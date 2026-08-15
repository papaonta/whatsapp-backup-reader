import {
	type DefaultIdentitySettings,
	getDefaultIdentitySettings,
} from '$lib/persistence.svelte';

function createDefaultIdentityState() {
	let settings = $state<DefaultIdentitySettings>({
		enabled: false,
		identity: '',
	});

	return {
		get settings() {
			return settings;
		},

		async init(): Promise<void> {
			settings = await getDefaultIdentitySettings();
		},

		async refreshSettings(): Promise<void> {
			settings = await getDefaultIdentitySettings();
		},
	};
}

export const defaultIdentityState = createDefaultIdentityState();
