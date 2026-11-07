<script lang="ts">
import { chatStorageState } from '$lib/chat-storage.svelte';
import { openElectronFolder } from '$lib/helpers/file-picker';
import * as m from '$lib/paraglide/messages';
import Button from './Button.svelte';

const api = window.electronAPI?.isElectron
	? window.electronAPI.chatStorage
	: undefined;

const problem = $derived(chatStorageState.problem);
const status = $derived(chatStorageState.status);
const configCorrupt = $derived(status?.reason === 'config-unreadable');
// Only the default folder (inside the app's own data) may be re-created, and
// only by an explicit click.
const canCreateDefault = $derived(
	problem === 'unavailable' && status?.reason === 'missing' && status.isDefault,
);

const canOfferCryptomator = $derived(
	problem === 'unavailable' && !configCorrupt && status?.isDefault === false,
);

// "Open Cryptomator": only for a custom location that is unavailable, and only
// if the app is installed. Cryptomator stays optional: no hint to install it.
let cryptomatorInstalled = $state(false);
$effect(() => {
	cryptomatorInstalled = false;
	if (!api || !canOfferCryptomator) return;
	window.electronAPI?.cryptomator?.isInstalled().then((installed) => {
		cryptomatorInstalled = installed;
	});
});
async function openCryptomator() {
	await window.electronAPI?.cryptomator?.open();
}

let step = $state<'idle' | 'confirm-create' | 'confirm-recover'>('idle');
let recoverDir = $state<string | null>(null);
let errorText = $state<string | null>(null);

function reasonText(reason?: string): string {
	return reason === 'bad-marker' || reason === 'no-marker'
		? m.chat_storage_err_no_marker()
		: m.chat_storage_err_bad_destination();
}

async function createDefault() {
	if (!api) return;
	const result = await api.createDefault();
	step = 'idle';
	errorText = result.success ? null : (result.error ?? result.reason ?? null);
	await chatStorageState.refresh();
}

async function pickRecoverFolder() {
	if (!api) return;
	errorText = null;
	const picked = await openElectronFolder();
	if (!picked) return;
	const preview = await api.previewRecover(picked);
	if (!preview.success) {
		errorText = reasonText(preview.reason);
		return;
	}
	recoverDir = picked;
	step = 'confirm-recover';
}

async function recover() {
	if (!api || !recoverDir) return;
	const result = await api.recover(recoverDir);
	step = 'idle';
	recoverDir = null;
	errorText = result.success ? null : reasonText(result.reason);
	await chatStorageState.refresh();
}
</script>

{#if problem}
	<div
		class="px-3 py-2 text-xs border-b {problem === 'other-install'
			? 'bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 border-amber-200 dark:border-amber-800'
			: 'bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-100 border-red-200 dark:border-red-800'}"
		role="alert"
		data-testid="chat-storage-banner"
		data-state={problem}
		data-reason={status?.reason ?? ''}
	>
		<p>
			{#if configCorrupt}
				{m.chat_storage_banner_config_corrupt()}
			{:else if problem === 'unavailable'}
				{m.chat_storage_banner_unavailable()}
			{:else if problem === 'foreign'}
				{m.chat_storage_banner_foreign()}
			{:else}
				{m.chat_storage_banner_other_install()}
			{/if}
		</p>

		{#if step === 'confirm-create'}
			<p class="mt-1.5 font-medium" data-testid="chat-storage-create-confirm">
				{m.chat_storage_create_default_confirm({ path: status?.root ?? '' })}
			</p>
			<div class="mt-1.5 flex gap-2">
				<Button variant="primary" size="sm" onclick={createDefault}>{m.chat_storage_create_default_action()}</Button>
				<Button variant="ghost" size="sm" onclick={() => (step = 'idle')}>{m.persistence_duplicate_cancel()}</Button>
			</div>
		{:else if step === 'confirm-recover'}
			<p class="mt-1.5 font-medium" data-testid="chat-storage-recover-confirm">
				{m.chat_storage_recover_confirm({ path: recoverDir ?? '' })}
			</p>
			<div class="mt-1.5 flex gap-2">
				<Button variant="primary" size="sm" onclick={recover}>{m.chat_storage_recover_action()}</Button>
				<Button variant="ghost" size="sm" onclick={() => (step = 'idle')}>{m.persistence_duplicate_cancel()}</Button>
			</div>
		{:else if problem !== 'other-install'}
			<div class="mt-1.5 flex flex-wrap gap-2">
				<Button
					variant="secondary"
					size="sm"
					onclick={() => chatStorageState.refresh()}
					disabled={chatStorageState.checking}
				>
					{m.chat_storage_retry()}
				</Button>
				{#if canCreateDefault}
					<Button variant="secondary" size="sm" onclick={() => (step = 'confirm-create')}>
						{m.chat_storage_create_default()}
					</Button>
				{/if}
				{#if canOfferCryptomator && cryptomatorInstalled}
					<Button variant="secondary" size="sm" onclick={openCryptomator}>
						{m.chat_storage_open_cryptomator()}
					</Button>
				{/if}
				{#if configCorrupt}
					<Button variant="secondary" size="sm" onclick={pickRecoverFolder}>
						{m.chat_storage_recover()}
					</Button>
				{/if}
			</div>
		{/if}
		{#if errorText}
			<p class="mt-1.5" data-testid="chat-storage-banner-error">{errorText}</p>
		{/if}
	</div>
{/if}
