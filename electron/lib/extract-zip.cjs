const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const {
	locateCentralDirectory,
	readCentralDirectoryEntries,
	recoverOrphanEntries,
	readLocalFileHeader,
	extractEntryToFile,
} = require('./zip-reader.cjs');

const EXTRACTION_ROOT_NAME = 'extracted-chats';
const MEDIA_DIR_NAME = 'media';
const MANIFEST_FILENAME = 'manifest.json';

function getExtractionRoot(app) {
	return path.join(app.getPath('userData'), EXTRACTION_ROOT_NAME);
}

function isValidExtractionId(id) {
	return typeof id === 'string' && /^[a-zA-Z0-9-]+$/.test(id);
}

// Resolves `candidate` (a path that should live under `root`) and validates
// it doesn't escape `root` via traversal or symlinks. Mirrors the rigor of
// main.cjs's existing file:readFromPath handler.
async function resolveWithinRoot(root, candidate) {
	const resolvedRoot = path.resolve(root);
	const resolved = path.resolve(candidate);
	if (
		resolved !== resolvedRoot &&
		!resolved.startsWith(resolvedRoot + path.sep)
	) {
		throw new Error('Path escapes extraction root');
	}
	return resolved;
}

/**
 * Streams every entry of a ZIP file to disk under
 * `{extractionRoot}/{extractionId}/media/`, without loading the archive (or
 * any entry) fully into memory. No classification of "which entry is the
 * chat file" happens here - that stays in the renderer, reusing the same
 * logic that already parses in-memory ZIPs, to avoid maintaining two
 * implementations of that (non-trivial, still-evolving) heuristic.
 *
 * Uses the custom reader in zip-reader.cjs rather than a general-purpose
 * zip library: real WhatsApp iOS exports of large chats have been found
 * with a declared entry count higher than what's actually in the central
 * directory, and the "missing" entries - including the chat transcript
 * itself - usually still have their data intact in the archive body with
 * just their central directory record missing. Every library tried
 * (yauzl, yauzl-promise, unzipper) treats this as fatal corruption and
 * gives up; zip-reader.cjs's central-directory-size-driven walk plus
 * orphan-recovery pass reads every real entry, including recovering the
 * ones libraries would silently drop the import over. See zip-reader.cjs's
 * module docstring for the full diagnosis.
 *
 * @param {{ zipPath: string, extractionId: string, extractionRoot: string,
 *   onProgress?: (p: { filesProcessed: number, totalFiles: number,
 *     bytesProcessed: number, totalBytes: number, progress: number }) => void,
 *   signal?: AbortSignal }} params
 * @returns {Promise<{ extractionDir: string, originalFileName: string,
 *   entries: { name: string, path: string, size: number }[] }>}
 */
async function extractZipToDirectory({
	zipPath,
	extractionId,
	extractionRoot,
	onProgress,
	signal,
}) {
	if (!isValidExtractionId(extractionId)) {
		throw new Error('Invalid extraction id');
	}

	const extractionDir = await resolveWithinRoot(
		extractionRoot,
		path.join(extractionRoot, extractionId),
	);
	const mediaDir = path.join(extractionDir, MEDIA_DIR_NAME);
	await fs.promises.mkdir(mediaDir, { recursive: true });

	const throwIfAborted = () => {
		if (signal?.aborted) throw new Error('Extraction cancelled');
	};

	const resolveDestPath = async (fileName) => {
		const destPath = path.join(mediaDir, fileName);
		const resolvedDest = await resolveWithinRoot(mediaDir, destPath);
		await fs.promises.mkdir(path.dirname(resolvedDest), { recursive: true });
		return resolvedDest;
	};

	let fileHandle;
	try {
		fileHandle = await fs.promises.open(zipPath, 'r');
		const stat = await fileHandle.stat();
		const location = await locateCentralDirectory(fileHandle, stat.size);

		// declaredEntryCount is only a hint for the progress denominator - it
		// can be (and, for the exact bug this reader exists to work around,
		// sometimes is) inaccurate. Progress just degrades to a less precise
		// percentage if so; it doesn't affect correctness.
		const totalFiles = Math.max(location.declaredEntryCount, 1);
		const entries = [];
		let filesProcessed = 0;
		let lastProgressEmit = 0;

		const emitProgress = (force) => {
			const now = Date.now();
			if (!force && now - lastProgressEmit < 250) return;
			lastProgressEmit = now;
			onProgress?.({
				filesProcessed,
				totalFiles,
				progress: Math.min(100, (filesProcessed / totalFiles) * 100),
			});
		};

		let lastEntry = null;
		for await (const entry of readCentralDirectoryEntries(
			fileHandle,
			location,
		)) {
			throwIfAborted();
			if (entry.isDirectory) continue;

			const resolvedDest = await resolveDestPath(entry.fileName);
			await extractEntryToFile(fileHandle, zipPath, entry, resolvedDest);

			entries.push({
				name: entry.fileName.split('/').pop() || entry.fileName,
				path: entry.fileName,
				size: entry.uncompressedSize,
			});

			if (!lastEntry || entry.localHeaderOffset > lastEntry.localHeaderOffset) {
				lastEntry = entry;
			}

			filesProcessed++;
			emitProgress(false);
		}

		// Recover entries whose central directory record is missing but
		// whose data is still present in the gap between the last
		// central-directory-listed entry and where the central directory
		// begins (see zip-reader.cjs). No-op (gapStart === gapEnd) for
		// well-formed zips with no such gap.
		if (lastEntry) {
			const { dataStart } = await readLocalFileHeader(
				fileHandle,
				lastEntry.localHeaderOffset,
			);
			const gapStart = dataStart + lastEntry.compressedSize;
			const gapEnd = location.centralDirectoryOffset;

			const recovered = await recoverOrphanEntries(
				fileHandle,
				zipPath,
				gapStart,
				gapEnd,
				resolveDestPath,
				() => {
					filesProcessed++;
					emitProgress(false);
				},
			);
			entries.push(...recovered);
		}

		emitProgress(true);

		const manifest = {
			originalFileName: path.basename(zipPath),
			entries,
			extractedAt: new Date().toISOString(),
		};
		await fs.promises.writeFile(
			path.join(extractionDir, MANIFEST_FILENAME),
			JSON.stringify(manifest),
			'utf-8',
		);

		return {
			extractionDir,
			originalFileName: manifest.originalFileName,
			entries,
		};
	} catch (error) {
		await fs.promises
			.rm(extractionDir, { recursive: true, force: true })
			.catch(() => {});
		throw error;
	} finally {
		await fileHandle?.close().catch(() => {});
	}
}

async function loadManifest(extractionDir) {
	const manifestPath = path.join(extractionDir, MANIFEST_FILENAME);
	const raw = await fs.promises.readFile(manifestPath, 'utf-8');
	const manifest = JSON.parse(raw);
	return {
		extractionDir,
		originalFileName: manifest.originalFileName,
		entries: manifest.entries,
	};
}

async function deleteExtractionDir(extractionRoot, extractionDir) {
	const resolved = await resolveWithinRoot(extractionRoot, extractionDir);
	await fs.promises.rm(resolved, { recursive: true, force: true });
}

async function pruneOrphans(extractionRoot, keepExtractionIds) {
	const validKeepIds = new Set(
		keepExtractionIds.filter((id) => isValidExtractionId(id)),
	);
	let dirEntries;
	try {
		dirEntries = await fs.promises.readdir(extractionRoot, {
			withFileTypes: true,
		});
	} catch (error) {
		if (error.code === 'ENOENT') return { removed: [] };
		throw error;
	}

	const removed = [];
	for (const dirEntry of dirEntries) {
		if (!dirEntry.isDirectory()) continue;
		if (validKeepIds.has(dirEntry.name)) continue;
		if (!isValidExtractionId(dirEntry.name)) continue;
		const target = path.join(extractionRoot, dirEntry.name);
		await fs.promises.rm(target, { recursive: true, force: true });
		removed.push(dirEntry.name);
	}
	return { removed };
}

// Mirrors src/lib/parser/zip-parser.ts's getMimeType() - kept as a small,
// independently duplicated table rather than shared build tooling between
// the main process (CJS) and the renderer (TS/Vite).
function getMimeType(filename) {
	const ext = filename.toLowerCase().split('.').pop() || '';
	const mimeTypes = {
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		png: 'image/png',
		gif: 'image/gif',
		webp: 'image/webp',
		bmp: 'image/bmp',
		svg: 'image/svg+xml',
		mp4: 'video/mp4',
		mov: 'video/quicktime',
		avi: 'video/x-msvideo',
		mkv: 'video/x-matroska',
		'3gp': 'video/3gpp',
		webm: 'video/webm',
		opus: 'audio/opus',
		mp3: 'audio/mpeg',
		wav: 'audio/wav',
		aac: 'audio/aac',
		m4a: 'audio/mp4',
		ogg: 'audio/ogg',
		pdf: 'application/pdf',
		txt: 'text/plain',
		xml: 'application/xml',
		vcf: 'text/vcard',
	};
	return mimeTypes[ext] || 'application/octet-stream';
}

// Resolves and validates a media:// request's <extractionId>/<relPath> down
// to an absolute file path, or returns null if invalid/unsafe/missing.
// Shared by the media:// protocol handler in main.cjs.
async function resolveMediaFilePath(extractionRoot, extractionId, relPath) {
	if (!isValidExtractionId(extractionId)) return null;
	if (relPath.split(/[/\\]+/).includes('..')) return null;

	const mediaDir = path.join(extractionRoot, extractionId, MEDIA_DIR_NAME);
	let resolved;
	try {
		resolved = await resolveWithinRoot(mediaDir, path.join(mediaDir, relPath));
	} catch {
		return null;
	}

	try {
		const lst = await fs.promises.lstat(resolved);
		if (!lst.isFile() || lst.isSymbolicLink()) return null;
	} catch {
		return null;
	}

	return resolved;
}

// Builds a Response for a validated on-disk media file, honoring a single
// "bytes=start-end" Range header with proper 206/Content-Range semantics.
// Deliberately does NOT use net.fetch('file://...', {headers:{Range}}):
// empirically (Electron 39) it slices the body correctly but returns 200
// with no Content-Range header, which <video>/<audio> elements need to
// seek correctly - fs.createReadStream gives full control over both.
async function buildMediaFileResponse(resolved, relPath, rangeHeader) {
	const stat = await fs.promises.stat(resolved);
	const totalSize = stat.size;

	let start = 0;
	let end = totalSize - 1;
	let status = 200;

	const match = rangeHeader && /^bytes=(\d+)-(\d*)$/.exec(rangeHeader);
	if (match) {
		start = Number.parseInt(match[1], 10);
		end = match[2] ? Number.parseInt(match[2], 10) : totalSize - 1;
		if (end > totalSize - 1) end = totalSize - 1;
		if (Number.isNaN(start) || start > end || start >= totalSize) {
			return new Response(null, {
				status: 416,
				headers: { 'Content-Range': `bytes */${totalSize}` },
			});
		}
		status = 206;
	}

	const nodeStream = fs.createReadStream(resolved, { start, end });
	const webStream = Readable.toWeb(nodeStream);

	const headers = new Headers({
		'Content-Type': getMimeType(relPath),
		'Accept-Ranges': 'bytes',
		'Content-Length': String(end - start + 1),
	});
	if (status === 206) {
		headers.set('Content-Range', `bytes ${start}-${end}/${totalSize}`);
	}

	return new Response(webStream, { status, headers });
}

module.exports = {
	EXTRACTION_ROOT_NAME,
	MEDIA_DIR_NAME,
	getExtractionRoot,
	isValidExtractionId,
	resolveWithinRoot,
	getMimeType,
	resolveMediaFilePath,
	buildMediaFileResponse,
	extractZipToDirectory,
	loadManifest,
	deleteExtractionDir,
	pruneOrphans,
};
