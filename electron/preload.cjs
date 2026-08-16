const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
	// File dialogs
	openFile: () => ipcRenderer.invoke('dialog:openFile'),
	openFolder: () => ipcRenderer.invoke('dialog:openFolder'),

	// File system operations
	readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
	readDir: (dirPath) => ipcRenderer.invoke('fs:readDir', dirPath),
	fileExists: (filePath) => ipcRenderer.invoke('fs:fileExists', filePath),

	// Persistence file operations
	readFileFromPath: (filePath) =>
		ipcRenderer.invoke('file:readFromPath', filePath),

	// External links
	openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

	// ZIP extraction (streams a large export to disk instead of buffering
	// it all in memory - see electron/lib/extract-zip.cjs)
	extraction: {
		extract: (zipFilePath, extractionId) =>
			ipcRenderer.invoke('extraction:extract', zipFilePath, extractionId),
		cancelExtract: (extractionId) =>
			ipcRenderer.invoke('extraction:cancelExtract', extractionId),
		peekChatText: (zipFilePath) =>
			ipcRenderer.invoke('extraction:peekChatText', zipFilePath),
		createMergedChat: (extractionId, chatFileName, chatText, mediaEntries) =>
			ipcRenderer.invoke(
				'extraction:createMergedChat',
				extractionId,
				chatFileName,
				chatText,
				mediaEntries,
			),
		loadManifest: (extractionDir) =>
			ipcRenderer.invoke('extraction:loadManifest', extractionDir),
		deleteDir: (extractionDir) =>
			ipcRenderer.invoke('extraction:deleteDir', extractionDir),
		pruneOrphans: (keepExtractionIds) =>
			ipcRenderer.invoke('extraction:pruneOrphans', keepExtractionIds),
		getStorageUsage: () => ipcRenderer.invoke('extraction:getStorageUsage'),
		onProgress: (callback) => {
			const subscription = (_event, data) => callback(data);
			ipcRenderer.on('extraction:progress', subscription);
			return () =>
				ipcRenderer.removeListener('extraction:progress', subscription);
		},
	},

	// Auto-updater
	updater: {
		checkForUpdates: () => ipcRenderer.invoke('updater:checkForUpdates'),
		downloadUpdate: () => ipcRenderer.invoke('updater:downloadUpdate'),
		quitAndInstall: () => ipcRenderer.invoke('updater:quitAndInstall'),
		onStatus: (callback) => {
			const subscription = (_event, data) => callback(data);
			ipcRenderer.on('auto-update-status', subscription);
			return () =>
				ipcRenderer.removeListener('auto-update-status', subscription);
		},
	},

	// Platform info
	platform: process.platform,
	isElectron: true,
});
