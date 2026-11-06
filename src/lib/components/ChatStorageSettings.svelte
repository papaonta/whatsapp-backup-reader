<script lang="ts">
import { chatStorageState } from '$lib/chat-storage.svelte';
import { formatFileSize } from '$lib/helpers/document-utils';
import { openElectronFolder } from '$lib/helpers/file-picker';
import * as m from '$lib/paraglide/messages';
import Button from './Button.svelte';

// Settings → Storage → "Chat storage location". Chat data only; the app
// database (chat list, PIN, stars) is never moved.
const api = window.electronAPI?.isElectron
	? window.electronAPI.chatStorage
	: undefined;

type Plan = {
	toDefault: boolean;
	dir?: string;
	destination: string;
	chatCount: number;
	totalBytes: number;
	freeBytes: number | null;
};

let busy = $state<'idle' | 'planning' | 'moving' | 'reconnecting'>('idle');
let plan = $state<Plan | null>(null);
let message = $state<{ kind: 'info' | 'error'; text: string } | null>(null);
let progress = $state<{
	bytesDone: number;
	totalBytes: number;
	chatIndex: number;
	chatCount: number;
} | null>(null);
let oldFolderNote = $state<string | null>(null);
let usedBytes = $state<number | null>(null);

const status = $derived(chatStorageState.status);
const writable = $derived(chatStorageState.canWrite);
const percent = $derived(
	progress && progress.totalBytes > 0
		? Math.min(
				100,
				Math.round((progress.bytesDone / progress.totalBytes) * 100),
			)
		: 0,
);

const statusText = $derived.by(() => {
	switch (status?.state) {
		case 'ok':
			return m.chat_storage_status_ok();
		case 'unavailable':
			return m.chat_storage_status_unavailable();
		case 'foreign':
			return m.chat_storage_status_foreign();
		case 'other-install':
			return m.chat_storage_status_other_install();
		default:
			return '…';
	}
});

async function refreshSize() {
	usedBytes = null;
	if (!api || !chatStorageState.canRead) return;
	const r = await window.electronAPI?.extraction?.getStorageUsage();
	usedBytes = r?.success ? r.bytes : null;
}

$effect(() => {
	// Re-measure whenever the status (and so possibly the root) changes.
	status?.root;
	status?.state;
	refreshSize();
});

function reasonText(reason?: string): string {
	switch (reason) {
		case 'not-writable':
			return m.chat_storage_err_not_writable();
		case 'busy':
			return m.chat_storage_err_busy();
		case 'already-default':
			return m.chat_storage_err_already_default();
		case 'same-or-nested':
			return m.chat_storage_err_nested();
		case 'destination-not-empty':
			return m.chat_storage_err_not_empty();
		case 'not-enough-space':
			return m.chat_storage_err_no_space();
		case 'wrong-storage':
			return m.chat_storage_err_wrong_storage();
		case 'no-marker':
		case 'bad-marker':
			return m.chat_storage_err_no_marker();
		default:
			return m.chat_storage_err_bad_destination();
	}
}

async function startPlan(toDefault: boolean) {
	if (!api || busy !== 'idle') return;
	message = null;
	oldFolderNote = null;
	let dir: string | undefined;
	if (!toDefault) {
		const picked = await openElectronFolder();
		if (!picked) return;
		dir = picked;
	}
	busy = 'planning';
	const result = await api.planMove(toDefault ? { toDefault: true } : { dir });
	busy = 'idle';
	if (!result.success) {
		message = { kind: 'error', text: reasonText(result.reason) };
		return;
	}
	plan = {
		toDefault,
		dir,
		destination: result.destination ?? '',
		chatCount: result.chatCount ?? 0,
		totalBytes: result.totalBytes ?? 0,
		freeBytes: result.freeBytes ?? null,
	};
}

async function confirmMove() {
	if (!api || !plan) return;
	const current = plan;
	plan = null;
	busy = 'moving';
	progress = {
		bytesDone: 0,
		totalBytes: current.totalBytes,
		chatIndex: 0,
		chatCount: current.chatCount,
	};
	const off = api.onMoveProgress((p) => {
		progress = {
			bytesDone: p.bytesDone,
			totalBytes: p.totalBytes,
			chatIndex: p.chatIndex ?? 0,
			chatCount: p.chatCount,
		};
	});
	const result = await api.move(
		current.toDefault ? { toDefault: true } : { dir: current.dir },
	);
	off();
	busy = 'idle';
	progress = null;
	if (result.success) {
		oldFolderNote = result.oldRoot ?? null;
		message = {
			kind: 'info',
			text: m.chat_storage_move_done({ path: result.newRoot ?? '' }),
		};
	} else if (result.cancelled) {
		message = { kind: 'info', text: m.chat_storage_move_cancelled() };
	} else if (result.reason) {
		message = { kind: 'error', text: reasonText(result.reason) };
	} else {
		message = {
			kind: 'error',
			text: m.chat_storage_move_failed({ error: result.error ?? '' }),
		};
	}
	await chatStorageState.refresh();
}

async function reconnect() {
	if (!api || busy !== 'idle') return;
	message = null;
	oldFolderNote = null;
	const picked = await openElectronFolder();
	if (!picked) return;
	busy = 'reconnecting';
	const result = await api.reconnect(picked);
	busy = 'idle';
	if (result.success) {
		message = {
			kind: 'info',
			text: m.chat_storage_reconnect_done({ path: picked }),
		};
	} else {
		message = { kind: 'error', text: reasonText(result.reason) };
	}
	await chatStorageState.refresh();
}
</script>

{#if api}
	<div class="mt-3 text-sm text-gray-700 dark:text-gray-300 space-y-2" data-testid="chat-storage-settings">
		<h4 class="font-medium text-gray-800 dark:text-gray-100">{m.chat_storage_title()}</h4>
		<p class="text-xs text-gray-500 dark:text-gray-400">{m.chat_storage_hint()}</p>
		<dl class="text-xs grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
			<dt class="text-gray-500 dark:text-gray-400">{m.chat_storage_path_label()}</dt>
			<dd class="font-mono break-all" data-testid="chat-storage-path">
				{status?.root ?? '…'}{status?.isDefault ? ` ${m.chat_storage_default_badge()}` : ''}
			</dd>
			<dt class="text-gray-500 dark:text-gray-400">{m.chat_storage_size_label()}</dt>
			<dd>{usedBytes === null ? '—' : formatFileSize(usedBytes)}</dd>
			<dt class="text-gray-500 dark:text-gray-400">{m.chat_storage_status_label()}</dt>
			<dd data-testid="chat-storage-status">{statusText}</dd>
		</dl>

		{#if busy === 'moving' && progress}
			<div data-testid="chat-storage-progress">
				<p>
					{m.chat_storage_moving({
						percent,
						done: formatFileSize(progress.bytesDone),
						total: formatFileSize(progress.totalBytes),
						index: progress.chatIndex,
						count: progress.chatCount,
					})}
				</p>
				<div class="h-1.5 bg-gray-200 dark:bg-gray-700 rounded mt-1">
					<div class="h-1.5 bg-[var(--color-whatsapp-teal)] rounded" style="width: {percent}%"></div>
				</div>
				<div class="mt-2">
					<Button variant="secondary" size="sm" onclick={() => api.cancelMove()}>
						{m.persistence_duplicate_cancel()}
					</Button>
				</div>
			</div>
		{:else if plan}
			<div class="space-y-2" data-testid="chat-storage-confirm">
				<p class="font-medium">
					{m.chat_storage_confirm_move({
						count: plan.chatCount,
						size: formatFileSize(plan.totalBytes),
						path: plan.destination,
					})}
				</p>
				<p class="text-xs text-gray-500 dark:text-gray-400">
					{plan.freeBytes === null
						? m.chat_storage_free_unknown()
						: m.chat_storage_free_space({ size: formatFileSize(plan.freeBytes) })}
				</p>
				<div class="flex gap-2">
					<Button variant="primary" size="sm" onclick={confirmMove}>{m.chat_storage_confirm_action()}</Button>
					<Button variant="ghost" size="sm" onclick={() => (plan = null)}>{m.persistence_duplicate_cancel()}</Button>
				</div>
			</div>
		{:else}
			<div class="flex flex-wrap gap-2">
				<Button variant="secondary" size="sm" onclick={() => startPlan(false)} disabled={!writable || busy !== 'idle'}>
					{m.chat_storage_move()}
				</Button>
				<Button variant="secondary" size="sm" onclick={reconnect} disabled={busy !== 'idle' || chatStorageState.status?.moving}>
					{m.chat_storage_reconnect()}
				</Button>
				<Button
					variant="secondary"
					size="sm"
					onclick={() => startPlan(true)}
					disabled={!writable || busy !== 'idle' || !!status?.isDefault}
				>
					{m.chat_storage_restore_default()}
				</Button>
			</div>
		{/if}

		{#if message}
			<p class={message.kind === 'error' ? 'text-red-600 dark:text-red-400' : ''} data-testid="chat-storage-message">
				{message.text}
			</p>
		{/if}
		{#if oldFolderNote}
			<p class="text-xs font-medium" data-testid="chat-storage-old-folder">
				{m.chat_storage_old_folder({ path: oldFolderNote })}
			</p>
		{/if}
	</div>
{/if}
