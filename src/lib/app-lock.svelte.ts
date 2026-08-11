import { browser } from '$app/environment';
import {
	type AppLockSettings,
	getAppLockSettings,
	getOnboardingCompleted,
} from '$lib/persistence.svelte';

const IDLE_ACTIVITY_EVENTS = [
	'mousemove',
	'keydown',
	'click',
	'scroll',
	'touchstart',
] as const;

function createAppLockState() {
	let ready = $state(false);
	let onboardingCompleted = $state(false);
	let settings = $state<AppLockSettings>({
		enabled: false,
		autoLockIdleMinutes: 5,
		lockOnBlur: true,
	});
	let isLocked = $state(false);

	let idleTimer: ReturnType<typeof setTimeout> | undefined;

	function resetIdleTimer() {
		if (idleTimer) clearTimeout(idleTimer);
		if (!settings.enabled || isLocked || settings.autoLockIdleMinutes == null) {
			return;
		}
		idleTimer = setTimeout(
			() => {
				isLocked = true;
			},
			settings.autoLockIdleMinutes * 60 * 1000,
		);
	}

	function handleBlur() {
		if (settings.enabled && settings.lockOnBlur) {
			isLocked = true;
		}
	}

	return {
		get ready() {
			return ready;
		},
		get onboardingCompleted() {
			return onboardingCompleted;
		},
		get settings() {
			return settings;
		},
		get isLocked() {
			return isLocked;
		},

		async init(): Promise<void> {
			onboardingCompleted = await getOnboardingCompleted();
			settings = await getAppLockSettings();
			isLocked = onboardingCompleted && settings.enabled;
			ready = true;
		},

		async refreshSettings(): Promise<void> {
			settings = await getAppLockSettings();
			resetIdleTimer();
		},

		completeOnboarding(): void {
			onboardingCompleted = true;
		},

		lockNow(): void {
			isLocked = true;
		},

		unlock(): void {
			isLocked = false;
			resetIdleTimer();
		},

		setupAutoLockListeners(): () => void {
			if (!browser) return () => {};

			for (const event of IDLE_ACTIVITY_EVENTS) {
				window.addEventListener(event, resetIdleTimer);
			}
			window.addEventListener('blur', handleBlur);
			resetIdleTimer();

			return () => {
				for (const event of IDLE_ACTIVITY_EVENTS) {
					window.removeEventListener(event, resetIdleTimer);
				}
				window.removeEventListener('blur', handleBlur);
				if (idleTimer) clearTimeout(idleTimer);
			};
		},
	};
}

export const appLockState = createAppLockState();
