// External links open in the default browser; leftover site data is cleared
// without touching IndexedDB / localStorage.
const fs = require('node:fs');
const http = require('node:http');
const { launch, sleep, S } = require('./lib.cjs');

const ok = (name, cond, detail = '') =>
	console.log(cond ? 'PASS' : 'FAIL', name, detail);

(async () => {
	const srv = http.createServer((_req, res) => {
		res.setHeader('Set-Cookie', 'probe=1; Max-Age=99999');
		res.end('hi');
	});
	await new Promise((resolve) => srv.listen(0, '127.0.0.1', resolve));
	const url = `http://127.0.0.1:${srv.address().port}/`;

	const profile = `${S}/profile-links`;
	fs.rmSync(profile, { recursive: true, force: true });
	let { app, page } = await launch(profile);
	await sleep(2500);

	// Stub openExternal so nothing really opens.
	await app.evaluate(({ shell }) => {
		global.__opened = [];
		shell.openExternal = async (u) => {
			global.__opened.push(u);
		};
	});
	const click = (href, target = '_blank') =>
		page.evaluate(
			([h, t]) => {
				const a = document.createElement('a');
				a.href = h;
				a.target = t;
				a.rel = 'noopener noreferrer';
				document.body.appendChild(a);
				a.click();
				a.remove();
			},
			[href, target],
		);
	const opened = () => app.evaluate(() => global.__opened.slice());

	const windows0 = app.windows().length;
	await click(url);
	await sleep(1200);
	ok(
		'links: http link -> default browser, no new window',
		(await opened()).includes(url) && app.windows().length === windows0,
	);
	await click('mailto:a@b.co');
	await sleep(500);
	ok('links: mailto allowed', (await opened()).includes('mailto:a@b.co'));
	const before = (await opened()).length;
	await click('file:///etc/hosts');
	await click('javascript:alert(1)');
	await click('ftp://x.test/f');
	await sleep(800);
	ok(
		'links: file:/javascript:/ftp: rejected',
		(await opened()).length === before && app.windows().length === windows0,
	);
	const urlBefore = page.url();
	await click(url, '_self');
	await sleep(1200);
	ok(
		'links: in-app navigation to an external host is blocked',
		page.url() === urlBefore && (await opened()).includes(url),
	);
	await page.evaluate((u) => {
		window.location.href = u;
	}, `${url}redir`);
	await sleep(1200);
	ok('links: location.href to an external host is blocked', page.url() === urlBefore);

	// ---- site data
	await app.evaluate(async ({ session }, u) => {
		await session.defaultSession.cookies.set({
			url: u,
			name: 'probe',
			value: '1',
			expirationDate: Date.now() / 1000 + 99999,
		});
	}, url);
	await page.evaluate(async () => {
		localStorage.setItem('keep-me', '1');
		await new Promise((resolve) => {
			const r = indexedDB.open('keyval-store');
			r.onupgradeneeded = () => r.result.createObjectStore('keyval');
			r.onsuccess = () => {
				const tx = r.result.transaction('keyval', 'readwrite');
				tx.objectStore('keyval').put({ pin: 'x' }, 'whatsapp-lock-settings');
				tx.objectStore('keyval').put({ chatTitle: 'T' }, 'whatsapp-persisted-chat-1');
				tx.oncomplete = resolve;
			};
		});
		const cache = await caches.open('site-cache');
		await cache.put('/x', new Response('data'));
	});
	const state = async () => ({
		// The app's own locale cookie is recreated on every start, so only count probes.
		cookies: await app.evaluate(({ session }) =>
			session.defaultSession.cookies
				.get({})
				.then((c) => c.filter((x) => x.name.startsWith('probe')).length),
		),
		caches: await page.evaluate(() => caches.keys().then((k) => k.length)),
		ls: await page.evaluate(() => localStorage.getItem('keep-me')),
		idb: await page.evaluate(
			() =>
				new Promise((resolve) => {
					const r = indexedDB.open('keyval-store');
					r.onsuccess = () => {
						const c = r.result.transaction('keyval').objectStore('keyval').getAllKeys();
						c.onsuccess = () => resolve(c.result.sort());
					};
				}),
		),
	});
	const pre = await state();
	const res = await page.evaluate(() => window.electronAPI.clearSiteData());
	const post = await state();
	ok(
		'site data: manual clear removes cookies + cache storage',
		res.success && post.cookies === 0 && post.caches === 0,
	);
	ok(
		'site data: manual clear leaves IndexedDB + localStorage intact',
		post.ls === '1' && post.idb.length === 2 && JSON.stringify(post.idb) === JSON.stringify(pre.idb),
	);

	await app.evaluate(async ({ session }, u) => {
		await session.defaultSession.cookies.set({
			url: u,
			name: 'probe2',
			value: '1',
			expirationDate: Date.now() / 1000 + 99999,
		});
		await session.defaultSession.flushStorageData();
	}, url);
	await app.close();
	await sleep(1500);
	({ app, page } = await launch(profile));
	await sleep(3000);
	const post2 = await state();
	ok(
		'site data: startup clear removes cookies, keeps IndexedDB/localStorage',
		post2.cookies === 0 && post2.ls === '1' && post2.idb.length === 2,
	);
	await app.close();
	srv.close();
})().catch((e) => {
	console.error('ERR', e.stack || e.message);
	process.exit(1);
});
