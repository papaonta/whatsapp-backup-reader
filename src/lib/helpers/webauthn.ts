/**
 * Biometric unlock (Windows Hello / Touch ID / device biometrics) via the
 * WebAuthn platform authenticator — a supplementary fast-path on top of the
 * PIN, never a replacement for it.
 *
 * There is no server here to verify the WebAuthn signature against a stored
 * public key, so this treats a successfully-resolved navigator.credentials
 * call as proof the OS biometric check passed. It's a local "trigger the OS
 * prompt and tell me pass/fail" utility, not a cryptographically-verified
 * assertion — the same trust ceiling as the PIN itself.
 */

import { base64ToBytes, bytesToBase64 } from './lock-crypto';

const RP_NAME = 'WhatsApp Backup Reader';
const CHALLENGE_BYTES = 32;
const USER_ID_BYTES = 16;
// Upper bound the browser is asked to honor for the ceremony (spec-native
// "timeout" hint) — the caller should also pass an AbortSignal so a stuck
// prompt (dialog never appeared, hardware issue, etc.) has an immediate,
// user-triggered way out rather than relying on this alone.
export const BIOMETRIC_TIMEOUT_MS = 30_000;

function randomBytes(length: number): Uint8Array {
	return crypto.getRandomValues(new Uint8Array(length));
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
	if (typeof window === 'undefined') return false;
	if (!window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) {
		return false;
	}
	try {
		return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
	} catch {
		return false;
	}
}

export function getBiometricLabel(): string {
	if (typeof window === 'undefined') return 'device biometrics';

	const electronPlatform = (
		window as Window & { electronAPI?: { platform?: string } }
	).electronAPI?.platform;

	const platformString = electronPlatform || navigator.platform || navigator.userAgent;

	if (/Mac|iPhone|iPad|iPod|darwin/i.test(platformString)) return 'Touch ID';
	if (/Win/i.test(platformString)) return 'Windows Hello';
	return 'device biometrics';
}

export async function registerBiometric(
	signal?: AbortSignal,
): Promise<string | null> {
	try {
		const credential = (await navigator.credentials.create({
			publicKey: {
				challenge: randomBytes(CHALLENGE_BYTES) as BufferSource,
				rp: { name: RP_NAME },
				user: {
					id: randomBytes(USER_ID_BYTES) as BufferSource,
					name: 'local-user',
					displayName: 'Local User',
				},
				pubKeyCredParams: [
					{ type: 'public-key', alg: -7 }, // ES256
					{ type: 'public-key', alg: -257 }, // RS256
				],
				authenticatorSelection: {
					authenticatorAttachment: 'platform',
					userVerification: 'required',
					residentKey: 'preferred',
				},
				timeout: BIOMETRIC_TIMEOUT_MS,
				attestation: 'none',
			},
			signal,
		})) as PublicKeyCredential | null;

		if (!credential) return null;
		return bytesToBase64(new Uint8Array(credential.rawId));
	} catch {
		// Covers user cancellation, a caller-triggered AbortSignal, the
		// browser's own timeout firing, or no authenticator responding.
		return null;
	}
}

export async function verifyBiometric(
	credentialId: string,
	signal?: AbortSignal,
): Promise<boolean> {
	try {
		const assertion = await navigator.credentials.get({
			publicKey: {
				challenge: randomBytes(CHALLENGE_BYTES) as BufferSource,
				allowCredentials: [
					{
						type: 'public-key',
						id: base64ToBytes(credentialId) as BufferSource,
					},
				],
				userVerification: 'required',
				timeout: BIOMETRIC_TIMEOUT_MS,
			},
			signal,
		});
		return !!assertion;
	} catch {
		return false;
	}
}
