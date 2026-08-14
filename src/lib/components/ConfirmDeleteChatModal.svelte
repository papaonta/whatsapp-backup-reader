<script lang="ts">
import * as m from '$lib/paraglide/messages';
import type { ChatData } from '$lib/state.svelte';
import Button from './Button.svelte';
import ChatAvatar from './ChatAvatar.svelte';
import Icon from './Icon.svelte';
import Modal from './Modal.svelte';
import ModalContent from './ModalContent.svelte';
import ModalHeader from './ModalHeader.svelte';

interface Props {
	chat: ChatData;
	onConfirm: () => void;
	onCancel: () => void;
}

let { chat, onConfirm, onCancel }: Props = $props();
</script>

<Modal open={true} onClose={onCancel}>
	<ModalHeader title={m.chat_delete_confirm_title()} onClose={onCancel} />
	<ModalContent>
		<div class="flex flex-col gap-5 sm:gap-6">
			<div class="flex gap-2 sm:gap-3 items-start p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 rounded-lg sm:rounded-xl border border-red-200 dark:border-red-800/30">
				<div class="flex-shrink-0 mt-0.5">
					<Icon name="alert-circle" size="md" class="text-red-600 dark:text-red-500" />
				</div>
				<p class="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
					{m.chat_delete_confirm_description({ chatTitle: chat.title })}
				</p>
			</div>

			<div class="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-100 dark:bg-gray-800 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700">
				<ChatAvatar name={chat.title} responsive />
				<div class="flex-1 min-w-0">
					<h3 class="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate mb-1">
						{chat.title}
					</h3>
					<div class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
						<Icon name="message-circle" size="xs" />
						<span>{m.persistence_message_count({ count: chat.messageCount })}</span>
					</div>
				</div>
			</div>

			<div class="flex flex-col gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
				<Button variant="danger" size="lg" onclick={onConfirm}>
					{m.chat_delete_confirm_action()}
				</Button>
				<Button variant="ghost" size="lg" onclick={onCancel}>
					{m.persistence_duplicate_cancel()}
				</Button>
			</div>
		</div>
	</ModalContent>
</Modal>
