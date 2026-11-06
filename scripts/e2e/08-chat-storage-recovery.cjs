// Chat storage, part 2: fresh install, manual "create default folder", corrupt
// config recovery, merge/backup/import locked for another computer's storage
// and during a move. Folders live under the OS temp folder only.
const fs = require('node:fs');
const { launch, sleep, S } = require('./lib.cjs');
const {
	ok,
	ZIP,
	MARKER,
	text,
	readJson,
	cfgOf,
	rootOf,
	tree,
	stubFolder,
	makeSeed,
	clone: cloneIn,
	chatIdIn,
	banner,
	waitBanner,
	attempts,
	allRefused,
	openSettings,
	waitMessage,
} = require('./storage-helpers.cjs');

const base = `${fs.realpathSync(S)}/cs2`;
const clone = (seed, name) => cloneIn(seed, base, name);
const disabled = (page, selector) =>
	page.evaluate((sel) => document.querySelector(sel)?.disabled, selector);
const selectChat = async (page) => {
	await page.locator('.sidebar-panel').getByText('ios-private-chat').first().click();
	await sleep(2500);
};

(async () => {
	const seed = await makeSeed(base);
	const ID = chatIdIn(rootOf(seed));

	// ---- fresh install: no folder, no config -> works, no banner
	{
		const P = `${base}/fresh`;
		const { app, page } = await launch(P);
		await sleep(5000);
		ok(
			'fresh install: no banner, config + marker + folder created, no .corrupt',
			(await banner(page).count()) === 0 &&
				fs.existsSync(cfgOf(P)) &&
				fs.existsSync(`${rootOf(P)}/${MARKER}`) &&
				!fs.existsSync(`${cfgOf(P)}.corrupt`),
		);
		ok('fresh install: import button enabled', (await disabled(page, 'button[aria-label="Import Chat"]')) !== true);
		await app.close();
	}

	// ---- default folder gone: manual "create new folder" with confirmation
	{
		const P = clone(seed, 'nodefault');
		const gone = `${P}/extracted-chats.GONE`;
		fs.renameSync(rootOf(P), gone);
		const snapGone = tree(gone);
		const cfg = readJson(cfgOf(P));
		const { app, page } = await launch(P);
		const shown = await waitBanner(page, true);
		ok('default folder missing: banner, nothing created automatically', shown && !fs.existsSync(rootOf(P)));
		const btn = banner(page).getByRole('button', { name: 'Create new folder in default location' });
		ok('default folder missing: manual button offered', (await btn.count()) === 1);
		await btn.click();
		const confirm = await page.locator('[data-testid=chat-storage-create-confirm]').innerText();
		ok('default folder missing: confirmation explains "Tap to reopen"', /Tap to reopen/.test(confirm) && confirm.includes(rootOf(P)));
		await banner(page).getByRole('button', { name: 'Cancel' }).click();
		await sleep(500);
		ok('default folder missing: cancel creates nothing', !fs.existsSync(rootOf(P)));
		await btn.click();
		await banner(page).getByRole('button', { name: 'Create folder' }).click();
		const cleared = await waitBanner(page, false);
		const marker = fs.existsSync(`${rootOf(P)}/${MARKER}`) ? readJson(`${rootOf(P)}/${MARKER}`) : null;
		ok(
			'default folder missing: confirmed -> empty folder + marker with the same identity, banner gone',
			cleared && !!marker && marker.storageId === cfg.storageId && marker.installId === cfg.installId && fs.readdirSync(rootOf(P)).length === 1,
		);
		await sleep(2500);
		ok('default folder missing: old chat stays "Tap to reopen", old folder untouched', /Tap to reopen/.test(await text(page)) && tree(gone) === snapGone);
		await app.close();
	}

	// ---- custom location missing: no create button
	{
		const P = clone(seed, 'nocustom');
		const cfg = readJson(cfgOf(P));
		cfg.root = `${base}/not/here`;
		fs.writeFileSync(cfgOf(P), JSON.stringify(cfg));
		const { app, page } = await launch(P);
		const shown = await waitBanner(page, true);
		ok('custom location missing: no "create folder" button, nothing created', shown && (await banner(page).getByRole('button', { name: /Create new folder/ }).count()) === 0 && !fs.existsSync(`${base}/not`));
		await app.close();
	}

	// ---- corrupt config
	{
		const P = clone(seed, 'corrupt');
		const garbage = '{ this is not json';
		fs.writeFileSync(cfgOf(P), garbage);
		const snapRoot = tree(rootOf(P));
		const marker = readJson(`${rootOf(P)}/${MARKER}`);
		const { app, page } = await launch(P);
		const shown = await waitBanner(page, true);
		await sleep(2000);
		const body = await text(page);
		ok('corrupt config: banner explains, copy saved as .corrupt, original untouched', shown && /settings file could not be read/.test(body) && fs.readFileSync(`${cfgOf(P)}.corrupt`, 'utf-8') === garbage && fs.readFileSync(cfgOf(P), 'utf-8') === garbage);
		const a = await attempts(page, ID);
		ok('corrupt config: every write refused, chat folders untouched', allRefused(a) && tree(rootOf(P)) === snapRoot);
		// A folder without a marker is refused
		const E = `${base}/corrupt-empty`;
		fs.mkdirSync(E);
		await stubFolder(app, E);
		await banner(page).getByRole('button', { name: 'Recover from marker…' }).click();
		await sleep(1200);
		ok('recover: folder without marker refused, config untouched', (await banner(page).innerText()).includes('no valid chat storage marker') && fs.readFileSync(cfgOf(P), 'utf-8') === garbage && fs.readdirSync(E).length === 0);
		// The real storage: confirm, then adopt
		await stubFolder(app, rootOf(P));
		await banner(page).getByRole('button', { name: 'Recover from marker…' }).click();
		await page.locator('[data-testid=chat-storage-recover-confirm]').waitFor({ timeout: 10000 });
		ok('recover: confirmation shown first, config still untouched', fs.readFileSync(cfgOf(P), 'utf-8') === garbage);
		await banner(page).getByRole('button', { name: 'Recover', exact: true }).click();
		const cleared = await waitBanner(page, false);
		await sleep(2500);
		const cfg = readJson(cfgOf(P));
		ok(
			'recover: storageId + installId adopted from the marker, atomic write (no .tmp), nothing copied or deleted',
			cleared && cfg.storageId === marker.storageId && cfg.installId === marker.installId && cfg.root === rootOf(P) && !fs.existsSync(`${cfgOf(P)}.tmp`) && tree(rootOf(P)) === snapRoot,
		);
		ok('recover: chat opens again', /Alice/.test(await text(page)) && !/Tap to reopen/.test(await text(page)));
		await app.close();
	}

	// ---- another computer's storage: merge / backup / import off, reading on
	{
		const P = clone(seed, 'othermerge');
		const V = `${base}/other-root`;
		fs.mkdirSync(V);
		let { app, page } = await launch(P);
		await sleep(5000);
		await page.evaluate((dir) => window.electronAPI.chatStorage.move({ dir }), V);
		await app.close();
		await sleep(1000);
		const mk = readJson(`${V}/${MARKER}`);
		mk.installId = 'another-computer';
		fs.writeFileSync(`${V}/${MARKER}`, JSON.stringify(mk));
		const snap = tree(V);
		({ app, page } = await launch(P));
		await waitBanner(page, true);
		await sleep(3000);
		await selectChat(page);
		ok(
			'other computer: merge, backup and import buttons are disabled with a chat open',
			(await disabled(page, 'button[aria-label="Merge with another chat…"]')) === true &&
				(await disabled(page, 'button[aria-label="Backup as ZIP"]')) === true &&
				(await disabled(page, 'button[aria-label="Import Chat"]')) === true,
		);
		const merged = await page.evaluate(() => window.electronAPI.extraction.createMergedChat('zz-merge', 'a.txt', 'x', []));
		ok('other computer: merge is refused by the main process too; nothing written', merged.success === false && tree(V) === snap);
		await app.close();
	}

	// ---- during a move: import, merge, delete, backup are locked
	{
		const P = clone(seed, 'moving');
		const D = `${base}/moving-dest`;
		fs.mkdirSync(D);
		const big = `${rootOf(P)}/${ID}/media/big-test.bin`;
		const fd = fs.openSync(big, 'w');
		fs.ftruncateSync(fd, 8 * 1024 * 1024 * 1024);
		fs.closeSync(fd);
		const { app, page } = await launch(P);
		await sleep(5000);
		await stubFolder(app, D);
		await openSettings(page);
		await page.getByRole('button', { name: 'Move…' }).click();
		await page.locator('[data-testid=chat-storage-confirm]').waitFor({ timeout: 15000 });
		await page.getByRole('button', { name: 'Copy and switch' }).click();
		await page.locator('[data-testid=chat-storage-progress]').waitFor({ timeout: 10000 });
		const during = await page.evaluate(async (zip) => {
			const x = window.electronAPI.extraction;
			return {
				extract: await x.extract(zip, 'zz-during'),
				merged: await x.createMergedChat('zz-during-m', 'a.txt', 'x', []),
				del: await x.deleteDir('zz-during'),
			};
		}, ZIP);
		// Settings is a full page: go back to the chat list while the move runs.
		await page.getByRole('button', { name: 'Back to chats' }).click();
		await sleep(1000);
		during.importDisabled = (await disabled(page, 'button[aria-label="Import Chat"]')) === true;
		ok(
			'during a move: extract, merge and delete refused by the main process; import button off',
			during.extract.success === false && during.merged.success === false && during.del.success === false && during.importDisabled,
			JSON.stringify(during).slice(0, 300),
		);
		await selectChat(page);
		ok(
			'during a move: merge and backup buttons off after returning to the chat',
			(await disabled(page, 'button[aria-label="Merge with another chat…"]')) === true && (await disabled(page, 'button[aria-label="Backup as ZIP"]')) === true,
		);
		await page.evaluate(() => window.electronAPI.chatStorage.cancelMove());
		await sleep(2500);
		ok(
			'after the move ends (cancelled here): buttons are enabled again, config unchanged',
			(await disabled(page, 'button[aria-label="Merge with another chat…"]')) !== true && readJson(cfgOf(P)).root === rootOf(P) && fs.readdirSync(D).length === 0,
		);
		fs.rmSync(big);
		await app.close();
	}
})().catch((e) => {
	console.error('ERR', e.stack || e.message);
	process.exit(1);
});
