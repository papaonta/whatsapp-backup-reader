<script lang="ts">
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import type { ChatData } from '$lib/state.svelte';
import ChatAvatar from './ChatAvatar.svelte';
import Icon from './Icon.svelte';
import IconButton from './IconButton.svelte';

interface Props {
	chat: ChatData;
	participantStats: Map<string, number> | null;
	onClose: () => void;
}

let { chat, participantStats, onClose }: Props = $props();

const locale = $derived(getLocale());

// Duplicated from ChatStats.svelte rather than extracted to a shared
// helper - small enough, and keeps this panel from risking a change to
// that already-working component.
function formatDuration(startDate: Date | null, endDate: Date | null): string {
	if (!startDate || !endDate) return m.stats_unknown();

	const diff = endDate.getTime() - startDate.getTime();
	const days = Math.floor(diff / (1000 * 60 * 60 * 24));
	const months = Math.floor(days / 30);
	const years = Math.floor(days / 365);

	if (years > 0) {
		const remainingMonths = months % 12;
		const yearLabel = years > 1 ? m.stats_years() : m.stats_year();
		const monthLabel =
			remainingMonths !== 1 ? m.stats_months() : m.stats_month();
		return `${years} ${yearLabel}, ${remainingMonths} ${monthLabel}`;
	}
	if (months > 0) {
		const remainingDays = days % 30;
		const monthLabel = months > 1 ? m.stats_months() : m.stats_month();
		const dayLabel = remainingDays !== 1 ? m.stats_days() : m.stats_day();
		return `${months} ${monthLabel}, ${remainingDays} ${dayLabel}`;
	}
	const dayLabel = days !== 1 ? m.stats_days() : m.stats_day();
	return `${days} ${dayLabel}`;
}
</script>

<div class="flex flex-col h-full bg-white dark:bg-gray-800">
	<!-- Header - matches BookmarksPanel/MediaGallery height -->
	<div class="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
		<div class="flex items-center justify-between h-10">
			<div class="flex items-center gap-2">
				<Icon name="info" class="text-[var(--color-whatsapp-teal)]" />
				<h2 class="font-semibold text-gray-900 dark:text-gray-100">{m.chat_info_title()}</h2>
			</div>
			<IconButton theme="light" size="sm" onclick={onClose} aria-label={m.close()}>
				<Icon name="close" />
			</IconButton>
		</div>
	</div>

	<div class="flex-1 overflow-y-auto p-4">
		<!-- Identity -->
		<div class="flex flex-col items-center text-center mb-6">
			<ChatAvatar name={chat.title} size="md" class="w-16 h-16 text-xl mb-3" />
			<h3 class="font-semibold text-gray-900 dark:text-white truncate max-w-full">{chat.title}</h3>
			{#if chat.startDate && chat.endDate}
				<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
					{formatDuration(chat.startDate, chat.endDate)}
				</p>
				<p class="text-xs text-gray-400 dark:text-gray-500">
					{chat.startDate.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}
					→
					{chat.endDate.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}
				</p>
			{/if}
		</div>

		<!-- Summary tiles -->
		<div class="grid grid-cols-3 gap-2 mb-6">
			<div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center">
				<div class="text-lg font-bold text-[var(--color-whatsapp-teal)]">
					{chat.messageCount.toLocaleString()}
				</div>
				<div class="text-xs text-gray-500 dark:text-gray-400">{m.stats_messages()}</div>
			</div>
			<div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center">
				<div class="text-lg font-bold text-[var(--color-whatsapp-teal)]">
					{chat.participants.length}
				</div>
				<div class="text-xs text-gray-500 dark:text-gray-400">{m.stats_participants()}</div>
			</div>
			<div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center">
				<div class="text-lg font-bold text-[var(--color-whatsapp-teal)]">
					{chat.mediaCount}
				</div>
				<div class="text-xs text-gray-500 dark:text-gray-400">{m.stats_media()}</div>
			</div>
		</div>

		<!-- Participants -->
		<h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
			{m.participants_members({ count: chat.participants.length })}
		</h3>
		<div>
			{#each chat.participants as participant}
				{@const messageCount = participantStats?.get(participant) || 0}
				{@const isPhoneNumber = /\+?\d[\d\s\-()]{8,}/.test(participant)}
				{@const contactInfo = chat.contacts?.get(participant.toLowerCase())}
				{@const phoneFromVcf = contactInfo?.phoneNumber}
				<div class="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0">
					<!-- Avatar -->
					<div class="w-10 h-10 rounded-full bg-[var(--color-whatsapp-teal)] flex items-center justify-center text-white font-semibold flex-shrink-0">
						{participant.charAt(0).toUpperCase()}
					</div>

					<!-- Participant info -->
					<div class="flex-1 min-w-0">
						<p class="font-medium text-gray-900 dark:text-white truncate">
							{participant}
						</p>
						{#if phoneFromVcf}
							<p class="text-xs text-[var(--color-whatsapp-teal)] font-medium">
								{phoneFromVcf}
							</p>
							<p class="text-xs text-gray-400 dark:text-gray-500">
								{m.participants_phone_from_vcf()}
							</p>
						{:else if isPhoneNumber}
							<p class="text-xs text-gray-500 dark:text-gray-400">
								{m.participants_phone_number()}
							</p>
						{:else}
							<p class="text-xs text-gray-500 dark:text-gray-400">
								{m.participants_contact_name()}
							</p>
						{/if}
					</div>

					<!-- Message count for this participant -->
					{#if messageCount > 0}
						<div class="text-right flex-shrink-0">
							<p class="text-sm font-medium text-[var(--color-whatsapp-teal)]">{messageCount}</p>
							<p class="text-xs text-gray-400">{m.participants_messages()}</p>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>
