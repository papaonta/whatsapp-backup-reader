// Optional "Open Cryptomator" button in the "chat storage not available"
// banner: only for a custom location AND an installed Cryptomator (detected in
// the main process; a stub path stands in for the real app here via
// WBR_CRYPTOMATOR_PATH). Windows detection (%ProgramFiles%\Cryptomator) is
// untested. The click only opens the app - no password is ever involved.
const fs = require('node:fs');
const { launch, sleep, S } = require('./lib.cjs');
const {
	ok,
	text,
	cfgOf,
	rootOf,
	makeSeed,
	clone: cloneIn,
	banner,
	waitBanner,
	focusEvent,
} = require('./storage-helpers.cjs');

const base = `${fs.realpathSync(S)}/cs3`;
const clone = (seed, name) => cloneIn(seed, base, name);
const BTN = 'Open Cryptomator';
const buttons = (page) => banner(page).getByRole('button', { name: BTN });

(async () => {
	const seed = await makeSeed(base);
	const stubApp = `${base}/Cryptomator.stub`;
	fs.writeFileSync(stubApp, 'stub');
	const missingApp = `${base}/not-installed/Cryptomator.stub`;

	// ---- custom location locked + Cryptomator "installed"
	{
		const P = clone(seed, 'custom');
		const V = `${base}/vault-root`;
		fs.mkdirSync(V);
		let { app, page } = await launch(P, { WBR_CRYPTOMATOR_PATH: stubApp });
		await sleep(5000);
		await page.evaluate((dir) => window.electronAPI.chatStorage.move({ dir }), V);
		await app.close();
		await sleep(1000);
		fs.renameSync(V, `${V}.LOCKED`);
		({ app, page } = await launch(P, { WBR_CRYPTOMATOR_PATH: stubApp }));
		await waitBanner(page, true);
		await sleep(1500);
		ok('cryptomator: button shown (custom location, app detected)', (await buttons(page).count()) === 1);
		// Record what would be opened instead of launching a real app.
		await app.evaluate(({ shell }) => {
			global.__opened = [];
			shell.openPath = async (p) => {
				global.__opened.push(p);
				return '';
			};
		});
		await buttons(page).click();
		await sleep(500);
		const opened = await app.evaluate(() => global.__opened);
		ok('cryptomator: click only opens the detected app (no arguments, no password)', opened.length === 1 && opened[0] === stubApp);
		// User unlocks the vault in Cryptomator, then comes back to the app.
		fs.renameSync(`${V}.LOCKED`, V);
		await focusEvent(page);
		const cleared = await waitBanner(page, false);
		await sleep(2500);
		const t = await text(page);
		ok('cryptomator: after unlocking, returning to the window restores the chat', cleared && /Alice/.test(t) && !/Tap to reopen/.test(t));
		await app.close();
	}

	// ---- default location unavailable: no button even if Cryptomator exists
	{
		const P = clone(seed, 'default');
		fs.renameSync(rootOf(P), `${rootOf(P)}.GONE`);
		const { app, page } = await launch(P, { WBR_CRYPTOMATOR_PATH: stubApp });
		const shown = await waitBanner(page, true);
		await sleep(1500);
		ok('cryptomator: no button for the default location', shown && (await buttons(page).count()) === 0);
		await app.close();
	}

	// ---- custom location locked, Cryptomator not installed: no button, no hint
	{
		const P = clone(seed, 'notinstalled');
		const cfg = JSON.parse(fs.readFileSync(cfgOf(P), 'utf-8'));
		cfg.root = `${base}/vault-gone`;
		fs.writeFileSync(cfgOf(P), JSON.stringify(cfg));
		const { app, page } = await launch(P, { WBR_CRYPTOMATOR_PATH: missingApp });
		const shown = await waitBanner(page, true);
		await sleep(1500);
		const bannerText = await banner(page).innerText();
		ok('cryptomator: no button and no install hint when it is not detected', shown && (await buttons(page).count()) === 0 && !/cryptomator/i.test(bannerText.replace('vault locked', '')));
		await app.close();
	}
})().catch((e) => {
	console.error('ERR', e.stack || e.message);
	process.exit(1);
});
