<script lang="ts">
import { browser } from '$app/environment';
import { appLockState } from '$lib/app-lock.svelte';
import favicon from '$lib/assets/favicon.png';
import AppLockGate from '$lib/components/AppLockGate.svelte';
import OnboardingWizard from '$lib/components/OnboardingWizard.svelte';
import * as m from '$lib/paraglide/messages';
import { clearLockPin, setAppLockSettings } from '$lib/persistence.svelte';
import '../app.css';

let { children } = $props();

$effect(() => {
	appLockState.init();
});

$effect(() => {
	if (!browser || !appLockState.ready) return;
	return appLockState.setupAutoLockListeners();
});

async function handleForgotPin() {
	await clearLockPin();
	await setAppLockSettings({
		enabled: false,
		autoLockIdleMinutes: 5,
		lockOnBlur: true,
	});
	await appLockState.refreshSettings();
	appLockState.unlock();
}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{m.app_title()}</title>
</svelte:head>

{#if !appLockState.ready}
	<!-- Avoid flashing real content while the async lock-state check is in flight -->
{:else if !appLockState.onboardingCompleted}
	<OnboardingWizard onComplete={() => appLockState.completeOnboarding()} />
{:else if appLockState.isLocked}
	<AppLockGate
		mode="unlock"
		onSuccess={() => appLockState.unlock()}
		onForgotPin={handleForgotPin}
	/>
{:else}
	{@render children()}
{/if}
