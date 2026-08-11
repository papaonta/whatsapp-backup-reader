<script lang="ts">
import { browser } from '$app/environment';
import * as m from '$lib/paraglide/messages';
import {
	getLockPin,
	setAppLockSettings,
	setOnboardingCompleted,
} from '$lib/persistence.svelte';
import AppLockGate from './AppLockGate.svelte';
import Button from './Button.svelte';
import FeatureItem from './FeatureItem.svelte';
import Icon from './Icon.svelte';

interface Props {
	onComplete: () => void;
}

let { onComplete }: Props = $props();

type Step = 'welcome' | 'pin-reuse' | 'pin-setup' | 'theme' | 'done';

let step = $state<Step>('welcome');
let hasExistingPin = $state(false);
let checkedExistingPin = $state(false);

let currentTheme = $state<'light' | 'dark' | 'system'>(
	browser && localStorage.getItem('theme') === 'dark'
		? 'dark'
		: browser && localStorage.getItem('theme') === 'light'
			? 'light'
			: 'system',
);

$effect(() => {
	getLockPin().then((pin) => {
		hasExistingPin = !!pin;
		checkedExistingPin = true;
	});
});

function goToPinStep() {
	step = checkedExistingPin && hasExistingPin ? 'pin-reuse' : 'pin-setup';
}

async function handleReuseExistingPin(reuse: boolean) {
	if (reuse) {
		await setAppLockSettings({
			enabled: true,
			autoLockIdleMinutes: 5,
			lockOnBlur: true,
		});
	}
	step = 'theme';
}

async function handlePinSetupSuccess() {
	await setAppLockSettings({
		enabled: true,
		autoLockIdleMinutes: 5,
		lockOnBlur: true,
	});
	step = 'theme';
}

function skipPinSetup() {
	step = 'theme';
}

function applyTheme(theme: 'light' | 'dark' | 'system') {
	currentTheme = theme;
	if (!browser) return;
	if (theme === 'dark') {
		document.documentElement.classList.add('dark');
		localStorage.setItem('theme', 'dark');
	} else if (theme === 'light') {
		document.documentElement.classList.remove('dark');
		localStorage.setItem('theme', 'light');
	} else {
		localStorage.removeItem('theme');
		const prefersDark = window.matchMedia(
			'(prefers-color-scheme: dark)',
		).matches;
		document.documentElement.classList.toggle('dark', prefersDark);
	}
}

async function finish() {
	await setOnboardingCompleted(true);
	onComplete();
}
</script>

<div class="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--color-chat-bg)] p-4">
	<div class="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
		{#if step === 'welcome'}
			<div class="flex flex-col items-center gap-4 px-6 pt-8 pb-6 text-center">
				<div class="w-14 h-14 rounded-full bg-[var(--color-whatsapp-dark-green)] text-white flex items-center justify-center">
					<Icon name="whatsapp" size="lg" />
				</div>
				<h1 class="font-semibold text-lg text-gray-900 dark:text-gray-100">
					{m.onboarding_welcome_title()}
				</h1>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					{m.onboarding_welcome_subtitle()}
				</p>
				<div class="w-full flex flex-col gap-2 mt-2">
					<FeatureItem icon="wifi-off" variant="icon">{m.privacy_offline()}</FeatureItem>
					<FeatureItem icon="shield" variant="icon">{m.privacy_local_processing()}</FeatureItem>
					<FeatureItem icon="eye-off" variant="icon">{m.privacy_no_tracking()}</FeatureItem>
				</div>
				<Button
					variant="primary"
					size="lg"
					class="w-full justify-center mt-2"
					onclick={goToPinStep}
				>
					{m.onboarding_get_started()}
				</Button>
			</div>
		{:else if step === 'pin-reuse'}
			<div class="flex flex-col gap-4 p-6">
				<div class="flex flex-col items-center gap-3 text-center">
					<div class="w-14 h-14 rounded-full bg-[var(--color-whatsapp-light-green)] dark:bg-[var(--color-whatsapp-dark-green)]/20 flex items-center justify-center">
						<Icon name="lock" size="lg" class="text-[var(--color-whatsapp-teal)]" />
					</div>
					<h1 class="font-semibold text-lg text-gray-900 dark:text-gray-100">
						{m.onboarding_pin_reuse_title()}
					</h1>
					<p class="text-sm text-gray-600 dark:text-gray-400">
						{m.onboarding_pin_reuse_body()}
					</p>
				</div>
				<div class="flex flex-col gap-2 mt-1">
					<Button
						variant="primary"
						size="lg"
						class="w-full justify-center"
						onclick={() => handleReuseExistingPin(true)}
					>
						{m.onboarding_pin_reuse_yes()}
					</Button>
					<Button
						variant="secondary"
						size="lg"
						class="w-full justify-center"
						onclick={() => handleReuseExistingPin(false)}
					>
						{m.onboarding_pin_reuse_no()}
					</Button>
				</div>
			</div>
		{:else if step === 'pin-setup'}
			<div class="flex flex-col">
				<div class="px-6 pt-6">
					<button
						type="button"
						class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline cursor-pointer"
						onclick={skipPinSetup}
					>
						{m.onboarding_skip()}
					</button>
				</div>
				<div class="p-6 pt-2">
					<AppLockGate mode="setup" fullscreen={false} onSuccess={handlePinSetupSuccess} />
				</div>
			</div>
		{:else if step === 'theme'}
			<div class="flex flex-col gap-4 p-6">
				<div class="flex flex-col items-center gap-3 text-center">
					<div class="w-14 h-14 rounded-full bg-[var(--color-whatsapp-light-green)] dark:bg-[var(--color-whatsapp-dark-green)]/20 flex items-center justify-center">
						<Icon name="sun" size="lg" class="text-[var(--color-whatsapp-teal)]" />
					</div>
					<h1 class="font-semibold text-lg text-gray-900 dark:text-gray-100">
						{m.onboarding_theme_title()}
					</h1>
				</div>
				<div class="grid grid-cols-3 gap-2">
					<button
						type="button"
						class="flex flex-col items-center gap-1.5 py-3 rounded-lg border-2 cursor-pointer transition-colors {currentTheme === 'light' ? 'border-[var(--color-whatsapp-teal)] bg-[var(--color-whatsapp-light-green)] dark:bg-[var(--color-whatsapp-teal)]/10' : 'border-gray-200 dark:border-gray-700'}"
						onclick={() => applyTheme('light')}
					>
						<Icon name="sun" size="md" />
						<span class="text-xs text-gray-700 dark:text-gray-300">{m.onboarding_theme_light()}</span>
					</button>
					<button
						type="button"
						class="flex flex-col items-center gap-1.5 py-3 rounded-lg border-2 cursor-pointer transition-colors {currentTheme === 'dark' ? 'border-[var(--color-whatsapp-teal)] bg-[var(--color-whatsapp-light-green)] dark:bg-[var(--color-whatsapp-teal)]/10' : 'border-gray-200 dark:border-gray-700'}"
						onclick={() => applyTheme('dark')}
					>
						<Icon name="moon" size="md" />
						<span class="text-xs text-gray-700 dark:text-gray-300">{m.onboarding_theme_dark()}</span>
					</button>
					<button
						type="button"
						class="flex flex-col items-center gap-1.5 py-3 rounded-lg border-2 cursor-pointer transition-colors {currentTheme === 'system' ? 'border-[var(--color-whatsapp-teal)] bg-[var(--color-whatsapp-light-green)] dark:bg-[var(--color-whatsapp-teal)]/10' : 'border-gray-200 dark:border-gray-700'}"
						onclick={() => applyTheme('system')}
					>
						<Icon name="settings" size="md" />
						<span class="text-xs text-gray-700 dark:text-gray-300">{m.onboarding_theme_system()}</span>
					</button>
				</div>
				<Button
					variant="primary"
					size="lg"
					class="w-full justify-center mt-1"
					onclick={() => (step = 'done')}
				>
					{m.onboarding_continue()}
				</Button>
			</div>
		{:else if step === 'done'}
			<div class="flex flex-col items-center gap-4 px-6 py-8 text-center">
				<div class="w-14 h-14 rounded-full bg-[var(--color-whatsapp-light-green)] dark:bg-[var(--color-whatsapp-teal)]/10 flex items-center justify-center">
					<Icon name="check-circle" size="lg" class="text-[var(--color-whatsapp-teal)]" />
				</div>
				<h1 class="font-semibold text-lg text-gray-900 dark:text-gray-100">
					{m.onboarding_done_title()}
				</h1>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					{m.onboarding_done_body()}
				</p>
				<Button variant="primary" size="lg" class="w-full justify-center mt-2" onclick={finish}>
					{m.onboarding_done_button()}
				</Button>
			</div>
		{/if}
	</div>
</div>
