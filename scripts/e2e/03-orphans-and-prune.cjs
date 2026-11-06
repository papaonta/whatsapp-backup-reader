// No automatic pruning at launch; manual orphan cleanup lists first, asks for
// confirmation, and refuses when chats can't be read or storage is unavailable.
const fs = require('node:fs');
const { launch, sleep, S } = require('./lib.cjs');

const ok = (name, cond, detail = '') =>
	console.log(cond ? 'PASS' : 'FAIL', name, detail);
const P = `${S}/profile-orphans`;
const R = `${P}/extracted-chats`;
const mk = (id) => {
	fs.mkdirSync(`${R}/${id}/media`, { recursive: true });
	fs.writeFileSync(`${R}/${id}/media/x.bin`, Buffer.alloc(2048));
};
const text = async (page) => (await page.locator('body').innerText()).replace(/\s+/g, ' ');

(async () => {
	fs.rmSync(P, { recursive: true, force: true });
	mk('orphan-aaa');
	mk('orphan-bbb');
	const { app, page } = await launch(P);
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
	await sleep(8000);
	ok('orphans: launch does NOT prune', fs.existsSync(`${R}/orphan-aaa`) && fs.existsSync(`${R}/orphan-bbb`));

	await page.locator('button[title="Settings"]:visible').first().click();
	await sleep(1500);
	await page.getByRole('button', { name: 'Check for orphaned folders' }).click();
	await sleep(1500);
	let body = await text(page);
	ok('orphans: manual check lists orphans with sizes', /2 orphaned folders/.test(body) && body.includes('orphan-aaa'));
	ok('orphans: listing deletes nothing', fs.existsSync(`${R}/orphan-aaa`));
	await page.getByRole('button', { name: 'Delete these folders' }).click();
	await sleep(500);
	body = await text(page);
	ok('orphans: confirmation step shown, nothing deleted yet', /Permanently delete 2 folders/.test(body) && fs.existsSync(`${R}/orphan-aaa`));
	await page.getByRole('button', { name: 'Yes, delete' }).click();
	await sleep(1500);
	ok('orphans: confirm deletes only the orphans', !fs.existsSync(`${R}/orphan-aaa`) && !fs.existsSync(`${R}/orphan-bbb`));

	// Unreadable chat list -> nothing deleted.
	mk('orphan-ccc');
	await page.getByRole('button', { name: 'Check for orphaned folders' }).click();
	await sleep(1200);
	await page.getByRole('button', { name: 'Delete these folders' }).click();
	await sleep(300);
	await page.evaluate(() => {
		IDBObjectStore.prototype.getAllKeys = () => {
			throw new Error('boom');
		};
		IDBObjectStore.prototype.openCursor = () => {
			throw new Error('boom');
		};
	});
	await page.getByRole('button', { name: 'Yes, delete' }).click();
	await sleep(1500);
	body = await text(page);
	ok('orphans: unreadable chat list -> nothing deleted + message', fs.existsSync(`${R}/orphan-ccc`) && /Couldn.t read the saved chat list/.test(body));

	// Main-process guards.
	await page.reload();
	await sleep(2500);
	const ipc = await page.evaluate(async () => {
		const x = window.electronAPI.extraction;
		return {
			keepSafe: await x.deleteOrphans(['orphan-ccc'], ['orphan-ccc']),
			badIds: await Promise.all(['', '..', '../x', 'a/b'].map((i) => x.deleteDir(i))),
		};
	});
	ok('orphans: deleteOrphans never removes a kept id', fs.existsSync(`${R}/orphan-ccc`) && ipc.keepSafe.removed.length === 0);
	ok('orphans: deleteDir rejects invalid ids / the root', ipc.badIds.every((r) => r.success === false));
	fs.renameSync(R, `${R}.LOCKED`);
	const un = await page.evaluate(async () => ({
		del: await window.electronAPI.extraction.deleteDir('orphan-ccc'),
		list: await window.electronAPI.extraction.listOrphans([]),
		delo: await window.electronAPI.extraction.deleteOrphans(['orphan-ccc'], []),
	}));
	ok(
		'orphans: storage unavailable -> delete/list/deleteOrphans refuse and create nothing',
		un.del.unavailable === true && un.del.success === false && un.list.unavailable === true && un.delo.unavailable === true && !fs.existsSync(R),
	);
	await app.close();
})().catch((e) => {
	console.error('ERR', e.stack || e.message);
	process.exit(1);
});
