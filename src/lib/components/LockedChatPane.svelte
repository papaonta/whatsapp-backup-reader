<script lang="ts">
import * as m from '$lib/paraglide/messages';
import Button from './Button.svelte';
import Icon from './Icon.svelte';

interface Props {
	onUnlock: () => void;
}

let { onUnlock }: Props = $props();
</script>

<div class="flex-1 flex flex-col items-center justify-center gap-4 p-8 bg-gray-50 dark:bg-gray-900/50">
	<div class="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
		<Icon name="lock" size="xl" class="text-gray-500 dark:text-gray-400" />
	</div>
	<div class="text-center">
		<p class="font-medium text-gray-700 dark:text-gray-200">
			{m.locked_chat_pane_title()}
		</p>
		<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
			{m.locked_chat_pane_subtitle()}
		</p>
	</div>
	<Button variant="primary" size="md" onclick={onUnlock}>
		<Icon name="lock-open" size="sm" />
		{m.locked_chat_pane_unlock()}
	</Button>
</div>
