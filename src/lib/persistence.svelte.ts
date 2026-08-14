/**
 * Persistent Conversation Storage
 * Allows users to save chat sessions across app restarts without storing large ZIP files.
 *
 * Storage Strategy (Hybrid Approach):
 * - Electron: Store absolute file path, read from disk on restore
 * - Web (Chromium): Store FileSystemFileHandle in IndexedDB
 * - Web (Firefox/Safari): Store metadata only, prompt to re-select file
 *
 * What Gets Stored (Always Small ~1MB):
 * - Chat metadata (title, filename, timestamps, message count)
 * - Bookmarks array
 * - Transcriptions map
 * - Settings (language, autoLoadMedia, perspective)
 * - File reference (path/handle/reselect-required marker)
 *
 * The actual ZIP file content is NEVER stored in the browser.
 */

import { del, get, keys, set } from 'idb-keyval';
import { browser } from '$app/environment';
import type { Bookmark } from './bookmarks.svelte';
import type { StoredPin } from './helpers/lock-crypto';
import type { ChatData } from './state.svelte';

export interface PersistedChatMetadata {
	id: string; // Unique ID (crypto.randomUUID)
	fileName: string; // Original filename
	chatTitle: string; // Parsed chat title (for display)
	messageCount: number; // For validation
	firstMessageTimestamp: string; // ISO string - for validation
	lastMessageTimestamp: string; // ISO string - for validation
	firstMessageIds: string[]; // First 5 message IDs (backup validation for iOS)
	savedAt: string; // ISO timestamp
	updatedAt: string; // ISO timestamp (for sorting)

	// File reference (varies by platform)
	fileReference:
		| { type: 'electron-path'; filePath: string }
		| { type: 'file-handle'; handleId: string } // Handle stored separately
		| { type: 'reselect-required' }
		// Electron only - chat was streamed to disk instead of buffered in
		// memory (see electron/lib/extract-zip.cjs). originalFilePath is kept
		// as a fallback to re-extract from if the extraction folder is gone
		// (e.g. app data was cleared).
		| {
				type: 'electron-extracted';
				extractionDir: string;
				extractionId: string;
				originalFilePath: string;
		  };

	// Persisted data (always stored - small)
	bookmarks: Bookmark[];
	transcriptions: Record<string, string>;
	settings: {
		language: string;
		autoLoadMedia: boolean;
		perspective: string | null;
		locked: boolean;
	};
}

interface ValidationResult {
	valid: boolean;
	confidence: 'high' | 'medium' | 'low';
	reasons: string[];
}

const PERSISTENCE_PREFIX = 'whatsapp-persisted-chat-';
const HANDLE_PREFIX = 'whatsapp-file-handle-';
const DONT_SHOW_KEY = 'whatsapp-dont-show-restore-modal';
const LOCK_PIN_KEY = 'whatsapp-lock-settings';
const LOCK_WEBAUTHN_KEY = 'whatsapp-lock-webauthn-credential';
const ONBOARDING_COMPLETED_KEY = 'whatsapp-onboarding-completed';
const APP_LOCK_SETTINGS_KEY = 'whatsapp-app-lock-settings';

// Number of message IDs to store for validation (helps with iOS exports that lack chat title)
const VALIDATION_MESSAGE_ID_COUNT = 5;

/**
 * Store a FileSystemFileHandle in IndexedDB
 */
export async function storeFileHandle(
	handleId: string,
	handle: FileSystemFileHandle,
): Promise<void> {
	await set(`${HANDLE_PREFIX}${handleId}`, handle);
}

/**
 * Get a stored FileSystemFileHandle from IndexedDB
 */
async function getStoredFileHandle(
	handleId: string,
): Promise<FileSystemFileHandle | null> {
	try {
		const handle = await get<FileSystemFileHandle>(
			`${HANDLE_PREFIX}${handleId}`,
		);
		return handle || null;
	} catch (e) {
		console.error('Failed to get stored file handle from IndexedDB:', e);
		return null;
	}
}

/**
 * Verify permission for a FileSystemFileHandle.
 * Queries current permission state; optionally requests permission if shouldRequest
 * is true (requires an active user gesture).
 * @returns 'granted' | 'denied' | 'prompt'
 */
async function verifyHandlePermission(
	handle: FileSystemFileHandle,
	shouldRequest = false,
): Promise<PermissionState> {
	try {
		const opts: FileSystemHandlePermissionDescriptor = {};

		// First check current permission
		let permission = await handle.queryPermission(opts);

		// If permission is 'prompt' and we should request (have user gesture), request it
		if (permission === 'prompt' && shouldRequest) {
			try {
				permission = await handle.requestPermission(opts);
			} catch (e) {
				// Request failed (no user gesture or user denied)
				console.warn('Failed to request file permission:', e);
				return 'denied';
			}
		}

		return permission;
	} catch (e) {
		console.error('Failed to verify file handle permission:', e);
		return 'prompt';
	}
}

/**
 * Request persistent storage to prevent eviction
 *
 * Note: This is a browser permission request that may fail if:
 * - The browser doesn't support the API
 * - The user denies permission
 * - The site doesn't meet browser criteria for persistent storage
 *
 * If the request fails, the data may still be stored but could be evicted
 * by the browser if storage space is needed.
 *
 * @returns Promise<boolean> - true if persistent storage was granted, false otherwise
 */
async function requestPersistentStorage(): Promise<boolean> {
	if (!browser || !navigator.storage?.persist) return false;
	try {
		const granted = await navigator.storage.persist();
		return granted;
	} catch (e) {
		console.error('Failed to request persistent storage:', e);
		return false;
	}
}

/**
 * Save a persisted chat
 */
export async function savePersistedChat(
	chat: ChatData,
	file: File | null,
	bookmarks: Bookmark[],
	transcriptions: Record<string, string>,
	settings: {
		language: string;
		autoLoadMedia: boolean;
		perspective: string | null;
		locked: boolean;
	},
	filePath?: string, // For Electron
	fileHandle?: FileSystemFileHandle, // For web with File System Access API
	extraction?: { extractionDir: string; extractionId: string }, // For Electron chats imported via the streaming extraction pipeline
): Promise<string> {
	if (!browser) throw new Error('Persistence only available in browser');

	// Remove any existing entry for this chat to prevent duplicates - but only
	// once confirmed it's genuinely the same chat (not just a same-titled
	// different one, which would otherwise silently destroy its data). This is
	// a defense-in-depth backstop; the primary guard is resolveUniqueChatTitle
	// at import time in +page.svelte.
	const existing = await findPersistedChatByTitle(chat.title);
	if (existing && validateRestoredFile(chat, existing).valid) {
		await removePersistedChat(existing.id);
	}

	// Generate unique ID
	const id = crypto.randomUUID();

	// Extract first message IDs for validation
	const firstMessageIds = chat.messages
		.slice(0, VALIDATION_MESSAGE_ID_COUNT)
		.map((msg) => msg.id)
		.filter(Boolean);

	// Determine file reference based on platform
	let fileReference: PersistedChatMetadata['fileReference'];

	// Check if running in Electron
	const isElectron = window.electronAPI?.isElectron;

	if (isElectron && extraction) {
		// Electron: chat was streamed to an extraction folder on disk -
		// restoring re-reads that folder's manifest instantly, no re-parsing
		// of the original zip needed.
		fileReference = {
			type: 'electron-extracted',
			extractionDir: extraction.extractionDir,
			extractionId: extraction.extractionId,
			originalFilePath: filePath ?? '',
		};
	} else if (isElectron && filePath) {
		// Electron: store absolute file path
		fileReference = { type: 'electron-path', filePath };
	} else if (fileHandle) {
		// Web (Chromium): store file handle
		const handleId = id; // Use the same ID for the handle
		await storeFileHandle(handleId, fileHandle);
		fileReference = { type: 'file-handle', handleId };
	} else {
		// No handle/path available: require reselect (Firefox/Safari, or no file)
		fileReference = { type: 'reselect-required' };
	}

	const metadata: PersistedChatMetadata = {
		id,
		fileName: file?.name || chat.title,
		chatTitle: chat.title,
		messageCount: chat.messages.length,
		firstMessageTimestamp:
			chat.messages[0]?.timestamp.toISOString() || new Date().toISOString(),
		lastMessageTimestamp:
			chat.messages[chat.messages.length - 1]?.timestamp.toISOString() ||
			new Date().toISOString(),
		firstMessageIds,
		savedAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		fileReference,
		bookmarks,
		transcriptions,
		settings,
	};

	// Save metadata
	await set(`${PERSISTENCE_PREFIX}${id}`, metadata);

	// Request persistent storage
	await requestPersistentStorage();

	return id;
}

/**
 * Get all persisted chats (sorted by updatedAt)
 */
export async function getPersistedChats(): Promise<PersistedChatMetadata[]> {
	if (!browser) return [];

	try {
		const allKeys = await keys();
		const chatKeys = allKeys.filter(
			(key) => typeof key === 'string' && key.startsWith(PERSISTENCE_PREFIX),
		);

		const chats: PersistedChatMetadata[] = [];
		for (const key of chatKeys) {
			const metadata = await get<PersistedChatMetadata>(key as string);
			if (metadata) {
				chats.push(metadata);
			}
		}

		// Sort by updatedAt (most recent first)
		return chats.sort(
			(a, b) =>
				new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
		);
	} catch (e) {
		console.error('Failed to get persisted chats:', e);
		return [];
	}
}

/**
 * Remove a persisted chat
 */
export async function removePersistedChat(id: string): Promise<void> {
	if (!browser) return;

	try {
		const metadata = await get<PersistedChatMetadata>(
			`${PERSISTENCE_PREFIX}${id}`,
		);
		await del(`${PERSISTENCE_PREFIX}${id}`);
		// Remove associated file handle if this was a file-handle reference
		if (metadata?.fileReference.type === 'file-handle') {
			await del(`${HANDLE_PREFIX}${metadata.fileReference.handleId}`);
		}
		// Delete the on-disk extraction folder if this was an
		// electron-extracted reference - every "delete this persisted chat"
		// call site funnels through here, so this alone covers all of them.
		if (
			metadata?.fileReference.type === 'electron-extracted' &&
			window.electronAPI?.isElectron &&
			window.electronAPI.extraction
		) {
			await window.electronAPI.extraction
				.deleteDir(metadata.fileReference.extractionDir)
				.catch((e) => {
					console.error('Failed to delete extraction folder:', e);
				});
		}
	} catch (e) {
		console.error('Failed to remove persisted chat:', e);
	}
}

/**
 * Update a persisted chat (for updating bookmarks/transcriptions)
 */
export async function updatePersistedChat(
	id: string,
	updates: Partial<PersistedChatMetadata>,
): Promise<void> {
	if (!browser) return;

	try {
		const metadata = await get<PersistedChatMetadata>(
			`${PERSISTENCE_PREFIX}${id}`,
		);
		if (!metadata) throw new Error('Chat not found');

		const updated: PersistedChatMetadata = {
			...metadata,
			...updates,
			updatedAt: new Date().toISOString(),
		};

		await set(`${PERSISTENCE_PREFIX}${id}`, updated);
	} catch (e) {
		console.error('Failed to update persisted chat:', e);
		throw e;
	}
}

/**
 * Validate a restored file against saved metadata. Only reads
 * `parsed.messages`, so a lightweight pre-check result (parsed messages
 * without a full ChatData) can reuse this directly - see
 * checkForDuplicateImport in zip-parser.ts.
 */
export function validateRestoredFile(
	parsed: Pick<ChatData, 'messages'>,
	saved: PersistedChatMetadata,
): ValidationResult {
	const reasons: string[] = [];
	let matchCount = 0;

	// Check message count
	const messageCountMatch = parsed.messages.length === saved.messageCount;
	if (messageCountMatch) {
		matchCount++;
	} else {
		reasons.push(
			`Message count mismatch: expected ${saved.messageCount}, got ${parsed.messages.length}`,
		);
	}

	// Check first message timestamp
	const firstMessageMatch =
		parsed.messages[0]?.timestamp.toISOString() === saved.firstMessageTimestamp;
	if (firstMessageMatch) {
		matchCount++;
	} else {
		reasons.push('First message timestamp mismatch');
	}

	// Check last message timestamp
	const lastMessageMatch =
		parsed.messages[parsed.messages.length - 1]?.timestamp.toISOString() ===
		saved.lastMessageTimestamp;
	if (lastMessageMatch) {
		matchCount++;
	} else {
		reasons.push('Last message timestamp mismatch');
	}

	// Check first message IDs
	const parsedFirstIds = parsed.messages
		.slice(0, VALIDATION_MESSAGE_ID_COUNT)
		.map((msg) => msg.id)
		.filter(Boolean);
	const firstIdsMatch =
		parsedFirstIds.length === saved.firstMessageIds.length &&
		parsedFirstIds.every((id, idx) => id === saved.firstMessageIds[idx]);
	if (firstIdsMatch) {
		matchCount++;
	} else {
		reasons.push('First message IDs mismatch');
	}

	// Determine confidence level
	let confidence: 'high' | 'medium' | 'low';
	if (messageCountMatch && firstMessageMatch && lastMessageMatch) {
		confidence = 'high';
	} else if (matchCount >= 2) {
		confidence = 'medium';
	} else {
		confidence = 'low';
	}

	return {
		valid: matchCount >= 2, // At least 2 signals must match
		confidence,
		reasons,
	};
}

/**
 * Restore a chat from file (Electron path or reselected file)
 */
export async function restoreChat(
	persistedChat: PersistedChatMetadata,
	file?: File,
): Promise<{
	success: boolean;
	data?: {
		buffer?: ArrayBuffer;
		name: string;
		metadata: PersistedChatMetadata;
		// Set instead of buffer when restoring from an Electron extraction
		// folder - no re-parsing of the original zip needed.
		extracted?: {
			extractionDir: string;
			extractionId: string;
			originalFileName?: string;
			entries: { name: string; path: string; size: number }[];
		};
	};
	error?: string;
	needsReselect?: boolean;
}> {
	if (!browser)
		return { success: false, error: 'Restoration only available in browser' };

	const { fileReference } = persistedChat;

	try {
		// Electron extraction folder - instant restore, no re-extraction
		if (fileReference.type === 'electron-extracted') {
			const isElectron = window.electronAPI?.isElectron;
			if (!isElectron || !window.electronAPI?.extraction) {
				return { success: false, needsReselect: true };
			}

			const manifest = await window.electronAPI.extraction.loadManifest(
				fileReference.extractionDir,
			);
			if (manifest.success && manifest.entries) {
				return {
					success: true,
					data: {
						name: manifest.originalFileName || persistedChat.fileName,
						metadata: persistedChat,
						extracted: {
							extractionDir: fileReference.extractionDir,
							extractionId: fileReference.extractionId,
							originalFileName: manifest.originalFileName,
							entries: manifest.entries,
						},
					},
				};
			}

			// Extraction folder is gone (e.g. app data was cleared) - fall back
			// to re-extracting from the original zip path before giving up.
			const originalExists = fileReference.originalFilePath
				? await window.electronAPI.fileExists(fileReference.originalFilePath)
				: false;
			if (!originalExists) {
				return {
					success: false,
					error: 'Extraction folder not found and original file is gone',
					needsReselect: true,
				};
			}

			const extractResult = await window.electronAPI.extraction.extract(
				fileReference.originalFilePath,
				fileReference.extractionId,
			);
			if (!extractResult.success || !extractResult.entries) {
				return {
					success: false,
					error: extractResult.error || 'Failed to re-extract',
					needsReselect: true,
				};
			}

			return {
				success: true,
				data: {
					name: extractResult.originalFileName || persistedChat.fileName,
					metadata: persistedChat,
					extracted: {
						extractionDir: fileReference.extractionDir,
						extractionId: fileReference.extractionId,
						originalFileName: extractResult.originalFileName,
						entries: extractResult.entries,
					},
				},
			};
		}

		// Electron path
		if (fileReference.type === 'electron-path') {
			const isElectron = window.electronAPI?.isElectron;
			if (!isElectron || !window.electronAPI) {
				return { success: false, needsReselect: true };
			}

			// Check if file exists
			const exists = await window.electronAPI.fileExists(
				fileReference.filePath,
			);
			if (!exists) {
				return {
					success: false,
					error: 'File not found at saved path',
					needsReselect: true,
				};
			}

			// Read file from path
			const result = await window.electronAPI.readFileFromPath(
				fileReference.filePath,
			);
			if (!result.success || !result.buffer) {
				return {
					success: false,
					error: result.error || 'Failed to read file',
					needsReselect: true,
				};
			}

			return {
				success: true,
				data: {
					buffer: result.buffer,
					name: result.name || persistedChat.fileName,
					metadata: persistedChat,
				},
			};
		}

		// File handle (Chromium with File System Access API)
		if (fileReference.type === 'file-handle') {
			const handle = await getStoredFileHandle(fileReference.handleId);
			if (!handle) {
				return {
					success: false,
					error: 'File handle not found',
					needsReselect: true,
				};
			}

			// Check and request permission (we have user gesture from "Restore" click)
			const permission = await verifyHandlePermission(handle, true);
			if (permission !== 'granted') {
				return {
					success: false,
					error: 'File permission denied',
					needsReselect: true,
				};
			}

			// Read file from handle
			try {
				const fileFromHandle = await handle.getFile();
				const buffer = await fileFromHandle.arrayBuffer();
				return {
					success: true,
					data: {
						buffer,
						name: fileFromHandle.name,
						metadata: persistedChat,
					},
				};
			} catch (e) {
				console.error('Failed to read file from handle:', e);
				return {
					success: false,
					error: 'Failed to read file from handle',
					needsReselect: true,
				};
			}
		}

		// Reselect required
		if (fileReference.type === 'reselect-required') {
			if (!file) {
				return { success: false, needsReselect: true };
			}

			// User provided file - use it
			const buffer = await file.arrayBuffer();
			return {
				success: true,
				data: {
					buffer,
					name: file.name,
					metadata: persistedChat,
				},
			};
		}

		return { success: false, error: 'Unknown file reference type' };
	} catch (e) {
		console.error('Failed to restore chat:', e);
		return {
			success: false,
			error: e instanceof Error ? e.message : 'Unknown error',
		};
	}
}

/**
 * Get "don't show again" preference
 */
export async function getDontShowRestoreModal(): Promise<boolean> {
	if (!browser) return false;
	try {
		return (await get<boolean>(DONT_SHOW_KEY)) || false;
	} catch (e) {
		console.error('Failed to get dont-show-restore-modal preference:', e);
		return false;
	}
}

/**
 * Set "don't show again" preference
 */
export async function setDontShowRestoreModal(value: boolean): Promise<void> {
	if (!browser) return;
	try {
		await set(DONT_SHOW_KEY, value);
	} catch (e) {
		console.error('Failed to set dont show preference:', e);
	}
}

/**
 * Get the stored chat-lock PIN (hash + salt), or null if no PIN has been set
 */
export async function getLockPin(): Promise<StoredPin | null> {
	if (!browser) return null;
	try {
		return (await get<StoredPin>(LOCK_PIN_KEY)) || null;
	} catch (e) {
		console.error('Failed to get lock PIN:', e);
		return null;
	}
}

/**
 * Store the chat-lock PIN (hash + salt)
 */
export async function setLockPin(pin: StoredPin): Promise<void> {
	if (!browser) return;
	try {
		await set(LOCK_PIN_KEY, pin);
	} catch (e) {
		console.error('Failed to set lock PIN:', e);
	}
}

/**
 * Clear the chat-lock PIN (used by the "forgot PIN" recovery flow)
 */
export async function clearLockPin(): Promise<void> {
	if (!browser) return;
	try {
		await del(LOCK_PIN_KEY);
		// Resetting the PIN resets biometric registration too, so no orphaned
		// credential is left pointing at whatever was registered before.
		await del(LOCK_WEBAUTHN_KEY);
	} catch (e) {
		console.error('Failed to clear lock PIN:', e);
	}
}

/**
 * Get the registered WebAuthn credential ID for biometric unlock, or null
 * if none has been registered.
 */
export async function getWebAuthnCredentialId(): Promise<string | null> {
	if (!browser) return null;
	try {
		return (await get<string>(LOCK_WEBAUTHN_KEY)) || null;
	} catch (e) {
		console.error('Failed to get WebAuthn credential:', e);
		return null;
	}
}

/**
 * Store the WebAuthn credential ID used for biometric unlock
 */
export async function setWebAuthnCredentialId(id: string): Promise<void> {
	if (!browser) return;
	try {
		await set(LOCK_WEBAUTHN_KEY, id);
	} catch (e) {
		console.error('Failed to set WebAuthn credential:', e);
	}
}

/**
 * Clear the registered WebAuthn credential ID
 */
export async function clearWebAuthnCredentialId(): Promise<void> {
	if (!browser) return;
	try {
		await del(LOCK_WEBAUTHN_KEY);
	} catch (e) {
		console.error('Failed to clear WebAuthn credential:', e);
	}
}

/**
 * Whether the first-launch onboarding flow has been completed
 */
export async function getOnboardingCompleted(): Promise<boolean> {
	if (!browser) return false;
	try {
		return (await get<boolean>(ONBOARDING_COMPLETED_KEY)) || false;
	} catch (e) {
		console.error('Failed to get onboarding status:', e);
		return false;
	}
}

export async function setOnboardingCompleted(value: boolean): Promise<void> {
	if (!browser) return;
	try {
		await set(ONBOARDING_COMPLETED_KEY, value);
	} catch (e) {
		console.error('Failed to set onboarding status:', e);
	}
}

export interface AppLockSettings {
	enabled: boolean;
	// null = idle-timeout auto-lock disabled
	autoLockIdleMinutes: number | null;
	// Lock when the app window loses focus or is minimized
	lockOnBlur: boolean;
}

const DEFAULT_APP_LOCK_SETTINGS: AppLockSettings = {
	enabled: false,
	autoLockIdleMinutes: 5,
	lockOnBlur: true,
};

/**
 * Get the app-wide lock settings (whether the whole app is gated behind
 * the shared PIN, not just individual chats)
 */
export async function getAppLockSettings(): Promise<AppLockSettings> {
	if (!browser) return DEFAULT_APP_LOCK_SETTINGS;
	try {
		return (
			(await get<AppLockSettings>(APP_LOCK_SETTINGS_KEY)) ||
			DEFAULT_APP_LOCK_SETTINGS
		);
	} catch (e) {
		console.error('Failed to get app lock settings:', e);
		return DEFAULT_APP_LOCK_SETTINGS;
	}
}

export async function setAppLockSettings(
	settings: AppLockSettings,
): Promise<void> {
	if (!browser) return;
	try {
		await set(APP_LOCK_SETTINGS_KEY, settings);
	} catch (e) {
		console.error('Failed to set app lock settings:', e);
	}
}

/**
 * Type guard to check if a file reference is an electron-path type
 */
export function isElectronPathReference(
	ref: PersistedChatMetadata['fileReference'],
): ref is { type: 'electron-path'; filePath: string } {
	return ref.type === 'electron-path';
}

/**
 * Type guard to check if a file reference is an electron-extracted type
 */
export function isElectronExtractedReference(
	ref: PersistedChatMetadata['fileReference'],
): ref is {
	type: 'electron-extracted';
	extractionDir: string;
	extractionId: string;
	originalFilePath: string;
} {
	return ref.type === 'electron-extracted';
}

/**
 * Find persisted chat by chat title
 */
export async function findPersistedChatByTitle(
	chatTitle: string,
): Promise<PersistedChatMetadata | null> {
	if (!browser) return null;

	try {
		const chats = await getPersistedChats();
		return chats.find((chat) => chat.chatTitle === chatTitle) || null;
	} catch (e) {
		console.error('Failed to find persisted chat:', e);
		return null;
	}
}
