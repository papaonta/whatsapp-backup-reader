// The downloaded Whisper model must survive an app restart (it lives in Cache
// Storage, so the startup cleanup must not touch it) and must NOT be downloaded
// again. Only the manual "Clear website data" button removes it.
// Needs internet once (to download the model from huggingface.co); skipped
// when the model host can't be reached. Takes a few minutes.
const fs = require('node:fs');
const { launch, sleep, S } = require('./lib.cjs');

const ok = (name, cond, detail = '') =>
	console.log(cond ? 'PASS' : 'FAIL', name, detail);
const P = `${S}/profile-model`;
const ZIP = `${S}/zips/ios-private-chat.zip`;
const text = async (page) =>
	(await page.locator('body').innerText()).replace(/\s+/g, ' ');

const hookModelRequests = (app) =>
	app.evaluate(({ session }) => {
		global.__hf = [];
		session.defaultSession.webRequest.onBeforeRequest(
			{
				urls: ['*://huggingface.co/*', '*://*.huggingface.co/*', '*://*.hf.co/*'],
			},
			(details, callback) => {
				global.__hf.push(details.url);
				callback({});
			},
		);
	});
const modelRequests = (app) => app.evaluate(() => global.__hf.length);
const cacheEntries = (page) =>
	page.evaluate(async () => {
		let total = 0;
		const names = await caches.keys();
		for (const name of names) {
			total += (await (await caches.open(name)).keys()).length;
		}
		return { names, total };
	});

// Opens the first voice message and waits until the model is loaded. The UI
// then shows "Transcribing..." (the inference itself can take minutes on
// CPU, which this test doesn't need to wait for).
async function loadModelViaTranscription(page) {
	// DOM clicks: after a restart the chat view can sit partly under the
	// sidebar, which makes pointer-based clicks flaky.
	const domClick = (label) =>
		page.evaluate((t) => {
			const el = [...document.querySelectorAll('button')].find((b) =>
				b.innerText.trim().includes(t),
			);
			if (!el) throw new Error(`no button with text: ${t}`);
			el.click();
		}, label);
	// After a restart no chat is open yet: select it from the sidebar first.
	if ((await page.getByText('Click to load audio').count()) === 0) {
		await page.locator('.sidebar-panel').getByText('ios-private-chat').first().click();
		await sleep(2500);
	}
	await domClick('Click to load audio');
	await sleep(1500);
	await domClick('Transcribe audio');
	for (let i = 0; i < 600; i++) {
		await sleep(1000);
		const t = await text(page);
		if (/Transcribing\.\.\./.test(t) || /\(No speech detected\)/.test(t)) return;
		if (/Retry/.test(t)) {
			throw new Error(`model/transcription failed (Retry shown): ${t.slice(-160)}`);
		}
	}
	throw new Error('model did not load in 10 minutes');
}

(async () => {
	try {
		const res = await fetch(
			'https://huggingface.co/Xenova/whisper-small/resolve/main/config.json',
			{ method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(8000) },
		);
		if (res.status >= 500) throw new Error(`status ${res.status}`);
	} catch {
		console.log('SKIP model cache test: huggingface.co is not reachable');
		return;
	}

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
	await app.evaluate(({ ipcMain }, zip) => {
		ipcMain.removeHandler('dialog:openFile');
		ipcMain.handle('dialog:openFile', async () => ({
			path: zip,
			name: zip.split('/').pop(),
		}));
	}, ZIP);
	await page.getByText('click to browse').first().click();
	await sleep(9000);

	// 1st use: the model is downloaded and stored in Cache Storage.
	await hookModelRequests(app);
	await loadModelViaTranscription(page);
	const firstRequests = await modelRequests(app);
	let cache = await cacheEntries(page);
	ok('model: first use downloads it', firstRequests > 0, `requests=${firstRequests}`);
	ok('model: stored in Cache Storage', cache.total > 0, JSON.stringify(cache));

	// Restart: the startup cleanup must leave Cache Storage alone.
	await app.close();
	await sleep(1500);
	({ app, page } = await launch(P));
	await sleep(5000);
	cache = await cacheEntries(page);
	ok('model: still cached after restart (startup cleanup left it)', cache.total > 0, JSON.stringify(cache));

	await hookModelRequests(app);
	await loadModelViaTranscription(page);
	const secondRequests = await modelRequests(app);
	ok('model: NOT downloaded again after restart', secondRequests === 0, `requests=${secondRequests}`);

	// Only the manual button (after its warning) removes it.
	await page.locator('button[title="Settings"]:visible').first().click();
	await sleep(1500);
	await page.getByRole('button', { name: 'Clear website data' }).click();
	await sleep(500);
	const warning = await text(page);
	ok('model: manual clear warns about re-downloading', /transcription model \(Whisper\)/.test(warning));
	ok('model: the warning step alone deletes nothing', (await cacheEntries(page)).total > 0);
	await page.getByRole('button', { name: 'Yes, clear' }).click();
	await sleep(1500);
	cache = await cacheEntries(page);
	ok('model: confirmed manual clear removes the cached model', cache.total === 0, JSON.stringify(cache));
	await app.close();
})().catch((e) => {
	console.error('ERR', e.stack || e.message);
	process.exit(1);
});
