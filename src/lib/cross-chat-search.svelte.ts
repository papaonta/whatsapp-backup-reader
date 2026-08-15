/**
 * Cross-chat message search (Fase 6d) - orchestrates one instance of the
 * existing, unmodified search-worker.ts per currently-loaded, indexed
 * chat, rather than a single worker holding every chat's messages. Each
 * worker's own searchId-based cancellation already gives us free, correct
 * per-chat cancellation; a shared search generation counter reused as
 * every worker's searchId lets us also discard responses from a
 * superseded overall query.
 */
import { appState, type ChatData } from './state.svelte';
import { getTranscriptionsForChat } from './transcription.svelte';

export interface CrossChatSearchResult {
	messageId: string;
	sender: string;
	content: string;
	timestamp: Date;
	isMediaMessage: boolean;
}

export interface ChatResultGroup {
	chatTitle: string;
	chatEndDate: Date | null;
	totalMatches: number;
	results: CrossChatSearchResult[];
}

const RESULTS_PER_CHAT_CAP = 10;

interface WorkerEntry {
	worker: Worker;
	latestSearchId: number;
}

function createCrossChatSearchState() {
	let workers = new Map<string, WorkerEntry>();
	let query = $state('');
	let isSearching = $state(false);
	let groups = $state<ChatResultGroup[]>([]);
	let searchGeneration = 0;
	let pendingByChat = new Map<string, ChatResultGroup>();
	let expectedResponses = 0;
	let receivedResponses = 0;

	function spawnWorker(chat: ChatData): WorkerEntry {
		const worker = new Worker(
			new URL('./workers/search-worker.ts', import.meta.url),
			{ type: 'module' },
		);
		const entry: WorkerEntry = { worker, latestSearchId: 0 };
		worker.onmessage = (event: MessageEvent) =>
			handleWorkerMessage(chat.title, entry, event);
		const messageData = (chat.serializedMessages ?? chat.messages).map((m) => ({
			id: m.id,
			content: m.content,
			sender: m.sender,
		}));
		worker.postMessage({ type: 'load-data', messages: messageData });
		return entry;
	}

	function handleWorkerMessage(
		chatTitle: string,
		entry: WorkerEntry,
		event: MessageEvent,
	) {
		const data = event.data;
		if (data.type !== 'complete') return;
		// Ignore responses to a superseded search (this chat's worker moved
		// on to a newer query, or the overall search generation changed).
		if (data.searchId !== entry.latestSearchId) return;
		if (data.searchId !== searchGeneration) return;

		const chat = appState.chats.find((c) => c.title === chatTitle);
		if (chat) {
			pendingByChat.set(chatTitle, buildGroup(chat, data.matchingIds ?? []));
		}
		receivedResponses++;
		groups = sortedGroups(pendingByChat);
		if (receivedResponses >= expectedResponses) {
			isSearching = false;
		}
	}

	function buildGroup(chat: ChatData, matchingIds: string[]): ChatResultGroup {
		const results: CrossChatSearchResult[] = [];
		for (const id of matchingIds) {
			const msg = chat.messagesById?.get(id);
			if (!msg) continue;
			results.push({
				messageId: msg.id,
				sender: msg.sender,
				content: msg.content,
				timestamp: msg.timestamp,
				isMediaMessage: msg.isMediaMessage,
			});
		}
		// Worker returns matches in chronological order - reverse for
		// newest-first, matching every other list in this app.
		results.reverse();
		return {
			chatTitle: chat.title,
			chatEndDate: chat.endDate,
			totalMatches: matchingIds.length,
			results: results.slice(0, RESULTS_PER_CHAT_CAP),
		};
	}

	function sortedGroups(
		byChat: Map<string, ChatResultGroup>,
	): ChatResultGroup[] {
		return [...byChat.values()]
			.filter((g) => g.totalMatches > 0)
			.sort(
				(a, b) =>
					(b.chatEndDate?.getTime() ?? 0) - (a.chatEndDate?.getTime() ?? 0),
			);
	}

	/** Spawn/terminate workers to match the currently-loaded, indexed chat set. */
	function ensureWorkersForChats(chats: ChatData[]): void {
		const currentTitles = new Set(
			chats
				.filter((c) => appState.indexedChatTitles.has(c.title))
				.map((c) => c.title),
		);
		for (const [title, entry] of workers) {
			if (!currentTitles.has(title)) {
				entry.worker.terminate();
				workers.delete(title);
			}
		}
		for (const chat of chats) {
			if (currentTitles.has(chat.title) && !workers.has(chat.title)) {
				workers.set(chat.title, spawnWorker(chat));
			}
		}
	}

	function search(newQuery: string): void {
		query = newQuery;
		searchGeneration++;
		pendingByChat = new Map();
		groups = [];

		const trimmed = newQuery.trim();
		if (!trimmed || workers.size === 0) {
			isSearching = false;
			return;
		}

		isSearching = true;
		expectedResponses = workers.size;
		receivedResponses = 0;

		for (const [title, entry] of workers) {
			const chat = appState.chats.find((c) => c.title === title);
			if (!chat) continue;
			entry.latestSearchId = searchGeneration;
			entry.worker.postMessage({
				type: 'search',
				searchId: searchGeneration,
				query: trimmed,
				transcriptions: getTranscriptionsForChat(
					chat.messages.map((m) => m.id),
				),
			});
		}
	}

	function teardown(): void {
		for (const entry of workers.values()) {
			entry.worker.terminate();
		}
		workers = new Map();
		query = '';
		groups = [];
		pendingByChat = new Map();
		isSearching = false;
	}

	return {
		get query() {
			return query;
		},
		get isSearching() {
			return isSearching;
		},
		get groups() {
			return groups;
		},

		ensureWorkersForChats,
		search,
		teardown,
	};
}

export const crossChatSearchState = createCrossChatSearchState();
