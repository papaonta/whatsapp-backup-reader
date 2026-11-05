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
	// Number of in-flight operations that must not trigger an auto-lock - the
	// app's own file dialogs (opening one blurs the window) and long imports.
	// A counter, not a flag, so overlapping operations can't release each
	// other's pause.
	let suspendCount = 0;

	function resetIdleTimer() {
		if (idleTimer) clearTimeout(idleTimer);
		if (!settings.enabled || isLocked || settings.autoLockIdleMinutes == null) {
			return;
		}
		idleTimer = setTimeout(
			() => {
				if (suspendCount > 0) return;
				isLocked = true;
			},
			settings.autoLockIdleMinutes * 60 * 1000,
		);
	}

	function handleBlur() {
		if (suspendCount > 0) return;
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

		/**
		 * Pauses auto-lock (idle timer and lock-on-blur) until the returned
		 * release function is called. Always release in a `finally`. Safe to
		 * call the release more than once. An explicit lockNow() still locks.
		 */
		suspend(): () => void {
			suspendCount++;
			let released = false;
			return () => {
				if (released) return;
				released = true;
				suspendCount = Math.max(0, suspendCount - 1);
				resetIdleTimer();
			};
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
