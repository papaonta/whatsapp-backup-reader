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

export function buildSenderColorMap(
	senders: Iterable<string>,
): Map<string, string> {
	const sorted = Array.from(senders).sort();
	const map = new Map<string, string>();
	sorted.forEach((sender, i) => {
		map.set(sender, SENDER_COLOR_CLASSES[i % SENDER_COLOR_CLASSES.length]);
	});
	return map;
}
