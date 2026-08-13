// Parser exports

export type { ChatMessage, ParsedChat } from './chat-parser';
export {
	formatTime,
	generateDeterministicId,
	getChatStats,
	groupMessagesByDate,
	parseChat,
	toLocalDateKey,
} from './chat-parser';
export type { ContactInfo } from './vcf-parser';
export { formatPhoneNumber, isPhoneNumber, parseVcf } from './vcf-parser';
export type {
	DateFlatItem,
	FlatItem,
	MediaFile,
	MessageFlatItem,
	ParsedZipChat,
	ParseProgress,
} from './zip-parser';
export {
	cleanupMediaUrls,
	deriveChatTitle,
	getExtractedMediaUrl,
	getMediaBytes,
	loadMediaFile,
	matchMediaToMessages,
	mediaFileHasSource,
	parseExtractedChat,
	parseZipFile,
	preloadMedia,
	readFileAsArrayBuffer,
} from './zip-parser';
