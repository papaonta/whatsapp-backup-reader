<script lang="ts">
import { chatStorageState } from '$lib/chat-storage.svelte';
import * as m from '$lib/paraglide/messages';
import Button from './Button.svelte';

const problem = $derived(chatStorageState.problem);
</script>

{#if problem}
	<div
		class="px-3 py-2 text-xs border-b {problem === 'other-install'
			? 'bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 border-amber-200 dark:border-amber-800'
			: 'bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-100 border-red-200 dark:border-red-800'}"
		role="alert"
		data-testid="chat-storage-banner"
		data-state={problem}
	>
		<p>
			{#if problem === 'unavailable'}
				{m.chat_storage_banner_unavailable()}
			{:else if problem === 'foreign'}
				{m.chat_storage_banner_foreign()}
			{:else}
				{m.chat_storage_banner_other_install()}
			{/if}
		</p>
		{#if problem !== 'other-install'}
			<div class="mt-1.5">
				<Button
					variant="secondary"
					size="sm"
					onclick={() => chatStorageState.refresh()}
					disabled={chatStorageState.checking}
				>
					{m.chat_storage_retry()}
				</Button>
			</div>
		{/if}
	</div>
{/if}
