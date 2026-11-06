// Shared helpers for the Electron e2e tests. Every test runs the real app
// (dev mode) against an ISOLATED --user-data-dir under the OS temp folder -
// never the real app data.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { _electron } = require('playwright-core');

const repo = path.resolve(__dirname, '..', '..');
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
