/**
 * Runs the desktop app in dev mode against an ISOLATED profile (separate
 * --user-data-dir), so it can be tested without a DMG build and without ever
 * touching the real app data.
 *
 *   npm run electron:dev:test          reuse ~/.whats-reader-test-profile
 *   npm run electron:dev:test:fresh    brand-new temporary profile
 */
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const fresh = process.argv.includes('--fresh');
const PORT = 5173;
const REAL_APP_NAMES = ['WhatsApp Backup Reader', 'whats-reader'];

const profileDir = fresh
	? fs.mkdtempSync(path.join(os.tmpdir(), 'whats-reader-test-'))
	: path.join(os.homedir(), '.whats-reader-test-profile');

// Never run against the real profile.
const realLocations = [
	path.join(os.homedir(), 'Library', 'Application Support'),
	process.env.APPDATA,
	path.join(os.homedir(), '.config'),
].filter(Boolean);
const resolvedProfile = path.resolve(profileDir);
const looksReal =
	REAL_APP_NAMES.some((name) => resolvedProfile.split(path.sep).includes(name)) ||
	realLocations.some((dir) => resolvedProfile.startsWith(path.resolve(dir) + path.sep));
if (looksReal) {
	console.error(`Refusing to use ${resolvedProfile}: it looks like real app data.`);
	process.exit(1);
}
fs.mkdirSync(resolvedProfile, { recursive: true });

// Electron must be installed, and ELECTRON_RUN_AS_NODE (set by some
// terminals/editors) would make it start as plain Node and crash.
const env = { ...process.env, NODE_ENV: 'development' };
delete env.ELECTRON_RUN_AS_NODE;
const probe = spawnSync(process.execPath, ['-p', "require('electron')"], {
	cwd: root,
	env,
	encoding: 'utf-8',
});
if (probe.status !== 0) {
	console.error(
		'Electron is not installed correctly. Run: node node_modules/electron/install.js',
	);
	process.exit(1);
}
const electronBinary = probe.stdout.trim();

const isUp = () =>
	new Promise((resolve) => {
		const req = http.get({ host: '127.0.0.1', port: PORT, path: '/' }, (res) => {
			res.resume();
			resolve(res.statusCode === 200);
		});
		req.on('error', () => resolve(false));
		req.setTimeout(1000, () => {
			req.destroy();
			resolve(false);
		});
	});

async function main() {
	let vite;
	if (!(await isUp())) {
		console.log('Starting the dev server...');
		// Run vite directly (not via `npm run dev`) so killing it really stops the server.
		vite = spawn(process.execPath, [require.resolve('vite/bin/vite.js'), 'dev'], {
			cwd: root,
			env,
			stdio: 'ignore',
		});
		const started = Date.now();
		while (!(await isUp())) {
			if (Date.now() - started > 60000) {
				console.error('Dev server did not start within 60s.');
				vite.kill();
				process.exit(1);
			}
			await new Promise((r) => setTimeout(r, 500));
		}
	} else {
		console.log(`Reusing the dev server already running on port ${PORT}.`);
	}

	console.log(`\nTest profile : ${resolvedProfile}`);
	console.log(`Archive folder: ${path.join(resolvedProfile, 'extracted-chats')}`);
	console.log('Your real app data is NOT used.\n');

	const electron = spawn(
		electronBinary,
		['.', `--user-data-dir=${resolvedProfile}`],
		{ cwd: root, env, stdio: 'inherit' },
	);
	const shutdown = () => {
		if (vite) vite.kill();
	};
	electron.on('exit', (code) => {
		shutdown();
		process.exit(code ?? 0);
	});
	for (const signal of ['SIGINT', 'SIGTERM']) {
		process.on(signal, () => {
			electron.kill();
			shutdown();
		});
	}
}

main();
