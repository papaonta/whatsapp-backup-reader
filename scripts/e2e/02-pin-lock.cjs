// Auto-lock must not trigger behind the app's own file dialog or during a long
// import (lock-on-blur and the idle timer are paused), and must work again after.
// Takes ~90s: the stubbed dialog stays open longer than the 1-minute idle limit.
const fs = require('node:fs');
const { launch, sleep, S } = require('./lib.cjs');

const ok = (name, cond, detail = '') =>
	console.log(cond ? 'PASS' : 'FAIL', name, detail);
const ZIP = `${S}/zips/ios-private-chat.zip`;

const seedLock = (page, idleMinutes) =>
	page.evaluate(async (idle) => {
		const b64 = (u) => btoa(String.fromCharCode(...u));
		const salt = crypto.getRandomValues(new Uint8Array(16));
		const km = await crypto.subtle.importKey('raw', new TextEncoder().encode('1234'), 'PBKDF2', false, ['deriveBits']);
		const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, km, 256);
		await new Promise((resolve) => {
			const r = indexedDB.open('keyval-store');
			r.onupgradeneeded = () => r.result.createObjectStore('keyval');
			r.onsuccess = () => {
				const tx = r.result.transaction('keyval', 'readwrite');
				const o = tx.objectStore('keyval');
				o.put(true, 'whatsapp-onboarding-completed');
				o.put({ enabled: true, autoLockIdleMinutes: idle, lockOnBlur: true }, 'whatsapp-app-lock-settings');
				o.put({ hash: b64(new Uint8Array(bits)), salt: b64(salt) }, 'whatsapp-lock-settings');
				tx.oncomplete = resolve;
			};
		});
	}, idleMinutes);

(async () => {
	const profile = `${S}/profile-pin`;
	fs.rmSync(profile, { recursive: true, force: true });
	const { app, page } = await launch(profile);
	await sleep(2500);
	await seedLock(page, 1);
	await page.reload();
	await sleep(2000);
	const pw = page.locator('input[type=password]').first();
	await pw.fill('1234');
	await pw.press('Enter');
	await sleep(1500);
	ok('pin: setup unlocked', (await page.locator('input[type=password]').count()) === 0);

	// Stand-in for the native dialog: blurs the window like the real one does,
	// stays open 75s (> the 1 minute idle limit), then returns the zip.
	await app.evaluate(({ ipcMain, BrowserWindow }, zip) => {
		ipcMain.removeHandler('dialog:openFile');
		ipcMain.handle('dialog:openFile', async () => {
			const w = BrowserWindow.getAllWindows().find((x) =>
				x.webContents.getURL().startsWith('http://localhost:5173'),
			);
			w.blur();
			await new Promise((r) => setTimeout(r, 75000));
			w.focus();
			return { path: zip, name: zip.split('/').pop() };
		});
	}, ZIP);
	await page.evaluate(() => {
		window.__blurs = 0;
		window.addEventListener('blur', () => window.__blurs++);
	});
	await page.getByText('click to browse').first().click();
	await sleep(9000);
	// The OS-level blur() above only fires if the test window really had focus
	// (not the case for background runs, and Electron 45 no longer emits it for
	// an unfocused window). Dispatch the same DOM event the app listens to.
	await page.evaluate(() => window.dispatchEvent(new Event('blur')));
	await sleep(1000);
	let st = await page.evaluate(() => ({
		blurs: window.__blurs,
		gate: document.querySelectorAll('input[type=password]').length,
	}));
	// blurs can be 0 when the test window never had OS focus (e.g. a background
	// run); the check that matters is that the app did not lock.
	ok('pin: blur while the app dialog is open does NOT lock', st.gate === 0, JSON.stringify(st));

	await sleep(70000);
	st = await page.evaluate(() => ({
		gate: document.querySelectorAll('input[type=password]').length,
		body: document.body.innerText.replace(/\s+/g, ' ').slice(0, 80),
	}));
	ok('pin: idle limit passed during dialog + import: still unlocked, chat imported', st.gate === 0 && /ios-private-chat/.test(st.body), JSON.stringify(st));
	const persisted = await page.evaluate(
		() =>
			new Promise((resolve) => {
				const r = indexedDB.open('keyval-store');
				r.onsuccess = () => {
					const c = r.result.transaction('keyval').objectStore('keyval').getAllKeys();
					c.onsuccess = () =>
						resolve(c.result.filter((k) => String(k).startsWith('whatsapp-persisted-chat-')).length);
				};
			}),
	);
	ok('pin: import completed after the pick (chat persisted)', persisted === 1, `records=${persisted}`);

	await page.evaluate(() => window.dispatchEvent(new Event('blur')));
	await sleep(1500);
	ok('pin: after release, blur locks again', (await page.locator('input[type=password]').count()) === 1);
	await app.close();
})().catch((e) => {
	console.error('ERR', e.stack || e.message);
	process.exit(1);
});
