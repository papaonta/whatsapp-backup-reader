// Regression: normal import, cancelling an extraction, Delete Chat (refused
// while storage is unavailable), and the manual re-extract.
const fs = require('node:fs');
const { launch, sleep, S } = require('./lib.cjs');

const ok = (name, cond, detail = '') =>
	console.log(cond ? 'PASS' : 'FAIL', name, detail);
const P = `${S}/profile-regression`;
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
								out.push({ title: x.value.chatTitle, dir: x.value.fileReference.extractionId });
							}
							x.continue();
						} else resolve(out);
					};
				};
			}),
	);
const stub = (app) =>
	app.evaluate(({ ipcMain }, zip) => {
		ipcMain.removeHandler('dialog:openFile');
		ipcMain.handle('dialog:openFile', async () => ({ path: zip, name: zip.split('/').pop() }));
	}, ZIP);
const text = async (page) => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
// The sidebar item's menu button comes first in the DOM.
const openChatMenu = (page) =>
	page.evaluate(() => {
		const b = document.querySelectorAll('button[aria-label="Chat options"]')[0];
		if (!b) throw new Error('no chat options button');
		b.click();
	});
const clickDeleteChat = async (page) => {
	await openChatMenu(page);
	await sleep(1500);
	await page.evaluate(() => {
		const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Delete Chat');
		if (!b) throw new Error('no Delete Chat item');
		b.click();
	});
	await sleep(500);
	await page.getByRole('button', { name: 'Delete', exact: true }).click();
	await sleep(2000);
};

(async () => {
	fs.rmSync(P, { recursive: true, force: true });
	let { app, page } = await launch(P);
	await sleep(2000);
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
	await stub(app);
	await page.getByText('click to browse').first().click();
	await sleep(9000);
	let r = await records(page);
	ok('regression: normal import works', r.length === 1 && fs.readdirSync(R).includes(r[0].dir) && /Alice/.test(await text(page)));

	const c = await page.evaluate(async (zip) => {
		const x = window.electronAPI.extraction;
		const p = x.extract(zip, 'cancel-test-1');
		await x.cancelExtract('cancel-test-1');
		const res = await p;
		return { cancelled: res.cancelled, success: res.success };
	}, ZIP);
	ok('regression: cancelled extraction leaves no folder', c.cancelled === true && !fs.existsSync(`${R}/cancel-test-1`));

	fs.renameSync(R, `${R}.LOCKED`);
	await clickDeleteChat(page);
	r = await records(page);
	ok(
		'regression: Delete Chat refused while storage is unavailable (record kept, nothing created)',
		r.length === 1 && /Nothing was deleted/.test(await text(page)) && !fs.existsSync(R) && fs.existsSync(`${R}.LOCKED/${r[0].dir}`),
	);
	fs.renameSync(`${R}.LOCKED`, R);
	await clickDeleteChat(page);
	r = await records(page);
	ok('regression: Delete Chat with storage available removes record + folder', r.length === 0 && fs.readdirSync(R).length === 0);

	// Manual re-extract after an explicit click.
	await page.getByText('click to browse').first().click();
	await sleep(9000);
	r = await records(page);
	const dir = r[0].dir;
	await app.close();
	await sleep(1000);
	fs.renameSync(R, `${R}.LOCKED`);
	({ app, page } = await launch(P));
	await sleep(5000);
	await page.getByText('Tap to reopen').first().click();
	await sleep(1200);
	await page.getByRole('button', { name: 'Re-extract from ZIP' }).click();
	await sleep(8000);
	const t = await text(page);
	ok('regression: manual re-extract recreates the folder and loads the chat', fs.existsSync(`${R}/${dir}/manifest.json`) && /Alice/.test(t) && !/Tap to reopen/.test(t));
	await app.close();
	await sleep(1000);
	({ app, page } = await launch(P));
	await sleep(5000);
	const t2 = await text(page);
	ok('regression: normal restart afterwards restores the chat', /Alice/.test(t2) && !/Tap to reopen/.test(t2));
	await app.close();
})().catch((e) => {
	console.error('ERR', e.stack || e.message);
	process.exit(1);
});
