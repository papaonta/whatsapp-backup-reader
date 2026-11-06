// Where the extracted chat data ("chat storage") lives, and whether it can be
// trusted right now.
//
// Terms: "chat data" = the extracted-chats folders (one per imported chat).
// "App database" (IndexedDB / localStorage in userData) is NOT part of this and
// is never moved. This has nothing to do with the "archive chat" feature.
//
// Rule of thumb: IF IN DOUBT, DO NOTHING. A custom location (e.g. a Cryptomator
// vault) is never created, never given a marker automatically, and nothing is
// written, deleted or re-extracted while it is not available.
//
// Files:
//   userData/chat-storage.json   { version, root, storageId, installId }
//   <root>/.whatsreader-storage  { storageId, installId, createdAt }
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pipeline } = require('node:stream/promises');
const {
	EXTRACTION_ROOT_NAME,
	isValidExtractionId,
} = require('./extract-zip.cjs');

const MARKER_NAME = '.whatsreader-storage';
const CONFIG_NAME = 'chat-storage.json';
const CONFIG_VERSION = 1;
// Free space we want left over on the destination on top of the data itself.
const FREE_SPACE_MARGIN_BYTES = 64 * 1024 * 1024;

const uuid = () => crypto.randomUUID();

// Case-insensitive on Windows and macOS (their default file systems are).
const normalizeForCompare = (p) =>
	process.platform === 'linux' ? p : p.toLowerCase();

function isSameOrInside(parent, child) {
	const a = normalizeForCompare(path.resolve(parent));
	const b = normalizeForCompare(path.resolve(child));
	if (a === b) return true;
	const rel = path.relative(a, b);
	return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

async function realpathOrResolve(p) {
	try {
		return await fs.promises.realpath(p);
	} catch {
		return path.resolve(p);
	}
}

// Recursive stats (regular files only; symlinks are neither copied nor counted).
async function scanTree(dir) {
	let files = 0;
	let bytes = 0;
	const entries = await fs.promises.readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			const sub = await scanTree(full);
			files += sub.files;
			bytes += sub.bytes;
		} else if (entry.isFile()) {
			files += 1;
			bytes += (await fs.promises.stat(full)).size;
		}
	}
	return { files, bytes };
}

async function copyTree(src, dest, ctx) {
	await fs.promises.mkdir(dest, { recursive: true });
	const entries = await fs.promises.readdir(src, { withFileTypes: true });
	for (const entry of entries) {
		if (ctx.signal.aborted) throw new Error('Move cancelled');
		const from = path.join(src, entry.name);
		const to = path.join(dest, entry.name);
		if (entry.isDirectory()) {
			await copyTree(from, to, ctx);
		} else if (entry.isFile()) {
			const stat = await fs.promises.stat(from);
			const read = fs.createReadStream(from);
			read.on('data', (chunk) => ctx.addBytes(chunk.length));
			// 'wx': never overwrite anything that is already at the destination.
			await pipeline(read, fs.createWriteStream(to, { flags: 'wx' }), {
				signal: ctx.signal,
			});
			const written = await fs.promises.stat(to);
			if (written.size !== stat.size) {
				throw new Error(`Size mismatch after copying ${entry.name}`);
			}
			await fs.promises.utimes(to, stat.atime, stat.mtime).catch(() => {});
		}
	}
}

function createChatStorage(userDataDir, { isBusy = () => false } = {}) {
	const configPath = path.join(userDataDir, CONFIG_NAME);
	const defaultRoot = path.join(userDataDir, EXTRACTION_ROOT_NAME);
	let config = null;
	let configProblem = false;
	let moving = null; // { controller } while a move runs
	let lastStatus = null;

	const readConfigFile = () => {
		try {
			const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
			if (
				parsed &&
				parsed.version === CONFIG_VERSION &&
				typeof parsed.root === 'string' &&
				path.isAbsolute(parsed.root) &&
				typeof parsed.storageId === 'string' &&
				typeof parsed.installId === 'string'
			) {
				return { config: parsed, problem: false };
			}
			return { config: null, problem: true };
		} catch (error) {
			if (error.code === 'ENOENT') return { config: null, problem: false };
			return { config: null, problem: true };
		}
	};

	// Atomic: a half-written config would otherwise lose the storage location.
	const writeConfigFile = (next) => {
		const tmp = `${configPath}.tmp`;
		fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf-8');
		fs.renameSync(tmp, configPath);
		config = next;
		configProblem = false;
	};

	async function readMarker(root) {
		try {
			const raw = await fs.promises.readFile(
				path.join(root, MARKER_NAME),
				'utf-8',
			);
			const parsed = JSON.parse(raw);
			if (
				parsed &&
				typeof parsed.storageId === 'string' &&
				typeof parsed.installId === 'string'
			) {
				return { marker: parsed };
			}
			return { error: 'bad-marker' };
		} catch (error) {
			if (error.code === 'ENOENT') return { error: 'no-marker' };
			if (error instanceof SyntaxError) return { error: 'bad-marker' };
			return { error: 'unreadable' };
		}
	}

	const writeMarker = (root, marker) =>
		// 'wx': an existing marker is never overwritten.
		fs.promises.writeFile(
			path.join(root, MARKER_NAME),
			JSON.stringify(marker, null, 2),
			{ encoding: 'utf-8', flag: 'wx' },
		);

	const getRoot = () => (config ? config.root : defaultRoot);
	const realOrResolved = (p) => {
		try {
			return fs.realpathSync(p);
		} catch {
			return path.resolve(p);
		}
	};
	const isDefaultRoot = (root) =>
		normalizeForCompare(realOrResolved(root)) ===
		normalizeForCompare(realOrResolved(defaultRoot));

	const buildStatus = (state, reason) => {
		const root = getRoot();
		const status = {
			state, // 'ok' | 'unavailable' | 'foreign' | 'other-install'
			reason: reason ?? null,
			root,
			defaultRoot,
			isDefault: isDefaultRoot(root),
			canRead: state === 'ok' || state === 'other-install',
			canWrite: state === 'ok' && !moving,
			moving: !!moving,
			checkedAt: Date.now(),
		};
		lastStatus = status;
		return status;
	};

	/**
	 * Runs once at startup, before any window exists. Only ever touches the
	 * DEFAULT location (inside userData, never a vault): first run / upgrade
	 * from a version without a marker. A custom location is never touched.
	 */
	async function init() {
		const read = readConfigFile();
		config = read.config;
		configProblem = read.problem;
		if (configProblem) return;

		if (!config) {
			// First launch of a version with this feature (or a fresh install).
			try {
				await fs.promises.mkdir(defaultRoot, { recursive: true });
				await fs.promises.readdir(defaultRoot);
			} catch {
				return; // can't read the default folder: stay quiet, retry next launch
			}
			const existing = await readMarker(defaultRoot);
			let marker = existing.marker;
			if (!marker) {
				if (existing.error !== 'no-marker') return;
				marker = {
					storageId: uuid(),
					installId: uuid(),
					createdAt: new Date().toISOString(),
				};
				await writeMarker(defaultRoot, marker);
			}
			writeConfigFile({
				version: CONFIG_VERSION,
				root: defaultRoot,
				storageId: marker.storageId,
				installId: marker.installId,
			});
			return;
		}

		// Config exists and points at the default folder, which is readable but
		// lost its marker: restore it. (Never for a custom location, and never
		// when the folder itself is missing.)
		if (isDefaultRoot(config.root)) {
			try {
				await fs.promises.readdir(config.root);
			} catch {
				return;
			}
			const existing = await readMarker(config.root);
			if (existing.error === 'no-marker') {
				await writeMarker(config.root, {
					storageId: config.storageId,
					installId: config.installId,
					createdAt: new Date().toISOString(),
				}).catch(() => {});
			}
		}
	}

	/** Read-only check of the current storage; never creates or changes anything. */
	async function getStatus() {
		if (configProblem) return buildStatus('unavailable', 'config-unreadable');
		if (!config) return buildStatus('unavailable', 'no-config');
		const root = config.root;
		try {
			const dir = await fs.promises.opendir(root);
			await dir.close();
		} catch (error) {
			return buildStatus(
				'unavailable',
				error.code === 'ENOENT' ? 'missing' : 'unreadable',
			);
		}
		const { marker, error } = await readMarker(root);
		if (!marker) {
			// A custom folder without our marker is not "our" storage - most likely
			// an empty mount point of a locked vault. Never adopt it.
			return buildStatus('unavailable', error);
		}
		if (marker.storageId !== config.storageId) {
			return buildStatus('foreign', 'wrong-storage');
		}
		if (marker.installId !== config.installId) {
			return buildStatus('other-install', 'other-install');
		}
		return buildStatus('ok');
	}

	async function requireWritable() {
		const status = await getStatus();
		if (!status.canWrite) {
			const error = new Error(
				status.moving
					? 'Chat storage is being moved'
					: 'Chat storage is not available',
			);
			error.code = 'CHAT_STORAGE_UNAVAILABLE';
			throw error;
		}
		return status;
	}

	async function listChatDirs(root) {
		const entries = await fs.promises.readdir(root, { withFileTypes: true });
		return entries
			.filter((e) => e.isDirectory() && isValidExtractionId(e.name))
			.map((e) => e.name)
			.sort();
	}

	/** Checks a move/restore-default target and sizes the data. Read-only. */
	async function planMove({ toDefault, dir }) {
		const status = await getStatus();
		if (!status.canWrite) {
			return { success: false, reason: 'not-writable' };
		}
		if (isBusy()) return { success: false, reason: 'busy' };

		let dest;
		if (toDefault) {
			if (status.isDefault)
				return { success: false, reason: 'already-default' };
			dest = defaultRoot;
		} else {
			if (typeof dir !== 'string' || !path.isAbsolute(dir)) {
				return { success: false, reason: 'invalid-destination' };
			}
			dest = path.resolve(dir);
		}

		const source = status.root;
		const realSource = await realpathOrResolve(source);
		const realDest = await realpathOrResolve(dest);
		if (
			isSameOrInside(realSource, realDest) ||
			isSameOrInside(realDest, realSource)
		) {
			return { success: false, reason: 'same-or-nested' };
		}

		// The destination must already exist and be empty. Only the app's own
		// default folder may be created by us.
		let destExists = true;
		try {
			const stat = await fs.promises.stat(dest);
			if (!stat.isDirectory()) {
				return { success: false, reason: 'destination-missing' };
			}
		} catch (error) {
			if (error.code === 'ENOENT' && toDefault) destExists = false;
			else return { success: false, reason: 'destination-missing' };
		}
		if (destExists) {
			try {
				const names = await fs.promises.readdir(dest);
				if (names.length > 0) {
					return { success: false, reason: 'destination-not-empty' };
				}
			} catch {
				return { success: false, reason: 'destination-unreadable' };
			}
		}

		let ids;
		let totalBytes = 0;
		let fileCount = 0;
		try {
			ids = await listChatDirs(source);
			for (const id of ids) {
				const s = await scanTree(path.join(source, id));
				totalBytes += s.bytes;
				fileCount += s.files;
			}
		} catch {
			return { success: false, reason: 'not-writable' };
		}

		// Free space. If the file system can't tell (some virtual drives), the
		// move is still allowed but the UI says the check wasn't possible.
		let freeBytes = null;
		if (typeof fs.promises.statfs === 'function') {
			let probe = dest;
			while (!destExists && !fs.existsSync(probe)) {
				const parent = path.dirname(probe);
				if (parent === probe) break;
				probe = parent;
			}
			try {
				const st = await fs.promises.statfs(probe);
				freeBytes = Number(st.bavail) * Number(st.bsize);
			} catch {
				freeBytes = null;
			}
		}
		if (
			freeBytes !== null &&
			freeBytes < totalBytes + FREE_SPACE_MARGIN_BYTES
		) {
			return {
				success: false,
				reason: 'not-enough-space',
				totalBytes,
				freeBytes,
			};
		}

		return {
			success: true,
			destination: dest,
			source,
			chatCount: ids.length,
			fileCount,
			totalBytes,
			freeBytes,
		};
	}

	/**
	 * Copies every chat folder to the destination, verifies file count and
	 * size per folder, writes the marker, and only then switches the config.
	 * The old folder is never touched. On failure/cancel only what THIS attempt
	 * wrote is removed and the config is unchanged.
	 */
	async function move({ toDefault, dir }, onProgress) {
		if (moving) return { success: false, reason: 'busy' };
		const plan = await planMove({ toDefault, dir });
		if (!plan.success) return plan;

		const controller = new AbortController();
		moving = { controller };
		const dest = plan.destination;
		const source = plan.source;
		const created = [];
		let createdDest = false;
		let markerWritten = false;
		try {
			if (toDefault) {
				try {
					await fs.promises.stat(dest);
				} catch {
					await fs.promises.mkdir(dest, { recursive: true });
					createdDest = true;
				}
			}
			const ids = await listChatDirs(source);
			let bytesDone = 0;
			let lastEmit = 0;
			const emit = (force, extra) => {
				const now = Date.now();
				if (!force && now - lastEmit < 250) return;
				lastEmit = now;
				onProgress?.({
					bytesDone,
					totalBytes: plan.totalBytes,
					chatCount: ids.length,
					...extra,
				});
			};
			const ctx = {
				signal: controller.signal,
				addBytes: (n) => {
					bytesDone += n;
					emit(false, { chatIndex: ctx.chatIndex });
				},
				chatIndex: 0,
			};
			for (let i = 0; i < ids.length; i++) {
				const id = ids[i];
				ctx.chatIndex = i + 1;
				created.push(id);
				await copyTree(path.join(source, id), path.join(dest, id), ctx);
				const before = await scanTree(path.join(source, id));
				const after = await scanTree(path.join(dest, id));
				if (before.files !== after.files || before.bytes !== after.bytes) {
					throw new Error(`Verification failed for ${id}`);
				}
				emit(true, { chatIndex: i + 1 });
			}
			if (controller.signal.aborted) throw new Error('Move cancelled');

			const marker = {
				storageId: uuid(),
				installId: config.installId,
				createdAt: new Date().toISOString(),
			};
			await writeMarker(dest, marker);
			markerWritten = true;
			writeConfigFile({ ...config, root: dest, storageId: marker.storageId });
			return {
				success: true,
				oldRoot: source,
				newRoot: dest,
				chatCount: ids.length,
				bytes: plan.totalBytes,
			};
		} catch (error) {
			// Remove only what this attempt created. The destination was verified
			// empty when the attempt started, so these folders are ours.
			for (const id of created) {
				if (!isValidExtractionId(id)) continue;
				await fs.promises
					.rm(path.join(dest, id), { recursive: true, force: true })
					.catch(() => {});
			}
			if (markerWritten) {
				await fs.promises
					.rm(path.join(dest, MARKER_NAME), { force: true })
					.catch(() => {});
			}
			if (createdDest) await fs.promises.rmdir(dest).catch(() => {});
			return {
				success: false,
				cancelled: controller.signal.aborted,
				error: error instanceof Error ? error.message : String(error),
			};
		} finally {
			moving = null;
		}
	}

	function cancelMove() {
		if (!moving) return { success: false };
		moving.controller.abort();
		return { success: true };
	}

	/**
	 * Points the config at an existing storage folder, accepted only when its
	 * marker has OUR storageId. Copies and deletes nothing.
	 */
	async function reconnect(dir) {
		if (configProblem || !config)
			return { success: false, reason: 'no-config' };
		if (moving || isBusy()) return { success: false, reason: 'busy' };
		if (typeof dir !== 'string' || !path.isAbsolute(dir)) {
			return { success: false, reason: 'invalid-destination' };
		}
		const root = path.resolve(dir);
		const { marker, error } = await readMarker(root);
		if (!marker) return { success: false, reason: error };
		if (marker.storageId !== config.storageId) {
			return { success: false, reason: 'wrong-storage' };
		}
		writeConfigFile({ ...config, root });
		return { success: true, status: await getStatus() };
	}

	return {
		init,
		getStatus,
		requireWritable,
		planMove,
		move,
		cancelMove,
		reconnect,
		getRoot,
		getDefaultRoot: () => defaultRoot,
		// Last evaluated state, for hot paths (media:// requests).
		getLastStatus: () => lastStatus,
	};
}

module.exports = { createChatStorage, MARKER_NAME, CONFIG_NAME };
