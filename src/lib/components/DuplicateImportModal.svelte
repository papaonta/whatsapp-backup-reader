<script lang="ts">
import { formatRelativeDate } from '$lib/helpers/format';
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import type { PersistedChatMetadata } from '$lib/persistence.svelte';
import Button from './Button.svelte';
import ChatAvatar from './ChatAvatar.svelte';
import Icon from './Icon.svelte';
import Modal from './Modal.svelte';
import ModalContent from './ModalContent.svelte';
import ModalHeader from './ModalHeader.svelte';

interface Props {
	existing: PersistedChatMetadata;
	isExactDuplicate: boolean;
	newMessageCount: number;
	onUpdate: () => void;
	onImportAsNew: () => void;
	onCancel: () => void;
}

let {
	existing,
	isExactDuplicate,
	newMessageCount,
	onUpdate,
	onImportAsNew,
	onCancel,
}: Props = $props();
</script>

<Modal open={true} onClose={onCancel}>
	<ModalHeader title={m.persistence_duplicate_title()} onClose={onCancel} />
	<ModalContent>
		<div class="flex flex-col gap-5 sm:gap-6">
			<div class="flex gap-2 sm:gap-3 items-start p-3 sm:p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg sm:rounded-xl border border-amber-200 dark:border-amber-800/30">
				<div class="flex-shrink-0 mt-0.5">
					<Icon name="alert-circle" size="md" class="text-amber-600 dark:text-amber-500" />
				</div>
				<p class="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
					{#if isExactDuplicate}
						{m.persistence_duplicate_exact_description({
							count: existing.messageCount,
							date: formatRelativeDate(existing.updatedAt, getLocale(), m.time_today(), m.time_yesterday(), 'label'),
						})}
					{:else if newMessageCount > existing.messageCount}
						{m.persistence_duplicate_newer_description({
							chatTitle: existing.chatTitle,
							oldCount: existing.messageCount,
							newCount: newMessageCount,
						})}
					{:else}
						{m.persistence_duplicate_fewer_description({
							chatTitle: existing.chatTitle,
							oldCount: existing.messageCount,
							newCount: newMessageCount,
						})}
					{/if}
				</p>
			</div>

			<div class="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-[var(--color-whatsapp-light-green)] dark:bg-[var(--color-whatsapp-dark-green)]/20 rounded-lg sm:rounded-xl border border-[var(--color-whatsapp-teal)]/20">
				<ChatAvatar name={existing.chatTitle} responsive />
				<div class="flex-1 min-w-0">
					<h3 class="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate mb-1">
						{existing.chatTitle}
					</h3>
					<div class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
						<Icon name="message-circle" size="xs" />
						<span>{m.persistence_message_count({ count: existing.messageCount })}</span>
					</div>
				</div>
			</div>

			<div class="flex flex-col gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
				<Button variant="primary" size="lg" onclick={onUpdate}>
					{m.persistence_duplicate_update()}
				</Button>
				<Button variant="secondary" size="lg" onclick={onImportAsNew}>
					{m.persistence_duplicate_import_as_new()}
				</Button>
				<Button variant="ghost" size="lg" onclick={onCancel}>
					{m.persistence_duplicate_cancel()}
				</Button>
			</div>
		</div>
	</ModalContent>
</Modal>
