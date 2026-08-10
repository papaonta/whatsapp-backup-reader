/**
 * PIN hashing for the per-chat lock feature.
 *
 * This is a local UI gate, not encryption at rest — chat/media data stays
 * unencrypted in IndexedDB and in memory regardless of lock state. PBKDF2
 * just avoids storing the PIN in plaintext.
 */

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

export interface StoredPin {
	hash: string;
	salt: string;
}

export function bytesToBase64(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

async function deriveHash(pin: string, salt: Uint8Array): Promise<string> {
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(pin),
		'PBKDF2',
		false,
		['deriveBits'],
	);
	const derived = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt: salt as BufferSource,
			iterations: PBKDF2_ITERATIONS,
			hash: 'SHA-256',
		},
		keyMaterial,
		HASH_BITS,
	);
	return bytesToBase64(new Uint8Array(derived));
}

export async function hashPin(pin: string): Promise<StoredPin> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
	const hash = await deriveHash(pin, salt);
	return { hash, salt: bytesToBase64(salt) };
}

export async function verifyPin(
	pin: string,
	stored: StoredPin,
): Promise<boolean> {
	const salt = base64ToBytes(stored.salt);
	const hash = await deriveHash(pin, salt);

	if (hash.length !== stored.hash.length) return false;
	// Constant-time-ish comparison to avoid trivial early-exit timing leaks.
	let diff = 0;
	for (let i = 0; i < hash.length; i++) {
		diff |= hash.charCodeAt(i) ^ stored.hash.charCodeAt(i);
	}
	return diff === 0;
}
