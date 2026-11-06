// "Chat storage location" (Settings → Storage): migration marker, locked
// vault, missing custom path, foreign / other-computer markers, move (success,
// failure, cancel), restore default and reconnect. Chat data only.
// All folders live under the OS temp folder; the real profile is never used.
const fs = require('node:fs');
const { launch, sleep, S } = require('./lib.cjs');
const {
	ok,
	ZIP,
	MARKER,
	text,
	readJson,
	writeJson,
	cfgOf,
	rootOf,
	tree,
	stubFolder,
	makeSeed,
	clone: cloneIn,
	chatIdIn,
	banner,
	waitBanner,
	focusEvent,
	attempts,
	allRefused,
	openSettings,
	waitMessage,
} = require('./storage-helpers.cjs');

const base = `${fs.realpathSync(S)}/cs`;
const clone = (seed, name) => cloneIn(seed, base, name);

(async () => {
	const seed = await makeSeed(base);
	const ID = chatIdIn(rootOf(seed));
	ok('setup: seed has config, marker and one chat folder', !!ID && fs.existsSync(cfgOf(seed)) && fs.existsSync(`${rootOf(seed)}/${MARKER}`));
	const seedCfg = readJson(cfgOf(seed));
	const seedMarker = readJson(`${rootOf(seed)}/${MARKER}`);
	ok(
		'fresh install: marker + config created for the default location',
		seedCfg.version === 1 && seedCfg.root === rootOf(seed) && seedMarker.storageId === seedCfg.storageId && seedMarker.installId === seedCfg.installId && !!seedMarker.createdAt,
	);

	// ---- 1. Migration: data from an older version (no marker, no config)
	{
		const P = clone(seed, 'migrate');
		fs.rmSync(cfgOf(P));
		fs.rmSync(`${rootOf(P)}/${MARKER}`);
		const before = tree(rootOf(P));
		const { app, page } = await launch(P);
		await sleep(6000);
		const cfg = fs.existsSync(cfgOf(P)) ? readJson(cfgOf(P)) : null;
		const marker = fs.existsSync(`${rootOf(P)}/${MARKER}`) ? readJson(`${rootOf(P)}/${MARKER}`) : null;
		ok('migration: marker + config created in the default folder', !!cfg && !!marker && cfg.root === rootOf(P) && cfg.storageId === marker.storageId && cfg.installId === marker.installId);
		ok('migration: existing chat data untouched', tree(rootOf(P), [MARKER]) === before);
		const t = await text(page);
		ok('migration: chat opens normally, no banner', /Alice/.test(t) && !/Tap to reopen/.test(t) && (await banner(page).count()) === 0);
		await app.close();
	}

	// ---- 2. Locked vault (custom location renamed away)
	{
		const P = clone(seed, 'vault');
		const V = `${base}/vault-root`;
		fs.mkdirSync(V);
		let { app, page } = await launch(P);
		await sleep(5000);
		const mv = await page.evaluate((dir) => window.electronAPI.chatStorage.move({ dir }), V);
		ok('vault setup: chat data moved to a custom folder', mv.success === true && fs.existsSync(`${V}/${ID}/manifest.json`) && readJson(cfgOf(P)).root === V);
		await app.close();
		await sleep(1000);
		const snapshotV = tree(V);
		const snapshotDefault = tree(rootOf(P));
		fs.renameSync(V, `${V}.LOCKED`);
		({ app, page } = await launch(P));
		const shown = await waitBanner(page, true);
		const body = await text(page);
		ok('vault: banner shown', shown && /Chat storage is not available \(vault locked\?\)\. Your data has not been changed\./.test(body));
		ok('vault: chat stays visible (greyed) and nothing is created', /Tap to reopen/.test(body) && !fs.existsSync(V));
		ok('vault: import button disabled', await page.evaluate(() => document.querySelector('button[aria-label="Import Chat"]')?.disabled === true));
		const a = await attempts(page, ID);
		ok('vault: import, merge, delete, orphan cleanup and move all refuse', allRefused(a), JSON.stringify(a).slice(0, 200));
		await banner(page).getByRole('button', { name: 'Try again' }).click();
		await sleep(800);
		ok('vault: "Try again" while still locked keeps the banner, creates nothing', (await banner(page).count()) === 1 && !fs.existsSync(V) && !fs.existsSync(`${V}.LOCKED/zz-attempt`) && !fs.existsSync(`${V}.LOCKED/zz-merged`));
		ok('vault: locked folder and old default copy untouched', tree(`${V}.LOCKED`) === snapshotV && tree(rootOf(P)) === snapshotDefault);
		// Unlock (focus re-check)
		fs.renameSync(`${V}.LOCKED`, V);
		await focusEvent(page);
		const gone = await waitBanner(page, false);
		await sleep(2500);
		const t2 = await text(page);
		ok('vault: unlocked + window focus -> banner gone, chat restored without extraction', gone && /Alice/.test(t2) && !/Tap to reopen/.test(t2));
		// Lock again, unlock with the button
		fs.renameSync(V, `${V}.LOCKED`);
		await focusEvent(page);
		const again = await waitBanner(page, true);
		fs.renameSync(`${V}.LOCKED`, V);
		await banner(page).getByRole('button', { name: 'Try again' }).click();
		const gone2 = await waitBanner(page, false);
		ok('vault: lock again, then "Try again" after unlocking -> normal', again && gone2 && tree(V) === snapshotV);
		await app.close();
	}

	// ---- 3. Custom path that does not exist at all: never created
	{
		const P = clone(seed, 'nopath');
		const cfg = readJson(cfgOf(P));
		cfg.root = `${base}/nope/deep/vault`;
		writeJson(cfgOf(P), cfg);
		const { app, page } = await launch(P);
		const shown = await waitBanner(page, true);
		await sleep(3000);
		const a = await attempts(page, ID);
		ok('missing path: banner shown', shown);
		ok('missing path: no folder or marker created anywhere', !fs.existsSync(`${base}/nope`) && allRefused(a));
		ok('missing path: config unchanged', readJson(cfgOf(P)).root === `${base}/nope/deep/vault`);
		await app.close();
	}

	// ---- 4. Marker with a different storageId: "not your chat storage"
	{
		const P = clone(seed, 'foreign');
		const F = `${base}/foreign-root`;
		fs.mkdirSync(`${F}/abc-123`, { recursive: true });
		fs.writeFileSync(`${F}/abc-123/file.txt`, 'someone else');
		writeJson(`${F}/${MARKER}`, { storageId: 'not-ours', installId: seedCfg.installId, createdAt: '2020-01-01T00:00:00.000Z' });
		const cfg = readJson(cfgOf(P));
		cfg.root = F;
		writeJson(cfgOf(P), cfg);
		const snap = tree(F);
		const { app, page } = await launch(P);
		const shown = await waitBanner(page, true);
		const body = await text(page);
		ok('foreign marker: message "not your chat storage"', shown && /This folder is not your chat storage\. Nothing was written to it\./.test(body));
		const a = await attempts(page, 'abc-123');
		await banner(page).getByRole('button', { name: 'Try again' }).click();
		await sleep(800);
		ok('foreign marker: every write refused, folder byte-identical', allRefused(a) && tree(F) === snap);
		await app.close();
	}

	// ---- 5. Marker of another installation: read yes, write no
	{
		const P = clone(seed, 'other');
		const V = `${base}/other-root`;
		fs.mkdirSync(V);
		let { app, page } = await launch(P);
		await sleep(5000);
		const mv = await page.evaluate((dir) => window.electronAPI.chatStorage.move({ dir }), V);
		await app.close();
		await sleep(1000);
		const mk = readJson(`${V}/${MARKER}`);
		mk.installId = 'another-computer';
		writeJson(`${V}/${MARKER}`, mk);
		const snap = tree(V);
		({ app, page } = await launch(P));
		const shown = await waitBanner(page, true);
		await sleep(3000);
		const body = await text(page);
		ok('other computer: warning shown', mv.success && shown && /This storage is used by another computer/.test(body));
		ok('other computer: chat still opens (reading allowed)', /Alice/.test(body) && !/Tap to reopen/.test(body));
		const a = await attempts(page, ID);
		ok('other computer: delete, orphan cleanup, import, move all refused; data unchanged', allRefused(a) && tree(V) === snap);
		await openSettings(page);
		const moveDisabled = await page.getByRole('button', { name: 'Move…' }).isDisabled();
		ok('other computer: "Move…" disabled in Settings', moveDisabled);
		await app.close();
	}

	// ---- 6. Move via the Settings UI, then restore default
	{
		const P = clone(seed, 'move');
		const D = `${base}/move-dest`;
		fs.mkdirSync(D);
		const srcBefore = tree(rootOf(P), [MARKER]);
		const oldCfg = readJson(cfgOf(P));
		const { app, page } = await launch(P);
		await sleep(5000);
		await stubFolder(app, D);
		await openSettings(page);
		await page.getByRole('button', { name: 'Move…' }).click();
		await page.locator('[data-testid=chat-storage-confirm]').waitFor({ timeout: 15000 });
		const confirmText = await page.locator('[data-testid=chat-storage-confirm]').innerText();
		ok('move: confirmation shows chat count, size and destination; nothing copied yet', /Copy 1 chats \(/.test(confirmText) && confirmText.includes(D) && fs.readdirSync(D).length === 0);
		await page.getByRole('button', { name: 'Copy and switch' }).click();
		const done = await waitMessage(page, /Chat data is now in/);
		await sleep(800);
		const newCfg = readJson(cfgOf(P));
		const newMarker = readJson(`${D}/${MARKER}`);
		ok('move: identical content at the destination', tree(D, [MARKER]) === srcBefore);
		ok('move: config switched, new marker written (same installId, new storageId)', newCfg.root === D && newMarker.storageId === newCfg.storageId && newMarker.storageId !== oldCfg.storageId && newMarker.installId === oldCfg.installId);
		ok('move: old folder kept intact and the note says to delete it manually', tree(rootOf(P), [MARKER]) === srcBefore && /NOT deleted/.test(done) && done.includes(rootOf(P)));
		ok('move: Settings shows the new path', (await page.locator('[data-testid=chat-storage-path]').innerText()).includes(D));
		// Restore default: refused while the old default folder still holds data
		await page.getByRole('button', { name: 'Restore default' }).click();
		const refused = await waitMessage(page, /must be empty/, 10000);
		ok('restore default: refused while the old folder is still there, nothing changed', /must be empty/.test(refused) && readJson(cfgOf(P)).root === D);
		// Owner deletes the old folder manually, then restores
		fs.rmSync(rootOf(P), { recursive: true, force: true });
		await page.getByRole('button', { name: 'Restore default' }).click();
		await page.locator('[data-testid=chat-storage-confirm]').waitFor({ timeout: 15000 });
		await page.getByRole('button', { name: 'Copy and switch' }).click();
		await waitMessage(page, new RegExp(`Chat data is now in ${rootOf(P).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
		await sleep(800);
		ok('restore default: content copied back, config points at the default again, custom copy kept', readJson(cfgOf(P)).root === rootOf(P) && tree(rootOf(P), [MARKER]) === srcBefore && fs.existsSync(`${D}/${ID}/manifest.json`));
		await app.close();
		await sleep(1000);
		const r2 = await launch(P);
		await sleep(6000);
		const t = await text(r2.page);
		ok('restore default: after restart the chat opens, no banner', /Alice/.test(t) && !/Tap to reopen/.test(t) && (await banner(r2.page).count()) === 0);
		await r2.app.close();
	}

	// ---- 7. Move fails midway / is cancelled: config and source untouched
	{
		const P = clone(seed, 'fail');
		const D1 = `${base}/fail-dest-1`;
		const D2 = `${base}/fail-dest-2`;
		const D3 = `${base}/fail-dest-3`;
		for (const d of [D1, D2, D3]) fs.mkdirSync(d);
		const media = `${rootOf(P)}/${ID}/media`;
		const files = fs.readdirSync(media).sort();
		const victim = `${media}/${files[files.length - 1]}`;
		const cfgBefore = fs.readFileSync(cfgOf(P), 'utf-8');
		const srcBefore = tree(rootOf(P));
		const { app, page } = await launch(P);
		await sleep(5000);

		// (a) a source file can't be read -> fails after copying some files
		fs.chmodSync(victim, 0o000);
		const a = await page.evaluate((dir) => window.electronAPI.chatStorage.move({ dir }), D1);
		fs.chmodSync(victim, 0o644);
		ok('failed move (unreadable source file): reported as failed', a.success === false && !a.cancelled);
		ok('failed move: config unchanged, destination cleaned, source intact', fs.readFileSync(cfgOf(P), 'utf-8') === cfgBefore && fs.readdirSync(D1).length === 0 && tree(rootOf(P)) === srcBefore);

		// (b) read-only destination
		fs.chmodSync(D2, 0o555);
		const b = await page.evaluate((dir) => window.electronAPI.chatStorage.move({ dir }), D2);
		fs.chmodSync(D2, 0o755);
		ok('failed move (read-only destination): failed, config unchanged, nothing written', b.success === false && fs.readFileSync(cfgOf(P), 'utf-8') === cfgBefore && fs.readdirSync(D2).length === 0 && tree(rootOf(P)) === srcBefore);

		// (c) cancel while copying a large file
		const big = `${media}/big-test.bin`;
		const fd = fs.openSync(big, 'w');
		fs.ftruncateSync(fd, 1024 * 1024 * 1024);
		fs.closeSync(fd);
		const bigBefore = tree(rootOf(P));
		const result = await page.evaluate(async (dir) => {
			const p = window.electronAPI.chatStorage.move({ dir });
			await new Promise((r) => setTimeout(r, 150));
			await window.electronAPI.chatStorage.cancelMove();
			return await p;
		}, D3);
		ok('cancelled move: reported as cancelled', result.cancelled === true && result.success === false, JSON.stringify(result).slice(0, 120));
		ok('cancelled move: config unchanged, partial copy removed, source intact', fs.readFileSync(cfgOf(P), 'utf-8') === cfgBefore && fs.readdirSync(D3).length === 0 && tree(rootOf(P)) === bigBefore);
		fs.rmSync(big);
		await app.close();
	}

	// ---- 8. Reconnect (drive letter / vault path changed)
	{
		const P = clone(seed, 'reconnect');
		const A = `${base}/rc-a`;
		const B = `${base}/rc-b`;
		fs.mkdirSync(A);
		let { app, page } = await launch(P);
		await sleep(5000);
		await page.evaluate((dir) => window.electronAPI.chatStorage.move({ dir }), A);
		await app.close();
		await sleep(1000);
		fs.renameSync(A, B);
		const snapB = tree(B);
		({ app, page } = await launch(P));
		const shown = await waitBanner(page, true);
		ok('reconnect: path changed -> banner', shown);
		await openSettings(page);
		await stubFolder(app, B);
		await page.getByRole('button', { name: 'Connect to existing storage…' }).click();
		await waitMessage(page, /Connected to/);
		const gone = await waitBanner(page, false);
		ok('reconnect: matching marker accepted, only the config path changed', gone && readJson(cfgOf(P)).root === B && tree(B) === snapB);

		// Wrong storage: the old default folder carries a different storageId
		const cfgNow = fs.readFileSync(cfgOf(P), 'utf-8');
		await stubFolder(app, rootOf(P));
		await page.getByRole('button', { name: 'Connect to existing storage…' }).click();
		const wrong = await waitMessage(page, /not your chat storage/);
		ok('reconnect: marker with a different storageId is refused', /not your chat storage/.test(wrong) && fs.readFileSync(cfgOf(P), 'utf-8') === cfgNow);
		// No marker at all
		const E = `${base}/empty-folder`;
		fs.mkdirSync(E);
		await stubFolder(app, E);
		await page.getByRole('button', { name: 'Connect to existing storage…' }).click();
		const nomark = await waitMessage(page, /no valid chat storage marker/);
		ok('reconnect: folder without a marker is refused, nothing written into it', /no valid chat storage marker/.test(nomark) && fs.readdirSync(E).length === 0 && fs.readFileSync(cfgOf(P), 'utf-8') === cfgNow);
		await app.close();
	}
})().catch((e) => {
	console.error('ERR', e.stack || e.message);
	process.exit(1);
});
