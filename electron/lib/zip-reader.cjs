/**
 * Minimal, purpose-built ZIP central-directory reader, with recovery for a
 * second, more severe bug also observed in real WhatsApp iOS exports.
 *
 * Bug 1 - bogus declared entry count: the EOCD/ZIP64 EOCD record's entry
 * count is higher than the number of entries actually present in the
 * central directory (observed: 5 entries on a 4.07GiB/1134-declared export,
 * 624 on a 6.15GiB/1850-declared export). Every general-purpose zip library
 * tried (yauzl, yauzl-promise, unzipper) treats this mismatch as fatal
 * corruption. It isn't: the central directory itself is complete and
 * internally consistent for what it does contain - walking it and stopping
 * once `centralDirectorySize` bytes are consumed (ignoring the declared
 * count) reads every real entry cleanly.
 *
 * Bug 2 - orphaned entries: the "missing" entries from bug 1 usually still
 * have their local file header + compressed data written into the archive
 * body (in the gap between the last central-directory-listed entry's data
 * and where the central directory begins) - only their central directory
 * *record* is missing, most likely because the export process ran out of
 * time/resources while writing the central directory listing, after having
 * already finished writing the file data itself. This includes the actual
 * chat transcript (_chat.txt) in both real exports this was diagnosed
 * against - without recovering it, the whole import is useless even though
 * the data was sitting right there. Recovery: scan that gap for additional
 * local file header signatures, then actually decompress each one found -
 * DEFLATE streams self-terminate, and `zlib`'s `.bytesWritten` reports
 * exactly how many input bytes really belonged to the stream, so this
 * correctly determines each recovered entry's true extent (and correctly
 * skips past coincidental signature matches nested inside another
 * recovered entry's own bytes - observed for recovered .pptx/.zip
 * attachments, which are themselves zip containers) instead of naively
 * bounding by wherever the next raw signature match happens to be.
 *
 * Scope is deliberately narrow: sequential full-archive extraction of
 * plain (unencrypted) DEFLATE or STORE entries, which is all a WhatsApp
 * export ever contains. No support for encryption, other compression
 * methods, or split archives.
 */

const fs = require('node:fs');
const zlib = require('node:zlib');
const { pipeline } = require('node:stream/promises');

const EOCD_SIGNATURE = 0x06054b50;
const EOCD_MIN_SIZE = 22;
const ZIP64_EOCD_LOCATOR_SIGNATURE = 0x07064b50;
const ZIP64_EOCD_LOCATOR_SIZE = 20;
const ZIP64_EOCD_SIGNATURE = 0x06064b50;
const CENTRAL_DIRECTORY_FILE_HEADER_SIGNATURE = 0x02014b50;
const CENTRAL_DIRECTORY_FILE_HEADER_SIZE = 46;
const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const LOCAL_FILE_HEADER_SIZE = 30;
const LOCAL_FILE_HEADER_SIGNATURE_BUFFER = Buffer.from([
	0x50, 0x4b, 0x03, 0x04,
]);
const ZIP64_EXTRA_FIELD_ID = 0x0001;
const MAX_COMMENT_LENGTH = 0xffff;
const MAX_ORPHAN_FILENAME_LENGTH = 500;
// Printable ASCII plus common Latin/CJK/emoji ranges - just enough to
// reject obvious false-positive signature matches inside binary media
// data, not a real filename validator (that happens naturally when the
// entry is actually extracted and used).
const PLAUSIBLE_FILENAME_REGEX = /^[\x20-\x7E -￿]+$/;

/**
 * Locates and parses the EOCD (and ZIP64 EOCD, if present) to find where
 * the central directory actually is. Does NOT trust the declared entry
 * count for anything beyond returning it as a hint.
 * @param {import('node:fs/promises').FileHandle} fileHandle
 * @param {number} fileSize
 * @returns {Promise<{ centralDirectoryOffset: number, centralDirectorySize: number, declaredEntryCount: number }>}
 */
async function locateCentralDirectory(fileHandle, fileSize) {
	const searchSize = Math.min(EOCD_MIN_SIZE + MAX_COMMENT_LENGTH, fileSize);
	const tail = Buffer.alloc(searchSize);
	await fileHandle.read(tail, 0, searchSize, fileSize - searchSize);

	let eocdOffsetInTail = -1;
	for (let i = tail.length - EOCD_MIN_SIZE; i >= 0; i--) {
		if (tail.readUInt32LE(i) === EOCD_SIGNATURE) {
			eocdOffsetInTail = i;
			break;
		}
	}
	if (eocdOffsetInTail === -1) {
		throw new Error(
			'Not a valid ZIP file: end of central directory record not found',
		);
	}

	const declaredEntryCount = tail.readUInt16LE(eocdOffsetInTail + 10);
	let centralDirectorySize = tail.readUInt32LE(eocdOffsetInTail + 12);
	let centralDirectoryOffset = tail.readUInt32LE(eocdOffsetInTail + 16);

	// Check for a ZIP64 EOCD Locator immediately before the EOCD record.
	const locatorOffsetInTail = eocdOffsetInTail - ZIP64_EOCD_LOCATOR_SIZE;
	if (
		locatorOffsetInTail >= 0 &&
		tail.readUInt32LE(locatorOffsetInTail) === ZIP64_EOCD_LOCATOR_SIGNATURE
	) {
		const zip64EocdOffsetLow = tail.readUInt32LE(locatorOffsetInTail + 8);
		const zip64EocdOffsetHigh = tail.readUInt32LE(locatorOffsetInTail + 12);
		const zip64EocdOffset = zip64EocdOffsetLow + zip64EocdOffsetHigh * 2 ** 32;

		const zip64Eocd = Buffer.alloc(56);
		await fileHandle.read(zip64Eocd, 0, 56, zip64EocdOffset);
		if (zip64Eocd.readUInt32LE(0) !== ZIP64_EOCD_SIGNATURE) {
			throw new Error(
				'Invalid ZIP64 end of central directory record signature',
			);
		}
		centralDirectorySize = Number(zip64Eocd.readBigUInt64LE(40));
		centralDirectoryOffset = Number(zip64Eocd.readBigUInt64LE(48));
	}

	return { centralDirectoryOffset, centralDirectorySize, declaredEntryCount };
}

// Parses a ZIP64 extra field (id 0x0001), overriding whichever of
// uncompressedSize/compressedSize/localHeaderOffset were sentinel values
// (0xFFFFFFFF) in the main 32-bit fields. Per spec, only the fields that
// are actually sentineled are present, in this fixed order.
function applyZip64ExtraField(entry, extraFieldsBuffer) {
	let cursor = 0;
	while (cursor + 4 <= extraFieldsBuffer.length) {
		const id = extraFieldsBuffer.readUInt16LE(cursor);
		const size = extraFieldsBuffer.readUInt16LE(cursor + 2);
		const dataStart = cursor + 4;
		if (id === ZIP64_EXTRA_FIELD_ID) {
			let i = dataStart;
			if (entry.uncompressedSize === 0xffffffff && i + 8 <= dataStart + size) {
				entry.uncompressedSize = Number(extraFieldsBuffer.readBigUInt64LE(i));
				i += 8;
			}
			if (entry.compressedSize === 0xffffffff && i + 8 <= dataStart + size) {
				entry.compressedSize = Number(extraFieldsBuffer.readBigUInt64LE(i));
				i += 8;
			}
			if (entry.localHeaderOffset === 0xffffffff && i + 8 <= dataStart + size) {
				entry.localHeaderOffset = Number(extraFieldsBuffer.readBigUInt64LE(i));
				i += 8;
			}
			return;
		}
		cursor = dataStart + size;
	}
}

/**
 * Walks the central directory starting at `centralDirectoryOffset`,
 * yielding one entry per record, and stops as soon as
 * `centralDirectorySize` bytes have been consumed - regardless of how
 * many entries that turns out to be (see module docstring, Bug 1).
 * @param {import('node:fs/promises').FileHandle} fileHandle
 * @param {{ centralDirectoryOffset: number, centralDirectorySize: number }} location
 * @yields {{ fileName: string, compressedSize: number, uncompressedSize: number,
 *   compressionMethod: number, localHeaderOffset: number, isDirectory: boolean }}
 */
async function* readCentralDirectoryEntries(fileHandle, location) {
	const { centralDirectoryOffset, centralDirectorySize } = location;
	const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;

	let cursor = centralDirectoryOffset;
	const header = Buffer.alloc(CENTRAL_DIRECTORY_FILE_HEADER_SIZE);

	while (cursor < centralDirectoryEnd) {
		await fileHandle.read(header, 0, header.length, cursor);
		const signature = header.readUInt32LE(0);
		if (signature !== CENTRAL_DIRECTORY_FILE_HEADER_SIGNATURE) {
			throw new Error(
				`Invalid central directory file header signature: 0x${signature.toString(16)} at offset ${cursor}`,
			);
		}

		const compressionMethod = header.readUInt16LE(10);
		const compressedSize32 = header.readUInt32LE(20);
		const uncompressedSize32 = header.readUInt32LE(24);
		const filenameLength = header.readUInt16LE(28);
		const extraFieldLength = header.readUInt16LE(30);
		const commentLength = header.readUInt16LE(32);
		const localHeaderOffset32 = header.readUInt32LE(42);

		const filenameBuffer = Buffer.alloc(filenameLength);
		await fileHandle.read(
			filenameBuffer,
			0,
			filenameLength,
			cursor + CENTRAL_DIRECTORY_FILE_HEADER_SIZE,
		);

		const extraFieldsBuffer = Buffer.alloc(extraFieldLength);
		if (extraFieldLength > 0) {
			await fileHandle.read(
				extraFieldsBuffer,
				0,
				extraFieldLength,
				cursor + CENTRAL_DIRECTORY_FILE_HEADER_SIZE + filenameLength,
			);
		}

		const entry = {
			compressedSize: compressedSize32,
			uncompressedSize: uncompressedSize32,
			localHeaderOffset: localHeaderOffset32,
		};
		if (extraFieldLength > 0) applyZip64ExtraField(entry, extraFieldsBuffer);

		const fileName = filenameBuffer.toString('utf8');

		yield {
			fileName,
			compressedSize: entry.compressedSize,
			uncompressedSize: entry.uncompressedSize,
			compressionMethod,
			localHeaderOffset: entry.localHeaderOffset,
			isDirectory: fileName.endsWith('/'),
			recovered: false,
		};

		cursor +=
			CENTRAL_DIRECTORY_FILE_HEADER_SIZE +
			filenameLength +
			extraFieldLength +
			commentLength;
	}
}

// Reads a local file header to find where this entry's compressed data
// actually starts. Only filenameLength/extraFieldLength are used from it -
// size fields are not trusted here (entries using a trailing data
// descriptor report 0 in the local header; the central directory's sizes,
// already resolved via ZIP64 if needed, are authoritative for entries that
// have a central directory record).
async function readLocalFileHeader(fileHandle, localHeaderOffset) {
	const header = Buffer.alloc(LOCAL_FILE_HEADER_SIZE);
	await fileHandle.read(header, 0, header.length, localHeaderOffset);
	const signature = header.readUInt32LE(0);
	if (signature !== LOCAL_FILE_HEADER_SIGNATURE) {
		throw new Error(
			`Invalid local file header signature: 0x${signature.toString(16)} at offset ${localHeaderOffset}`,
		);
	}
	const compressionMethod = header.readUInt16LE(8);
	const filenameLength = header.readUInt16LE(26);
	const extraFieldLength = header.readUInt16LE(28);
	return {
		compressionMethod,
		dataStart:
			localHeaderOffset +
			LOCAL_FILE_HEADER_SIZE +
			filenameLength +
			extraFieldLength,
	};
}

// Finds the next local file header signature at or after `from`, within
// `[from, gapEnd)`. Returns its offset, or null if none found.
async function findNextLocalFileHeaderSignature(fileHandle, from, gapEnd) {
	const CHUNK_SIZE = 32 * 1024 * 1024;
	let pos = from;
	let prevTail = Buffer.alloc(0);
	while (pos < gapEnd) {
		const readSize = Math.min(CHUNK_SIZE, gapEnd - pos);
		const chunk = Buffer.alloc(readSize);
		await fileHandle.read(chunk, 0, readSize, pos);
		const combined = Buffer.concat([prevTail, chunk]);
		const idx = combined.indexOf(LOCAL_FILE_HEADER_SIGNATURE_BUFFER);
		if (idx !== -1) return pos - prevTail.length + idx;
		prevTail = combined.subarray(
			Math.max(
				0,
				combined.length - (LOCAL_FILE_HEADER_SIGNATURE_BUFFER.length - 1),
			),
		);
		pos += readSize;
	}
	return null;
}

// Attempts to decompress starting at `dataStart`, reading up to (but not
// necessarily consuming all of) `[dataStart, boundEnd)`. For DEFLATE this
// is safe even though `boundEnd` is only an upper bound (typically the gap
// end, not the entry's real end) - deflate streams self-terminate, and
// `inflate.bytesWritten` reports exactly how many *input* bytes were
// actually part of the stream, letting the caller resume scanning right
// after this entry's true end instead of at the (possibly much later)
// bound. This is what correctly skips past coincidental PK signatures
// nested inside another orphan's own compressed bytes (observed for
// recovered .pptx/.zip attachments, which are themselves zip containers).
async function tryDecompressBounded(
	zipPath,
	dataStart,
	boundEnd,
	compressionMethod,
	destPath,
) {
	const readStream = fs.createReadStream(zipPath, {
		start: dataStart,
		end: boundEnd - 1,
	});
	const writeStream = fs.createWriteStream(destPath);
	try {
		if (compressionMethod === 0) {
			// Stored (no compression) has no self-terminating marker, so this
			// can't disambiguate its real end from the bound the same way -
			// not observed in practice (both real exports this was built
			// against are 100% DEFLATE); best-effort takes the whole bound.
			await pipeline(readStream, writeStream);
			return {
				success: true,
				compressedBytesConsumed: writeStream.bytesWritten,
				uncompressedSize: writeStream.bytesWritten,
			};
		}
		if (compressionMethod !== 8) return { success: false };

		const inflate = zlib.createInflateRaw();
		await pipeline(readStream, inflate, writeStream);
		return {
			success: true,
			compressedBytesConsumed: inflate.bytesWritten,
			uncompressedSize: writeStream.bytesWritten,
		};
	} catch {
		return { success: false };
	}
}

/**
 * Recovers entries whose local file header (and compressed data) exists in
 * the archive body but whose central directory record is missing (see
 * module docstring, Bug 2) - most notably the chat transcript itself in
 * both real exports this was built against. Scans `[gapStart, gapEnd)`
 * sequentially: for each candidate local file header signature found,
 * validates it, then actually attempts decompression to confirm it's real
 * (a coincidental 4-byte match inside unrelated binary data reliably fails
 * to inflate) and to discover exactly how many bytes it really occupies,
 * before resuming the scan right after it. Writes recovered entries
 * directly to disk as they're found (there's no way to know an entry's
 * true extent without actually decompressing it).
 * @param {import('node:fs/promises').FileHandle} fileHandle
 * @param {string} zipPath
 * @param {number} gapStart
 * @param {number} gapEnd
 * @param {(fileName: string) => Promise<string>} resolveDestPath - Given a
 *   recovered entry's decoded filename, returns the validated absolute
 *   path to write it to.
 * @param {(p: { cursor: number, gapStart: number, gapEnd: number }) => void} [onProgress] -
 *   Called after each recovered entry (this pass has no reliable entry
 *   count upfront, so progress is reported as bytes-through-the-gap).
 * @returns {Promise<{ name: string, path: string, size: number }[]>}
 */
async function recoverOrphanEntries(
	fileHandle,
	zipPath,
	gapStart,
	gapEnd,
	resolveDestPath,
	onProgress,
) {
	const recovered = [];
	let cursor = gapStart;

	while (cursor < gapEnd) {
		const foundOffset = await findNextLocalFileHeaderSignature(
			fileHandle,
			cursor,
			gapEnd,
		);
		if (foundOffset === null) break;

		const header = Buffer.alloc(LOCAL_FILE_HEADER_SIZE);
		await fileHandle.read(header, 0, header.length, foundOffset);
		if (header.readUInt32LE(0) !== LOCAL_FILE_HEADER_SIGNATURE) {
			cursor = foundOffset + 1;
			continue;
		}

		const compressionMethod = header.readUInt16LE(8);
		const filenameLength = header.readUInt16LE(26);
		const extraFieldLength = header.readUInt16LE(28);
		if (
			(compressionMethod !== 0 && compressionMethod !== 8) ||
			filenameLength === 0 ||
			filenameLength > MAX_ORPHAN_FILENAME_LENGTH ||
			foundOffset + LOCAL_FILE_HEADER_SIZE + filenameLength > gapEnd
		) {
			cursor = foundOffset + 1;
			continue;
		}

		const filenameBuffer = Buffer.alloc(filenameLength);
		await fileHandle.read(
			filenameBuffer,
			0,
			filenameLength,
			foundOffset + LOCAL_FILE_HEADER_SIZE,
		);
		const fileName = filenameBuffer.toString('utf8');
		if (!PLAUSIBLE_FILENAME_REGEX.test(fileName) || fileName.endsWith('/')) {
			cursor = foundOffset + 1;
			continue;
		}

		const dataStart =
			foundOffset + LOCAL_FILE_HEADER_SIZE + filenameLength + extraFieldLength;

		let destPath;
		try {
			destPath = await resolveDestPath(fileName);
		} catch {
			cursor = foundOffset + 1;
			continue;
		}

		const attempt = await tryDecompressBounded(
			zipPath,
			dataStart,
			gapEnd,
			compressionMethod,
			destPath,
		);
		if (!attempt.success || attempt.compressedBytesConsumed === 0) {
			await fs.promises.rm(destPath, { force: true }).catch(() => {});
			cursor = foundOffset + 1;
			continue;
		}

		recovered.push({
			name: fileName.split('/').pop() || fileName,
			path: fileName,
			size: attempt.uncompressedSize,
		});
		cursor = dataStart + attempt.compressedBytesConsumed;
		onProgress?.({ cursor, gapStart, gapEnd });
	}

	return recovered;
}

/**
 * Best-effort fast path for finding just the chat transcript when it's one
 * of the orphaned entries (see recoverOrphanEntries doc above) - scans the
 * same gap the same way, but stops as soon as it hits a non-hidden `.txt`
 * entry instead of recovering every orphan. Each candidate along the way
 * still has to be fully decompressed to discover its true extent and let
 * the scan advance past it (there's no directory for orphans - that's the
 * whole reason they need this kind of scan), so this is only actually fast
 * when the chat transcript happens to be one of the first few orphans by
 * archive-body order; if it's the last of many (large exports can have
 * hundreds), this can cost close to as much as a full recovery pass. There
 * is no way to know which case applies without scanning, which is exactly
 * why this exists as a separate, abortable pass rather than folding a
 * "stop early" flag into recoverOrphanEntries itself (which always needs
 * to recover everything for a real import). `maxScanMs` bounds the
 * worst case: measured against two real large exports this was built
 * against, one found its chat transcript in 0.24s (5 orphans total), the
 * other took 233s (624 orphans, transcript was the very last one) - with
 * no cheap way to tell which case a given file is upfront, without a cap
 * the second case would make a "fast pre-check" cost as much as just
 * running the real extraction, and then the real extraction would still
 * have to run on top of that if the user proceeds, roughly doubling total
 * wait time for exactly the files this is least able to help with. Giving
 * up and returning null past the cap is the same graceful "couldn't
 * pre-check, import normally" outcome as never having found a candidate
 * at all.
 * @param {import('node:fs/promises').FileHandle} fileHandle
 * @param {string} zipPath
 * @param {number} gapStart
 * @param {number} gapEnd
 * @param {string} scratchPath - Reusable throwaway path each candidate's
 *   decompressed bytes are written to; only kept (read back and returned)
 *   for the entry that actually matches.
 * @param {number} maxScanMs - Give up and return null once this much time
 *   has elapsed.
 * @returns {Promise<{ fileName: string, content: string } | null>}
 */
async function findChatEntryInGap(
	fileHandle,
	zipPath,
	gapStart,
	gapEnd,
	scratchPath,
	maxScanMs,
) {
	let cursor = gapStart;
	const deadline = Date.now() + maxScanMs;

	while (cursor < gapEnd) {
		if (Date.now() > deadline) return null;
		const foundOffset = await findNextLocalFileHeaderSignature(
			fileHandle,
			cursor,
			gapEnd,
		);
		if (foundOffset === null) break;

		const header = Buffer.alloc(LOCAL_FILE_HEADER_SIZE);
		await fileHandle.read(header, 0, header.length, foundOffset);
		if (header.readUInt32LE(0) !== LOCAL_FILE_HEADER_SIGNATURE) {
			cursor = foundOffset + 1;
			continue;
		}

		const compressionMethod = header.readUInt16LE(8);
		const filenameLength = header.readUInt16LE(26);
		const extraFieldLength = header.readUInt16LE(28);
		if (
			(compressionMethod !== 0 && compressionMethod !== 8) ||
			filenameLength === 0 ||
			filenameLength > MAX_ORPHAN_FILENAME_LENGTH ||
			foundOffset + LOCAL_FILE_HEADER_SIZE + filenameLength > gapEnd
		) {
			cursor = foundOffset + 1;
			continue;
		}

		const filenameBuffer = Buffer.alloc(filenameLength);
		await fileHandle.read(
			filenameBuffer,
			0,
			filenameLength,
			foundOffset + LOCAL_FILE_HEADER_SIZE,
		);
		const fileName = filenameBuffer.toString('utf8');
		if (!PLAUSIBLE_FILENAME_REGEX.test(fileName) || fileName.endsWith('/')) {
			cursor = foundOffset + 1;
			continue;
		}

		const dataStart =
			foundOffset + LOCAL_FILE_HEADER_SIZE + filenameLength + extraFieldLength;

		const attempt = await tryDecompressBounded(
			zipPath,
			dataStart,
			gapEnd,
			compressionMethod,
			scratchPath,
		);
		if (!attempt.success || attempt.compressedBytesConsumed === 0) {
			cursor = foundOffset + 1;
			continue;
		}

		const cleanName = (fileName.split('/').pop() || fileName).replace(
			/^\uFEFF/,
			'',
		);
		const isTxtFile = cleanName.toLowerCase().endsWith('.txt');
		const isNotHidden = !cleanName.startsWith('.');
		if (isTxtFile && isNotHidden) {
			const content = await fs.promises.readFile(scratchPath, 'utf-8');
			return { fileName, content };
		}

		cursor = dataStart + attempt.compressedBytesConsumed;
	}

	return null;
}

/**
 * Streams one central-directory-listed entry's decompressed bytes to
 * `destPath`, using its known (and, for entries with a ZIP64 extra field,
 * already-corrected) compressedSize.
 * @param {import('node:fs/promises').FileHandle} fileHandle
 * @param {string} zipPath - Path of the zip file (needed for a range read stream).
 * @param {{ compressedSize: number, compressionMethod: number, localHeaderOffset: number }} entry
 * @param {string} destPath
 */
async function extractEntryToFile(fileHandle, zipPath, entry, destPath) {
	const { dataStart } = await readLocalFileHeader(
		fileHandle,
		entry.localHeaderOffset,
	);
	const dataEnd = dataStart + entry.compressedSize - 1;

	const readStream =
		entry.compressedSize > 0
			? fs.createReadStream(zipPath, { start: dataStart, end: dataEnd })
			: fs.createReadStream(zipPath, { start: dataStart, end: dataStart - 1 });
	const writeStream = fs.createWriteStream(destPath);

	if (entry.compressionMethod === 0) {
		await pipeline(readStream, writeStream);
	} else if (entry.compressionMethod === 8) {
		await pipeline(readStream, zlib.createInflateRaw(), writeStream);
	} else {
		throw new Error(
			`Unsupported compression method ${entry.compressionMethod} for entry`,
		);
	}
}

module.exports = {
	locateCentralDirectory,
	readCentralDirectoryEntries,
	recoverOrphanEntries,
	findChatEntryInGap,
	readLocalFileHeader,
	extractEntryToFile,
};
