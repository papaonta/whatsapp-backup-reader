/**
 * Media gallery state management using Svelte 5 runes
 *
 * Keeps selection/lightbox UI state separate from parsing and media loading.
 *
 * Note: Full-size media loading should continue to use loadMediaFile() in
 * src/lib/parser/zip-parser.ts to reuse the existing global cache.
 */

import type { MediaFile } from './parser/zip-parser';
import { appState } from './state.svelte';

export interface GalleryItem {
	id: string; // stable ID (chatTitle + media.path - see toGalleryItem)
	media: MediaFile;
	name: string;
	path: string;
	type: MediaFile['type'];
	size: number;
	messageId?: string;
	messageTimestamp?: string;
	messageSender?: string;
	// Which chat this item belongs to - always the current chat in 'chat'
	// mode, essential for provenance/navigation in 'all' mode. Chats have
	// no separate id; title is already the established lookup key (see
	// +page.svelte's handleNavigateToBookmark).
	chatTitle: string;
}

/** Date key in YYYY-MM-DD format */
export type DateKey = string;

/** Sentinel sync key for "All Media" mode - see syncToChatTitle. */
export const ALL_MEDIA_SYNC_KEY = '__ALL_MEDIA__';

function toGalleryItem(media: MediaFile, chatTitle: string): GalleryItem {
	return {
		// media.path alone isn't guaranteed unique once items from multiple
		// chats are merged in 'all' mode (WhatsApp's auto-generated media
		// filenames can collide across separate chat exports) - chatTitle
		// disambiguates. Selection/lightbox key off `id`, not `path` (see
		// selectedMediaIds/lightboxMediaId below); `path`/`media` stay the
		// original values needed for byte-fetching.
		id: `${chatTitle}::${media.path}`,
		media,
		name: media.name,
		path: media.path,
		type: media.type,
		size: media.size,
		messageId: media.messageId,
		messageTimestamp: media.messageTimestamp,
		messageSender: media.messageSender,
		chatTitle,
	};
}

/** Extract YYYY-MM-DD from ISO timestamp or return null */
function toDateKey(timestamp?: string): DateKey | null {
	if (!timestamp) return null;

	// Fast path: timestamp already starts with ISO date "YYYY-MM-DD"
	const isoMatch = /^(\d{4}-\d{2}-\d{2})/.exec(timestamp);
	if (isoMatch) {
		return isoMatch[1];
	}

	// Fallback: try to parse other date formats and normalize to YYYY-MM-DD
	const date = new Date(timestamp);
	if (Number.isNaN(date.getTime())) {
		return null;
	}

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

/** Valid media type filter values */
export type MediaTypeFilter =
	| 'image'
	| 'video'
	| 'audio'
	| 'document'
	| 'other';

function createGalleryState() {
	let selectedMediaIds = $state<Set<string>>(new Set());
	let lightboxMediaId = $state<string | null>(null);
	let lastChatTitle = $state<string | null>(null);
	let scrollToDateKey = $state<DateKey | null>(null);

	// Filter state (stored as Sets internally for O(1) operations)
	let filterParticipantsSet = $state<Set<string>>(new Set());
	let filterTypesSet = $state<Set<MediaTypeFilter>>(new Set());

	// Expose filters as arrays for external consumption
	const filterParticipants = $derived(Array.from(filterParticipantsSet));
	const filterTypes = $derived(Array.from(filterTypesSet));

	let viewMode = $state<'chat' | 'all'>('chat');

	/** All items (unfiltered) */
	const allItems = $derived.by(() => {
		if (viewMode === 'all') {
			return appState.chats.flatMap((chat) =>
				chat.mediaFiles.map((media) => toGalleryItem(media, chat.title)),
			);
		}
		const chat = appState.selectedChat;
		if (!chat) return [] as GalleryItem[];
		return chat.mediaFiles.map((media) => toGalleryItem(media, chat.title));
	});

	/** Unique participants who sent media */
	const mediaParticipants = $derived.by(() => {
		const participants = new Set<string>();
		for (const item of allItems) {
			if (item.messageSender) {
				participants.add(item.messageSender);
			}
		}
		return [...participants].sort((a, b) =>
			a.localeCompare(b, undefined, { sensitivity: 'base' }),
		);
	});

	/** Filtered items based on participant and type filters */
	const items = $derived.by(() => {
		let result = allItems;

		// Filter by participants
		if (filterParticipantsSet.size > 0) {
			result = result.filter((item) =>
				item.messageSender
					? filterParticipantsSet.has(item.messageSender)
					: false,
			);
		}

		// Filter by types
		if (filterTypesSet.size > 0) {
			result = result.filter((item) => filterTypesSet.has(item.type));
		}

		return result;
	});

	/** Whether any filter is active */
	const hasActiveFilter = $derived(
		filterParticipantsSet.size > 0 || filterTypesSet.size > 0,
	);

	/** Items grouped by date (YYYY-MM-DD), sorted newest first */
	const itemsByDate = $derived.by(() => {
		const map = new Map<DateKey, GalleryItem[]>();
		const unknownKey = 'unknown';

		for (const item of items) {
			const key = toDateKey(item.messageTimestamp) ?? unknownKey;
			let arr = map.get(key);
			if (!arr) {
				arr = [];
				map.set(key, arr);
			}
			arr.push(item);
		}

		// Sort keys descending (newest first), but keep 'unknown' at end
		const sortedKeys = [...map.keys()].sort((a, b) => {
			if (a === unknownKey) return 1;
			if (b === unknownKey) return -1;
			return b.localeCompare(a);
		});

		return { map, sortedKeys };
	});

	/** Set of date keys that have media */
	const datesWithMedia = $derived.by(() => {
		const set = new Set<DateKey>();
		for (const key of itemsByDate.sortedKeys) {
			if (key !== 'unknown') {
				set.add(key);
			}
		}
		return set;
	});

	/** Date boundaries (oldest and newest dates with media) */
	const dateBoundaries = $derived.by(() => {
		const keys = itemsByDate.sortedKeys.filter((k) => k !== 'unknown');
		if (keys.length === 0) return { minDate: null, maxDate: null };
		// keys are sorted descending (newest first)
		return {
			minDate: keys[keys.length - 1], // oldest
			maxDate: keys[0], // newest
		};
	});

	const selectedCount = $derived(selectedMediaIds.size);

	const selectedItems = $derived.by(() => {
		if (selectedMediaIds.size === 0) return [] as GalleryItem[];
		const selected = selectedMediaIds;
		return items.filter((it) => selected.has(it.id));
	});

	// currentKey is a real chat title in 'chat' mode, or ALL_MEDIA_SYNC_KEY
	// when entering/leaving 'all' mode - same reset mechanism either way.
	function syncToChatTitle(currentKey: string | null): void {
		if (currentKey === lastChatTitle) return;
		selectedMediaIds = new Set();
		lightboxMediaId = null;
		lastChatTitle = currentKey;
		// Reset filters when changing chats
		filterParticipantsSet = new Set();
		filterTypesSet = new Set();
	}

	function toggleParticipantFilter(participant: string): void {
		if (filterParticipantsSet.has(participant)) {
			filterParticipantsSet.delete(participant);
		} else {
			filterParticipantsSet.add(participant);
		}
		filterParticipantsSet = new Set(filterParticipantsSet);
	}

	function toggleTypeFilter(type: MediaTypeFilter): void {
		if (filterTypesSet.has(type)) {
			filterTypesSet.delete(type);
		} else {
			filterTypesSet.add(type);
		}
		filterTypesSet = new Set(filterTypesSet);
	}

	function clearFilters(): void {
		filterParticipantsSet = new Set();
		filterTypesSet = new Set();
	}

	function isSelected(id: string): boolean {
		return selectedMediaIds.has(id);
	}

	function clearSelection(): void {
		if (selectedMediaIds.size === 0) return;
		selectedMediaIds = new Set();
	}

	function toggleSelected(id: string): void {
		const next = new Set(selectedMediaIds);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		selectedMediaIds = next;
	}

	function selectOnly(id: string): void {
		selectedMediaIds = new Set([id]);
	}

	function selectMany(ids: string[]): void {
		if (ids.length === 0) return;
		const next = new Set(selectedMediaIds);
		for (const id of ids) {
			next.add(id);
		}
		selectedMediaIds = next;
	}

	function setLightbox(id: string | null): void {
		lightboxMediaId = id;
	}

	function setViewMode(mode: 'chat' | 'all'): void {
		viewMode = mode;
	}

	function goToDate(dateKey: DateKey): void {
		scrollToDateKey = dateKey;
	}

	function clearScrollToDate(): void {
		scrollToDateKey = null;
	}

	function getItemCountForDate(dateKey: DateKey): number {
		return itemsByDate.map.get(dateKey)?.length ?? 0;
	}

	/** Get media type breakdown for a specific date */
	function getMediaTypesForDate(dateKey: DateKey): {
		images: number;
		videos: number;
		audio: number;
	} {
		const dateItems = itemsByDate.map.get(dateKey) ?? [];
		let images = 0;
		let videos = 0;
		let audio = 0;
		for (const item of dateItems) {
			if (item.type === 'image') images++;
			else if (item.type === 'video') videos++;
			else if (item.type === 'audio') audio++;
		}
		return { images, videos, audio };
	}

	return {
		get items() {
			return items;
		},
		get allItems() {
			return allItems;
		},
		get itemsByDate() {
			return itemsByDate;
		},
		get datesWithMedia() {
			return datesWithMedia;
		},
		get dateBoundaries() {
			return dateBoundaries;
		},
		get selectedCount() {
			return selectedCount;
		},
		get selectedItems() {
			return selectedItems;
		},
		get lightboxMediaId() {
			return lightboxMediaId;
		},
		get lastChatTitle() {
			return lastChatTitle;
		},
		get viewMode() {
			return viewMode;
		},
		get scrollToDateKey() {
			return scrollToDateKey;
		},
		get filterParticipants() {
			return filterParticipants;
		},
		get filterTypes() {
			return filterTypes;
		},
		get hasActiveFilter() {
			return hasActiveFilter;
		},
		get mediaParticipants() {
			return mediaParticipants;
		},

		syncToChatTitle,
		setViewMode,
		isSelected,
		clearSelection,
		toggleSelected,
		selectOnly,
		selectMany,
		setLightbox,
		goToDate,
		clearScrollToDate,
		getItemCountForDate,
		getMediaTypesForDate,
		toggleParticipantFilter,
		toggleTypeFilter,
		clearFilters,
	};
}

export const galleryState = createGalleryState();
