/**
 * Runs the Electron e2e tests one after another against ISOLATED profiles
 * (under the OS temp folder, never the real app data). Starts the Vite dev
 * server itself if it isn't already running on port 5173.
 *
 *   npm run test:e2e                 all tests (~3-4 minutes)
 *   npm run test:e2e -- 03 04        only tests whose file name contains 03 or 04
 */
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const repo = path.resolve(__dirname, '..', '..');
const env = { ...process.env, NODE_ENV: 'development' };
delete env.ELECTRON_RUN_AS_NODE;

const probe = spawnSync(process.execPath, ['-p', "require('electron')"], {
	cwd: repo,
	env,
	encoding: 'utf-8',
});
if (probe.status !== 0) {
	console.error('Electron is not installed correctly. Run: node node_modules/electron/install.js');
	process.exit(1);
}

const isUp = () =>
	new Promise((resolve) => {
		const req = http.get({ host: '127.0.0.1', port: 5173, path: '/' }, (res) => {
			res.resume();
			resolve(res.statusCode === 200);
		});
		req.on('error', () => resolve(false));
		req.setTimeout(1000, () => {
			req.destroy();
			resolve(false);
		});
	});

const filters = process.argv.slice(2);
const tests = fs
	.readdirSync(__dirname)
	.filter((f) => /^\d\d-.*\.cjs$/.test(f))
	.filter((f) => filters.length === 0 || filters.some((x) => f.includes(x)))
	.sort();

const runTest = (file) =>
	new Promise((resolve) => {
		const child = spawn(process.execPath, [path.join(__dirname, file)], {
			cwd: repo,
			env,
		});
		let failed = false;
		const onData = (chunk) => {
			const text = chunk.toString();
			if (/^FAIL /m.test(text) || /^ERR /m.test(text)) failed = true;
			process.stdout.write(text);
		};
		child.stdout.on('data', onData);
		child.stderr.on('data', onData);
		child.on('exit', (code) => resolve(failed || code !== 0));
	});

async function main() {
	let vite;
	if (!(await isUp())) {
		console.log('Starting the dev server...');
		vite = spawn(process.execPath, [path.join(repo, 'node_modules', 'vite', 'bin', 'vite.js'), 'dev'], {
			cwd: repo,
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
	}

	let failures = 0;
	for (const file of tests) {
		console.log(`\n=== ${file}`);
		if (await runTest(file)) failures++;
	}
	if (vite) vite.kill();
	console.log(failures === 0 ? '\nAll e2e tests passed.' : `\n${failures} test file(s) FAILED.`);
	process.exit(failures === 0 ? 0 : 1);
}

main();
