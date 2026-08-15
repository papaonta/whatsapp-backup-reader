<script lang="ts">
import { appLockState } from '$lib/app-lock.svelte';
import { defaultIdentityState } from '$lib/default-identity.svelte';
import { formatFileSize } from '$lib/helpers/document-utils';
import * as m from '$lib/paraglide/messages';
import {
	clearLockPin,
	getLockPin,
	setAppLockSettings,
	setDefaultIdentitySettings,
} from '$lib/persistence.svelte';
import AppLockGate from './AppLockGate.svelte';
import Button from './Button.svelte';
import Icon from './Icon.svelte';
import LocaleSwitcher from './LocaleSwitcher.svelte';

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
			</section>
		</div>
	</div>
</div>

{#if overlay === 'setup'}
	<AppLockGate mode="setup" onSuccess={handleSetupSuccess} onCancel={cancelOverlay} />
{:else if overlay === 'verify-change' || overlay === 'verify-remove'}
	<AppLockGate mode="unlock" onSuccess={handleVerifySuccess} onCancel={cancelOverlay} />
{/if}
