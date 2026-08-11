import type { ChatMessage, ParsedChat } from '$lib/parser';
import { formatTime, groupMessagesByDate } from '$lib/parser';
import { buildSenderColorHexMap } from './sender-colors';

// Duplicated from MessageBubble.svelte's private escapeHtml - trivial pure
// function, not worth exporting from a component for one other caller.
// This is a real XSS boundary: the output is a standalone HTML file that
// gets opened directly in a browser later.
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function formatDateSeparator(dateKey: string, locale: string): string {
	const date = new Date(`${dateKey}T00:00:00`);
	return date.toLocaleDateString(locale, {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}

/**
 * Builds a self-contained, print-friendly HTML transcript of a chat.
 * Text-only - media messages already read as filename text in
 * message.content, so nothing is embedded.
 */
export function buildChatExportHtml(
	chat: ParsedChat,
	currentUser: string | undefined,
	locale: string,
): string {
	const allSenders = new Set<string>();
	for (const msg of chat.messages) {
		if (!msg.isSystemMessage && msg.sender) allSenders.add(msg.sender);
	}
	const isMultiSenderChat = allSenders.size > 2;
	const senderColorMap = isMultiSenderChat
		? buildSenderColorHexMap(allSenders)
		: new Map<string, string>();

	const dateRange =
		chat.startDate && chat.endDate
			? `${chat.startDate.toLocaleDateString(locale)} – ${chat.endDate.toLocaleDateString(locale)}`
			: '';

	const bodyParts: string[] = [];
	const grouped = groupMessagesByDate(chat.messages);
	for (const [dateKey, messages] of grouped) {
		bodyParts.push(
			`<div class="date-sep">${escapeHtml(formatDateSeparator(dateKey, locale))}</div>`,
		);
		for (const msg of messages) {
			bodyParts.push(renderMessage(msg, currentUser, senderColorMap, locale));
		}
	}

	return `<!DOCTYPE html>
<html lang="${escapeHtml(locale)}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(chat.title)}</title>
<style>${STYLE}</style>
</head>
<body>
<header>
	<h1>${escapeHtml(chat.title)}</h1>
	<p class="meta">${escapeHtml(chat.participants.join(', '))}</p>
	<p class="meta">${escapeHtml(dateRange)} · ${chat.messageCount} messages${chat.mediaCount ? ` · ${chat.mediaCount} media` : ''}</p>
</header>
<main>
${bodyParts.join('\n')}
</main>
</body>
</html>`;
}

function renderMessage(
	msg: ChatMessage,
	currentUser: string | undefined,
	senderColorMap: Map<string, string>,
	locale: string,
): string {
	if (msg.isSystemMessage) {
		return `<div class="system-msg">${escapeHtml(msg.content)}</div>`;
	}

	const isOwn = currentUser !== undefined && msg.sender === currentUser;
	const senderColor = senderColorMap.get(msg.sender);
	const senderLabel =
		!isOwn && msg.sender
			? `<div class="sender"${senderColor ? ` style="color:${senderColor}"` : ''}>${escapeHtml(msg.sender)}</div>`
			: '';

	return `<div class="msg-row ${isOwn ? 'own' : ''}">
	<div class="bubble">
		${senderLabel}
		<div class="content">${escapeHtml(msg.content)}</div>
		<div class="time">${escapeHtml(formatTime(msg.timestamp, locale))}</div>
	</div>
</div>`;
}

const STYLE = `
	body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #ECE5DD; margin: 0; padding: 1rem; color: #111827; }
	header { text-align: center; margin-bottom: 1.5rem; }
	header h1 { margin: 0 0 0.25rem; font-size: 1.25rem; }
	header .meta { margin: 0.1rem 0; font-size: 0.8rem; color: #4b5563; }
	main { max-width: 720px; margin: 0 auto; }
	.date-sep { background: #fff; border-radius: 8px; padding: 4px 12px; font-size: 0.75rem; box-shadow: 0 1px 2px rgba(0,0,0,0.1); width: fit-content; margin: 1rem auto; }
	.system-msg { text-align: center; font-size: 0.75rem; color: #6b7280; background: rgba(255,255,255,0.8); border-radius: 8px; padding: 4px 12px; width: fit-content; margin: 8px auto; }
	.msg-row { display: flex; justify-content: flex-start; margin-bottom: 4px; break-inside: avoid; }
	.msg-row.own { justify-content: flex-end; }
	.bubble { max-width: 75%; background: #fff; border-radius: 8px; padding: 6px 10px; box-shadow: 0 1px 1px rgba(0,0,0,0.1); }
	.msg-row.own .bubble { background: #DCF8C6; }
	.sender { font-size: 0.75rem; font-weight: 600; margin-bottom: 2px; }
	.content { font-size: 0.875rem; white-space: pre-wrap; word-break: break-word; }
	.time { font-size: 0.65rem; color: #6b7280; text-align: right; margin-top: 2px; }
	@media print {
		body { background: #fff; }
		.bubble { box-shadow: none; border: 1px solid #e5e7eb; }
		.msg-row { break-inside: avoid; }
		@page { margin: 1cm; }
	}
`;
