import type { ChatMessage, ContactInfo, MediaFile } from '$lib/parser';
import { generateDeterministicId } from '$lib/parser';
import type { ChatData } from '$lib/state.svelte';

/**
 * Merges multiple already-parsed chats (e.g. several exports of the same
 * real conversation, each covering a different date range) into one
 * deduplicated, chronologically sorted chat.
 *
 * Message IDs are regenerated against `mergedTitle` - IDs are not stable
 * across source files (they're partly derived from the imported filename),
 * so this can't just keep whichever ID a message happened to have.
 */
export function mergeChats(chats: ChatData[], mergedTitle: string): ChatData {
	const seen = new Set<string>();
	const dedupedMessages: ChatMessage[] = [];

	for (const chat of chats) {
		for (const msg of chat.messages) {
			const key = `${msg.timestamp.toISOString()}|${msg.sender}|${msg.content}`;
			if (seen.has(key)) continue;
			seen.add(key);
			dedupedMessages.push(msg);
		}
	}

	dedupedMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

	const usedIds = new Set<string>();
	const messages: ChatMessage[] = dedupedMessages.map((msg) => ({
		...msg,
		id: (() => {
			const id = generateDeterministicId(
				mergedTitle,
				msg.timestamp,
				msg.sender,
				msg.content,
				usedIds,
			);
			usedIds.add(id);
			return id;
		})(),
	}));

	const participants = Array.from(
		new Set(chats.flatMap((chat) => chat.participants)),
	).sort();

	const startDates = chats
		.map((c) => c.startDate)
		.filter((d): d is Date => d !== null);
	const endDates = chats
		.map((c) => c.endDate)
		.filter((d): d is Date => d !== null);
	const startDate = startDates.length
		? new Date(Math.min(...startDates.map((d) => d.getTime())))
		: null;
	const endDate = endDates.length
		? new Date(Math.max(...endDates.map((d) => d.getTime())))
		: null;

	const mediaFiles: MediaFile[] = [];
	const seenMediaNames = new Set<string>();
	for (const chat of chats) {
		for (const media of chat.mediaFiles) {
			if (seenMediaNames.has(media.name)) continue;
			seenMediaNames.add(media.name);
			mediaFiles.push(media);
		}
	}

	const contacts = new Map<string, ContactInfo>();
	for (const chat of chats) {
		for (const [key, value] of chat.contacts) {
			contacts.set(key, value);
		}
	}

	return {
		messages,
		participants,
		startDate,
		endDate,
		title: mergedTitle,
		messageCount: messages.length,
		mediaCount: mediaFiles.length,
		mediaFiles,
		hasMedia: mediaFiles.length > 0,
		contacts,
	};
}
