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
 * Open a file via Electron's native dialog and return a File + absolute path.
 * Returns null when not running in Electron or the user cancelled.
 */
export async function openElectronFile(): Promise<{
	file: File;
	path: string;
} | null> {
	if (!window.electronAPI) return null;

	const result = await window.electronAPI.openFile();
	if (!result) return null;

	const blob = new Blob([result.buffer]);
	const file = new File([blob], result.name, { type: 'application/zip' });
	return { file, path: result.path };
}

/**
 * Extract the absolute file path that Electron attaches to drag-dropped files.
 * Returns undefined when not running in Electron or the property is absent.
 */
export function getElectronFilePath(file: File): string | undefined {
	return 'path' in file ? (file as File & { path: string }).path : undefined;
}
