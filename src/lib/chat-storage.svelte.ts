// Renderer-side view of the chat storage (the extracted-chats folder, see
// electron/lib/chat-storage.cjs). Chat data only - not the app database, and
// unrelated to the "archive chat" feature.
//
// The main process is the source of truth and enforces every rule itself; this
// state only drives the banner and disables buttons. Outside Electron there is
// no such storage, so everything is always allowed.

export type ChatStorageState =
	| 'ok'
	| 'unavailable'
	| 'foreign'
	| 'other-install';

export interface ChatStorageStatus {
	state: ChatStorageState;
	reason: string | null;
	root: string;
	defaultRoot: string;
	isDefault: boolean;
	canRead: boolean;
	canWrite: boolean;
	moving: boolean;
}

function createChatStorageState() {
	const api =
		typeof window !== 'undefined' && window.electronAPI?.isElectron
			? window.electronAPI.chatStorage
			: undefined;

	let status = $state<ChatStorageStatus | null>(null);
	let checking = $state(false);
	const readableListeners = new Set<() => void>();

	async function refresh(): Promise<ChatStorageStatus | null> {
		if (!api) return null;
		checking = true;
		try {
			const wasReadable = status?.canRead ?? false;
			const next = await api.getStatus();
			status = next;
			if (next.canRead && !wasReadable) {
				for (const listener of readableListeners) listener();
			}
			return next;
		} catch {
			return status;
		} finally {
			checking = false;
		}
	}

	/** Re-checks whenever the window regains focus. Returns a cleanup function. */
	function start(): () => void {
		if (!api || typeof window === 'undefined') return () => {};
		const onFocus = () => {
			refresh();
		};
		window.addEventListener('focus', onFocus);
		refresh();
		return () => window.removeEventListener('focus', onFocus);
	}

	/** Called when the storage becomes readable again (e.g. vault unlocked). */
	function onBecameReadable(listener: () => void): () => void {
		readableListeners.add(listener);
		return () => readableListeners.delete(listener);
	}

	return {
		get isElectron() {
			return !!api;
		},
		get status() {
			return status;
		},
		get checking() {
			return checking;
		},
		/** Reading chats is possible (also with the "other computer" warning). */
		get canRead() {
			return !api || status?.canRead === true;
		},
		/** Importing / deleting / merging / backing up / moving is allowed. */
		get canWrite() {
			return !api || status?.canWrite === true;
		},
		/** Show a banner (anything but "ok"). Unknown yet = no banner. */
		get problem() {
			return api && status && status.state !== 'ok' ? status.state : null;
		},
		refresh,
		start,
		onBecameReadable,
	};
}

export const chatStorageState = createChatStorageState();
