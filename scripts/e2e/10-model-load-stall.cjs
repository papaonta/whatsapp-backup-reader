// Model loading watchdog: a download that makes NO progress for 2 minutes is
// stopped with an error + Retry; a slow download that keeps moving is NOT
// stopped; Retry works once the server is back. A local stub server sits in
// front of huggingface.co (requests are redirected to it by the main process
// in this test only) and can hold, throttle or pass the responses through.
// Needs internet (the real model files are proxied); skipped when unreachable.
// Takes about 6 minutes (it waits for the real 2-minute limit once).
const fs = require('node:fs');
const http = require('node:http');
const { launch, sleep, S } = require('./lib.cjs');

const ok = (name, cond, detail = '') =>
	console.log(cond ? 'PASS' : 'FAIL', name, detail);
const P = `${S}/profile-model-stall`;
const ZIP = `${S}/zips/ios-private-chat.zip`;
const text = async (page) =>
	(await page.locator('body').innerText()).replace(/\s+/g, ' ');

let mode = 'stall'; // 'stall' | 'slow' | 'normal'
const sockets = new Set();

const server = http.createServer(async (req, res) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Headers', '*');
	res.setHeader('Access-Control-Allow-Methods', '*');
	res.setHeader('Access-Control-Expose-Headers', '*');
	if (req.method === 'OPTIONS') {
		res.writeHead(204).end();
		return;
	}
	// The mode is re-read for every chunk, so a running download can be
	// slowed down, held, or released while it is in flight.
	const upstreamUrl = new URL(req.url, 'http://x').searchParams.get('u');
	try {
		const headers = {};
		if (req.headers.range) headers.range = req.headers.range;
		const up = await fetch(upstreamUrl, { method: req.method, headers });
		const out = {};
		for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag']) {
			const v = up.headers.get(h);
			if (v) out[h] = v;
		}
		res.writeHead(up.status, out);
		if (!up.body) {
			res.end();
			return;
		}
		for await (const chunk of up.body) {
			for (let off = 0; off < chunk.length; off += 16384) {
				while (mode === 'stall') await sleep(200);
				if (res.destroyed) return;
				res.write(chunk.subarray(off, off + 16384));
				if (mode === 'slow') await sleep(100);
			}
		}
		res.end();
	} catch {
		res.destroy();
	}
});
server.on('connection', (s) => {
	sockets.add(s);
	s.on('close', () => sockets.delete(s));
});

(async () => {
	try {
		const probe = await fetch('https://huggingface.co/Xenova/whisper-small/resolve/main/config.json', {
			method: 'HEAD',
			redirect: 'manual',
			signal: AbortSignal.timeout(8000),
		});
		if (probe.status >= 500) throw new Error(`status ${probe.status}`);
	} catch {
		console.log('SKIP model stall test: huggingface.co is not reachable');
		return;
	}

	await new Promise((r) => server.listen(0, '127.0.0.1', r));
	const port = server.address().port;

	fs.rmSync(P, { recursive: true, force: true });
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
	await sleep(1500);
	await app.evaluate(({ ipcMain }, zip) => {
		ipcMain.removeHandler('dialog:openFile');
		ipcMain.handle('dialog:openFile', async () => ({ path: zip, name: zip.split('/').pop() }));
	}, ZIP);
	await page.getByText('click to browse').first().click();
	await sleep(9000);

	// Send every model-host request through the stub.
	await app.evaluate(({ session }, p) => {
		session.defaultSession.webRequest.onBeforeRequest(
			{ urls: ['*://huggingface.co/*', '*://*.huggingface.co/*', '*://*.hf.co/*'] },
			(d, cb) => cb({ redirectURL: `http://127.0.0.1:${p}/?u=${encodeURIComponent(d.url)}` }),
		);
	}, port);

	const domClick = (label) =>
		page.evaluate((t) => {
			const el = [...document.querySelectorAll('button')].find((b) => b.innerText.trim().includes(t));
			if (!el) throw new Error(`no button with text: ${t}`);
			el.click();
		}, label);
	await domClick('Click to load audio');
	await sleep(1500);

	// ---- 1. Download held: nothing moves -> Retry after ~2 minutes (real limit)
	mode = 'stall';
	await domClick('Transcribe audio');
	const t0 = Date.now();
	let retryAt = null;
	let t;
	for (let i = 0; i < 200; i++) {
		await sleep(1000);
		t = await text(page);
		if (/Retry/.test(t)) {
			retryAt = (Date.now() - t0) / 1000;
			break;
		}
	}
	ok('stall: nothing is stopped before the 2-minute limit', retryAt !== null && retryAt > 100, `retry after ${retryAt && retryAt.toFixed(0)}s`);
	ok('stall: Retry appears about 2 minutes after the last progress', retryAt !== null && retryAt < 160);
	ok('stall: clear message shown', /The model download stalled\. Check your internet connection and try again\./.test(t ?? ''));

	// ---- 2. Slow but moving: must NOT be stopped (limit shortened to 20 s here)
	await page.evaluate(() => localStorage.setItem('wbr-model-stall-ms', '20000'));
	mode = 'slow';
	await domClick('Retry');
	await sleep(1500);
	let stoppedWhileSlow = false;
	for (let i = 0; i < 60; i++) {
		await sleep(1000);
		if (/Retry/.test(await text(page))) stoppedWhileSlow = true;
	}
	const slowText = await text(page);
	ok('slow: a download that keeps moving is not stopped (60 s with a 20 s limit)', !stoppedWhileSlow && /Loading AI model/.test(slowText), (slowText.match(/Loading AI model[^A-Z]{0,20}/) || [''])[0]);

	// ---- 3. Moving, then stuck again -> detected after the (shortened) limit
	mode = 'stall';
	let stalledAgain = false;
	for (let i = 0; i < 60; i++) {
		await sleep(1000);
		if (/Retry/.test(await text(page))) {
			stalledAgain = true;
			break;
		}
	}
	ok('stall after progress: stopped once nothing moves for the limit', stalledAgain);

	// ---- 4. Server back to normal: Retry works (parts already cached are reused)
	await page.evaluate(() => localStorage.removeItem('wbr-model-stall-ms'));
	mode = 'normal';
	await domClick('Retry');
	let ready = false;
	for (let i = 0; i < 300; i++) {
		await sleep(1000);
		const now = await text(page);
		if (/Transcribing\.\.\./.test(now) || /\(No speech detected\)/.test(now) || /Transcription/.test(now)) {
			ready = true;
			break;
		}
		if (/Retry/.test(now)) break;
	}
	ok('retry: model loads once the server is back', ready);

	await app.close();
	for (const s of sockets) s.destroy();
	server.close();
})().catch((e) => {
	console.error('ERR', e.stack || e.message);
	for (const s of sockets) s.destroy();
	server.close();
	process.exit(1);
});
