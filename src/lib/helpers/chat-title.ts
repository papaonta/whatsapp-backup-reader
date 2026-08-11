import type { ChatData } from '$lib/state.svelte';

/**
 * Whether two chats are likely the same real conversation, based on
 * content signals rather than title (titles can coincidentally collide,
 * e.g. two different iOS exports both falling back to a generic name).
 * Same threshold philosophy as persistence.svelte.ts's validateRestoredFile.
 */
function chatsLikelySame(a: ChatData, b: ChatData): boolean {
	let matches = 0;
	if (a.messages.length === b.messages.length) matches++;
	if (a.startDate?.getTime() === b.startDate?.getTime()) matches++;
	if (a.endDate?.getTime() === b.endDate?.getTime()) matches++;
	return matches >= 2;
}

/**
 * Returns a title guaranteed not to collide with an existing, genuinely
 * different chat. Persistence is keyed by title, so two different chats
 * sharing one would silently overwrite each other's saved data.
 *
 * If the candidate matches an existing chat with the same title closely
 * enough to likely be the same conversation (a real duplicate import),
 * the title is left as-is - that's an unrelated case, handled by the
 * Merge feature, not this function.
 */
export function resolveUniqueChatTitle(
	candidate: ChatData,
	existingChats: ChatData[],
): string {
	const sameTitled = existingChats.filter((c) => c.title === candidate.title);
	if (sameTitled.length === 0) return candidate.title;
	if (sameTitled.some((c) => chatsLikelySame(c, candidate))) {
		return candidate.title;
	}

	const existingTitles = new Set(existingChats.map((c) => c.title));
	let suffix = 2;
	let disambiguated = `${candidate.title} (${suffix})`;
	while (existingTitles.has(disambiguated)) {
		suffix++;
		disambiguated = `${candidate.title} (${suffix})`;
	}
	return disambiguated;
}
