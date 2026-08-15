<script lang="ts">
import { floating } from '$lib/actions/floating';
import { formatRelativeDate } from '$lib/helpers/format';
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import type { PersistedChatMetadata } from '$lib/persistence.svelte';
import type { ChatData, LoadingChat } from '$lib/state.svelte';
import { getAvailableLanguages } from '$lib/transcription.svelte';
import ChatAvatar from './ChatAvatar.svelte';
import Icon from './Icon.svelte';
import IconButton from './IconButton.svelte';
import ListItemButton from './ListItemButton.svelte';

interface Props {
	chats: ChatData[];
	selectedIndex: number | null;
	onSelect: (index: number) => void;
	onDeleteRequest: (index: number) => void;
	languageByChat?: Map<string, string>;
	onLanguageChange?: (chatTitle: string, language: string) => void;
	autoLoadMediaByChat?: Map<string, boolean>;
	onAutoLoadMediaChange?: (chatTitle: string, enabled: boolean) => void;
	loadingChats?: LoadingChat[];
	lockedChats?: Set<string>;
	onToggleLock?: (chatTitle: string, enabled: boolean) => void;
	archivedChats?: Set<string>;
	onToggleArchive?: (chatTitle: string, archived: boolean) => void;
	// When true, show only archived chats (the "Archived" rail view)
	// instead of the default main list, which hides them.
	showArchivedOnly?: boolean;
	// Chat-list search filter - matches against title or any participant
	// name (see +page.svelte's chatSearchQuery). Not full-text message
	// search (a separate, bigger feature).
	nameFilter?: string;
	// Opens the cross-chat message-content search panel, seeded with the
	// current nameFilter text (Fase 6d) - a distinct feature from nameFilter
	// above, not wired to it beyond sharing the initial query text.
	onSearchMessages?: (query: string) => void;
	// Web-only: chats that couldn't restore without a fresh user gesture -
	// rendered as click-to-reopen placeholders (see +page.svelte's
	// handleOpenReselectChat).
	chatsNeedingReselect?: PersistedChatMetadata[];
	onOpenReselect?: (metadata: PersistedChatMetadata) => void;
}

let {
	chats,
	selectedIndex,
	onSelect,
	onDeleteRequest,
	languageByChat = new Map(),
	onLanguageChange,
	autoLoadMediaByChat = new Map(),
	onAutoLoadMediaChange,
	loadingChats = [],
	lockedChats = new Set(),
	onToggleLock,
	archivedChats = new Set(),
	onToggleArchive,
	showArchivedOnly = false,
	nameFilter = '',
	onSearchMessages,
	chatsNeedingReselect = [],
	onOpenReselect,
}: Props = $props();

const stageLabels = $derived({
	reading: m.loading_reading(),
	checking: m.loading_checking(),
	extracting: m.loading_extracting(),
	parsing: m.loading_parsing(),
});

// Context menu state
let contextMenuIndex = $state<number | null>(null);
let menuButtonRef = $state<HTMLButtonElement | null>(null);
let showLanguageSubmenu = $state(false);
let languageTriggerRef = $state<HTMLButtonElement | null>(null);
let submenuHideTimeout: ReturnType<typeof setTimeout> | null = null;

const availableLanguages = getAvailableLanguages();

function openContextMenu(
	e: MouseEvent,
	index: number,
	buttonEl: HTMLButtonElement,
) {
	e.preventDefault();
	e.stopPropagation();
	contextMenuIndex = index;
	menuButtonRef = buttonEl;
	showLanguageSubmenu = false;
}

function closeContextMenu() {
	contextMenuIndex = null;
	showLanguageSubmenu = false;
	menuButtonRef = null;
	languageTriggerRef = null;
}

function handleLanguageSelect(language: string) {
	if (contextMenuIndex !== null && onLanguageChange) {
		const chat = chats[contextMenuIndex];
		onLanguageChange(chat.title, language);
	}
	closeContextMenu();
}

function showSubmenu() {
	if (submenuHideTimeout) {
		clearTimeout(submenuHideTimeout);
		submenuHideTimeout = null;
	}
	showLanguageSubmenu = true;
}

function hideSubmenuDelayed() {
	submenuHideTimeout = setTimeout(() => {
		showLanguageSubmenu = false;
	}, 150); // Small delay to allow mouse to move between elements
}

function cancelHideSubmenu() {
	if (submenuHideTimeout) {
		clearTimeout(submenuHideTimeout);
		submenuHideTimeout = null;
	}
}

function getLanguageForChat(chatTitle: string): string {
	return languageByChat.get(chatTitle) || 'portuguese';
}

function getLanguageName(code: string): string {
	return availableLanguages.find((l) => l.code === code)?.name || code;
}

function isAutoLoadEnabled(chatTitle: string): boolean {
	return autoLoadMediaByChat.get(chatTitle) || false;
}

function handleAutoLoadToggle() {
	if (contextMenuIndex !== null && onAutoLoadMediaChange) {
		const chat = chats[contextMenuIndex];
		const currentEnabled = isAutoLoadEnabled(chat.title);
		onAutoLoadMediaChange(chat.title, !currentEnabled);
	}
	closeContextMenu();
}

function handleDeleteRequest() {
	if (contextMenuIndex !== null) {
		onDeleteRequest(contextMenuIndex);
	}
	closeContextMenu();
}

function isLocked(chatTitle: string): boolean {
	return lockedChats.has(chatTitle);
}

function handleToggleLock() {
	if (contextMenuIndex !== null && onToggleLock) {
		const chat = chats[contextMenuIndex];
		const currentLocked = isLocked(chat.title);
		onToggleLock(chat.title, !currentLocked);
	}
	closeContextMenu();
}

function isArchived(chatTitle: string): boolean {
	return archivedChats.has(chatTitle);
}

function handleToggleArchive() {
	if (contextMenuIndex !== null && onToggleArchive) {
		const chat = chats[contextMenuIndex];
		const currentArchived = isArchived(chat.title);
		onToggleArchive(chat.title, !currentArchived);
	}
	closeContextMenu();
}

function formatDate(date: Date | null): string {
	return formatRelativeDate(
		date,
		getLocale(),
		m.time_today(),
		m.time_yesterday(),
		'compact',
	);
}

function getLastMessage(chat: ChatData): string {
	if (chat.messages.length === 0) return m.no_messages();
	const last = chat.messages[chat.messages.length - 1];
	if (last.isMediaMessage) return m.last_message_media();
	if (last.isSystemMessage) return last.content;
	return `${last.sender}: ${last.content}`;
}

function matchesNameFilter(chat: ChatData, query: string): boolean {
	if (!query) return true;
	if (chat.title.toLowerCase().includes(query)) return true;
	return chat.participants.some((p) => p.toLowerCase().includes(query));
}

// Display chats most-recent-activity-first (chat.endDate, already computed
// at parse time as the last message's timestamp) rather than insertion
// order - insertion order differs between a live import (appended to the
// end) and a restart restore (sorted by when the record was last touched),
// so neither was a reliable "most recent" ordering on its own. We sort a
// list of indices rather than `chats` itself so onSelect/onDeleteRequest/
// selectedIndex, which all address the original `chats` array, keep working
// unchanged.
const sortedChatIndices = $derived.by(() => {
	const query = nameFilter.toLowerCase().trim();
	return chats
		.map((_, index) => index)
		.filter((index) => isArchived(chats[index].title) === showArchivedOnly)
		.filter((index) => matchesNameFilter(chats[index], query))
		.sort(
			(a, b) =>
				(chats[b].endDate?.getTime() ?? 0) - (chats[a].endDate?.getTime() ?? 0),
		);
});
</script>

<div class="flex flex-col h-full bg-white dark:bg-gray-900">
	<!-- Chat list -->
	<div class="flex-1 overflow-y-auto">
		{#if nameFilter.trim() && sortedChatIndices.length === 0}
			<div class="p-4 text-center text-gray-500 dark:text-gray-400">
			<p>{m.chats_search_no_results({ query: nameFilter.trim() })}</p>
			</div>
		{:else if showArchivedOnly && sortedChatIndices.length === 0}
			<div class="p-4 text-center text-gray-500 dark:text-gray-400">
			<p>{m.archived_chats_empty()}</p>
			</div>
		{:else if !showArchivedOnly && sortedChatIndices.length === 0 && loadingChats.length === 0 && chatsNeedingReselect.length === 0}
			<div class="p-4 text-center text-gray-500 dark:text-gray-400">
			<p>{m.chats_no_loaded()}</p>
			<p class="text-sm mt-1">{m.chats_import_hint()}</p>
			</div>
		{:else}
			<!-- Loading chat placeholders (not shown in the Archived view or
			     while filtering - these are transient import-in-progress
			     states, never archived and have no meaningful name match). -->
			{#each showArchivedOnly || nameFilter.trim() ? [] : loadingChats as loadingChat (loadingChat.id)}
				<div
					class="w-full p-4 flex items-start gap-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50"
				>
					<!-- Animated avatar skeleton -->
					<div class="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
						<Icon name="upload" size="lg" class="text-gray-400 dark:text-gray-500 animate-pulse" />
					</div>

					<!-- Loading info -->
					<div class="flex-1 min-w-0 text-left">
						<div class="flex items-center justify-between">
							<h3 class="font-semibold text-gray-800 dark:text-white truncate">
								{loadingChat.filename}
							</h3>
							<span class="text-xs text-[var(--color-whatsapp-teal)] flex-shrink-0 ml-2">
								{Math.round(loadingChat.progress)}%
							</span>
						</div>
						<p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
							{stageLabels[loadingChat.stage]}
						</p>
						<!-- Progress bar -->
						<div class="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
							<div 
								class="h-full bg-[var(--color-whatsapp-teal)] rounded-full transition-all duration-300 ease-out"
								style="width: {loadingChat.progress}%"
							></div>
						</div>
					</div>
				</div>
			{/each}

			<!-- Loaded chats -->
			{#each sortedChatIndices as index (chats[index].title)}
				{@const chat = chats[index]}
				<div
					class="w-full p-4 flex items-start gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 cursor-pointer {selectedIndex === index ? 'bg-gray-100 dark:bg-gray-800' : ''}"
					onclick={() => onSelect(index)}
					onkeydown={(e) => e.key === 'Enter' && onSelect(index)}
					role="button"
					tabindex="0"
				>
					<!-- Avatar -->
					<ChatAvatar name={chat.title} size="md" />

					<!-- Chat info -->
					<div class="flex-1 min-w-0 text-left">
						<div class="flex items-center justify-between">
							<h3 class="font-semibold text-gray-800 dark:text-white truncate">
								{chat.title}
							</h3>
							<span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
								{formatDate(chat.endDate)}
							</span>
						</div>
						<p class="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5 flex items-center gap-1">
							{#if isLocked(chat.title)}
								<Icon name="lock" size="xs" class="flex-shrink-0" />
								<span class="italic">{m.chat_locked_preview()}</span>
							{:else}
								{getLastMessage(chat)}
							{/if}
						</p>
						<div class="flex items-center gap-2 mt-1">
							<span class="text-xs text-gray-400 dark:text-gray-500">
								{chat.messageCount} {m.count_messages()}
							</span>
							{#if chat.mediaCount > 0}
								<span class="text-xs text-gray-400 dark:text-gray-500">
									• {chat.mediaCount} {m.count_media()}
								</span>
							{/if}
						</div>
					</div>

					<!-- Action buttons -->
					<div class="flex flex-col gap-1 flex-shrink-0">
						<!-- Menu button -->
						<IconButton
							theme="subtle"
							size="sm"
							onclick={(e) => {
								e.stopPropagation();
								openContextMenu(e, index, e.currentTarget as HTMLButtonElement);
							}}
							title={m.chat_options()}
							aria-label={m.chat_options()}
						>
							<Icon name="dots-vertical" size="md" />
						</IconButton>
					</div>
				</div>
			{/each}

			<!-- Chats that need a file re-selected before they can open (web
			     only - see chatsNeedingReselect's doc comment in +page.svelte).
			     Not shown in the Archived view or while filtering, for the
			     same reason as the loading placeholders above. -->
			{#each showArchivedOnly || nameFilter.trim() ? [] : chatsNeedingReselect as metadata (metadata.id)}
				<div
					class="w-full p-4 flex items-start gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 cursor-pointer opacity-60"
					onclick={() => onOpenReselect?.(metadata)}
					onkeydown={(e) => e.key === 'Enter' && onOpenReselect?.(metadata)}
					role="button"
					tabindex="0"
				>
					<ChatAvatar name={metadata.chatTitle} size="md" />
					<div class="flex-1 min-w-0 text-left">
						<h3 class="font-semibold text-gray-800 dark:text-white truncate">
							{metadata.chatTitle}
						</h3>
						<p class="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5 flex items-center gap-1">
							<Icon name="folder" size="xs" class="flex-shrink-0" />
							{m.chat_needs_reselect()}
						</p>
					</div>
				</div>
			{/each}
		{/if}

		{#if nameFilter.trim() && onSearchMessages}
			<button
				type="button"
				class="w-full flex items-center gap-2 px-4 py-3 text-sm text-[var(--color-whatsapp-teal)] hover:bg-gray-50 dark:hover:bg-gray-800 border-t border-gray-100 dark:border-gray-800 cursor-pointer"
				onclick={() => onSearchMessages?.(nameFilter.trim())}
			>
				<Icon name="search" size="sm" />
				{m.global_search_trigger({ query: nameFilter.trim() })}
			</button>
		{/if}
	</div>

	<!-- Context Menu -->
	{#if contextMenuIndex !== null && menuButtonRef}
		<!-- Backdrop -->
		<button
			type="button"
			class="fixed inset-0 z-40 cursor-default"
			onclick={closeContextMenu}
			aria-label={m.context_menu_close()}
		></button>
		
		<!-- Menu -->
		<div
			class="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 w-[200px]"
			use:floating={{ 
				reference: menuButtonRef, 
				placement: 'bottom-end', 
				fallbackPlacements: ['bottom-start', 'top-end', 'top-start', 'left-start', 'right-start'],
				offsetDistance: 4 
			}}
		>
			<!-- Auto-load media toggle -->
			{#if chats[contextMenuIndex]?.mediaCount > 0}
				<ListItemButton class="justify-between" onclick={handleAutoLoadToggle}>
					<span class="flex items-center gap-2">
					<Icon name="image" size="sm" />
						{m.auto_load_media()}
					</span>
					{#if isAutoLoadEnabled(chats[contextMenuIndex]?.title || '')}
						<Icon name="check" size="sm" class="text-[var(--color-whatsapp-teal)]" />
					{/if}
				</ListItemButton>
			{/if}
			
			<!-- Lock chat toggle -->
			<ListItemButton class="justify-between" onclick={handleToggleLock}>
				<span class="flex items-center gap-2">
					<Icon name="lock" size="sm" />
					{isLocked(chats[contextMenuIndex]?.title || '')
						? m.chat_remove_lock()
						: m.chat_lock()}
				</span>
				{#if isLocked(chats[contextMenuIndex]?.title || '')}
					<Icon name="check" size="sm" class="text-[var(--color-whatsapp-teal)]" />
				{/if}
			</ListItemButton>

			<!-- Archive chat toggle -->
			<ListItemButton class="justify-between" onclick={handleToggleArchive}>
				<span class="flex items-center gap-2">
					<Icon name="archive" size="sm" />
					{isArchived(chats[contextMenuIndex]?.title || '')
						? m.chat_unarchive()
						: m.chat_archive()}
				</span>
			</ListItemButton>

			<!-- Language submenu trigger -->
			<div class="relative">
				<ListItemButton
					bind:ref={languageTriggerRef}
					class="justify-between"
					onmouseenter={showSubmenu}
					onmouseleave={hideSubmenuDelayed}
					onclick={() => showLanguageSubmenu = !showLanguageSubmenu}
				>
					<span class="flex items-center gap-2">
						<Icon name="language" size="sm" />
						{m.transcription_language()}
					</span>
				<Icon name="chevron-right" size="sm" />
			</ListItemButton>
				<!-- Language submenu -->
				{#if showLanguageSubmenu && languageTriggerRef}
					<!-- svelte-ignore a11y_interactive_supports_focus -->
					<div
						class="fixed z-[60] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 w-[160px] overflow-y-auto"
						use:floating={{
							reference: languageTriggerRef,
							placement: 'left-start',
							fallbackPlacements: ['right-start', 'bottom-start', 'bottom-end', 'top-start'],
							offsetDistance: 4,
							enableSizeConstraint: true
						}}
						onmouseenter={cancelHideSubmenu}
						onmouseleave={hideSubmenuDelayed}
						role="menu"
					>
						<div class="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
							<span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{m.transcription_select_language()}</span>
						</div>
						{#each availableLanguages as lang}
							{@const currentLang = getLanguageForChat(chats[contextMenuIndex]?.title || '')}
							<ListItemButton
								active={currentLang === lang.code}
								onclick={() => handleLanguageSelect(lang.code)}
							>
								<span class="w-5 text-center">{currentLang === lang.code ? '✓' : ''}</span>
								<span>{lang.name}</span>
							</ListItemButton>
						{/each}
					</div>
				{/if}
			</div>
			
			<!-- Divider -->
			<div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
			
			<!-- Delete chat -->
			<ListItemButton danger onclick={handleDeleteRequest}>
				<Icon name="trash" size="sm" />
				{m.chat_delete()}
			</ListItemButton>
		</div>
	{/if}
</div>
