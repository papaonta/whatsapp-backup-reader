<script lang="ts">
import { appLockState } from '$lib/app-lock.svelte';
import { chatStorageState } from '$lib/chat-storage.svelte';
import { defaultIdentityState } from '$lib/default-identity.svelte';
import { formatFileSize } from '$lib/helpers/document-utils';
import * as m from '$lib/paraglide/messages';
import {
	clearLockPin,
	getLockPin,
	getPersistedChatsStrict,
	setAppLockSettings,
	setDefaultIdentitySettings,
} from '$lib/persistence.svelte';
import { currentVersion } from '$lib/update-checker.svelte';
import AppLockGate from './AppLockGate.svelte';
import Button from './Button.svelte';
import ChatStorageSettings from './ChatStorageSettings.svelte';
import Icon from './Icon.svelte';
import LocaleSwitcher from './LocaleSwitcher.svelte';

const FORK_REPO_URL = 'https://github.com/papaonta/whatsapp-backup-reader';

interface Props {
	onBack: () => void;
	isDarkMode: boolean;
	onToggleDarkMode: () => void;
}

let { onBack, isDarkMode, onToggleDarkMode }: Props = $props();

let hasPin = $state(false);
let overlay = $state<'none' | 'setup' | 'verify-change' | 'verify-remove'>(
	'none',
);
let pendingEnableAfterSetup = $state(false);

let storageBytes = $state<number | null>(null);
let storageError = $state(false);

// Clears cookies / service workers / Cache Storage left by websites (Electron
// only). Never touches the saved chats, PIN, starred messages or settings.
const canClearSiteData = !!window.electronAPI?.clearSiteData;
let siteDataStatus = $state<'idle' | 'confirm' | 'busy' | 'done' | 'failed'>(
	'idle',
);

async function clearSiteData() {
	if (!window.electronAPI?.clearSiteData) return;
	siteDataStatus = 'busy';
	const result = await window.electronAPI.clearSiteData();
	siteDataStatus = result.success ? 'done' : 'failed';
}

// Manual orphan-folder cleanup (Electron only). Nothing is ever deleted
// automatically: list first, then delete only after an explicit confirmation,
// and only if the saved chat list was read successfully.
const orphansApi = window.electronAPI?.isElectron
	? window.electronAPI.extraction
	: undefined;
let orphanStatus = $state<
	| 'idle'
	| 'checking'
	| 'none'
	| 'found'
	| 'unavailable'
	| 'read-failed'
	| 'deleted'
>('idle');
let orphanList = $state<{ id: string; bytes: number }[]>([]);
let orphanConfirming = $state(false);
let orphanDeletedCount = $state(0);
const orphanTotalBytes = $derived(
	orphanList.reduce((sum, o) => sum + o.bytes, 0),
);

async function checkOrphans() {
	if (!orphansApi) return;
	orphanStatus = 'checking';
	orphanConfirming = false;
	let keepIds: string[];
	try {
		const persisted = await getPersistedChatsStrict();
		keepIds = persisted
			.filter((p) => p.fileReference.type === 'electron-extracted')
			.map((p) => (p.fileReference as { extractionId: string }).extractionId);
	} catch {
		orphanStatus = 'read-failed';
		return;
	}
	const result = await orphansApi.listOrphans(keepIds);
	if (!result.success || result.unavailable) {
		orphanStatus = 'unavailable';
		return;
	}
	orphanList = result.orphans ?? [];
	orphanStatus = orphanList.length === 0 ? 'none' : 'found';
}

async function deleteOrphans() {
	if (!orphansApi) return;
	// Re-read the chat list right before deleting; abort on any doubt.
	let keepIds: string[];
	try {
		const persisted = await getPersistedChatsStrict();
		keepIds = persisted
			.filter((p) => p.fileReference.type === 'electron-extracted')
			.map((p) => (p.fileReference as { extractionId: string }).extractionId);
	} catch {
		orphanStatus = 'read-failed';
		orphanConfirming = false;
		return;
	}
	const result = await orphansApi.deleteOrphans(
		orphanList.map((o) => o.id),
		keepIds,
	);
	orphanConfirming = false;
	if (!result.success || result.unavailable) {
		orphanStatus = 'unavailable';
		return;
	}
	orphanDeletedCount = result.removed?.length ?? 0;
	orphanList = [];
	orphanStatus = 'deleted';
	orphansApi.getStorageUsage().then((r) => {
		if (r.success) storageBytes = r.bytes;
	});
}

$effect(() => {
	getLockPin().then((pin) => {
		hasPin = !!pin;
	});
});

$effect(() => {
	const extractionApi = window.electronAPI?.isElectron
		? window.electronAPI.extraction
		: undefined;
	if (extractionApi) {
		extractionApi.getStorageUsage().then((result) => {
			if (result.success) {
				storageBytes = result.bytes;
			} else {
				storageError = true;
			}
		});
	} else if (navigator.storage?.estimate) {
		navigator.storage
			.estimate()
			.then((estimate) => {
				storageBytes = estimate.usage ?? 0;
			})
			.catch(() => {
				storageError = true;
			});
	} else {
		storageError = true;
	}
});

async function refreshPinStatus() {
	hasPin = !!(await getLockPin());
}

function cancelOverlay() {
	overlay = 'none';
	pendingEnableAfterSetup = false;
}

async function handleToggleEnabled() {
	if (!appLockState.settings.enabled && !hasPin) {
		pendingEnableAfterSetup = true;
		overlay = 'setup';
		return;
	}
	await setAppLockSettings({
		...appLockState.settings,
		enabled: !appLockState.settings.enabled,
	});
	await appLockState.refreshSettings();
}

async function handleToggleLockOnBlur() {
	await setAppLockSettings({
		...appLockState.settings,
		lockOnBlur: !appLockState.settings.lockOnBlur,
	});
	await appLockState.refreshSettings();
}

async function handleIdleMinutesChange(value: string) {
	const minutes = value === 'off' ? null : Number(value);
	await setAppLockSettings({
		...appLockState.settings,
		autoLockIdleMinutes: minutes,
	});
	await appLockState.refreshSettings();
}

async function handleSetupSuccess() {
	overlay = 'none';
	await refreshPinStatus();
	if (pendingEnableAfterSetup) {
		await setAppLockSettings({ ...appLockState.settings, enabled: true });
		await appLockState.refreshSettings();
	}
	pendingEnableAfterSetup = false;
}

function handleChangePinClick() {
	overlay = 'verify-change';
}

function handleRemovePinClick() {
	overlay = 'verify-remove';
}

async function handleVerifySuccess() {
	if (overlay === 'verify-change') {
		overlay = 'setup';
		return;
	}
	// verify-remove
	await clearLockPin();
	await setAppLockSettings({
		enabled: false,
		autoLockIdleMinutes: 5,
		lockOnBlur: true,
	});
	await appLockState.refreshSettings();
	await refreshPinStatus();
	overlay = 'none';
}

function handleLockNow() {
	appLockState.lockNow();
}

async function handleToggleDefaultIdentity() {
	await setDefaultIdentitySettings({
		...defaultIdentityState.settings,
		enabled: !defaultIdentityState.settings.enabled,
	});
	await defaultIdentityState.refreshSettings();
}

async function handleDefaultIdentityChange(value: string) {
	await setDefaultIdentitySettings({
		...defaultIdentityState.settings,
		identity: value,
	});
	await defaultIdentityState.refreshSettings();
}
</script>

<div class="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
	<div class="max-w-2xl mx-auto p-6">
		<button
			type="button"
			class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer mb-4"
			onclick={onBack}
		>
			<Icon name="chevron-left" size="sm" />
			{m.archived_chats_back()}
		</button>

		<div class="flex flex-col gap-6">
			<section>
				<h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
					{m.settings_appearance_section()}
				</h3>
				<div class="flex items-center justify-between py-2">
					<p class="text-sm font-medium text-gray-800 dark:text-gray-100">{m.toggle_dark_mode()}</p>
					<button
						type="button"
						role="switch"
						aria-checked={isDarkMode}
						aria-label={m.toggle_dark_mode()}
						onclick={onToggleDarkMode}
						class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors cursor-pointer {isDarkMode ? 'bg-[var(--color-whatsapp-teal)]' : 'bg-gray-300 dark:bg-gray-600'}"
					>
						<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {isDarkMode ? 'translate-x-6' : 'translate-x-1'}"></span>
					</button>
				</div>
			</section>

			<section>
				<h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
					{m.settings_language_section()}
				</h3>
				<div class="flex items-center justify-between py-2">
					<p class="text-sm font-medium text-gray-800 dark:text-gray-100">{m.language_change()}</p>
					<LocaleSwitcher variant="default" />
				</div>
			</section>

			<section>
				<h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
					{m.settings_app_lock_section()}
				</h3>
				<div class="flex items-center justify-between py-2">
					<div>
						<p class="text-sm font-medium text-gray-800 dark:text-gray-100">{m.settings_app_lock_enable()}</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">{m.settings_app_lock_enable_hint()}</p>
					</div>
					<button
						type="button"
						role="switch"
						aria-checked={appLockState.settings.enabled}
						aria-label={m.settings_app_lock_enable()}
						onclick={handleToggleEnabled}
						class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors cursor-pointer {appLockState.settings.enabled ? 'bg-[var(--color-whatsapp-teal)]' : 'bg-gray-300 dark:bg-gray-600'}"
					>
						<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {appLockState.settings.enabled ? 'translate-x-6' : 'translate-x-1'}"></span>
					</button>
				</div>

				{#if appLockState.settings.enabled}
					<div class="flex items-center justify-between py-2">
						<p class="text-sm text-gray-700 dark:text-gray-300">{m.settings_auto_lock_idle()}</p>
						<select
							value={appLockState.settings.autoLockIdleMinutes == null
								? 'off'
								: String(appLockState.settings.autoLockIdleMinutes)}
							onchange={(e) => handleIdleMinutesChange(e.currentTarget.value)}
							class="text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1"
						>
							<option value="off">{m.settings_auto_lock_off()}</option>
							<option value="1">{m.settings_auto_lock_1min()}</option>
							<option value="5">{m.settings_auto_lock_5min()}</option>
							<option value="15">{m.settings_auto_lock_15min()}</option>
							<option value="30">{m.settings_auto_lock_30min()}</option>
						</select>
					</div>

					<div class="flex items-center justify-between py-2">
						<p class="text-sm text-gray-700 dark:text-gray-300">{m.settings_lock_on_blur()}</p>
						<button
							type="button"
							role="switch"
							aria-checked={appLockState.settings.lockOnBlur}
							aria-label={m.settings_lock_on_blur()}
							onclick={handleToggleLockOnBlur}
							class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors cursor-pointer {appLockState.settings.lockOnBlur ? 'bg-[var(--color-whatsapp-teal)]' : 'bg-gray-300 dark:bg-gray-600'}"
						>
							<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {appLockState.settings.lockOnBlur ? 'translate-x-6' : 'translate-x-1'}"></span>
						</button>
					</div>

					<Button variant="secondary" size="sm" class="w-full justify-center mt-1" onclick={handleLockNow}>
						<Icon name="lock" size="sm" />
						{m.lock_now_button()}
					</Button>
				{/if}
			</section>

			{#if hasPin}
				<section>
					<h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
						{m.settings_pin_section()}
					</h3>
					<div class="flex gap-2">
						<Button variant="secondary" size="sm" class="flex-1" onclick={handleChangePinClick}>
							{m.settings_change_pin()}
						</Button>
						<Button variant="danger" size="sm" class="flex-1" onclick={handleRemovePinClick}>
							{m.settings_remove_pin()}
						</Button>
					</div>
				</section>
			{/if}

			<section>
				<h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
					{m.settings_default_identity_section()}
				</h3>
				<div class="flex items-center justify-between py-2">
					<div>
						<p class="text-sm font-medium text-gray-800 dark:text-gray-100">{m.settings_default_identity_enable()}</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">{m.settings_default_identity_enable_hint()}</p>
					</div>
					<button
						type="button"
						role="switch"
						aria-checked={defaultIdentityState.settings.enabled}
						aria-label={m.settings_default_identity_enable()}
						onclick={handleToggleDefaultIdentity}
						class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors cursor-pointer {defaultIdentityState.settings.enabled ? 'bg-[var(--color-whatsapp-teal)]' : 'bg-gray-300 dark:bg-gray-600'}"
					>
						<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {defaultIdentityState.settings.enabled ? 'translate-x-6' : 'translate-x-1'}"></span>
					</button>
				</div>

				{#if defaultIdentityState.settings.enabled}
					<div class="py-2">
						<input
							type="text"
							value={defaultIdentityState.settings.identity}
							onchange={(e) => handleDefaultIdentityChange(e.currentTarget.value)}
							placeholder={m.settings_default_identity_placeholder()}
							class="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2"
						/>
					</div>
				{/if}
			</section>

			<section>
				<h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
					{m.settings_storage_section()}
				</h3>
				<div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
					<div class="text-2xl font-bold text-[var(--color-whatsapp-teal)]">
						{storageError ? '—' : storageBytes === null ? '…' : formatFileSize(storageBytes)}
					</div>
					<div class="text-sm text-gray-500 dark:text-gray-400">{m.settings_storage_used()}</div>
				</div>
				<ChatStorageSettings />
				{#if canClearSiteData}
					<div class="mt-3 text-sm text-gray-700 dark:text-gray-300 space-y-2">
						<p class="text-xs text-gray-500 dark:text-gray-400">{m.settings_site_data_hint()}</p>
						{#if siteDataStatus === 'confirm'}
							<p class="text-red-600 dark:text-red-400 font-medium">{m.settings_site_data_warning()}</p>
							<div class="flex gap-2">
								<Button variant="danger" size="sm" onclick={clearSiteData}>{m.settings_site_data_confirm_action()}</Button>
								<Button variant="ghost" size="sm" onclick={() => (siteDataStatus = 'idle')}>{m.persistence_duplicate_cancel()}</Button>
							</div>
						{:else}
							<Button variant="secondary" size="sm" onclick={() => (siteDataStatus = 'confirm')} disabled={siteDataStatus === 'busy'}>
								{m.settings_site_data_clear()}
							</Button>
						{/if}
						{#if siteDataStatus === 'done'}
							<p>{m.settings_site_data_cleared()}</p>
						{:else if siteDataStatus === 'failed'}
							<p class="text-red-600 dark:text-red-400">{m.settings_site_data_failed()}</p>
						{/if}
					</div>
				{/if}
				{#if orphansApi}
					<div class="mt-3 text-sm text-gray-700 dark:text-gray-300 space-y-2">
						<p class="text-xs text-gray-500 dark:text-gray-400">{m.settings_orphans_hint()}</p>
						<Button variant="secondary" size="sm" onclick={checkOrphans} disabled={orphanStatus === 'checking' || !chatStorageState.canWrite}>
							{orphanStatus === 'checking' ? m.settings_orphans_checking() : m.settings_orphans_check()}
						</Button>
						{#if orphanStatus === 'none'}
							<p>{m.settings_orphans_none()}</p>
						{:else if orphanStatus === 'unavailable'}
							<p class="text-red-600 dark:text-red-400">{m.settings_orphans_unavailable()}</p>
						{:else if orphanStatus === 'read-failed'}
							<p class="text-red-600 dark:text-red-400">{m.settings_orphans_read_failed()}</p>
						{:else if orphanStatus === 'deleted'}
							<p>{m.settings_orphans_deleted({ count: orphanDeletedCount })}</p>
						{:else if orphanStatus === 'found'}
							<p>{m.settings_orphans_found({ count: orphanList.length, size: formatFileSize(orphanTotalBytes) })}</p>
							<ul class="text-xs font-mono text-gray-600 dark:text-gray-400 space-y-0.5">
								{#each orphanList as orphan (orphan.id)}
									<li>{orphan.id} ({formatFileSize(orphan.bytes)})</li>
								{/each}
							</ul>
							{#if orphanConfirming}
								<p class="text-red-600 dark:text-red-400 font-medium">
									{m.settings_orphans_confirm({ count: orphanList.length, size: formatFileSize(orphanTotalBytes) })}
								</p>
								<div class="flex gap-2">
									<Button variant="danger" size="sm" onclick={deleteOrphans}>{m.settings_orphans_confirm_action()}</Button>
									<Button variant="ghost" size="sm" onclick={() => (orphanConfirming = false)}>{m.persistence_duplicate_cancel()}</Button>
								</div>
							{:else}
								<Button variant="danger" size="sm" onclick={() => (orphanConfirming = true)}>{m.settings_orphans_delete()}</Button>
							{/if}
						{/if}
					</div>
				{/if}
			</section>

			<section>
				<h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
					{m.settings_about_section()}
				</h3>
				<div class="text-sm text-gray-700 dark:text-gray-300 space-y-1">
					<p>{m.settings_about_version({ version: currentVersion })}</p>
					<p>{m.settings_about_fork_notice()}</p>
					<p class="text-xs text-gray-500 dark:text-gray-400">{m.settings_about_original_credit()}</p>
				</div>
				<a
					href={FORK_REPO_URL}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 mt-2 text-sm text-[var(--color-whatsapp-teal)] hover:underline cursor-pointer"
					onclick={(e) => {
						if (window.electronAPI?.isElectron && window.electronAPI?.openExternal) {
							e.preventDefault();
							window.electronAPI.openExternal(FORK_REPO_URL);
						}
					}}
				>
					<Icon name="github" size="sm" />
					{m.settings_about_view_source()}
				</a>
			</section>
		</div>
	</div>
</div>

{#if overlay === 'setup'}
	<AppLockGate mode="setup" onSuccess={handleSetupSuccess} onCancel={cancelOverlay} />
{:else if overlay === 'verify-change' || overlay === 'verify-remove'}
	<AppLockGate mode="unlock" onSuccess={handleVerifySuccess} onCancel={cancelOverlay} />
{/if}
