<script lang="ts">
import { tick } from 'svelte';
import { browser } from '$app/environment';
import favicon from '$lib/assets/favicon.png';
import { getAutoUpdaterState, initAutoUpdater } from '$lib/auto-updater.svelte';
import { bookmarksState } from '$lib/bookmarks.svelte';
import {
	ChatList,
	ChatStats,
	ChatView,
	Collapsible,
	Dropdown,
	DropdownHeader,
	DropdownList,
	DropdownSearch,
	FeatureItem,
	FileDropZone,
	SearchBar,
	VersionBadge,
} from '$lib/components';
import AutoUpdateToast from '$lib/components/AutoUpdateToast.svelte';
import BookmarksPanel from '$lib/components/BookmarksPanel.svelte';
import Icon from '$lib/components/Icon.svelte';
import IconButton from '$lib/components/IconButton.svelte';
import ListItemButton from '$lib/components/ListItemButton.svelte';
import LocaleSwitcher from '$lib/components/LocaleSwitcher.svelte';
import LockedChatPane from '$lib/components/LockedChatPane.svelte';
import LockPinModal from '$lib/components/LockPinModal.svelte';
import MediaGallery from '$lib/components/MediaGallery.svelte';
import MergeChatsModal from '$lib/components/MergeChatsModal.svelte';
import Modal from '$lib/components/Modal.svelte';
import ModalContent from '$lib/components/ModalContent.svelte';
import ModalHeader from '$lib/components/ModalHeader.svelte';
import OnThisDayBanner from '$lib/components/OnThisDayBanner.svelte';
import ReselectFileModal from '$lib/components/ReselectFileModal.svelte';
import RestoreSessionModal from '$lib/components/RestoreSessionModal.svelte';
import Toast from '$lib/components/Toast.svelte';
import { triggerDownload } from '$lib/helpers/download';
import { buildChatExportHtml } from '$lib/helpers/export-chat';
import {
	getElectronFilePath,
	openElectronFile,
} from '$lib/helpers/file-picker';
import { sanitizeFilename } from '$lib/helpers/format';
import { mergeChats } from '$lib/helpers/merge-chats';
import {
	dismissOnThisDay,
	findOnThisDayMatch,
	isOnThisDayDismissed,
} from '$lib/helpers/on-this-day';
import {
	isElectronMac as checkIsElectronMac,
	isElectronApp,
	isMobileViewport,
} from '$lib/helpers/responsive';
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import {
	parseZipFile,
	readFileAsArrayBuffer,
	toLocalDateKey,
} from '$lib/parser';
import {
	clearLockPin,
	findPersistedChatByTitle,
	getDontShowRestoreModal,
	getLockPin,
	getPersistedChats,
	isElectronPathReference,
	type PersistedChatMetadata,
	removePersistedChat,
	restoreChat,
	savePersistedChat,
	storeFileHandle,
	updatePersistedChat,
	validateRestoredFile,
} from '$lib/persistence.svelte';
import { appState, type ChatData, type LoadingChat } from '$lib/state.svelte';
import {
	getTranscriptionsForChat,
	setTranscriptionLanguage,
	setTranscriptionsForChat,
} from '$lib/transcription.svelte';

// Detect if running in Electron
const isElectron = isElectronApp();

// Detect if running in Electron on macOS (only macOS needs custom titlebar)
const isElectronMac = checkIsElectronMac();

// Dark mode state - check if dark class is on html element
let isDarkMode = $state(
	browser ? document.documentElement.classList.contains('dark') : true,
);

function toggleDarkMode() {
	isDarkMode = !isDarkMode;
	if (browser) {
		if (isDarkMode) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
		// Only persist to localStorage when user explicitly toggles
		localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
	}
}

// Auto-updater state
const autoUpdaterState = $derived(getAutoUpdaterState());

// Initialize auto-updater when the app loads (Electron only)
$effect(() => {
	if (browser && isElectron) {
		initAutoUpdater();
	}
});

let showStats = $state(false);
let showSidebar = $state(true);
let sidebarFileInput: HTMLInputElement | undefined = $state();
let showBookmarks = $state(false);
let showMediaGallery = $state(false);
let showParticipants = $state(false);
let participantStats = $state<Map<string, number> | null>(null);
let scrollToMessageId = $state<string | null>(null);
let showMergeChatsModal = $state(false);

// Toast notification state
let toastMessage = $state<string | null>(null);
let toastType = $state<'success' | 'error' | 'info'>('success');

function showToast(
	message: string,
	type: 'success' | 'error' | 'info' = 'success',
) {
	toastMessage = message;
	toastType = type;
}

function hideToast() {
	toastMessage = null;
}

// Compute participant stats when modal opens (not during render)
function openParticipantsModal() {
	if (!appState.selectedChat) return;

	// Pre-compute message counts in a single pass
	const counts = new Map<string, number>();
	for (const msg of appState.selectedChat.messages) {
		if (msg.sender) {
			counts.set(msg.sender, (counts.get(msg.sender) || 0) + 1);
		}
	}
	participantStats = counts;
	showParticipants = true;
}

function closeParticipantsModal() {
	showParticipants = false;
	participantStats = null;
}
let showPerspectiveDropdown = $state(false);
let perspectiveSearchQuery = $state('');
let showChatOptionsDropdown = $state(false);
let chatOptionsButtonRef = $state<HTMLButtonElement | null>(null);

// Loading chats state - shows placeholder items while importing
let loadingChats = $state<LoadingChat[]>([]);

// Derived loading state for FileDropZone (empty state)
const isLoadingFiles = $derived(loadingChats.length > 0);
const loadingFilesProgress = $derived.by(() => {
	if (loadingChats.length === 0) return 0;
	const total = loadingChats.reduce((sum, lc) => sum + lc.progress, 0);
	return total / loadingChats.length;
});
let perspectiveButtonRef = $state<HTMLButtonElement | null>(null);
let perspectiveSearchInputRef = $state<HTMLInputElement | null>(null);

// Auto-focus search input when perspective dropdown opens
$effect(() => {
	if (showPerspectiveDropdown && perspectiveSearchInputRef) {
		// Small delay to ensure the element is rendered and positioned
		setTimeout(() => perspectiveSearchInputRef?.focus(), 50);
	}
});

// Store selected perspective per chat (chatTitle -> participant name or null for "None")
let perspectiveByChat = $state<Map<string, string | null>>(new Map());

// Store transcription language per chat (chatTitle -> language code)
let languageByChat = $state<Map<string, string>>(new Map());

// Store auto-load media preference per chat (chatTitle -> enabled)
let autoLoadMediaByChat = $state<Map<string, boolean>>(new Map());

// Store chat-lock flag per chat (chatTitle -> locked)
let lockedByChat = $state<Map<string, boolean>>(new Map());
// Chats unlocked (PIN entered) for the current session only — never persisted,
// so every locked chat re-locks after a reload/restart.
let unlockedThisSession = $state<Set<string>>(new Set());
// Pending PIN modal request; null when no lock modal should be shown.
let lockPinRequest = $state<{
	mode: 'setup' | 'unlock';
	purpose?: 'view' | 'remove';
	chatTitle: string;
} | null>(null);

const lockedChatTitles = $derived(
	new Set(
		[...lockedByChat].filter(([, locked]) => locked).map(([title]) => title),
	),
);
const isSelectedChatLocked = $derived(
	!!appState.selectedChat &&
		lockedByChat.get(appState.selectedChat.title) === true &&
		!unlockedThisSession.has(appState.selectedChat.title),
);
// True while viewing a locked chat that was unlocked (PIN/biometric) this
// session — the state that shows the "Lock now" re-lock button.
const isViewingUnlockedLockedChat = $derived(
	!!appState.selectedChat &&
		lockedByChat.get(appState.selectedChat.title) === true &&
		unlockedThisSession.has(appState.selectedChat.title),
);

// Auto re-lock a session-unlocked chat the moment the user navigates away
// from it, mirroring the previousChatId pattern in ChatView.svelte.
let previousSelectedChatTitle = $state<string | null>(null);
$effect(() => {
	const currentTitle = appState.selectedChat?.title ?? null;
	if (
		previousSelectedChatTitle &&
		previousSelectedChatTitle !== currentTitle &&
		unlockedThisSession.has(previousSelectedChatTitle)
	) {
		unlockedThisSession.delete(previousSelectedChatTitle);
		unlockedThisSession = new Set(unlockedThisSession);
	}
	previousSelectedChatTitle = currentTitle;
});

// Persistence state
let rememberedChats = $state<Set<string>>(new Set());

function addRemembered(chatTitle: string) {
	rememberedChats.add(chatTitle);
	rememberedChats = new Set(rememberedChats);
}

function removeRemembered(chatTitle: string) {
	rememberedChats.delete(chatTitle);
	rememberedChats = new Set(rememberedChats);
}
let showRestoreSessionModal = $state(false);
let showReselectFileModal = $state(false);
let reselectChatMetadata = $state<PersistedChatMetadata | null>(null);
let reselectResolve:
	| ((
			result: {
				file: File;
				path?: string;
				handle?: FileSystemFileHandle;
			} | null,
	  ) => void)
	| null = null;
let persistedChatsToRestore = $state<PersistedChatMetadata[]>([]);

// Track file references for persistence (chatTitle -> {file, filePath, fileHandle, persistedId})
// Note: mutated via .set()/.delete() without reassignment — read imperatively, not in reactive contexts
let chatFileReferences = $state<
	Map<
		string,
		{
			file: File | null;
			filePath?: string;
			fileHandle?: FileSystemFileHandle;
			persistedId?: string;
		}
	>
>(new Map());

// Get auto-load media setting for the current chat
const autoLoadMediaForCurrentChat = $derived.by(() => {
	if (!appState.selectedChat) return false;
	return autoLoadMediaByChat.get(appState.selectedChat.title) || false;
});

const STAGE_PROGRESS = {
	reading: { offset: 0.0, weight: 0.1 },
	extracting: { offset: 0.1, weight: 0.5 },
	parsing: { offset: 0.6, weight: 0.4 },
} as const;

function startIndexWorker(chatData: ChatData) {
	const indexWorker = new Worker(
		new URL('$lib/workers/index-worker.ts', import.meta.url),
		{ type: 'module' },
	);

	indexWorker.onmessage = (
		event: MessageEvent<{
			chatTitle: string;
			indexEntries: [string, number][];
			flatItems: Array<
				| { type: 'date'; dateKey: string }
				| { type: 'message'; messageId: string }
			>;
			serializedMessages: Array<{
				id: string;
				timestamp: string;
				sender: string;
				content: string;
				isSystemMessage: boolean;
				isMediaMessage: boolean;
				mediaType?: string;
				rawLine: string;
			}>;
		}>,
	) => {
		const { chatTitle, indexEntries, flatItems, serializedMessages } =
			event.data;
		const messageIndex = new Map(indexEntries);
		appState.updateChatMessageIndex(chatTitle, messageIndex);
		appState.updateChatFlatItems(chatTitle, flatItems);
		appState.updateChatSerializedMessages(chatTitle, serializedMessages);
		indexWorker.terminate();
	};

	indexWorker.onerror = (err) => {
		console.error('Index worker error:', err);
		indexWorker.terminate();
	};

	indexWorker.postMessage({
		messages: chatData.messages.map((m) => ({
			id: m.id,
			timestamp: m.timestamp.toISOString(),
			sender: m.sender,
			content: m.content,
			isSystemMessage: m.isSystemMessage,
			isMediaMessage: m.isMediaMessage,
			mediaType: m.mediaType,
			rawLine: m.rawLine,
		})),
		chatTitle: chatData.title,
	});
}

function makeProgressCallback(loadingId: string) {
	return async ({
		stage,
		progress,
	}: {
		stage: LoadingChat['stage'];
		progress: number;
	}) => {
		const { offset: stageOffset, weight: stageWeight } =
			STAGE_PROGRESS[stage] ?? STAGE_PROGRESS.extracting;
		const overallProgress =
			10 + (stageOffset + (progress / 100) * stageWeight) * 90;
		loadingChats = loadingChats.map((lc) =>
			lc.id === loadingId ? { ...lc, progress: overallProgress, stage } : lc,
		);
	};
}

async function handleSidebarImport() {
	if (window.electronAPI) {
		const result = await openElectronFile();
		if (result) {
			const dt = new DataTransfer();
			dt.items.add(result.file);
			handleFilesSelected(
				dt.files,
				undefined,
				result.path ? [result.path] : undefined,
			);
		}
	} else {
		// Deliberately use the plain <input type="file"> dialog instead of
		// showOpenFilePicker(): Chrome spuriously flags the tab as "Page
		// Unresponsive" while that picker's promise is pending and the user
		// is still browsing. Drag-and-drop still captures a FileSystemFileHandle.
		sidebarFileInput?.click();
	}
}

async function handleFilesSelected(
	files: FileList,
	handles?: FileSystemFileHandle[],
	paths?: string[],
) {
	appState.clearError();

	let handleIndex = 0;
	for (const file of files) {
		if (!file.name.endsWith('.zip')) {
			appState.setError(m.error_unsupported_file({ filename: file.name }));
			continue;
		}

		// Create a loading placeholder for this file
		const loadingId = crypto.randomUUID();
		const filename = sanitizeFilename(file.name);

		loadingChats = [
			...loadingChats,
			{
				id: loadingId,
				filename,
				progress: 0,
				stage: 'reading',
			},
		];

		// Capture values before async IIFE to avoid closure-over-loop-variable bug
		const currentHandleIndex = handleIndex;
		// File path: prefer explicit path from Electron dialog, fall back to file.path from drag-drop
		const droppedFilePath =
			paths?.[currentHandleIndex] || getElectronFilePath(file);
		const droppedHandle = handles?.[currentHandleIndex];

		// Process file asynchronously
		(async () => {
			try {
				// Read file (0-10% of progress)
				const buffer = await readFileAsArrayBuffer(file, (readProgress) => {
					loadingChats = loadingChats.map((lc) =>
						lc.id === loadingId
							? {
									...lc,
									progress: readProgress * 0.1,
									stage: 'reading' as const,
								}
							: lc,
					);
				});

				// Parse ZIP file using Web Worker
				const chatData: ChatData = await parseZipFile(
					buffer,
					makeProgressCallback(loadingId),
				);

				// Remove loading placeholder and add actual chat
				loadingChats = loadingChats.filter((lc) => lc.id !== loadingId);
				appState.addChat(chatData);

				// Store file reference for persistence
				chatFileReferences.set(chatData.title, {
					file,
					filePath: droppedFilePath,
					fileHandle: droppedHandle,
				});

				// Remember this chat automatically so it survives an app
				// restart without requiring a manual per-chat toggle
				await rememberChat(chatData.title, true);

				// Start background indexing
				startIndexWorker(chatData);

				// On mobile, collapse sidebar after loading chats
				if (browser && isMobileViewport()) {
					showSidebar = false;
				}
			} catch (error) {
				console.error('Error parsing file:', error);
				// Remove loading placeholder on error
				loadingChats = loadingChats.filter((lc) => lc.id !== loadingId);
				appState.setError(
					error instanceof Error ? error.message : m.error_parse_failed(),
				);
			}
		})();
		handleIndex++;
	}
}

function handleSelectChat(index: number) {
	appState.selectChat(index);
	// Set the transcription language for this chat
	const chat = appState.chats[index];
	if (chat) {
		const lang = languageByChat.get(chat.title) || 'portuguese';
		setTranscriptionLanguage(lang);
	}
	// On mobile, collapse sidebar after selecting a chat
	if (browser && isMobileViewport()) {
		showSidebar = false;
	}
}

function handleRemoveChat(index: number) {
	const chat = appState.chats[index];
	const chatTitle = chat?.title;

	// Remove from current session only — persisted data stays in IndexedDB
	// so the chat can be restored on next app launch.
	// To remove from saved chats, user must toggle "Remember Conversation" off.
	appState.removeChat(index);

	if (chatTitle) {
		chatFileReferences.delete(chatTitle);
	}
}

function handleLanguageChange(chatTitle: string, language: string) {
	languageByChat.set(chatTitle, language);
	languageByChat = new Map(languageByChat); // trigger reactivity
	// If this is the currently selected chat, update the transcription service
	if (appState.selectedChat?.title === chatTitle) {
		setTranscriptionLanguage(language);
	}
}

function handleAutoLoadMediaChange(chatTitle: string, enabled: boolean) {
	autoLoadMediaByChat.set(chatTitle, enabled);
	autoLoadMediaByChat = new Map(autoLoadMediaByChat); // trigger reactivity
}

function handleSearchInput(value: string) {
	appState.setSearchQuery(value);
}

function toggleStats() {
	showStats = !showStats;
}

function toggleSidebar() {
	showSidebar = !showSidebar;
}

function toggleBookmarks() {
	showBookmarks = !showBookmarks;
	if (showBookmarks) {
		showMediaGallery = false;
	}
}

function toggleMediaGallery() {
	showMediaGallery = !showMediaGallery;
	if (showMediaGallery) {
		showBookmarks = false;
	}
}

async function handleNavigateToMediaMessage(messageId: string) {
	// Clear any previous scroll target
	scrollToMessageId = null;

	// Wait for Svelte to process the null value
	await tick();

	// Set the new scroll target
	scrollToMessageId = messageId;
}

async function handleNavigateToBookmark(messageId: string, chatId: string) {
	// Find and select the chat if different from current
	const chatIndex = appState.chats.findIndex((c) => c.title === chatId);
	const needsChatSwitch =
		chatIndex !== -1 && chatIndex !== appState.selectedChatIndex;

	if (needsChatSwitch) {
		appState.selectChat(chatIndex);
	}

	// Clear any previous scroll target
	scrollToMessageId = null;

	// Wait for Svelte to process the null value
	await tick();

	// Use longer delay when switching chats to allow messages to load
	const delay = needsChatSwitch ? 300 : 0;
	if (delay > 0) {
		await new Promise((resolve) => setTimeout(resolve, delay));
	}

	// Set the new scroll target
	scrollToMessageId = messageId;
}

function selectPerspective(participant: string | null) {
	if (appState.selectedChat) {
		// Create a new Map to trigger reactivity
		const newMap = new Map(perspectiveByChat);
		newMap.set(appState.selectedChat.title, participant);
		perspectiveByChat = newMap;
	}
	showPerspectiveDropdown = false;
	showChatOptionsDropdown = false;
	perspectiveSearchQuery = '';
}

// Get current perspective for selected chat
const currentPerspective = $derived.by(() => {
	if (!appState.selectedChat) return null;
	return perspectiveByChat.get(appState.selectedChat.title) ?? null;
});

// Filter participants based on search query
const filteredParticipants = $derived.by(() => {
	if (!appState.selectedChat) return [];
	const query = perspectiveSearchQuery.toLowerCase().trim();
	if (!query) return appState.selectedChat.participants;
	return appState.selectedChat.participants.filter((p) =>
		p.toLowerCase().includes(query),
	);
});

// Determine current user based on selected perspective
const currentUser = $derived.by(() => {
	if (!appState.selectedChat) return undefined;
	// If a perspective is selected, use it
	if (currentPerspective !== null) {
		return currentPerspective;
	}
	// Otherwise, no perspective (all messages on left)
	return undefined;
});

// "On This Day" - find messages from the same month+day in a past year
const todayDateKey = toLocalDateKey(new Date());
const onThisDayMatch = $derived.by(() => {
	if (!appState.selectedChat) return null;
	return findOnThisDayMatch(appState.selectedChat.messages);
});
let onThisDayDismissed = $state(true);
$effect(() => {
	if (!appState.selectedChat || !onThisDayMatch) {
		onThisDayDismissed = true;
		return;
	}
	onThisDayDismissed = isOnThisDayDismissed(
		appState.selectedChat.title,
		todayDateKey,
	);
});

function handleDismissOnThisDay() {
	if (!appState.selectedChat) return;
	dismissOnThisDay(appState.selectedChat.title, todayDateKey);
	onThisDayDismissed = true;
}

async function handleViewOnThisDay() {
	if (!onThisDayMatch) return;
	const messageId = onThisDayMatch.messages[0].id;
	scrollToMessageId = null;
	await tick();
	scrollToMessageId = messageId;
}

function handleExportChat() {
	if (!appState.selectedChat) return;
	const html = buildChatExportHtml(
		appState.selectedChat,
		currentUser,
		getLocale(),
	);
	const blob = new Blob([html], { type: 'text/html' });
	triggerDownload(
		blob,
		`${sanitizeFilename(appState.selectedChat.title)}.html`,
	);
	showToast(m.export_chat_success());
}

async function handleMergeChats(otherChats: ChatData[], mergedTitle: string) {
	if (!appState.selectedChat) return;
	const currentChat = appState.selectedChat;
	const sourceChats = [currentChat, ...otherChats];

	const merged = mergeChats(sourceChats, mergedTitle);
	const totalSourceMessages = sourceChats.reduce(
		(sum, c) => sum + c.messageCount,
		0,
	);
	const newCount = merged.messageCount - currentChat.messageCount;
	const duplicateCount = totalSourceMessages - merged.messageCount;

	// Remap bookmarks from every source chat onto the merged message IDs -
	// message IDs are regenerated during merge, so old messageIds no longer
	// point anywhere. Bookmarks are keyed by chat title app-wide, so if two
	// source chats happen to share a title (common - they're exports of the
	// same conversation), only process that title's bookmarks once.
	//
	// Removing before adding matters: generateDeterministicId is keyed by
	// chatIdentifier, and that's the chat's *derived title* (see
	// zip-parser.ts's parseChat(chatContent, titleHint) call), not the
	// filename. When mergedTitle equals a source chat's original title -
	// the common case, since the picker defaults to it - an unchanged
	// message regenerates the exact same ID it already had. Adding the
	// (identical-ID) replacement before removing the old one would leave
	// both rows sharing one messageId, and removeBookmark's filter deletes
	// every row matching that ID - wiping out the row we just added.
	const sourceTitles = new Set(sourceChats.map((c) => c.title));
	for (const sourceTitle of sourceTitles) {
		const sourceBookmarks = bookmarksState.getBookmarksForChat(sourceTitle);
		for (const bookmark of sourceBookmarks) {
			const previewStart = bookmark.messagePreview.replace(/\.\.\.$/, '');
			const match = merged.messages.find(
				(msg) =>
					msg.timestamp.toISOString() === bookmark.messageTimestamp &&
					msg.sender === bookmark.sender &&
					msg.content.startsWith(previewStart),
			);
			if (!match) continue;
			bookmarksState.removeBookmark(bookmark.messageId);
			bookmarksState.addBookmark({
				messageId: match.id,
				chatId: mergedTitle,
				comment: bookmark.comment,
				messageContent: match.content,
				sender: match.sender,
				messageTimestamp: match.timestamp,
			});
		}
	}

	// Remove old entries (highest index first so earlier removals don't
	// shift the indices of chats not yet removed). Matched by object
	// identity, not title - two source chats commonly share a title, and
	// title-matching would also sweep up an unrelated, unselected chat that
	// happens to share it.
	const indicesToRemove = sourceChats
		.map((source) => appState.chats.indexOf(source))
		.filter((i) => i !== -1)
		.sort((a, b) => b - a);
	for (const index of indicesToRemove) {
		appState.removeChat(index);
	}

	appState.addChat(merged);
	startIndexWorker(merged);

	// Clean up persisted records and per-chat maps for absorbed source
	// titles (the merged chat keeps mergedTitle going forward)
	for (const title of sourceTitles) {
		if (title === mergedTitle) continue;
		chatFileReferences.delete(title);
		const persistedChat = await findPersistedChatByTitle(title);
		if (persistedChat) {
			await removePersistedChat(persistedChat.id);
		}
		removeRemembered(title);
		perspectiveByChat.delete(title);
		lockedByChat.delete(title);
		languageByChat.delete(title);
		autoLoadMediaByChat.delete(title);
		unlockedThisSession.delete(title);
	}
	perspectiveByChat = new Map(perspectiveByChat);
	lockedByChat = new Map(lockedByChat);
	languageByChat = new Map(languageByChat);
	autoLoadMediaByChat = new Map(autoLoadMediaByChat);
	unlockedThisSession = new Set(unlockedThisSession);

	showMergeChatsModal = false;
	showToast(
		m.merge_chats_success({
			count: sourceChats.length,
			newCount,
			newPlural: newCount === 1 ? '' : 's',
			duplicateCount,
			duplicatePlural: duplicateCount === 1 ? '' : 's',
		}),
	);
}

// Check for persisted chats on app load (one-time)
let persistenceChecked = false;
$effect(() => {
	if (!browser || persistenceChecked) return;
	persistenceChecked = true;

	(async () => {
		try {
			const persisted = await getPersistedChats();
			if (persisted.length === 0) return;

			// Seed rememberedChats from IndexedDB so toggle state is correct
			// even if user skips the restore modal or clicks "Start Fresh"
			for (const chat of persisted) {
				rememberedChats.add(chat.chatTitle);
			}
			rememberedChats = new Set(rememberedChats);

			// Check if user wants to skip the modal
			const dontShow = await getDontShowRestoreModal();
			if (dontShow) return;

			// Show restore modal
			persistedChatsToRestore = persisted;
			showRestoreSessionModal = true;
		} catch (e) {
			console.error('Failed to check for persisted chats:', e);
		}
	})();
});

// Handle restoring selected chats
async function handleRestoreChats(chatIds: string[]) {
	showRestoreSessionModal = false;

	for (const chatId of chatIds) {
		const persistedChat = persistedChatsToRestore.find((c) => c.id === chatId);
		if (!persistedChat) continue;

		try {
			const result = await restoreChat(persistedChat);

			if (result.needsReselect) {
				// Show reselect modal and wait for user response
				reselectChatMetadata = persistedChat;
				showReselectFileModal = true;
				const reselected = await new Promise<{
					file: File;
					path?: string;
					handle?: FileSystemFileHandle;
				} | null>((resolve) => {
					reselectResolve = resolve;
				});
				reselectChatMetadata = null;
				showReselectFileModal = false;

				if (reselected) {
					const reselectedBuffer = await reselected.file.arrayBuffer();
					const { validationPassed } = await loadChatFromBuffer(
						reselectedBuffer,
						reselected.file.name,
						persistedChat,
					);

					// Only upgrade persisted entry and mark remembered when validation passes
					// to avoid binding saved metadata to the wrong file
					if (validationPassed) {
						const reselectedPath =
							reselected.path || getElectronFilePath(reselected.file);
						chatFileReferences.set(persistedChat.chatTitle, {
							file: reselected.file,
							filePath: reselectedPath,
							fileHandle: reselected.handle,
							persistedId: persistedChat.id,
						});

						// Upgrade persisted entry so future restores work automatically
						if (reselectedPath) {
							await updatePersistedChat(persistedChat.id, {
								fileReference: {
									type: 'electron-path',
									filePath: reselectedPath,
								},
							});
						} else if (reselected.handle) {
							// Chrome/Edge: store handle and upgrade entry
							await storeFileHandle(persistedChat.id, reselected.handle);
							await updatePersistedChat(persistedChat.id, {
								fileReference: {
									type: 'file-handle',
									handleId: persistedChat.id,
								},
							});
						}
						addRemembered(persistedChat.chatTitle);
					}
				}
				continue;
			}

			if (!result.success || !result.data) {
				console.error(
					`Failed to restore chat ${persistedChat.chatTitle}:`,
					result.error,
				);
				showToast(m.persistence_restore_failed(), 'error');
				continue;
			}

			// Parse and load the chat
			await loadChatFromBuffer(
				result.data.buffer,
				result.data.name,
				persistedChat,
				isElectronPathReference(result.data.metadata.fileReference)
					? result.data.metadata.fileReference.filePath
					: undefined,
			);

			// Store file reference for subsequent toggle operations
			chatFileReferences.set(persistedChat.chatTitle, {
				file: null,
				filePath: isElectronPathReference(result.data.metadata.fileReference)
					? result.data.metadata.fileReference.filePath
					: undefined,
				persistedId: persistedChat.id,
			});

			addRemembered(persistedChat.chatTitle);
		} catch (e) {
			console.error(`Error restoring chat ${persistedChat.chatTitle}:`, e);
			showToast(m.persistence_restore_failed(), 'error');
		}
	}
}

// Handle reselect file for a persisted chat
async function handleReselectFile(
	file: File,
	filePath?: string,
	fileHandle?: FileSystemFileHandle,
) {
	if (reselectResolve) {
		reselectResolve({ file, path: filePath, handle: fileHandle });
		reselectResolve = null;
	}
}

// Skip reselect for a chat
function handleSkipReselect() {
	if (reselectResolve) {
		reselectResolve(null);
		reselectResolve = null;
	}
}

// Handle start fresh (close restore modal without restoring)
function handleStartFresh() {
	showRestoreSessionModal = false;
	persistedChatsToRestore = [];
}

// Load chat from buffer with optional restoration metadata
async function loadChatFromBuffer(
	buffer: ArrayBuffer,
	fileName: string,
	restoredMetadata?: PersistedChatMetadata,
	filePath?: string,
): Promise<{ validationPassed: boolean }> {
	// Create a loading placeholder
	const loadingId = crypto.randomUUID();
	const displayName = sanitizeFilename(fileName);

	loadingChats = [
		...loadingChats,
		{
			id: loadingId,
			filename: displayName,
			progress: 0,
			stage: 'extracting',
		},
	];

	try {
		// Parse ZIP file using Web Worker
		const chatData: ChatData = await parseZipFile(
			buffer,
			makeProgressCallback(loadingId),
		);

		// If restoring, validate the file and only apply metadata if valid
		let validationPassed = true;
		if (restoredMetadata) {
			const validation = validateRestoredFile(chatData, restoredMetadata);
			if (!validation.valid) {
				console.warn('Restored file validation failed:', validation.reasons);
				validationPassed = false;
			} else {
				// Restore bookmarks
				if (restoredMetadata.bookmarks.length > 0) {
					bookmarksState.importBookmarks({
						version: 1,
						exportedAt: restoredMetadata.savedAt,
						bookmarks: restoredMetadata.bookmarks,
					});
				}

				// Restore transcriptions
				if (Object.keys(restoredMetadata.transcriptions).length > 0) {
					setTranscriptionsForChat(restoredMetadata.transcriptions);
				}

				// Restore settings
				if (restoredMetadata.settings.language) {
					languageByChat.set(
						chatData.title,
						restoredMetadata.settings.language,
					);
					languageByChat = new Map(languageByChat);
				}
				if (restoredMetadata.settings.autoLoadMedia !== undefined) {
					autoLoadMediaByChat.set(
						chatData.title,
						restoredMetadata.settings.autoLoadMedia,
					);
					autoLoadMediaByChat = new Map(autoLoadMediaByChat);
				}
				if (restoredMetadata.settings.perspective !== undefined) {
					perspectiveByChat.set(
						chatData.title,
						restoredMetadata.settings.perspective,
					);
					perspectiveByChat = new Map(perspectiveByChat);
				}
				if (restoredMetadata.settings.locked !== undefined) {
					lockedByChat.set(chatData.title, restoredMetadata.settings.locked);
					lockedByChat = new Map(lockedByChat);
				}
			}
		}

		// Remove loading placeholder and add actual chat
		loadingChats = loadingChats.filter((lc) => lc.id !== loadingId);
		appState.addChat(chatData);

		// Store file reference for persistence
		if (filePath) {
			chatFileReferences.set(chatData.title, { file: null, filePath });
		}

		// Start background indexing
		startIndexWorker(chatData);

		return { validationPassed };
	} catch (error) {
		console.error('Error parsing file:', error);
		// Remove loading placeholder on error
		loadingChats = loadingChats.filter((lc) => lc.id !== loadingId);
		throw error;
	}
}

async function rememberChat(chatTitle: string, silent = false) {
	const chat = appState.chats.find((c) => c.title === chatTitle);
	if (!chat) return;

	try {
		const fileRef = chatFileReferences.get(chatTitle);
		// Use handle captured during drag-drop (no file picker needed)
		const fileHandle = fileRef?.fileHandle;

		const bookmarks = bookmarksState.getBookmarksForChat(chatTitle);
		const chatMessageIds = chat.messages.map((msg) => msg.id);
		const transcriptions = getTranscriptionsForChat(chatMessageIds);

		const persistedId = await savePersistedChat(
			chat,
			fileRef?.file || null,
			bookmarks,
			transcriptions,
			{
				language: languageByChat.get(chatTitle) || 'portuguese',
				autoLoadMedia: autoLoadMediaByChat.get(chatTitle) || false,
				perspective: perspectiveByChat.get(chatTitle) || null,
				locked: lockedByChat.get(chatTitle) || false,
			},
			fileRef?.filePath,
			fileHandle,
		);

		if (fileRef) {
			chatFileReferences.set(chatTitle, {
				...fileRef,
				fileHandle,
				persistedId,
			});
		}

		addRemembered(chatTitle);
		if (!silent) showToast(m.persistence_conversation_saved(), 'success');
	} catch (e) {
		console.error('Failed to save conversation:', e);
		showToast(m.persistence_save_failed(), 'error');
	}
}

async function forgetChat(chatTitle: string) {
	try {
		const persistedChat = await findPersistedChatByTitle(chatTitle);
		if (persistedChat) {
			await removePersistedChat(persistedChat.id);
		}
		removeRemembered(chatTitle);
		showToast(m.persistence_conversation_removed(), 'success');
	} catch (e) {
		console.error('Failed to remove conversation:', e);
		showToast(m.persistence_remove_failed(), 'error');
	}
}

function handleToggleRemember(chatTitle: string, enabled: boolean) {
	if (enabled) {
		rememberChat(chatTitle);
	} else {
		forgetChat(chatTitle);
	}
}

// Keep a remembered chat's persisted settings.locked in sync with lockedByChat.
// No-op for chats that were never "Remember"-d (nothing persisted to update).
async function persistLockedFlag(chatTitle: string, locked: boolean) {
	const persistedId = chatFileReferences.get(chatTitle)?.persistedId;
	if (!persistedId) return;
	try {
		await updatePersistedChat(persistedId, {
			settings: {
				language: languageByChat.get(chatTitle) || 'portuguese',
				autoLoadMedia: autoLoadMediaByChat.get(chatTitle) || false,
				perspective: perspectiveByChat.get(chatTitle) || null,
				locked,
			},
		});
	} catch (e) {
		console.error('Failed to persist lock state:', e);
	}
}

function applyLock(chatTitle: string) {
	lockedByChat.set(chatTitle, true);
	lockedByChat = new Map(lockedByChat);
	persistLockedFlag(chatTitle, true);
}

function applyUnlockPermanent(chatTitle: string) {
	lockedByChat.set(chatTitle, false);
	lockedByChat = new Map(lockedByChat);
	unlockedThisSession.delete(chatTitle);
	unlockedThisSession = new Set(unlockedThisSession);
	persistLockedFlag(chatTitle, false);
}

function closeLockPinModal() {
	lockPinRequest = null;
}

async function handleToggleLock(chatTitle: string, enable: boolean) {
	if (enable) {
		const existingPin = await getLockPin();
		if (!existingPin) {
			lockPinRequest = { mode: 'setup', chatTitle };
			return;
		}
		applyLock(chatTitle);
		showToast(m.lock_chat_locked_toast(), 'success');
	} else {
		lockPinRequest = { mode: 'unlock', purpose: 'remove', chatTitle };
	}
}

function handleRequestUnlock(chatTitle: string) {
	lockPinRequest = { mode: 'unlock', purpose: 'view', chatTitle };
}

// Re-hide a session-unlocked locked chat immediately, without switching
// chats. Symmetric with the rule that locking never requires a PIN.
function handleLockNow(chatTitle: string) {
	unlockedThisSession.delete(chatTitle);
	unlockedThisSession = new Set(unlockedThisSession);
}

function handleLockPinSuccess() {
	if (!lockPinRequest) return;
	const { mode, purpose, chatTitle } = lockPinRequest;
	if (mode === 'setup') {
		applyLock(chatTitle);
		showToast(m.lock_chat_locked_toast(), 'success');
	} else if (purpose === 'remove') {
		applyUnlockPermanent(chatTitle);
		showToast(m.lock_chat_unlocked_toast(), 'success');
	} else {
		unlockedThisSession.add(chatTitle);
		unlockedThisSession = new Set(unlockedThisSession);
	}
	closeLockPinModal();
}

async function handleForgotPin() {
	await clearLockPin();
	for (const title of lockedChatTitles) {
		await persistLockedFlag(title, false);
	}
	lockedByChat = new Map();
	unlockedThisSession = new Set();
	closeLockPinModal();
	showToast(m.lock_forgot_pin_done(), 'success');
}
</script>

<div class="h-screen flex flex-col bg-gray-100 dark:bg-gray-950">
	<!-- Electron drag region for macOS titlebar (only shown in Electron on macOS) -->
	{#if isElectronMac}
		<div class="electron-drag h-[38px] flex-shrink-0 bg-[var(--color-whatsapp-dark-green)]"></div>
	{/if}

	{#if !appState.hasChats}
		<!-- Empty state - show file upload -->
		<div class="relative flex-1 flex flex-col overflow-hidden">
			<!-- Version badge (top-left) - fixed position -->
			<div class="absolute top-4 left-4 z-10">
				<VersionBadge />
			</div>
			
			<!-- Settings buttons (top-right) - fixed position -->
			<div class="absolute top-4 right-4 flex items-center gap-1.5 z-10">
				<LocaleSwitcher variant="default" />
				<button
					onclick={toggleDarkMode}
					class="p-1.5 rounded-full transition-colors cursor-pointer bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 backdrop-blur-sm"
					aria-label={m.toggle_dark_mode()}
					title={isDarkMode ? m.theme_switch_to_light() : m.theme_switch_to_dark()}
				>
					{#if isDarkMode}
						<!-- Sun icon -->
						<Icon name="sun" size="sm" class="text-yellow-500" />
					{:else}
						<!-- Moon icon -->
						<Icon name="moon" size="sm" class="text-gray-600 dark:text-gray-400" />
					{/if}
				</button>
			</div>
			
			<!-- Scrollable content area -->
			<div class="flex-1 overflow-y-auto">
				<div class="flex flex-col items-center p-4 sm:p-8 min-h-full">
					<div class="max-w-lg w-full flex flex-col items-center py-8">
					<!-- Logo and title -->
					<div class="text-center mb-6">
						<div class="w-32 h-32 mx-auto mb-4">
							<img src={favicon} alt="WhatsApp Backup Reader" class="w-full h-full" />
						</div>
						<h1 class="text-2xl font-bold text-gray-800 dark:text-white mb-1">
							{m.app_title()}
						</h1>
						<p class="text-sm text-gray-500 dark:text-gray-400">
							{m.app_subtitle()}
						</p>
					</div>

					<!-- Drop zone -->
					<div class="w-full">
						<FileDropZone onFilesSelected={handleFilesSelected} isLoading={isLoadingFiles} loadingProgress={loadingFilesProgress} />
					</div>

					{#if appState.error}
						<div class="mt-4 w-full p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
							<p class="text-red-700 dark:text-red-400 text-sm text-center">
								{appState.error}
							</p>
						</div>
					{/if}

				<!-- Instructions - Collapsible -->
				<Collapsible title={m.export_instructions_title()} class="mt-6 w-full">
					<div class="grid grid-cols-1 gap-2">
						<FeatureItem badge={1}>{m.export_step_1()}</FeatureItem>
						<FeatureItem badge={2}>{m.export_step_2()}</FeatureItem>
						<FeatureItem badge={3}>{m.export_step_3()}</FeatureItem>
						<FeatureItem badge={4}>{m.export_step_4()}</FeatureItem>
						<FeatureItem badge={5}>{m.export_step_5()}</FeatureItem>
					</div>
				</Collapsible>

				<!-- Privacy & Security - Collapsible -->
				<Collapsible title={m.privacy_title()} class="mt-4 w-full">
					<div class="grid grid-cols-1 gap-2">
						<FeatureItem icon="wifi-off" variant="icon">{m.privacy_offline()}</FeatureItem>
						<FeatureItem icon="shield" variant="icon">{m.privacy_local_processing()}</FeatureItem>
						<FeatureItem icon="code" variant="icon">{m.privacy_local_ai()}</FeatureItem>
						<FeatureItem icon="eye-off" variant="icon">{m.privacy_no_tracking()}</FeatureItem>
						<FeatureItem icon="code" variant="icon">{m.privacy_open_source()}</FeatureItem>
					</div>
				</Collapsible>

				<!-- GitHub Star -->
				<div class="mt-4 flex flex-col items-center gap-1.5">
					<span class="text-xs text-gray-400 dark:text-gray-500">{m.github_star_title()}</span>
					<a
						href="https://github.com/rodrigogs/whats-reader"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-md transition-colors text-xs font-medium"
						onclick={(e) => {
							if (isElectron && window.electronAPI?.openExternal) {
								e.preventDefault();
								window.electronAPI.openExternal('https://github.com/rodrigogs/whats-reader');
							}
						}}
					>
						<Icon name="github" size="sm" />
						<Icon name="star" size="xs" class="text-yellow-400" filled />
						{m.github_star_cta()}
					</a>
				</div>
			</div>
		</div>
	</div>
	</div>
	{:else}
		<!-- Main app layout -->
		<div class="flex-1 flex flex-col overflow-hidden">
			<!-- Top header bar - always full width -->
			{#if appState.selectedChat && !isSelectedChatLocked}
				{#snippet perspectiveSelectorContent()}
					<DropdownHeader title={m.perspective_view_as()} />
					
					<DropdownSearch
						bind:value={perspectiveSearchQuery}
						bind:ref={perspectiveSearchInputRef}
						placeholder={m.perspective_search_placeholder()}
					/>
					
					<DropdownList>
						{#if !perspectiveSearchQuery}
							<ListItemButton
								active={currentPerspective === null}
								onclick={() => selectPerspective(null)}
							>
								<span class="w-5 text-center">{currentPerspective === null ? '✓' : ''}</span>
								<span class="italic">{m.perspective_none()}</span>
							</ListItemButton>
						{/if}
						{#each filteredParticipants as participant}
							<ListItemButton
								active={currentPerspective === participant}
								onclick={() => selectPerspective(participant)}
							>
								<span class="w-5 text-center">{currentPerspective === participant ? '✓' : ''}</span>
								<span class="truncate">{participant}</span>
							</ListItemButton>
						{/each}
						{#if filteredParticipants.length === 0 && perspectiveSearchQuery}
							<div class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 italic">
								{m.perspective_no_match({ query: perspectiveSearchQuery })}
							</div>
						{/if}
					</DropdownList>
				{/snippet}
				
				<!-- Chat header -->
				<div class="h-16 px-4 flex items-center gap-3 bg-[var(--color-whatsapp-dark-green)] text-white shadow-md flex-shrink-0">
					<!-- Sidebar toggle button -->
					<IconButton
						theme="dark"
						size="md"
						class="-ml-2"
						onclick={toggleSidebar}
						aria-label={m.sidebar_toggle()}
						title={m.sidebar_toggle()}
					>
						{#if showSidebar}
							<Icon name="chevron-left" size="md" />
						{:else}
							<Icon name="menu" size="md" />
						{/if}
					</IconButton>
					<!-- Avatar -->
					<div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-semibold">
						{appState.selectedChat.title.charAt(0).toUpperCase()}
					</div>

					<!-- Chat info -->
					<div class="flex-1 min-w-0">
						<h2 class="font-semibold truncate">{appState.selectedChat.title}</h2>
						<button
							type="button"
							class="text-xs text-white/70 hover:text-white truncate block max-w-full text-left cursor-pointer transition-colors"
							onclick={openParticipantsModal}
						title={m.participants_view_all()}
						>
							{appState.selectedChat.participants.slice(0, 5).join(', ')}
							{#if appState.selectedChat.participants.length > 5}
								{m.perspective_more_participants({ count: appState.selectedChat.participants.length - 5 })}
							{/if}
						</button>
					</div>

					<!-- Actions -->
					<div class="flex items-center gap-2">
						<!-- Small screens: Options menu -->
						<div class="md:hidden relative">
							<IconButton
								bind:ref={chatOptionsButtonRef}
								theme="dark"
								size="md"
								onclick={() => showChatOptionsDropdown = !showChatOptionsDropdown}
								title={m.chat_options()}
								aria-label={m.chat_options()}
							>
								<Icon name="dots-vertical" size="md" />
							</IconButton>
							
							<Dropdown
								anchor={chatOptionsButtonRef}
								open={showChatOptionsDropdown}
								onClose={() => {
									showChatOptionsDropdown = false;
									showPerspectiveDropdown = false;
									perspectiveSearchQuery = '';
								}}
								width="w-56"
								placement="bottom-end"
							>
								{#if showPerspectiveDropdown}
									<!-- Perspective selector view -->
									{@render perspectiveSelectorContent()}
								{:else}
									<!-- Main options menu -->
									<DropdownList>
										<ListItemButton
											active={!!currentPerspective}
											onclick={() => showPerspectiveDropdown = true}
										>
											<Icon name="user" size="sm" />
											<span>{m.perspective_view_as()}</span>
										</ListItemButton>
										<ListItemButton
											active={showMediaGallery}
											onclick={() => {
												showChatOptionsDropdown = false;
												toggleMediaGallery();
											}}
										>
											<Icon name="image" size="sm" />
											<span>{m.media_gallery_title()}</span>
										</ListItemButton>
										<ListItemButton
											active={showBookmarks}
											onclick={() => {
												showChatOptionsDropdown = false;
												toggleBookmarks();
											}}
										>
											<Icon name="bookmark" size="sm" />
											<span>{m.bookmarks_title()}</span>
										</ListItemButton>
										<ListItemButton
											onclick={() => {
												showChatOptionsDropdown = false;
												toggleStats();
											}}
										>
											<Icon name="chart-bar" size="sm" />
											<span>{m.stats_view()}</span>
										</ListItemButton>
										<ListItemButton
											onclick={() => {
												showChatOptionsDropdown = false;
												handleExportChat();
											}}
										>
											<Icon name="download" size="sm" />
											<span>{m.export_chat()}</span>
										</ListItemButton>
										<ListItemButton
											onclick={() => {
												showChatOptionsDropdown = false;
												showMergeChatsModal = true;
											}}
										>
											<Icon name="upload" size="sm" />
											<span>{m.merge_chats_action()}</span>
										</ListItemButton>
										{#if isViewingUnlockedLockedChat}
											<ListItemButton
												onclick={() => {
													showChatOptionsDropdown = false;
													handleLockNow(appState.selectedChat?.title ?? '');
												}}
											>
												<Icon name="lock" size="sm" />
												<span>{m.lock_now_button()}</span>
											</ListItemButton>
										{/if}
									</DropdownList>
								{/if}
							</Dropdown>
						</div>

						<!-- Large screens: Individual buttons -->
						<div class="hidden md:flex items-center gap-2">
							<!-- Perspective selector -->
							<div class="relative">
								<IconButton
									bind:ref={perspectiveButtonRef}
									theme="dark"
									size="md"
									active={!!currentPerspective}
									onclick={() => showPerspectiveDropdown = !showPerspectiveDropdown}
									title={m.perspective_view_as()}
									aria-label={m.perspective_select()}
								>
									<Icon name="user" size="md" />
								</IconButton>
								
								<Dropdown
									anchor={perspectiveButtonRef}
									open={showPerspectiveDropdown}
									onClose={() => { showPerspectiveDropdown = false; perspectiveSearchQuery = ''; }}
								>
									{@render perspectiveSelectorContent()}
								</Dropdown>
							</div>

							<IconButton
								theme="dark"
								size="md"
								active={showMediaGallery}
								onclick={toggleMediaGallery}
								title={m.media_gallery_title()}
								aria-label={m.media_gallery_toggle()}
							>
								<Icon name="image" size="md" filled={showMediaGallery} />
							</IconButton>
							<IconButton
								theme="dark"
								size="md"
								active={showBookmarks}
								onclick={toggleBookmarks}
								title={m.bookmarks_title()}
								aria-label={m.bookmarks_toggle()}
							>
								<Icon name="bookmark" size="md" filled={showBookmarks} />
							</IconButton>
							<IconButton
								theme="dark"
								size="md"
								onclick={toggleStats}
								title={m.stats_view()}
								aria-label={m.stats_view()}
							>
								<Icon name="chart-bar" size="md" />
							</IconButton>
							<IconButton
								theme="dark"
								size="md"
								onclick={handleExportChat}
								title={m.export_chat()}
								aria-label={m.export_chat()}
							>
								<Icon name="download" size="md" />
							</IconButton>
							<IconButton
								theme="dark"
								size="md"
								onclick={() => (showMergeChatsModal = true)}
								title={m.merge_chats_action()}
								aria-label={m.merge_chats_action()}
							>
								<Icon name="upload" size="md" />
							</IconButton>
							{#if isViewingUnlockedLockedChat}
								<IconButton
									theme="dark"
									size="md"
									onclick={() => handleLockNow(appState.selectedChat?.title ?? '')}
									title={m.lock_now_button()}
									aria-label={m.lock_now_button()}
								>
									<Icon name="lock" size="md" />
								</IconButton>
							{/if}
						</div>

						<!-- Theme toggle and language selector (always visible) -->
						<LocaleSwitcher variant="header" />
						<IconButton
							theme="dark"
							size="md" rounded="full"
							onclick={toggleDarkMode}
							aria-label={m.toggle_dark_mode()}
							title={isDarkMode ? m.theme_switch_to_light() : m.theme_switch_to_dark()}
						>
							{#if isDarkMode}
								<Icon name="sun" size="md" class="text-yellow-300" />
							{:else}
								<Icon name="moon" size="md" class="text-white/80" />
							{/if}
						</IconButton>
					</div>
				</div>
			{:else if appState.selectedChat}
				<!-- Chat is locked - compact header, no participants/options menu -->
				<div class="h-16 px-4 flex items-center gap-3 bg-[var(--color-whatsapp-dark-green)] text-white shadow-md flex-shrink-0">
					<IconButton
						theme="dark"
						size="md"
						class="-ml-2"
						onclick={toggleSidebar}
						aria-label={m.sidebar_toggle()}
						title={m.sidebar_toggle()}
					>
						{#if showSidebar}
							<Icon name="chevron-left" size="md" />
						{:else}
							<Icon name="menu" size="md" />
						{/if}
					</IconButton>
					<div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-semibold">
						{appState.selectedChat.title.charAt(0).toUpperCase()}
					</div>
					<div class="flex-1 min-w-0 flex items-center gap-2">
						<h2 class="font-semibold truncate">{appState.selectedChat.title}</h2>
						<span class="flex items-center gap-1 text-xs text-white/70 flex-shrink-0">
							<Icon name="lock" size="xs" />
							{m.lock_header_badge()}
						</span>
					</div>
				</div>
			{:else}
				<!-- No chat selected - simplified header -->
				<div class="h-16 px-4 flex items-center bg-[var(--color-whatsapp-dark-green)] flex-shrink-0">
					<!-- Sidebar toggle button -->
					<IconButton
						theme="dark"
						size="md"
						class="-ml-2"
						onclick={toggleSidebar}
						aria-label={m.sidebar_toggle()}
						title={m.sidebar_toggle()}
					>
						{#if showSidebar}
							<Icon name="chevron-left" size="md" />
						{:else}
							<Icon name="menu" size="md" />
						{/if}
					</IconButton>
				</div>
			{/if}

			<!-- Content area below header -->
			<div class="flex-1 flex overflow-hidden">
				<!-- Sidebar -->
				<div
					class="sidebar-panel w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col {showSidebar ? 'sidebar-open' : 'sidebar-closed'}"
					class:electron-mac={isElectronMac}
				>
				
				<!-- Chats title bar - matches search bar styling exactly -->
				<div class="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
					<button
						type="button"
						class="relative flex items-center w-full h-10 pl-10 pr-4 bg-gray-100 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
						onclick={handleSidebarImport}
					>
						<div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
							<Icon name="plus" size="md" class="text-gray-400" />
						</div>
						<span class="text-gray-500">{m.import_chat()}</span>
					</button>
					<input
						bind:this={sidebarFileInput}
						type="file"
						accept=".zip"
						class="hidden"
						onchange={(e) => {
							const input = e.target as HTMLInputElement;
							if (input.files) handleFilesSelected(input.files);
						}}
						multiple
					/>
				</div>

				<!-- Chat list -->
				<div class="flex-1 overflow-hidden">
					<ChatList
						chats={appState.chats}
						selectedIndex={appState.selectedChatIndex}
						onSelect={handleSelectChat}
						onRemove={handleRemoveChat}
						{languageByChat}
						onLanguageChange={handleLanguageChange}
						{autoLoadMediaByChat}
						onAutoLoadMediaChange={handleAutoLoadMediaChange}
						{loadingChats}
						{rememberedChats}
						onToggleRemember={handleToggleRemember}
						lockedChats={lockedChatTitles}
						onToggleLock={handleToggleLock}
					/>
				</div>
			</div>

			<!-- Overlay for mobile sidebar -->
			{#if showSidebar}
				<button
					class="md:hidden fixed inset-0 bg-black/50 z-30"
					onclick={() => (showSidebar = false)}
					aria-label={m.sidebar_close()}
				></button>
			{/if}

			<!-- Main content -->
			{#if appState.selectedChat && isSelectedChatLocked}
				<LockedChatPane
					onUnlock={() => handleRequestUnlock(appState.selectedChat?.title ?? '')}
				/>
			{:else if appState.selectedChat}
				<div class="flex-1 flex flex-col overflow-hidden">
					<!-- Search bar -->
					<div class="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
						<div class="flex items-center gap-2">
							<div class="flex-1">
								<SearchBar
									value={appState.searchQuery}
									onInput={handleSearchInput}
									onNextResult={() => appState.nextSearchResult()}
									onPrevResult={() => appState.prevSearchResult()}
									placeholder={m.search_placeholder()}
								/>
							</div>
							{#if appState.searchQuery}
								<!-- Search results count and navigation -->
								<div class="flex items-center gap-1">
									{#if appState.isSearching}
										<div class="flex items-center gap-2 px-2">
											<svg class="w-4 h-4 animate-spin-slow" viewBox="0 0 36 36">
												<circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" stroke-width="3" class="text-gray-200 dark:text-gray-700" />
												<circle cx="18" cy="18" r="16" fill="none" stroke="var(--color-whatsapp-teal)" stroke-width="3" stroke-linecap="round" stroke-dasharray={100.53} stroke-dashoffset={100.53 - (100.53 * appState.searchProgress) / 100} transform="rotate(-90 18 18)" />
											</svg>
											<span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{appState.searchProgress}%</span>
										</div>
									{:else}
										<span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap px-2">
											{#if appState.totalSearchMatches > 0}
												{m.search_result_of({ current: appState.currentSearchIndex + 1, total: appState.totalSearchMatches })}
											{:else}
												{m.search_no_results()}
											{/if}
										</span>
										<!-- Navigation buttons -->
										<IconButton
											theme="subtle"
											size="sm"
											rounded="md"
											onclick={() => appState.prevSearchResult()}
											disabled={appState.totalSearchMatches === 0}
											class={appState.totalSearchMatches === 0 ? 'opacity-30 cursor-not-allowed' : ''}
											title={m.search_previous()}
											aria-label={m.search_previous()}
										>
											<Icon name="chevron-up" size="sm" class="text-gray-600 dark:text-gray-400" />
										</IconButton>
										<IconButton
											theme="subtle"
											size="sm"
											rounded="md"
											onclick={() => appState.nextSearchResult()}
											disabled={appState.totalSearchMatches === 0}
											class={appState.totalSearchMatches === 0 ? 'opacity-30 cursor-not-allowed' : ''}
											title={m.search_next()}
											aria-label={m.search_next()}
										>
											<Icon name="chevron-down" size="sm" class="text-gray-600 dark:text-gray-400" />
										</IconButton>
									{/if}
								</div>
							{/if}
						</div>
					</div>

					<!-- On This Day banner -->
					{#if onThisDayMatch && !onThisDayDismissed}
						<OnThisDayBanner
							match={onThisDayMatch}
							onView={handleViewOnThisDay}
							onDismiss={handleDismissOnThisDay}
						/>
					{/if}

					<!-- Chat view -->
					<ChatView
						messages={appState.displayMessages}
						chatId={appState.selectedChat.title}
						{currentUser}
						searchQuery={appState.activeSearchQuery}
						isSearchMatch={appState.isSearchMatch}
						currentSearchResultId={appState.currentSearchResultId}
						{scrollToMessageId}
						autoLoadMedia={autoLoadMediaForCurrentChat}
						precomputedMessageIndex={appState.selectedChat.messageIndex}
						precomputedFlatItems={appState.selectedChat.flatItems}
						precomputedMessagesById={appState.selectedChat.messagesById}
					/>
				</div>

				<!-- Media gallery panel (slide from right) -->
				<div
					class="gallery-panel w-96 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col {showMediaGallery ? 'gallery-open' : 'gallery-closed'}"
					class:electron-mac={isElectronMac}
				>
					<div class="flex-1 overflow-hidden">
						<MediaGallery
							onNavigateToMessage={handleNavigateToMediaMessage}
							onClose={() => (showMediaGallery = false)}
						/>
					</div>
				</div>

				<!-- Bookmarks panel (slide from right) -->
				<div
					class="bookmarks-panel w-80 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col {showBookmarks ? 'bookmarks-open' : 'bookmarks-closed'}"
					class:electron-mac={isElectronMac}
				>
					<!-- Bookmarks content -->
					<div class="flex-1 overflow-hidden">
						<BookmarksPanel
							currentChatId={appState.selectedChat.title}
							onNavigateToMessage={handleNavigateToBookmark}
							onClose={() => showBookmarks = false}
							indexedChatTitles={appState.indexedChatTitles}
						/>
					</div>
				</div>

				<!-- Stats modal -->
				{#if showStats}
					<ChatStats
						chat={appState.selectedChat}
						onClose={() => (showStats = false)}
					/>
				{/if}

				<!-- Participants modal -->
				<Modal open={showParticipants && !!appState.selectedChat && !!participantStats} onClose={closeParticipantsModal}>
					<ModalHeader
						icon="users"
						title={m.participants_title()}
						subtitle={appState.selectedChat ? m.participants_members({ count: appState.selectedChat.participants.length }) : ''}
						onClose={closeParticipantsModal}
						closeLabel={m.participants_close()}
					/>
					<ModalContent>
						{#if appState.selectedChat && participantStats}
							{#each appState.selectedChat.participants as participant}
								{@const messageCount = participantStats.get(participant) || 0}
								{@const isPhoneNumber = /\+?\d[\d\s\-()]{8,}/.test(participant)}
								{@const contactInfo = appState.selectedChat.contacts?.get(participant.toLowerCase())}
								{@const phoneFromVcf = contactInfo?.phoneNumber}
								<div class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0">
									<!-- Avatar -->
									<div class="w-10 h-10 rounded-full bg-[var(--color-whatsapp-teal)] flex items-center justify-center text-white font-semibold flex-shrink-0">
										{participant.charAt(0).toUpperCase()}
									</div>
									
									<!-- Participant info -->
									<div class="flex-1 min-w-0">
										<p class="font-medium text-gray-900 dark:text-white truncate">
											{participant}
										</p>
										{#if phoneFromVcf}
											<!-- Phone number from VCF file -->
											<p class="text-xs text-[var(--color-whatsapp-teal)] font-medium">
												{phoneFromVcf}
											</p>
											<p class="text-xs text-gray-400 dark:text-gray-500">
												{m.participants_phone_from_vcf()}
											</p>
										{:else if isPhoneNumber}
											<p class="text-xs text-gray-500 dark:text-gray-400">
												{m.participants_phone_number()}
											</p>
										{:else}
											<p class="text-xs text-gray-500 dark:text-gray-400">
												{m.participants_contact_name()}
											</p>
										{/if}
									</div>
									
									<!-- Message count for this participant -->
									{#if messageCount > 0}
										<div class="text-right flex-shrink-0">
											<p class="text-sm font-medium text-[var(--color-whatsapp-teal)]">{messageCount}</p>
											<p class="text-xs text-gray-400">{m.participants_messages()}</p>
										</div>
									{/if}
								</div>
							{/each}
						{/if}
					</ModalContent>
				</Modal>

				<!-- Merge chats modal -->
				{#if showMergeChatsModal}
					<MergeChatsModal
						currentChat={appState.selectedChat}
						otherChats={appState.chats.filter((_, i) => i !== appState.selectedChatIndex)}
						onMerge={handleMergeChats}
						onClose={() => (showMergeChatsModal = false)}
					/>
				{/if}
			{:else}
				<!-- No chat selected -->
				<div class="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
					<div class="text-center text-gray-500 dark:text-gray-400">
						<Icon name="chat" size="2xl" class="mx-auto mb-4 opacity-50" />
						<p>{m.chat_select()}</p>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
</div>

<!-- Auto-update toast notification (Electron only) -->
{#if isElectron && autoUpdaterState.isElectron}
	<AutoUpdateToast />
{/if}
<!-- Restore Session Modal -->
{#if showRestoreSessionModal}
<RestoreSessionModal
persistedChats={persistedChatsToRestore}
onRestore={handleRestoreChats}
onStartFresh={handleStartFresh}
onClose={handleStartFresh}
/>
{/if}

<!-- Reselect File Modal -->
{#if showReselectFileModal && reselectChatMetadata}
<ReselectFileModal
chatMetadata={reselectChatMetadata}
onFileSelected={handleReselectFile}
onSkip={handleSkipReselect}
onClose={handleSkipReselect}
/>
{/if}

<!-- Lock PIN Modal -->
{#if lockPinRequest}
<LockPinModal
mode={lockPinRequest.mode}
purpose={lockPinRequest.purpose}
chatTitle={lockPinRequest.chatTitle}
onSuccess={handleLockPinSuccess}
onForgotPin={lockPinRequest.mode === 'unlock' ? handleForgotPin : undefined}
onClose={closeLockPinModal}
/>
{/if}

<!-- Toast Notification -->
{#if toastMessage}
<Toast message={toastMessage} type={toastType} onClose={hideToast} />
{/if}
