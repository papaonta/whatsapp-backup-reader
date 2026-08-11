import { browser } from '$app/environment';
import type { ChatMessage } from '$lib/parser';
import { toLocalDateKey } from '$lib/parser';

const DISMISS_KEY_PREFIX = 'whatsapp-on-this-day-dismissed';

export function isOnThisDayDismissed(
	chatId: string,
	todayDateKey: string,
): boolean {
	if (!browser) return false;
	return (
		localStorage.getItem(`${DISMISS_KEY_PREFIX}:${chatId}:${todayDateKey}`) ===
		'true'
	);
}

export function dismissOnThisDay(chatId: string, todayDateKey: string): void {
	if (!browser) return;
	localStorage.setItem(
		`${DISMISS_KEY_PREFIX}:${chatId}:${todayDateKey}`,
		'true',
	);
}

export interface OnThisDayMatch {
	year: number;
	yearsAgo: number;
	messages: ChatMessage[];
}

/**
 * Finds messages from the most recent past year that fall on the same
 * month+day as `today`. `today` is injectable so this stays testable
 * without depending on the system clock.
 */
export function findOnThisDayMatch(
	messages: ChatMessage[],
	today: Date = new Date(),
): OnThisDayMatch | null {
	const todayMonthDay = toLocalDateKey(today).slice(5); // "MM-DD"
	const currentYear = today.getFullYear();
	const byYear = new Map<number, ChatMessage[]>();

	for (const msg of messages) {
		if (msg.isSystemMessage) continue;
		if (toLocalDateKey(msg.timestamp).slice(5) !== todayMonthDay) continue;

		const year = msg.timestamp.getFullYear();
		if (year === currentYear) continue;

		if (!byYear.has(year)) byYear.set(year, []);
		byYear.get(year)!.push(msg);
	}

	if (byYear.size === 0) return null;

	const mostRecentYear = Math.max(...byYear.keys());
	return {
		year: mostRecentYear,
		yearsAgo: currentYear - mostRecentYear,
		messages: byYear.get(mostRecentYear)!,
	};
}
