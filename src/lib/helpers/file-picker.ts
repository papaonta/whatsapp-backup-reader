import { appLockState } from '$lib/app-lock.svelte';

/**
 * Shared file-picker helpers for ZIP imports.
 *
 * Centralises the electronAPI.openFile (Electron) pattern so it isn't
 * duplicated across FileDropZone, ReselectFileModal, and +page.svelte.
 * The web build deliberately uses a plain <input type="file"> instead of
 * showOpenFilePicker() — the latter makes Chrome spuriously flag the tab as
 * "Page Unresponsive" while its promise is pending.
 */

/**
 * Open a file via Electron's native dialog and return its name + absolute
 * path. Returns null when not running in Electron or the user cancelled.
 *
 * Deliberately does not read the file's contents - large imports stream to
 * disk via the extraction:extract IPC channel instead (see
 * electron/lib/extract-zip.cjs). Callers that genuinely need the raw bytes
 * (e.g. ReselectFileModal's legacy re-select flow) fetch them separately via
 * window.electronAPI.readFileFromPath(path).
 */
export async function openElectronFile(): Promise<{
	name: string;
	path: string;
} | null> {
	if (!window.electronAPI) return null;

	// Opening a native dialog blurs the window; without this, lock-on-blur
	// would lock the app (and remount the page) behind the dialog.
	const release = appLockState.suspend();
	try {
		const result = await window.electronAPI.openFile();
		if (!result) return null;

		return { name: result.name, path: result.path };
	} finally {
		release();
	}
}

/**
 * Open Electron's native folder dialog (e.g. to pick the chat storage
 * location). Keeps auto-lock paused while the dialog is open, same as
 * openElectronFile. Returns null when cancelled or not in Electron.
 */
export async function openElectronFolder(): Promise<string | null> {
	if (!window.electronAPI) return null;
	const release = appLockState.suspend();
	try {
		return await window.electronAPI.openFolder();
	} finally {
		release();
	}
}

/**
 * Opens a web <input type="file"> dialog while keeping auto-lock paused. The
 * pause ends on `change`, `cancel`, or (as a fallback for browsers without a
 * `cancel` event) shortly after the window regains focus, with a hard upper
 * bound so a lost event can never leave auto-lock disabled.
 */
export function openFileInput(input: HTMLInputElement | null | undefined) {
	if (!input) return;
	const release = appLockState.suspend();
	let focusTimer: ReturnType<typeof setTimeout> | undefined;
	let done = false;
	const finish = () => {
		if (done) return;
		done = true;
		input.removeEventListener('change', finish);
		input.removeEventListener('cancel', finish);
		window.removeEventListener('focus', onFocus);
		clearTimeout(focusTimer);
		clearTimeout(safetyTimer);
		release();
	};
	const onFocus = () => {
		// Give `change` a chance to fire first.
		focusTimer = setTimeout(finish, 1000);
	};
	const safetyTimer = setTimeout(finish, 5 * 60 * 1000);
	input.addEventListener('change', finish);
	input.addEventListener('cancel', finish);
	window.addEventListener('focus', onFocus);
	input.click();
}

/**
 * Extract the absolute file path that Electron attaches to drag-dropped files.
 * Returns undefined when not running in Electron or the property is absent.
 */
export function getElectronFilePath(file: File): string | undefined {
	return 'path' in file ? (file as File & { path: string }).path : undefined;
}

/**
 * Builds an empty, content-less File carrying only a name - just enough for
 * handleFilesSelected's FileList-shaped API (name/extension checks, loading
 * placeholder text) when the real bytes will instead be streamed straight to
 * disk from the absolute path via the extraction pipeline, not read from
 * this File object.
 */
export function createPlaceholderZipFile(name: string): File {
	return new File([], name, { type: 'application/zip' });
}
