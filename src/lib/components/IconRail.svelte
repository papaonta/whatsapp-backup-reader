<script lang="ts">
import * as m from '$lib/paraglide/messages';
import Icon from './Icon.svelte';

interface Props {
	activeItem: 'chats' | 'starred';
	onSelectChats: () => void;
	onSelectStarred: () => void;
	onOpenSettings: () => void;
}

let { activeItem, onSelectChats, onSelectStarred, onOpenSettings }: Props =
	$props();

const activeClasses =
	'text-[var(--color-whatsapp-teal)] bg-[var(--color-whatsapp-teal)]/10';
const inactiveClasses =
	'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700';
const disabledClasses =
	'text-gray-400 dark:text-gray-600 opacity-40 cursor-not-allowed';
const baseClasses =
	'w-11 h-11 flex items-center justify-center rounded-lg transition-colors cursor-pointer';
</script>

<div
	class="hidden md:flex w-16 flex-shrink-0 flex-col items-center gap-1 py-3 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700"
>
	<button
		type="button"
		class="{baseClasses} {activeItem === 'chats' ? activeClasses : inactiveClasses}"
		onclick={onSelectChats}
		aria-label={m.rail_chats()}
		title={m.rail_chats()}
	>
		<Icon name="chat" size="lg" />
	</button>

	<button
		type="button"
		class="{baseClasses} {disabledClasses}"
		disabled
		aria-label={m.rail_archived()}
		title={m.rail_coming_soon()}
	>
		<Icon name="archive" size="lg" />
	</button>

	<button
		type="button"
		class="{baseClasses} {activeItem === 'starred' ? activeClasses : inactiveClasses}"
		onclick={onSelectStarred}
		aria-label={m.rail_starred()}
		title={m.rail_starred()}
	>
		<Icon name="star" size="lg" />
	</button>

	<button
		type="button"
		class="{baseClasses} {disabledClasses}"
		disabled
		aria-label={m.rail_all_media()}
		title={m.rail_coming_soon()}
	>
		<Icon name="grid" size="lg" />
	</button>

	<button
		type="button"
		class="{baseClasses} {inactiveClasses} mt-auto"
		onclick={onOpenSettings}
		aria-label={m.rail_settings()}
		title={m.rail_settings()}
	>
		<Icon name="settings" size="lg" />
	</button>
</div>
