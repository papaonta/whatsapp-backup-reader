// Simulated locked vault (extraction folder renamed away): nothing is
// re-extracted, deleted or created. Also: stars survive restart, and an
// Update of a chat that wasn't restored keeps its old stars.
const fs = require('node:fs');
const { launch, sleep, S } = require('./lib.cjs');

const ok = (name, cond, detail = '') =>
	console.log(cond ? 'PASS' : 'FAIL', name, detail);
const P = `${S}/profile-vault`;
const R = `${P}/extracted-chats`;
const ZIP = `${S}/zips/ios-private-chat.zip`;

const records = (page) =>
	page.evaluate(
		() =>
			new Promise((resolve) => {
				const r = indexedDB.open('keyval-store');
				r.onsuccess = () => {
					const c = r.result.transaction('keyval').objectStore('keyval').openCursor();
					const out = [];
					c.onsuccess = () => {
						const x = c.result;
						if (x) {
							if (String(x.key).startsWith('whatsapp-persisted-chat-')) {
								out.push({
									title: x.value.chatTitle,
									stars: (x.value.bookmarks || []).length,
									ref: x.value.fileReference.type,
									dir: x.value.fileReference.extractionId,
								});
							}
							x.continue();
						} else resolve(out);
					};
				};
			}),
	);
const stubDialog = (app) =>
	app.evaluate(({ ipcMain }, zip) => {
		ipcMain.removeHandler('dialog:openFile');
		ipcMain.handle('dialog:openFile', async () => ({ path: zip, name: zip.split('/').pop() }));
	}, ZIP);
const text = async (page) => (await page.locator('body').innerText()).replace(/\s+/g, ' ');

(async () => {
	fs.rmSync(P, { recursive: true, force: true });
	let { app, page } = await launch(P);
	await sleep(2500);
	await page.evaluate(
		() =>
			new Promise((resolve) => {
				const q = indexedDB.open('keyval-store');
				q.onupgradeneeded = () => q.result.createObjectStore('keyval');
				q.onsuccess = () => {
					const tx = q.result.transaction('keyval', 'readwrite');
					tx.objectStore('keyval').put(true, 'whatsapp-onboarding-completed');
					tx.oncomplete = resolve;
				};
			}),
	);
	await page.reload();
	await sleep(1500);
	await stubDialog(app);
	await page.getByText('click to browse').first().click();
	await sleep(9000);
	await page.locator('button.bookmark-btn').first().click({ force: true });
	await sleep(600);
	await page.keyboard.type('n');
	await page.getByRole('button', { name: /^Save$/ }).first().click();
	await sleep(1500);
	let r = await records(page);
	ok('stars: chat imported + 1 star persisted', r.length === 1 && r[0].stars === 1 && r[0].ref === 'electron-extracted');
	await app.close();
	await sleep(1000);
	({ app, page } = await launch(P));
	await sleep(5000);
	r = await records(page);
	ok('stars: star survives a restart, chat restored', r[0].stars === 1 && /Alice/.test(await text(page)));
	await app.close();
	await sleep(1000);

	// ---- locked vault (the whole storage folder is gone)
	fs.renameSync(R, `${R}.LOCKED`);
	({ app, page } = await launch(P));
	let seen = '';
	for (let i = 0; i < 60; i++) {
		seen = await text(page);
		if (/Nothing was changed or deleted/.test(seen)) break;
		await sleep(150);
	}
	await sleep(8000);
	r = await records(page);
	const body = await text(page);
	ok('vault: no re-extraction (extracted-chats not recreated)', !fs.existsSync(R));
	ok('vault: nothing deleted - record + star intact, locked folder untouched', r.length === 1 && r[0].stars === 1 && fs.existsSync(`${R}.LOCKED/${r[0].dir}/manifest.json`));
	ok('vault: no new folders in the profile', JSON.stringify(fs.readdirSync(P).filter((n) => /extract/i.test(n))) === JSON.stringify(['extracted-chats.LOCKED']));
	ok('vault: chat shows "Tap to reopen" + explanatory toast', /Tap to reopen/.test(body) && /Nothing was changed or deleted/.test(seen));
	ok('vault: banner "chat storage not available" is shown', /Chat storage is not available \(vault locked\?\)/.test(body));
	await page.getByText('Tap to reopen').first().click();
	await sleep(1200);
	ok('vault: clicking the greyed chat does NOT offer re-extraction', !/Re-extracting will write about/.test(await text(page)) && !fs.existsSync(R));
	const dir = r[0].dir;
	await app.close();
	await sleep(1000);

	// ---- only this chat's folder is missing (storage itself is fine)
	fs.renameSync(`${R}.LOCKED`, R);
	fs.renameSync(`${R}/${dir}`, `${R}/${dir}.MISSING`);
	({ app, page } = await launch(P));
	await sleep(6000);
	await page.getByText('Tap to reopen').first().click();
	await sleep(1500);
	const modal = await text(page);
	ok('missing chat folder: manual modal explains, shows ZIP + size, extracts nothing', /Storage folder not available/.test(modal) && /Original ZIP found/.test(modal) && /Re-extracting will write about/.test(modal) && !fs.existsSync(`${R}/${dir}`));
	await page.getByRole('button', { name: 'Cancel' }).first().click();
	await sleep(800);
	ok('missing chat folder: cancel -> still nothing created', !fs.existsSync(`${R}/${dir}`));

	// ---- Update of a chat that is not restored keeps its stars
	await stubDialog(app);
	await page.locator('button[title="Import Chat"]:visible,button[aria-label="Import Chat"]:visible').first().click();
	await sleep(5000);
	await page.getByRole('button', { name: 'Update' }).first().click();
	await sleep(9000);
	r = await records(page);
	ok('stars: Update of an unrestored chat keeps the old star', r.length === 1 && r[0].stars === 1);
	await app.close();
})().catch((e) => {
	console.error('ERR', e.stack || e.message);
	process.exit(1);
});
