/**
 * ZIP File Parser for WhatsApp exports
 *
 * Handles ZIP files that contain chat exports with media attachments
 * Optimized for large backups with lazy loading of media files
 */

import JSZip from 'jszip';
import {
	type ChatMessage,
	GENERIC_CHAT_TITLE_FALLBACK,
	type ParsedChat,
	parseChat,
} from './chat-parser';
import { type ContactInfo, parseVcf } from './vcf-parser';

export interface MediaFile {
	name: string;
	path: string;
	type: 'image' | 'video' | 'audio' | 'document' | 'other';
	size: number;
	// Optional context when we can link this file to a message
	messageId?: string;
	messageTimestamp?: string;
	messageSender?: string;
	blob?: Blob;
	url?: string;
	// For lazy loading from an in-memory ZIP
	_zipEntry?: JSZip.JSZipObject;
	// For lazy loading from an Electron-extracted folder on disk (see
	// electron/lib/extract-zip.cjs) - mutually exclusive with _zipEntry
	_extractionId?: string;
	_loaded?: boolean;
}

// Serializable flat item types for pre-computed rendering list
export interface DateFlatItem {
	type: 'date';
	dateKey: string; // YYYY-MM-DD
}

export interface MessageFlatItem {
	type: 'message';
	messageId: string;
}

export type FlatItem = DateFlatItem | MessageFlatItem;

// Serialized message format for search (pre-computed to avoid re-serialization)
export interface SerializedSearchMessage {
	id: string;
	timestamp: string;
	sender: string;
	content: string;
	isSystemMessage: boolean;
	isMediaMessage: boolean;
	mediaType?: string;
	rawLine: string;
}

export interface ParsedZipChat extends ParsedChat {
	mediaFiles: MediaFile[];
	hasMedia: boolean;
	// Contact information extracted from VCF files
	// Key is the contact name (normalized to lowercase for lookup)
	contacts: Map<string, ContactInfo>;
	// Reference to zip for lazy loading
	_zip?: JSZip;
	// Set instead of _zip when this chat was parsed from an Electron-extracted
	// folder on disk (see electron/lib/extract-zip.cjs) rather than an
	// in-memory ZIP.
	extractionDir?: string;
	extractionId?: string;
	// Pre-computed message index for bookmark navigation (messageId -> flatIndex)
	// Built by index-worker after import for efficient O(1) lookups
	messageIndex?: Map<string, number>;
	// Pre-computed flat items list for rendering (avoids groupMessagesByDate on main thread)
	flatItems?: FlatItem[];
	// Pre-computed messages by ID map for O(1) lookups (built with flatItems)
	messagesById?: Map<string, ChatMessage>;
	// Pre-serialized messages for search worker (avoids re-serialization on every search)
	serializedMessages?: SerializedSearchMessage[];
}

// Keep track of loaded media to manage memory
const loadedMediaCache = new Map<string, { url: string; refCount: number }>();
const MAX_CACHED_MEDIA = 50; // Maximum number of media files to keep in memory

function getMediaType(filename: string): MediaFile['type'] {
	const ext = filename.toLowerCase().split('.').pop() || '';

	const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
	const videoExts = ['mp4', 'mov', 'avi', 'mkv', '3gp', 'webm'];
	const audioExts = ['opus', 'mp3', 'wav', 'aac', 'm4a', 'ogg'];
	const docExts = [
		'pdf',
		'doc',
		'docx',
		'xls',
		'xlsx',
		'ppt',
		'pptx',
		'txt',
		'vcf',
		'xml',
	];

	if (imageExts.includes(ext)) return 'image';
	if (videoExts.includes(ext)) return 'video';
	if (audioExts.includes(ext)) return 'audio';
	if (docExts.includes(ext)) return 'document';

	return 'other';
}

export interface ParseProgress {
	stage: 'reading' | 'extracting' | 'parsing';
	progress: number; // 0-100
}

/**
 * Check if content looks like a WhatsApp chat export
 * by looking for timestamp patterns in the first few lines
 */
function looksLikeChatContent(content: string): boolean {
	const lines = content.split(/\r?\n/).slice(0, 10); // Check first 10 lines

	// Common timestamp patterns from WhatsApp exports
	const timestampPatterns = [
		/^\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}/, // MM/DD/YY or DD/MM/YY
		/^\d{4}[-/]\d{1,2}[-/]\d{1,2},?\s+\d{1,2}:\d{2}/, // YYYY-MM-DD or YYYY/MM/DD
		/^\d{1,2}\.\d{1,2}\.\d{2,4},?\s+\d{1,2}:\d{2}/, // DD.MM.YY (German)
		/^\[\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}:\d{2}/, // [DD/MM/YY, HH:MM:SS] (iOS bracketed)
	];

	// Count lines that match timestamp patterns
	let matchCount = 0;
	for (const line of lines) {
		if (
			line.trim() &&
			timestampPatterns.some((pattern) => pattern.test(line))
		) {
			matchCount++;
		}
	}

	// If at least 2 lines match timestamp patterns, it's likely a chat file
	return matchCount >= 2;
}

/**
 * Derives a display title hint for a chat, un-mangling iOS's generic
 * "_chat.txt" filename via (in order of preference) the containing folder
 * name, the original ZIP's filename, or a group-subject line inside the
 * chat content itself. Non-generic filenames are returned as-is.
 */
export function deriveChatTitle(params: {
	chatContent: string;
	chatFilename: string;
	chatEntryPath: string | null;
	originalFileName?: string;
}): string {
	const { chatContent, chatFilename, chatEntryPath, originalFileName } = params;
	const lower = chatFilename.toLowerCase();
	const isIosGenericChatName =
		lower === '_chat.txt' || lower.startsWith('_chat');

	if (!isIosGenericChatName) return chatFilename;

	// iOS exports always use "_chat.txt" - we need to extract a better name
	// Try multiple strategies in order of preference:

	// Strategy 1: Extract from parent folder name
	// e.g., "WhatsApp/Conversa do WhatsApp com GTR administração/_chat.txt"
	const parts = (chatEntryPath ?? '')
		.split('/')
		.map((p) => p.trim())
		.filter(Boolean);
	const parentFolder = parts.length >= 2 ? parts[parts.length - 2] : null;

	// Strategy 2: Extract from ZIP filename
	// e.g., "WhatsApp.Chat.-.+20.109.870.8253.zip" or "Chat with John.zip"
	let zipBaseName: string | null = null;
	if (originalFileName) {
		zipBaseName = originalFileName.replace(/\.zip$/i, '');
		// Clean up common patterns from iOS/Android exports
		zipBaseName = zipBaseName
			.replace(/^WhatsApp\.Chat\.-\./, '') // "WhatsApp.Chat.-." prefix
			.replace(
				/^WhatsApp[-_\s]+(Chat|Conversa|Plausch|チャット|聊天)(?:[-_\s]+with)?[-_\s]*/i,
				'',
			) // "WhatsApp Chat" or "WhatsApp Chat with" in various languages
			.replace(/[-_\s]+(Chat|Conversa|Plausch|チャット|聊天)[-_\s]+/gi, ' ') // " Chat " or " Conversa " in the middle
			.replace(/^(Chat|Conversa|Plausch|チャット|聊天)[-_\s]+with[-_\s]+/i, '') // "Chat with" prefix
			.replace(/\+/g, ' ') // Replace + with space
			.trim();
	}

	// Strategy 3: Parse the first few lines of the chat for contact/group info
	// Some iOS exports include the chat name in the first system message
	let contentHint: string | null = null;
	const firstLines = chatContent.split(/\r?\n/).slice(0, 5);
	for (const line of firstLines) {
		// Look for patterns like "Messages to this chat and calls are now secured with end-to-end encryption"
		// or group subject changes
		if (line.includes('group subject') || line.includes('assunto do grupo')) {
			const match = line.match(
				/(?:group subject|assunto do grupo)[:\s]+["']?([^"'\n]+)["']?/i,
			);
			if (match?.[1]) {
				contentHint = match[1].trim();
				break;
			}
		}
	}

	// Choose the best available name
	let titleHint: string;
	if (parentFolder && !parentFolder.toLowerCase().includes('whatsapp')) {
		// Parent folder is the best if it's not just "WhatsApp" itself
		titleHint = parentFolder
			.replace(
				/^(WhatsApp|Conversa do WhatsApp com|Chat with|Plausch mit)\s+/i,
				'',
			)
			.trim();
	} else if (zipBaseName && zipBaseName.length > 0) {
		// ZIP filename is second best
		titleHint = zipBaseName;
	} else if (contentHint) {
		// Content extraction is third best
		titleHint = contentHint;
	} else {
		// Fallback: use a generic but clear name instead of "_chat"
		titleHint = GENERIC_CHAT_TITLE_FALLBACK;
	}

	console.log(
		`iOS export detected. Original: "${chatFilename}", Derived title: "${titleHint}"`,
	);

	return titleHint;
}

interface ClassifiableEntry {
	path: string;
	size: number;
}

interface ClassificationResult {
	chatContent: string;
	chatFilename: string;
	chatEntryPath: string | null;
	vcfContents: Array<{ path: string; content: string }>;
	mediaFiles: Array<Pick<MediaFile, 'name' | 'path' | 'type' | 'size'>>;
	allFiles: Array<{ path: string; name: string }>;
}

/**
 * Classifies a flat list of ZIP/extraction entries into the chat text file,
 * VCF contact files, and media files - the same heuristics regardless of
 * whether entries live inside an in-memory JSZip instance or on disk (an
 * Electron-extracted folder), so this logic only needs to be maintained once.
 * `readText` is called for the chat-candidate and VCF entries only (media
 * entries are cataloged, never read here).
 */
async function classifyEntries(
	entries: ClassifiableEntry[],
	readText: (entryPath: string) => Promise<string>,
	onSubProgress?: (fraction: number) => void,
): Promise<ClassificationResult> {
	let chatContent = '';
	let chatFilename = 'WhatsApp Chat';
	let chatEntryPath: string | null = null;
	const mediaFiles: ClassificationResult['mediaFiles'] = [];
	const vcfContents: ClassificationResult['vcfContents'] = [];
	const allFiles: Array<{ path: string; name: string }> = [];

	const total = entries.length;
	let processed = 0;

	for (const entry of entries) {
		const filename = entry.path.split('/').pop() || entry.path;
		allFiles.push({ path: entry.path, name: filename });

		// Remove any potential BOM (Byte Order Mark) from filename for comparison
		const cleanFilename = filename.replace(/^\uFEFF/, '');
		const lowerFilename = cleanFilename.toLowerCase();

		// More flexible chat file detection
		// Check for:
		// 1. Files ending with .txt (case-insensitive)
		// 2. Files that might contain "chat" or "conversation" in the name
		// 3. Not hidden files (starting with . but underscore prefix is OK for iOS exports)
		const isTxtFile = lowerFilename.endsWith('.txt');
		const isChatLikeFile =
			lowerFilename.includes('chat') ||
			lowerFilename.includes('conversation') ||
			lowerFilename.includes('whatsapp');
		const isNotHidden = !cleanFilename.startsWith('.');

		if (isTxtFile && isNotHidden) {
			// This is likely the chat file - load it immediately (it's small)
			chatContent = await readText(entry.path);
			chatFilename = cleanFilename;
			chatEntryPath = entry.path;
			console.log(`Found chat file: ${cleanFilename} (${entry.path})`);
		} else if (isChatLikeFile && isNotHidden && !chatContent) {
			// Try loading files that might be chat files even without .txt extension
			console.log(
				`Trying potential chat file: ${cleanFilename} (${entry.path})`,
			);
			const content = await readText(entry.path);
			// Check if it looks like a chat file (contains timestamp patterns)
			if (looksLikeChatContent(content)) {
				chatContent = content;
				chatFilename = cleanFilename;
				chatEntryPath = entry.path;
				console.log(
					`Detected chat file without .txt extension: ${cleanFilename}`,
				);
			}
		} else if (lowerFilename.endsWith('.vcf')) {
			// This is a vCard file - read it now for later parsing
			try {
				const content = await readText(entry.path);
				vcfContents.push({ path: entry.path, content });
			} catch (e) {
				console.warn(`Failed to read VCF file: ${entry.path}`, e);
			}
		} else {
			// This is a media file - catalog it but don't load yet
			const mediaType = getMediaType(cleanFilename);
			if (mediaType !== 'other' || isNotHidden) {
				mediaFiles.push({
					name: cleanFilename,
					path: entry.path,
					type: mediaType,
					size: entry.size,
				});
			}
		}

		processed++;
		onSubProgress?.(processed / total);
	}

	return {
		chatContent,
		chatFilename,
		chatEntryPath,
		vcfContents,
		mediaFiles,
		allFiles,
	};
}

function buildNoChatFileError(
	allFiles: Array<{ path: string; name: string }>,
): Error {
	// Provide detailed error message with debugging information
	console.error('No chat file found in ZIP archive');
	console.error('Files found in ZIP:');
	for (const file of allFiles) {
		console.error(`  - ${file.path} (${file.name})`);
	}

	// Create a user-friendly error message
	const fileList = allFiles.map((f) => `  • ${f.name}`).join('\n');

	return new Error(
		`No WhatsApp chat file found in ZIP archive.\n\n` +
			`Expected: A .txt file containing chat history (e.g., "WhatsApp Chat with Contact.txt")\n\n` +
			`Files found in archive (${allFiles.length} total):\n${fileList}\n\n` +
			`Please ensure you exported the chat correctly:\n` +
			`1. Open WhatsApp\n` +
			`2. Open the chat you want to export\n` +
			`3. Tap the contact/group name at the top\n` +
			`4. Scroll down and tap "Export Chat"\n` +
			`5. Choose "Include Media" or "Without Media"\n` +
			`6. Save the ZIP file and try again`,
	);
}

function buildEmptyChatFileError(chatFilename: string): Error {
	return new Error(
		`Chat file is empty: ${chatFilename}\n\n` +
			`The file exists but contains no content. Please check if the export was completed correctly.`,
	);
}

function buildChatParseFailedError(
	chatFilename: string,
	error: unknown,
): Error {
	console.error('Failed to parse chat file:', error);
	return new Error(
		`Failed to parse chat file: ${chatFilename}\n\n` +
			`Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
			`The file format may not be supported or the file may be corrupted.`,
	);
}

function buildNoMessagesError(
	chatFilename: string,
	firstLines: string[],
): Error {
	console.warn('No messages were parsed from the chat file. First few lines:');
	for (let i = 0; i < Math.min(10, firstLines.length); i++) {
		console.warn(`  Line ${i + 1}: ${firstLines[i]}`);
	}

	return new Error(
		`No messages found in chat file: ${chatFilename}\n\n` +
			`The file was loaded but no messages could be parsed. This may indicate:\n` +
			`1. The date format is not recognized\n` +
			`2. The file structure is different from expected\n` +
			`3. The file may be corrupted\n\n` +
			`First line of file: "${firstLines[0]}"\n\n` +
			`Please report this issue with information about your WhatsApp version and phone model.`,
	);
}

/**
 * Validates and parses classified chat text into messages - shared by both
 * the in-memory JSZip pipeline and the Electron-extracted pipeline, since
 * everything from here on is identical regardless of where the bytes came
 * from.
 */
async function parseClassifiedChat(
	chatContent: string,
	chatFilename: string,
	chatEntryPath: string | null,
	originalFileName: string | undefined,
	allFiles: Array<{ path: string; name: string }>,
): Promise<ParsedChat> {
	if (!chatContent) {
		throw buildNoChatFileError(allFiles);
	}

	// Log the first few lines of the chat file for debugging
	const firstLines = chatContent.split(/\r?\n/).slice(0, 5);
	console.log(`Parsing chat file: ${chatFilename}`);
	console.log('First 5 lines of chat file (for format debugging):');
	for (let i = 0; i < firstLines.length; i++) {
		// Only show first 80 chars to minimize exposure of sensitive content
		const preview = firstLines[i].substring(0, 80);
		console.log(
			`  ${i + 1}: ${preview}${firstLines[i].length > 80 ? '...' : ''}`,
		);
	}

	// Check if the content is potentially parseable
	if (!chatContent.trim()) {
		throw buildEmptyChatFileError(chatFilename);
	}

	// Parse the chat content
	let parsedChat: ParsedChat;
	try {
		const titleHint = deriveChatTitle({
			chatContent,
			chatFilename,
			chatEntryPath,
			originalFileName,
		});
		parsedChat = parseChat(chatContent, titleHint);
	} catch (error) {
		throw buildChatParseFailedError(chatFilename, error);
	}

	// Validate that we got at least some messages
	if (parsedChat.messages.length === 0) {
		throw buildNoMessagesError(chatFilename, firstLines);
	}

	console.log(
		`Successfully parsed ${parsedChat.messages.length} messages from ${chatFilename}`,
	);

	return parsedChat;
}

function getJSZipEntrySize(zipEntry: JSZip.JSZipObject): number {
	try {
		// biome-ignore lint/suspicious/noExplicitAny: JSZip doesn't expose _data in its type definitions
		const zipData = (zipEntry as any)._data;
		if (zipData && typeof zipData.uncompressedSize === 'number') {
			return zipData.uncompressedSize;
		}
	} catch (err) {
		// Fallback to 0 if _data is not available or errors
		const errorMessage = err instanceof Error ? err.message : String(err);
		const errorStack = err instanceof Error ? err.stack : undefined;
		console.warn(`Could not read size for ${zipEntry.name}: ${errorMessage}`, {
			error: err,
			stack: errorStack,
			path: zipEntry.name,
		});
	}
	return 0;
}

/**
 * Parse a WhatsApp ZIP export file
 * Uses lazy loading for media files to handle large backups efficiently
 */
export async function parseZipFile(
	file: File | ArrayBuffer,
	onProgress?: (progress: ParseProgress) => void,
	originalFileName?: string,
): Promise<ParsedZipChat> {
	const zip = new JSZip();

	onProgress?.({ stage: 'extracting', progress: 0 });

	// Load ZIP (JSZip doesn't support progress callback for loadAsync)
	const contents = await zip.loadAsync(file);

	onProgress?.({ stage: 'extracting', progress: 30 });

	const fileEntries = Object.entries(contents.files).filter(
		([, entry]) => !entry.dir,
	);

	const classification = await classifyEntries(
		fileEntries.map(([path, zipEntry]) => ({
			path,
			size: getJSZipEntrySize(zipEntry),
		})),
		(entryPath) => contents.files[entryPath].async('string'),
		(fraction) =>
			onProgress?.({ stage: 'extracting', progress: 30 + fraction * 50 }),
	);

	const mediaFiles: MediaFile[] = classification.mediaFiles.map((m) => ({
		...m,
		_zipEntry: contents.files[m.path],
		_loaded: false,
	}));

	const contacts = new Map<string, ContactInfo>();
	for (const vcf of classification.vcfContents) {
		try {
			const contactInfo = parseVcf(vcf.content);
			if (contactInfo) {
				// Store by lowercase name for case-insensitive lookup
				contacts.set(contactInfo.name.toLowerCase(), contactInfo);
			}
		} catch (e) {
			// Ignore VCF parsing errors - file might be corrupted
			console.warn(`Failed to parse VCF file: ${vcf.path}`, e);
		}
	}

	onProgress?.({ stage: 'parsing', progress: 0 });

	const parsedChat = await parseClassifiedChat(
		classification.chatContent,
		classification.chatFilename,
		classification.chatEntryPath,
		originalFileName,
		classification.allFiles,
	);

	onProgress?.({ stage: 'parsing', progress: 50 });

	// Try to match media files with messages (just references, no loading)
	const enhancedMessages = matchMediaToMessages(
		parsedChat.messages,
		mediaFiles,
	);

	onProgress?.({ stage: 'parsing', progress: 100 });

	return {
		...parsedChat,
		messages: enhancedMessages,
		mediaFiles,
		hasMedia: mediaFiles.length > 0,
		contacts,
		_zip: zip,
	};
}

/**
 * Builds a media:// URL for a file that lives in an Electron-extracted
 * chat folder (see electron/lib/extract-zip.cjs and main.cjs's 'media://'
 * protocol handler).
 */
export function getExtractedMediaUrl(
	mediaPath: string,
	extractionId: string,
): string {
	const encodedPath = mediaPath.split('/').map(encodeURIComponent).join('/');
	return `media://${extractionId}/${encodedPath}`;
}

/**
 * Parse a chat that has already been streamed to disk by Electron's
 * extraction pipeline (see electron/lib/extract-zip.cjs), instead of being
 * held as an in-memory JSZip instance. Shares all classification/parsing
 * logic with parseZipFile via classifyEntries/parseClassifiedChat - only
 * how bytes are read (media:// fetch vs. JSZip.async) differs.
 */
export async function parseExtractedChat(
	extracted: {
		extractionDir: string;
		extractionId: string;
		originalFileName?: string;
		entries: Array<{ name: string; path: string; size: number }>;
	},
	onProgress?: (progress: ParseProgress) => void,
): Promise<ParsedZipChat> {
	onProgress?.({ stage: 'extracting', progress: 0 });

	const readText = async (entryPath: string): Promise<string> => {
		const res = await fetch(
			getExtractedMediaUrl(entryPath, extracted.extractionId),
		);
		if (!res.ok) {
			throw new Error(`Failed to read extracted file: ${entryPath}`);
		}
		return res.text();
	};

	const classification = await classifyEntries(
		extracted.entries.map((e) => ({ path: e.path, size: e.size })),
		readText,
		(fraction) =>
			onProgress?.({ stage: 'extracting', progress: fraction * 100 }),
	);

	const mediaFiles: MediaFile[] = classification.mediaFiles.map((m) => ({
		...m,
		_extractionId: extracted.extractionId,
		_loaded: false,
	}));

	const contacts = new Map<string, ContactInfo>();
	for (const vcf of classification.vcfContents) {
		try {
			const contactInfo = parseVcf(vcf.content);
			if (contactInfo) {
				contacts.set(contactInfo.name.toLowerCase(), contactInfo);
			}
		} catch (e) {
			console.warn(`Failed to parse VCF file: ${vcf.path}`, e);
		}
	}

	onProgress?.({ stage: 'parsing', progress: 0 });

	const parsedChat = await parseClassifiedChat(
		classification.chatContent,
		classification.chatFilename,
		classification.chatEntryPath,
		extracted.originalFileName,
		classification.allFiles,
	);

	onProgress?.({ stage: 'parsing', progress: 50 });

	const enhancedMessages = matchMediaToMessages(
		parsedChat.messages,
		mediaFiles,
	);

	onProgress?.({ stage: 'parsing', progress: 100 });

	return {
		...parsedChat,
		messages: enhancedMessages,
		mediaFiles,
		hasMedia: mediaFiles.length > 0,
		contacts,
		extractionDir: extracted.extractionDir,
		extractionId: extracted.extractionId,
	};
}

/**
 * Returns whether a MediaFile has a loadable byte source, regardless of
 * whether it's backed by an in-memory JSZip entry or an Electron-extracted
 * file on disk.
 */
export function mediaFileHasSource(media: MediaFile): boolean {
	return Boolean(media._zipEntry) || Boolean(media._extractionId);
}

/**
 * Reads a MediaFile's full bytes regardless of its source (in-memory ZIP
 * entry or Electron-extracted file on disk).
 */
export async function getMediaBytes(media: MediaFile): Promise<ArrayBuffer> {
	if (media._zipEntry) return media._zipEntry.async('arraybuffer');
	if (media._extractionId) {
		const res = await fetch(
			getExtractedMediaUrl(media.path, media._extractionId),
		);
		if (!res.ok) {
			throw new Error(`Failed to fetch extracted media: ${media.name}`);
		}
		return res.arrayBuffer();
	}
	throw new Error(
		`Cannot load media file: ${media.name} - no source available`,
	);
}

/**
 * Try to match media files with their corresponding messages
 */
export function matchMediaToMessages(
	messages: ChatMessage[],
	mediaFiles: MediaFile[],
): ChatMessage[] {
	// Regex to strip zero-width and invisible Unicode characters
	// U+200E (LTR mark), U+200F (RTL mark), U+200B (zero-width space), U+FEFF (BOM), etc.
	const invisibleCharsRegex = /[\u200B-\u200F\u2028-\u202F\uFEFF]/g;

	// Create a map of media files by cleaned name for quick lookup
	// Strip invisible characters once during map building for efficiency
	const mediaMap = new Map<string, MediaFile>();
	// Track duplicate filenames to help with debugging
	const duplicateNames = new Map<string, number>();

	for (const media of mediaFiles) {
		const lowerName = media.name.toLowerCase().replace(invisibleCharsRegex, '');

		// Track duplicates for logging and potential future handling
		if (mediaMap.has(lowerName)) {
			const count = duplicateNames.get(lowerName) || 1;
			duplicateNames.set(lowerName, count + 1);
			// Note: Last file with duplicate name will overwrite earlier ones in the map
			// This is a known limitation - only the last duplicate will be matchable
			// Messages referencing earlier files with same name will be incorrectly matched to the last file
		}

		mediaMap.set(lowerName, media);

		// Only add without extension for partial matching if name is long enough
		// Lowered threshold from 10 to 8 chars to catch legitimate short filenames like "document.pdf"
		// Still prevents very short names like "a.svg" from matching everything
		const nameWithoutExt = lowerName.replace(/\.[^.]+$/, '');
		if (nameWithoutExt.length >= 8) {
			mediaMap.set(nameWithoutExt, media);
		}
	}

	// Log consolidated warning for all duplicates found
	if (duplicateNames.size > 0) {
		console.warn(
			`Found ${duplicateNames.size} duplicate filename(s). Only the last file with each duplicate name will be linkable to messages. ` +
				`This may cause messages to be linked to the wrong media file. Duplicates:`,
			Array.from(duplicateNames.entries()).map(
				([name, count]) => `"${name}" (${count} occurrences)`,
			),
		);
	}

	const result = messages.map((message) => {
		if (!message.isMediaMessage) return message;

		// Strip invisible Unicode chars from message content once
		const content = message.content
			.toLowerCase()
			.replace(invisibleCharsRegex, '');

		// Try to find a matching media file
		// Keys in mediaMap are already cleaned, so no need to clean again
		for (const [cleanKey, media] of mediaMap) {
			if (content.includes(cleanKey)) {
				if (!media.messageId) {
					media.messageId = message.id;
					media.messageTimestamp = message.timestamp.toISOString();
					media.messageSender = message.sender || undefined;
				}
				return {
					...message,
					mediaFile: media,
				} as ChatMessage & { mediaFile: MediaFile };
			}
		}

		return message;
	});

	return result;
}

/**
 * Read a file as ArrayBuffer with progress callback
 */
export function readFileAsArrayBuffer(
	file: File,
	onProgress?: (progress: number) => void,
): Promise<ArrayBuffer> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as ArrayBuffer);
		reader.onerror = () => reject(reader.error);
		if (onProgress) {
			reader.onprogress = (event) => {
				if (event.lengthComputable) {
					onProgress((event.loaded / event.total) * 100);
				}
			};
		}
		reader.readAsArrayBuffer(file);
	});
}

/**
 * Get MIME type from filename extension
 */
function getMimeType(filename: string): string {
	const ext = filename.toLowerCase().split('.').pop() || '';
	const mimeTypes: Record<string, string> = {
		// Images
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		png: 'image/png',
		gif: 'image/gif',
		webp: 'image/webp',
		bmp: 'image/bmp',
		svg: 'image/svg+xml',
		// Videos
		mp4: 'video/mp4',
		mov: 'video/quicktime',
		avi: 'video/x-msvideo',
		mkv: 'video/x-matroska',
		'3gp': 'video/3gpp',
		webm: 'video/webm',
		// Audio
		opus: 'audio/opus',
		mp3: 'audio/mpeg',
		wav: 'audio/wav',
		aac: 'audio/aac',
		m4a: 'audio/mp4',
		ogg: 'audio/ogg',
		// Documents
		pdf: 'application/pdf',
		txt: 'text/plain',
		xml: 'application/xml',
		vcf: 'text/vcard',
	};
	return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Load a media file on demand (lazy loading)
 * Returns the blob URL for the media file
 */
export async function loadMediaFile(media: MediaFile): Promise<string> {
	// Already loaded and cached
	if (media.url && media._loaded) {
		return media.url;
	}

	if (!mediaFileHasSource(media)) {
		throw new Error(
			`Cannot load media file: ${media.name} - no source available`,
		);
	}

	// Extracted video/audio stream natively via the media:// protocol
	// (which supports Range requests for scrubbing) instead of being
	// pre-buffered into a Blob. Skips the cache entirely - the URL stays
	// valid for as long as the extraction folder exists, no revocation
	// needed.
	if (
		media._extractionId &&
		(media.type === 'video' || media.type === 'audio')
	) {
		media.url = getExtractedMediaUrl(media.path, media._extractionId);
		media._loaded = true;
		return media.url;
	}

	// Check if in cache
	const cached = loadedMediaCache.get(media.path);
	if (cached) {
		cached.refCount++;
		media.url = cached.url;
		media._loaded = true;
		return cached.url;
	}

	// Evict old entries if cache is full
	if (loadedMediaCache.size >= MAX_CACHED_MEDIA) {
		evictOldestFromCache();
	}

	// Load the blob with correct MIME type
	const arrayBuffer = await getMediaBytes(media);
	const mimeType = getMimeType(media.name);
	const blob = new Blob([arrayBuffer], { type: mimeType });
	const url = URL.createObjectURL(blob);

	// Cache it
	loadedMediaCache.set(media.path, { url, refCount: 1 });

	// Update media object
	media.blob = blob;
	media.url = url;
	media.size = blob.size;
	media._loaded = true;

	return url;
}

/**
 * Evict the oldest/least used entries from cache
 */
function evictOldestFromCache(): void {
	// Simple strategy: remove entries with lowest refCount
	const entries = Array.from(loadedMediaCache.entries());
	entries.sort((a, b) => a[1].refCount - b[1].refCount);

	// Remove bottom 20%
	const toRemove = Math.max(1, Math.floor(entries.length * 0.2));
	for (let i = 0; i < toRemove; i++) {
		const [path, { url }] = entries[i];
		URL.revokeObjectURL(url);
		loadedMediaCache.delete(path);
	}
}

/**
 * Clean up media URLs when done
 */
export function cleanupMediaUrls(mediaFiles: MediaFile[]): void {
	for (const media of mediaFiles) {
		if (media.url) {
			URL.revokeObjectURL(media.url);
			media.url = undefined;
			media.blob = undefined;
			media._loaded = false;
		}
	}
	// Clear the cache
	for (const { url } of loadedMediaCache.values()) {
		URL.revokeObjectURL(url);
	}
	loadedMediaCache.clear();
}

/**
 * Preload visible media files (for smooth scrolling)
 * Call this with the media files that are about to be visible
 */
export async function preloadMedia(mediaFiles: MediaFile[]): Promise<void> {
	// Limit concurrent loads to avoid overwhelming the browser
	const BATCH_SIZE = 5;

	for (let i = 0; i < mediaFiles.length; i += BATCH_SIZE) {
		const batch = mediaFiles.slice(i, i + BATCH_SIZE);
		await Promise.all(
			batch
				.filter((m) => !m._loaded && mediaFileHasSource(m))
				.map((m) => loadMediaFile(m).catch(() => {})), // Ignore individual failures
		);
	}
}
