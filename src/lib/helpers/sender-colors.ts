/**
 * Deterministic per-sender name label colors for group chats.
 * Colors are assigned per-chat in sorted-name order so participants never
 * collide on the same color as long as the group has 8 or fewer members
 * (a plain per-name hash can't guarantee that).
 */

// Literal class strings (not built via template interpolation) so
// Tailwind's static scanner can find and generate them at build time.
const SENDER_COLOR_CLASSES = [
	'text-[var(--color-sender-1)]',
	'text-[var(--color-sender-2)]',
	'text-[var(--color-sender-3)]',
	'text-[var(--color-sender-4)]',
	'text-[var(--color-sender-5)]',
	'text-[var(--color-sender-6)]',
	'text-[var(--color-sender-7)]',
	'text-[var(--color-sender-8)]',
];

// Same 8 values as app.css's light-theme --color-sender-1..8. Duplicated
// here as the JS-side source of truth for contexts (like the standalone
// chat export) that can't rely on the app's compiled Tailwind CSS.
const SENDER_COLOR_HEX = [
	'#E67E22',
	'#8E44AD',
	'#2980B9',
	'#C0392B',
	'#27AE60',
	'#B8860B',
	'#34568B',
	'#C2185B',
];

function assignByPalette<T>(
	senders: Iterable<string>,
	palette: T[],
): Map<string, T> {
	const sorted = Array.from(senders).sort();
	const map = new Map<string, T>();
	sorted.forEach((sender, i) => {
		map.set(sender, palette[i % palette.length]);
	});
	return map;
}

export function buildSenderColorMap(
	senders: Iterable<string>,
): Map<string, string> {
	return assignByPalette(senders, SENDER_COLOR_CLASSES);
}

export function buildSenderColorHexMap(
	senders: Iterable<string>,
): Map<string, string> {
	return assignByPalette(senders, SENDER_COLOR_HEX);
}
