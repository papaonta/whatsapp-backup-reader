<script lang="ts">
import { untrack } from 'svelte';
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import type { ChatData } from '$lib/state.svelte';
import Button from './Button.svelte';
import Modal from './Modal.svelte';
import ModalContent from './ModalContent.svelte';
import ModalHeader from './ModalHeader.svelte';

interface Props {
	currentChat: ChatData;
	otherChats: ChatData[];
	onMerge: (selected: ChatData[], title: string) => void;
	onClose: () => void;
}

let { currentChat, otherChats, onMerge, onClose }: Props = $props();

// Initialize with the current chat's title, using untrack to avoid warning
let mergedTitle = $state(untrack(() => currentChat.title));
// Keyed by index into otherChats, not title - two merge candidates commonly
// share the same title (they're exports of the same conversation), so a
// title-keyed Set would conflate them.
let selectedIndices = $state<Set<number>>(new Set());

function toggle(index: number) {
	const next = new Set(selectedIndices);
	if (next.has(index)) {
		next.delete(index);
	} else {
		next.add(index);
	}
	selectedIndices = next;
}

function formatRange(chat: ChatData): string {
	if (!chat.startDate || !chat.endDate) return '';
	const locale = getLocale();
	return `${chat.startDate.toLocaleDateString(locale)} – ${chat.endDate.toLocaleDateString(locale)}`;
}

function handleMerge() {
	const selected = otherChats.filter((_, i) => selectedIndices.has(i));
	if (selected.length === 0 || !mergedTitle.trim()) return;
	onMerge(selected, mergedTitle.trim());
}
</script>

<Modal open={true} {onClose}>
	<ModalHeader
		icon="upload"
		title={m.merge_chats_modal_title()}
		onClose={onClose}
		closeLabel={m.close()}
	/>
	<ModalContent>
		<label class="block mb-4">
			<span class="text-xs font-medium text-gray-500 dark:text-gray-400">{m.merge_chats_title_label()}</span>
			<input
				type="text"
				bind:value={mergedTitle}
				class="mt-1 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
			/>
		</label>

		<p class="text-xs text-gray-500 dark:text-gray-400 mb-2">{m.merge_chats_select_prompt()}</p>

		{#if otherChats.length === 0}
			<p class="text-sm text-gray-500 dark:text-gray-400 text-center py-6">{m.merge_chats_no_other_chats()}</p>
		{:else}
			<div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
				{#each otherChats as chat, index}
					<label class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 cursor-pointer">
						<input
							type="checkbox"
							checked={selectedIndices.has(index)}
							onchange={() => toggle(index)}
							class="flex-shrink-0"
						/>
						<div class="flex-1 min-w-0">
							<p class="font-medium text-gray-900 dark:text-white truncate">{chat.title}</p>
							<p class="text-xs text-gray-500 dark:text-gray-400 truncate">{chat.participants.join(', ')}</p>
							<p class="text-xs text-gray-400 dark:text-gray-500">{formatRange(chat)} · {chat.messageCount} {m.participants_messages()}</p>
						</div>
					</label>
				{/each}
			</div>
		{/if}

		<div class="flex justify-end gap-2 mt-6">
			<Button variant="secondary" onclick={onClose}>{m.merge_chats_cancel()}</Button>
			<Button
				variant="primary"
				disabled={selectedIndices.size === 0 || !mergedTitle.trim()}
				onclick={handleMerge}
			>
				{m.merge_chats_button()}
			</Button>
		</div>
	</ModalContent>
</Modal>
