<script lang="ts">
import { formatFileSize } from '$lib/helpers/document-utils';
import * as m from '$lib/paraglide/messages';
import Button from './Button.svelte';
import Icon from './Icon.svelte';
import Modal from './Modal.svelte';
import ModalContent from './ModalContent.svelte';
import ModalHeader from './ModalHeader.svelte';

interface Props {
	chatTitle: string;
	zipPath: string;
	// null while still being checked
	zipBytes: number | null | undefined;
	busy: boolean;
	progress: number;
	error: string | null;
	onConfirm: () => void;
	onChooseFile: () => void;
	onCancel: () => void;
}

let {
	chatTitle,
	zipPath,
	zipBytes,
	busy,
	progress,
	error,
	onConfirm,
	onChooseFile,
	onCancel,
}: Props = $props();

const zipFound = $derived(typeof zipBytes === 'number');
</script>

<Modal open={true} onClose={busy ? () => {} : onCancel}>
	<ModalHeader title={m.reextract_title()} onClose={busy ? () => {} : onCancel} />
	<ModalContent>
		<div class="flex flex-col gap-4">
			<div class="flex gap-2 sm:gap-3 items-start p-3 sm:p-4 bg-[var(--color-whatsapp-teal)]/10 rounded-lg sm:rounded-xl border border-[var(--color-whatsapp-teal)]/20">
				<div class="flex-shrink-0 mt-0.5">
					<Icon name="cloud-download" size="md" class="text-[var(--color-whatsapp-teal)]" />
				</div>
				<div class="flex flex-col gap-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
					<p>{m.reextract_description({ chatTitle })}</p>
					<p>{m.reextract_check_drive()}</p>
				</div>
			</div>

			{#if zipBytes === undefined}
				<p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">…</p>
			{:else if zipFound}
				<div class="text-xs sm:text-sm text-gray-700 dark:text-gray-300 break-all">
					<p>{m.reextract_zip_found({ path: zipPath, size: formatFileSize(zipBytes as number) })}</p>
					<p class="mt-1 font-medium">{m.reextract_estimate({ size: formatFileSize(zipBytes as number) })}</p>
				</div>
			{:else}
				<p class="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{m.reextract_zip_missing()}</p>
			{/if}

			{#if busy}
				<p class="text-sm text-gray-600 dark:text-gray-300">{m.reextract_in_progress({ progress: Math.round(progress * 100) })}</p>
			{/if}
			{#if error}
				<p class="text-sm text-red-600 dark:text-red-400">{error}</p>
			{/if}

			<div class="flex flex-col gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
				<Button variant="primary" size="lg" onclick={onConfirm} disabled={busy || !zipFound}>
					{m.reextract_action()}
				</Button>
				<Button variant="secondary" size="lg" onclick={onChooseFile} disabled={busy}>
					{m.reextract_choose_file()}
				</Button>
				<Button variant="ghost" size="lg" onclick={onCancel}>
					{m.persistence_duplicate_cancel()}
				</Button>
			</div>
		</div>
	</ModalContent>
</Modal>
