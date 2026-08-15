<script lang="ts">
import { untrack } from 'svelte';
import { crossChatSearchState } from '$lib/cross-chat-search.svelte';
import { formatRelativeDate } from '$lib/helpers/format';
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import { appState } from '$lib/state.svelte';
import ChatAvatar from './ChatAvatar.svelte';
import Icon from './Icon.svelte';
import IconButton from './IconButton.svelte';
import SearchBar from './SearchBar.svelte';

interface Props {
	initialQuery: string;
	onNavigateToMessage: (messageId: string, chatTitle: string) => void;
	onClose: () => void;
}

let { initialQuery, onNavigateToMessage, onClose }: Props = $props();

// Seeded from the trigger's query once, then independently editable -
// not meant to track initialQuery after mount.
let query = $state(untrack(() => initialQuery));

$effect(() => {
	crossChatSearchState.ensureWorkersForChats(appState.chats);
});

$effect(() => {
	crossChatSearchState.search(query);
});

function handleInput(value: string) {
	query = value;
}

function formatDate(date: Date): string {
	return formatRelativeDate(
		date,
		getLocale(),
		m.time_today(),
		m.time_yesterday(),
		'compact',
	);
}
</script>

<div class="flex flex-col h-full bg-white dark:bg-gray-800">
	<div class="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
		<div class="flex items-center justify-between h-10 mb-2">
			<div class="flex items-center gap-2">
				<Icon name="search" class="text-[var(--color-whatsapp-teal)]" />
				<h2 class="font-semibold text-gray-900 dark:text-gray-100">{m.global_search_title()}</h2>
			</div>
			<IconButton theme="light" size="sm" onclick={onClose} aria-label={m.close()}>
				<Icon name="close" />
			</IconButton>
		</div>
		<SearchBar
			value={query}
			onInput={handleInput}
			placeholder={m.global_search_placeholder()}
		/>
	</div>

	<div class="flex-1 overflow-y-auto">
		{#if crossChatSearchState.isSearching}
			<div class="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
				{m.global_search_searching()}
			</div>
		{:else if query.trim() && crossChatSearchState.groups.length === 0}
			<div class="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
				{m.global_search_no_results({ query: query.trim() })}
			</div>
		{:else}
			{#each crossChatSearchState.groups as group (group.chatTitle)}
				<div class="border-b border-gray-100 dark:border-gray-700/50">
					<div class="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900/40 sticky top-0">
						<ChatAvatar name={group.chatTitle} size="sm" />
						<span class="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">{group.chatTitle}</span>
						<span class="ml-auto text-xs text-gray-400 flex-shrink-0">
							{m.global_search_result_count({ count: group.totalMatches })}
						</span>
					</div>
					{#each group.results as result (result.messageId)}
						<button
							type="button"
							class="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700/50 border-b border-gray-50 dark:border-gray-800 last:border-b-0 cursor-pointer"
							onclick={() => onNavigateToMessage(result.messageId, group.chatTitle)}
						>
							<div class="flex items-center justify-between gap-2">
								<span class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{result.sender}</span>
								<span class="text-xs text-gray-400 flex-shrink-0">{formatDate(result.timestamp)}</span>
							</div>
							<p class="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
								{#if result.isMediaMessage}
									{m.last_message_media()}
								{:else}
									{result.content}
								{/if}
							</p>
						</button>
					{/each}
				</div>
			{/each}
		{/if}
	</div>
</div>
