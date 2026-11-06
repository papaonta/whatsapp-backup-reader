// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

interface FileResult {
	path: string;
	name: string;
}

interface FileReadResult {
	success: boolean;
	buffer?: ArrayBuffer;
	name?: string;
	error?: string;
}

interface ExtractionEntry {
	name: string;
	path: string;
	size: number;
}

interface ExtractionResult {
	success: boolean;
	// Set when the extraction folder couldn't be read (missing, drive locked,
	// ...). Never triggers an automatic re-extraction or deletion.
	unavailable?: boolean;
	extractionDir?: string;
	originalFileName?: string;
	entries?: ExtractionEntry[];
	error?: string;
	cancelled?: boolean;
}

interface ExtractionProgress {
	extractionId: string;
	filesProcessed: number;
	totalFiles: number;
	progress: number;
}

interface ExtractionOrphanList {
	success: boolean;
	unavailable?: boolean;
	orphans?: { id: string; bytes: number }[];
	error?: string;
}

interface ExtractionOrphanDeleteResult {
	success: boolean;
	unavailable?: boolean;
	removed?: string[];
	error?: string;
}

interface ChatTextPeekResult {
	success: boolean;
	chatContent?: string | null;
	chatFilename?: string;
	chatEntryPath?: string;
	error?: string;
}

interface MergedChatMediaEntry {
	relPath: string;
	bytes: ArrayBuffer;
}

interface ChatStorageStatusInfo {
	state: 'ok' | 'unavailable' | 'foreign' | 'other-install';
	reason: string | null;
	root: string;
	defaultRoot: string;
	isDefault: boolean;
	canRead: boolean;
	canWrite: boolean;
	moving: boolean;
}

interface ChatStorageMoveOptions {
	toDefault?: boolean;
	dir?: string;
}

interface ChatStoragePlanResult {
	success: boolean;
	reason?: string;
	error?: string;
	destination?: string;
	source?: string;
	chatCount?: number;
	fileCount?: number;
	totalBytes?: number;
	freeBytes?: number | null;
}

interface ChatStorageMoveResult {
	success: boolean;
	cancelled?: boolean;
	reason?: string;
	error?: string;
	oldRoot?: string;
	newRoot?: string;
	chatCount?: number;
	bytes?: number;
}

interface ChatStorageMoveProgress {
	bytesDone: number;
	totalBytes: number;
	chatCount: number;
	chatIndex?: number;
}

interface ElectronAPI {
	openFile: () => Promise<FileResult | null>;
	openFolder: () => Promise<string | null>;
	fileExists: (filePath: string) => Promise<boolean>;
	fileSize: (filePath: string) => Promise<number | null>;
	chatStorage: {
		getStatus: () => Promise<ChatStorageStatusInfo>;
		planMove: (
			options: ChatStorageMoveOptions,
		) => Promise<ChatStoragePlanResult>;
		move: (options: ChatStorageMoveOptions) => Promise<ChatStorageMoveResult>;
		cancelMove: () => Promise<{ success: boolean }>;
		createDefault: () => Promise<{
			success: boolean;
			reason?: string;
			error?: string;
		}>;
		previewRecover: (dir: string) => Promise<{
			success: boolean;
			reason?: string;
			root?: string;
			createdAt?: string | null;
		}>;
		recover: (
			dir: string,
		) => Promise<{ success: boolean; reason?: string; error?: string }>;
		reconnect: (
			dir: string,
		) => Promise<{ success: boolean; reason?: string; error?: string }>;
		onMoveProgress: (
			callback: (progress: ChatStorageMoveProgress) => void,
		) => () => void;
	};
	clearSiteData: () => Promise<{ success: boolean; error?: string }>;
	readFileFromPath: (filePath: string) => Promise<FileReadResult>;
	openExternal: (url: string) => Promise<void>;
	platform: string;
	isElectron: boolean;
	updater?: {
		checkForUpdates: () => Promise<void>;
		downloadUpdate: () => Promise<void>;
		quitAndInstall: () => void;
		onStatus: (
			callback: (data: { event: string; data?: unknown }) => void,
		) => () => void;
	};
	extraction?: {
		extract: (
			zipFilePath: string,
			extractionId: string,
		) => Promise<ExtractionResult>;
		cancelExtract: (extractionId: string) => Promise<{ success: boolean }>;
		peekChatText: (zipFilePath: string) => Promise<ChatTextPeekResult>;
		createMergedChat: (
			extractionId: string,
			chatFileName: string,
			chatText: string,
			mediaEntries: MergedChatMediaEntry[],
		) => Promise<ExtractionResult>;
		loadManifest: (extractionId: string) => Promise<ExtractionResult>;
		deleteDir: (extractionId: string) => Promise<{
			success: boolean;
			deleted?: boolean;
			unavailable?: boolean;
			error?: string;
		}>;
		listOrphans: (keepExtractionIds: string[]) => Promise<ExtractionOrphanList>;
		deleteOrphans: (
			ids: string[],
			keepExtractionIds: string[],
		) => Promise<ExtractionOrphanDeleteResult>;
		getStorageUsage: () => Promise<
			{ success: true; bytes: number } | { success: false; error: string }
		>;
		onProgress: (callback: (data: ExtractionProgress) => void) => () => void;
	};
}

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	// File System Access API types (experimental, not in default TypeScript libs)
	// See https://wicg.github.io/file-system-access/
	interface FileSystemHandlePermissionDescriptor {
		mode?: 'read' | 'readwrite';
	}

	interface OpenFilePickerOptions {
		types?: {
			description?: string;
			accept: Record<string, string[]>;
		}[];
		multiple?: boolean;
		excludeAcceptAllOption?: boolean;
	}

	interface FileSystemFileHandle {
		queryPermission(
			descriptor?: FileSystemHandlePermissionDescriptor,
		): Promise<PermissionState>;
		requestPermission(
			descriptor?: FileSystemHandlePermissionDescriptor,
		): Promise<PermissionState>;
	}

	interface DataTransferItem {
		getAsFileSystemHandle(): Promise<FileSystemHandle | null>;
	}

	interface Window {
		electronAPI?: ElectronAPI;
		showOpenFilePicker(
			options?: OpenFilePickerOptions,
		): Promise<FileSystemFileHandle[]>;
	}
}

export {};
