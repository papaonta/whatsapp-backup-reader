// Optional helper: finds an installed Cryptomator app so the UI can offer a
// "Open Cryptomator" button when the chat storage (a vault) is not available.
// Cryptomator stays optional - nothing here installs, prompts for, stores or
// forwards anything (in particular never a vault password).
const fs = require('node:fs');
const path = require('node:path');

/**
 * @param {{ platform?: string, env?: Record<string, string | undefined>,
 *   override?: string | undefined }} [options] `override` replaces the standard
 *   locations (tests only).
 * @returns {string | null} absolute path of the Cryptomator app, or null
 */
function findCryptomator({
	platform = process.platform,
	env = process.env,
	override,
} = {}) {
	let candidates;
	if (override !== undefined) {
		candidates = [override];
	} else if (platform === 'darwin') {
		candidates = ['/Applications/Cryptomator.app'];
	} else if (platform === 'win32') {
		// Windows paths are untested (development happens on macOS).
		candidates = [env.ProgramFiles, env['ProgramFiles(x86)']]
			.filter(Boolean)
			.map((dir) => path.join(dir, 'Cryptomator', 'Cryptomator.exe'));
	} else {
		candidates = [];
	}
	return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

module.exports = { findCryptomator };
