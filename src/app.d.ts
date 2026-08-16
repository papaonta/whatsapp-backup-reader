// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

interface FileResult {
	path: string;
	name: string;
}

interface ReadResult {
	success: boolean;
	data?: ArrayBuffer;
	error?: string;
}

interface FileReadResult {
	success: boolean;
	buffer?: ArrayBuffer;
	name?: string;
	error?: string;
}

interface DirEntry {
	name: string;
	isDirectory: boolean;
	path: string;
}

interface ReadDirResult {
	success: boolean;
	data?: DirEntry[];
	error?: string;
}

interface ExtractionEntry {
	name: string;
	path: string;
	size: number;
}

interface ExtractionResult {
	success: boolean;
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

interface ExtractionPruneResult {
	success: boolean;
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

interface ElectronAPI {
	openFile: () => Promise<FileResult | null>;
	openFolder: () => Promise<string | null>;
	readFile: (filePath: string) => Promise<ReadResult>;
	readDir: (dirPath: string) => Promise<ReadDirResult>;
	fileExists: (filePath: string) => Promise<boolean>;
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
		loadManifest: (extractionDir: string) => Promise<ExtractionResult>;
		deleteDir: (
			extractionDir: string,
		) => Promise<{ success: boolean; error?: string }>;
		pruneOrphans: (
			keepExtractionIds: string[],
		) => Promise<ExtractionPruneResult>;
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
