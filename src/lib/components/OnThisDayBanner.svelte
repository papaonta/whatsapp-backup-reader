<script lang="ts">
import type { OnThisDayMatch } from '$lib/helpers/on-this-day';
import * as m from '$lib/paraglide/messages';
import Icon from './Icon.svelte';
import IconButton from './IconButton.svelte';

interface Props {
	match: OnThisDayMatch;
	onView: () => void;
	onDismiss: () => void;
}

let { match, onView, onDismiss }: Props = $props();

const firstMessage = $derived(match.messages[0]);
const plural = $derived(match.yearsAgo !== 1 ? 's' : '');

function handleDismiss(e: MouseEvent) {
	e.stopPropagation();
	onDismiss();
}
</script>

<button
	type="button"
	class="w-full flex items-center gap-3 px-4 py-2.5 bg-[var(--color-whatsapp-light-green)] dark:bg-[var(--color-whatsapp-dark-green)]/40 border-b border-gray-200 dark:border-gray-700 text-left cursor-pointer hover:brightness-95 dark:hover:brightness-110 transition-all"
	onclick={onView}
>
	<Icon name="calendar" size="md" class="text-[var(--color-whatsapp-dark-green)] dark:text-[var(--color-whatsapp-light-green)] flex-shrink-0" />

	<div class="flex-1 min-w-0">
		<p class="text-sm font-semibold text-gray-800 dark:text-gray-100">
			{m.on_this_day_title({ yearsAgo: match.yearsAgo, plural })}
		</p>
		<p class="text-xs text-gray-600 dark:text-gray-300 truncate">
			{firstMessage.sender}: {firstMessage.content}
		</p>
	</div>

	<IconButton
		theme="subtle"
		size="sm"
		rounded="full"
		onclick={handleDismiss}
		aria-label={m.on_this_day_dismiss()}
		title={m.on_this_day_dismiss()}
	>
		<Icon name="close" size="sm" />
	</IconButton>
</button>
