// Shared helpers for the chat-storage e2e tests (07, 08). Not a test itself.
const fs = require('node:fs');
const path = require('node:path');
const { launch, sleep, S } = require('./lib.cjs');

const ok = (name, cond, detail = '') =>
	console.log(cond ? 'PASS' : 'FAIL', name, detail);
const ZIP = `${S}/zips/ios-private-chat.zip`;
const MARKER = '.whatsreader-storage';

const text = async (page) =>
	(await page.locator('body').innerText()).replace(/\s+/g, ' ');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf-8'));
const writeJson = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2));
const cfgOf = (P) => `${P}/chat-storage.json`;
const rootOf = (P) => `${P}/extracted-chats`;

// Deep listing "relative/path:size" (dotfiles included) for before/after checks.
function tree(dir, skip = []) {
	const out = [];
	const walk = (d, rel) => {
		for (const name of fs.readdirSync(d).sort()) {
			if (skip.includes(name) && rel === '') continue;
			const full = path.join(d, name);
			const st = fs.lstatSync(full);
			if (st.isDirectory()) walk(full, `${rel}${name}/`);
			else out.push(`${rel}${name}:${st.size}`);
		}
	};
	walk(dir, '');
	return out.join('\n');
}

const stubOpen = (app) =>
	app.evaluate(({ ipcMain }, zip) => {
		ipcMain.removeHandler('dialog:openFile');
		ipcMain.handle('dialog:openFile', async () => ({
			path: zip,
			name: zip.split('/').pop(),
		}));
	}, ZIP);
const stubFolder = (app, dir) =>
	app.evaluate(({ ipcMain }, d) => {
		ipcMain.removeHandler('dialog:openFolder');
		ipcMain.handle('dialog:openFolder', async () => d);
	}, dir);

// One imported chat, made once and cloned per scenario (fast + identical).
async function makeSeed(base) {
	const P = `${base}/seed`;
	fs.rmSync(base, { recursive: true, force: true });
	fs.mkdirSync(base, { recursive: true });
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
	await stubOpen(app);
	await page.getByText('click to browse').first().click();
	await sleep(9000);
	await app.close();
	await sleep(1000);
	return P;
}

function clone(seed, base, name) {
	const P = `${base}/${name}`;
	fs.cpSync(seed, P, { recursive: true });
	const cfg = readJson(cfgOf(P));
	cfg.root = rootOf(P);
	writeJson(cfgOf(P), cfg);
	return P;
}

const chatIdIn = (root) =>
	fs.readdirSync(root).find((n) => !n.startsWith('.') && !n.includes('.'));

const banner = (page) => page.locator('[data-testid=chat-storage-banner]');
async function waitBanner(page, visible, ms = 10000) {
	const start = Date.now();
	while (Date.now() - start < ms) {
		if ((await banner(page).count()) > 0 === visible) return true;
		await sleep(200);
	}
	return false;
}
const focusEvent = (page) =>
	page.evaluate(() => window.dispatchEvent(new Event('focus')));

// Everything that writes must refuse; reading depends on the state.
const attempts = (page, id) =>
	page.evaluate(
		async ({ zip, id }) => {
			const x = window.electronAPI.extraction;
			const c = window.electronAPI.chatStorage;
			return {
				extract: await x.extract(zip, 'zz-attempt'),
				merged: await x.createMergedChat('zz-merged', 'a.txt', 'hi', []),
				del: await x.deleteDir(id),
				list: await x.listOrphans([]),
				delo: await x.deleteOrphans(['abc-1'], []),
				plan: await c.planMove({ toDefault: true }),
				planDir: await c.planMove({ dir: '/tmp' }),
			};
		},
		{ zip: ZIP, id },
	);
const allRefused = (a) =>
	a.extract.success === false &&
	a.merged.success === false &&
	a.del.success === false &&
	a.list.success === false &&
	a.delo.success === false &&
	a.plan.success === false &&
	a.planDir.success === false;

async function openSettings(page) {
	await page.locator('button[title="Settings"]:visible').first().click();
	await sleep(1500);
}
async function waitMessage(page, re, ms = 30000) {
	const start = Date.now();
	while (Date.now() - start < ms) {
		const t = await text(page);
		if (re.test(t)) return t;
		await sleep(300);
	}
	return await text(page);
}


module.exports = {
	ok,
	ZIP,
	MARKER,
	text,
	readJson,
	writeJson,
	cfgOf,
	rootOf,
	tree,
	stubOpen,
	stubFolder,
	makeSeed,
	clone,
	chatIdIn,
	banner,
	waitBanner,
	focusEvent,
	attempts,
	allRefused,
	openSettings,
	waitMessage,
};
