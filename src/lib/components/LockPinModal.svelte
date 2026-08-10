<script lang="ts">
import { hashPin, verifyPin } from '$lib/helpers/lock-crypto';
import {
	getBiometricLabel,
	isPlatformAuthenticatorAvailable,
	registerBiometric,
	verifyBiometric,
} from '$lib/helpers/webauthn';
import * as m from '$lib/paraglide/messages';
import {
	getLockPin,
	getWebAuthnCredentialId,
	setLockPin,
	setWebAuthnCredentialId,
} from '$lib/persistence.svelte';
import Button from './Button.svelte';
import Icon from './Icon.svelte';
import Modal from './Modal.svelte';
import ModalContent from './ModalContent.svelte';
import ModalHeader from './ModalHeader.svelte';

interface Props {
	mode: 'setup' | 'unlock';
	// Only used when mode is 'unlock' — selects the copy variant and whether
	// success should just reveal the chat for this session ('view') or
	// permanently strip the lock flag ('remove').
	purpose?: 'view' | 'remove';
	chatTitle: string;
	onSuccess: () => void;
	// Only offered in 'unlock' mode. Called after the PIN has been cleared —
	// the caller is responsible for un-flagging every locked chat.
	onForgotPin?: () => void;
	onClose: () => void;
}

let { mode, purpose, chatTitle, onSuccess, onForgotPin, onClose }: Props =
	$props();

const MIN_PIN_LENGTH = 4;
const MAX_PIN_LENGTH = 6;
// Not localized on purpose — a literal token to type, like "type DELETE to
// confirm" patterns elsewhere. Keeping it in one fixed language avoids
// translation-dependent bypass/failure.
const FORGOT_PIN_CONFIRM_WORD = 'RESET';

let pin = $state('');
let confirmPin = $state('');
let error = $state('');
let isSubmitting = $state(false);
// "Forgot PIN?" only becomes reachable after a failed attempt — it no
// longer appears on first open of the unlock modal.
let pinAttemptFailed = $state(false);
let showForgotConfirm = $state(false);
let forgotConfirmText = $state('');
let pinInputRef: HTMLInputElement | undefined = $state();

let biometricAvailable = $state(false);
let hasBiometricRegistered = $state(false);
let enableBiometricCheckbox = $state(true);
// 'biometric-offer' is only reached after a *correct* PIN entry — enrolling
// a credential must never be possible without first proving PIN knowledge.
let innerStep = $state<'form' | 'biometric-offer'>('form');
const biometricLabel = getBiometricLabel();
// True while a navigator.credentials call is pending. The WebAuthn "timeout"
// option is only a hint some authenticators ignore, so this is paired with
// an AbortController — a stuck/never-appearing OS prompt is otherwise a
// silent, unexplained stuck-loading state with no visible way out.
let waitingForBiometric = $state(false);
let biometricAbortController: AbortController | null = null;

function cancelBiometricWait() {
	biometricAbortController?.abort();
}

$effect(() => {
	pinInputRef?.focus();
});

$effect(() => {
	isPlatformAuthenticatorAvailable().then((available) => {
		biometricAvailable = available;
	});
	if (mode === 'unlock') {
		getWebAuthnCredentialId().then((id) => {
			hasBiometricRegistered = !!id;
		});
	}
});

const title = $derived(
	mode === 'setup'
		? m.lock_setup_title()
		: purpose === 'remove'
			? m.lock_remove_title()
			: m.lock_view_title(),
);

const forgotPinReady = $derived(
	forgotConfirmText.trim().toUpperCase() === FORGOT_PIN_CONFIRM_WORD,
);

function offerBiometricOrSucceed() {
	// Only offer enrollment for the "just view it" path, and only once —
	// doesn't make sense while permanently removing the lock.
	if (purpose === 'view' && !hasBiometricRegistered && biometricAvailable) {
		innerStep = 'biometric-offer';
		return;
	}
	onSuccess();
}

async function handleSubmit() {
	error = '';

	if (pin.length < MIN_PIN_LENGTH) {
		error = m.lock_pin_too_short({ minLength: MIN_PIN_LENGTH });
		return;
	}

	if (mode === 'setup') {
		if (pin !== confirmPin) {
			error = m.lock_pin_mismatch();
			return;
		}
		isSubmitting = true;
		try {
			const stored = await hashPin(pin);
			await setLockPin(stored);
			if (enableBiometricCheckbox && biometricAvailable) {
				biometricAbortController = new AbortController();
				waitingForBiometric = true;
				try {
					const credentialId = await registerBiometric(
						biometricAbortController.signal,
					);
					if (credentialId) await setWebAuthnCredentialId(credentialId);
				} finally {
					waitingForBiometric = false;
					biometricAbortController = null;
				}
			}
			onSuccess();
		} finally {
			isSubmitting = false;
		}
		return;
	}

	// Unlock mode
	isSubmitting = true;
	try {
		const stored = await getLockPin();
		const valid = stored ? await verifyPin(pin, stored) : false;
		if (valid) {
			offerBiometricOrSucceed();
		} else {
			error = m.lock_pin_incorrect();
			pinAttemptFailed = true;
			pin = '';
		}
	} finally {
		isSubmitting = false;
	}
}

async function handleBiometricUnlock() {
	const credentialId = await getWebAuthnCredentialId();
	if (!credentialId) return;
	isSubmitting = true;
	biometricAbortController = new AbortController();
	waitingForBiometric = true;
	try {
		const ok = await verifyBiometric(credentialId, biometricAbortController.signal);
		if (ok) {
			onSuccess();
		} else {
			error = m.lock_biometric_failed();
		}
	} finally {
		isSubmitting = false;
		waitingForBiometric = false;
		biometricAbortController = null;
	}
}

async function handleBiometricOfferEnable() {
	isSubmitting = true;
	biometricAbortController = new AbortController();
	waitingForBiometric = true;
	try {
		const credentialId = await registerBiometric(biometricAbortController.signal);
		if (credentialId) await setWebAuthnCredentialId(credentialId);
	} finally {
		isSubmitting = false;
		waitingForBiometric = false;
		biometricAbortController = null;
	}
	onSuccess();
}

function handleBiometricOfferSkip() {
	onSuccess();
}

function handleKeydown(e: KeyboardEvent) {
	if (e.key === 'Enter') {
		e.preventDefault();
		handleSubmit();
	}
}

function handleForgotPin() {
	showForgotConfirm = false;
	forgotConfirmText = '';
	onForgotPin?.();
}
</script>

<Modal open={true} onClose={onClose}>
	<ModalHeader icon="lock" {title} subtitle={chatTitle} {onClose} />
	<ModalContent>
		{#if waitingForBiometric}
			<div class="flex flex-col items-center gap-4 py-6 text-center">
				<div class="w-10 h-10 rounded-full border-4 border-gray-200 dark:border-gray-700 border-t-[var(--color-whatsapp-teal)] animate-spin"></div>
				<p class="text-sm text-gray-700 dark:text-gray-300">
					{m.lock_waiting_for_biometric({ label: biometricLabel })}
				</p>
				<Button variant="secondary" size="md" onclick={cancelBiometricWait}>
					{m.bookmarks_cancel()}
				</Button>
			</div>
		{:else if innerStep === 'biometric-offer'}
			<div class="flex flex-col gap-4">
				<div class="flex flex-col items-center gap-3 py-2 text-center">
					<div class="w-14 h-14 rounded-full bg-[var(--color-whatsapp-light-green)] dark:bg-[var(--color-whatsapp-dark-green)]/20 flex items-center justify-center">
						<Icon name="lock-open" size="lg" class="text-[var(--color-whatsapp-teal)]" />
					</div>
					<p class="font-medium text-gray-800 dark:text-gray-100">
						{m.lock_biometric_offer_title({ label: biometricLabel })}
					</p>
				</div>
				<div class="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
					<Button variant="secondary" size="lg" class="flex-1" onclick={handleBiometricOfferSkip}>
						{m.lock_biometric_offer_skip()}
					</Button>
					<Button
						variant="primary"
						size="lg"
						class="flex-1"
						disabled={isSubmitting}
						onclick={handleBiometricOfferEnable}
					>
						{m.lock_biometric_offer_enable()}
					</Button>
				</div>
			</div>
		{:else}
			<div class="flex flex-col gap-4">
				{#if mode === 'setup'}
					<div class="flex gap-2 sm:gap-3 items-start p-3 sm:p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg sm:rounded-xl border border-amber-200 dark:border-amber-800/30">
						<div class="flex-shrink-0 mt-0.5">
							<Icon name="alert-circle" size="md" class="text-amber-600 dark:text-amber-500" />
						</div>
						<p class="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
							{m.lock_security_note()}
						</p>
					</div>
				{/if}

				{#if mode === 'unlock' && hasBiometricRegistered && biometricAvailable}
					<Button
						variant="secondary"
						size="lg"
						class="w-full justify-center"
						disabled={isSubmitting}
						onclick={handleBiometricUnlock}
					>
						<Icon name="lock-open" size="sm" />
						{m.lock_unlock_with_biometric({ label: biometricLabel })}
					</Button>
					<div class="flex items-center gap-2">
						<div class="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
						<span class="text-xs text-gray-400 dark:text-gray-500">{m.lock_or_enter_pin()}</span>
						<div class="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
					</div>
				{/if}

				<div>
					<label for="lock-pin" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
						{m.lock_enter_pin()}
					</label>
					<input
						bind:this={pinInputRef}
						bind:value={pin}
						id="lock-pin"
						type="password"
						inputmode="numeric"
						pattern="[0-9]*"
						maxlength={MAX_PIN_LENGTH}
						autocomplete="off"
						onkeydown={handleKeydown}
						class="w-full px-3 py-2 text-sm tracking-widest border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-whatsapp-teal)] focus:border-transparent"
						placeholder="••••"
					/>
				</div>

				{#if mode === 'setup'}
					<div>
						<label for="lock-pin-confirm" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							{m.lock_confirm_pin()}
						</label>
						<input
							bind:value={confirmPin}
							id="lock-pin-confirm"
							type="password"
							inputmode="numeric"
							pattern="[0-9]*"
							maxlength={MAX_PIN_LENGTH}
							autocomplete="off"
							onkeydown={handleKeydown}
							class="w-full px-3 py-2 text-sm tracking-widest border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-whatsapp-teal)] focus:border-transparent"
							placeholder="••••"
						/>
					</div>

					{#if biometricAvailable}
						<label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={enableBiometricCheckbox}
								class="rounded border-gray-300 dark:border-gray-600 text-[var(--color-whatsapp-teal)] focus:ring-[var(--color-whatsapp-teal)]"
							/>
							{m.lock_enable_biometric_checkbox({ label: biometricLabel })}
						</label>
					{/if}
				{/if}

				{#if error}
					<p class="text-xs sm:text-sm text-red-600 dark:text-red-400">{error}</p>
				{/if}

				{#if mode === 'unlock'}
					<div>
						{#if showForgotConfirm}
							<div class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/30 space-y-2">
								<p class="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
									{m.lock_forgot_pin_confirm()}
								</p>
								<div>
									<label for="lock-forgot-confirm" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">
										{m.lock_forgot_pin_type_confirm({ word: FORGOT_PIN_CONFIRM_WORD })}
									</label>
									<input
										bind:value={forgotConfirmText}
										id="lock-forgot-confirm"
										type="text"
										autocomplete="off"
										class="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
										placeholder={FORGOT_PIN_CONFIRM_WORD}
									/>
								</div>
								<div class="flex gap-2">
									<Button
										variant="danger"
										size="sm"
										disabled={!forgotPinReady}
										onclick={handleForgotPin}
									>
										{m.lock_forgot_pin_reset()}
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onclick={() => {
											showForgotConfirm = false;
											forgotConfirmText = '';
										}}
									>
										{m.bookmarks_cancel()}
									</Button>
								</div>
							</div>
						{:else if pinAttemptFailed}
							<button
								type="button"
								class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline cursor-pointer"
								onclick={() => (showForgotConfirm = true)}
							>
								{m.lock_forgot_pin()}
							</button>
						{/if}
					</div>
				{/if}

				<div class="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
					<Button variant="secondary" size="lg" class="flex-1" onclick={onClose}>
						{m.bookmarks_cancel()}
					</Button>
					<Button
						variant="primary"
						size="lg"
						class="flex-1"
						disabled={isSubmitting}
						onclick={handleSubmit}
					>
						{mode === 'setup' ? m.lock_setup_confirm() : m.lock_unlock_confirm()}
					</Button>
				</div>
			</div>
		{/if}
	</ModalContent>
</Modal>
