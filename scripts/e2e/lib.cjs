// Shared helpers for the Electron e2e tests. Every test runs the real app
// (dev mode) against an ISOLATED --user-data-dir under the OS temp folder -
// never the real app data.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { _electron } = require('playwright-core');

const repo = path.resolve(__dirname, '..', '..');

// Safety: the tests write large temporary files and rename/delete folders.
// Never run them with a temp folder on a vault or virtual/external drive.
function assertTempIsLocal() {
	const tmp = fs.realpathSync(os.tmpdir());
	let bad = null;
	if (process.platform === 'win32') {
		const systemDrive = (process.env.SystemDrive || 'C:').toLowerCase();
		if (path.parse(tmp).root.slice(0, 2).toLowerCase() !== systemDrive) {
			bad = 'the temp folder is not on the system drive';
		}
	} else if (tmp.startsWith('/Volumes/') || tmp.startsWith('/media/') || tmp.startsWith('/mnt/')) {
		bad = 'the temp folder is on a mounted volume';
	}
	if (!bad && /cryptomator/i.test(tmp)) bad = 'the temp folder looks like a Cryptomator vault';
	if (bad) {
		console.error(`ERR Refusing to run e2e tests: ${bad} (${tmp}). Set TMPDIR/TEMP to a normal local folder.`);
		process.exit(1);
	}
}
assertTempIsLocal();

const S = path.join(os.tmpdir(), 'whats-reader-e2e');
fs.mkdirSync(path.join(S, 'zips'), { recursive: true });
// Sample export used by the tests (copied so tests may move/rename it).
fs.copyFileSync(
	path.join(repo, 'examples', 'chats', 'ios-private-chat.zip'),
	path.join(S, 'zips', 'ios-private-chat.zip'),
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function launch(profile) {
	const env = { ...process.env, NODE_ENV: 'development' };
	// Set by some terminals/editors; would make Electron start as plain Node.
	delete env.ELECTRON_RUN_AS_NODE;
	const app = await _electron.launch({
		cwd: repo,
		args: ['.', `--user-data-dir=${profile}`],
		env,
	});
	let page;
	for (let i = 0; i < 40; i++) {
		page = app
			.windows()
			.find((w) => w.url().startsWith('http://localhost:5173'));
		if (page) break;
		await sleep(500);
	}
	if (!page) throw new Error('no app window');
	await page.waitForLoadState('domcontentloaded');
	return { app, page };
}

module.exports = { launch, sleep, S };
