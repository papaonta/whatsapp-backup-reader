const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
	// File dialogs
	openFile: () => ipcRenderer.invoke('dialog:openFile'),
	openFolder: () => ipcRenderer.invoke('dialog:openFolder'),

	// File system operations
	fileExists: (filePath) => ipcRenderer.invoke('fs:fileExists', filePath),
	fileSize: (filePath) => ipcRenderer.invoke('fs:fileSize', filePath),

	// Persistence file operations
	readFileFromPath: (filePath) =>
		ipcRenderer.invoke('file:readFromPath', filePath),

	// Chat storage location: where the extracted chat data lives, whether it is
	// available, and moving / reconnecting it (chat data only, never the app
	// database).
	chatStorage: {
		getStatus: () => ipcRenderer.invoke('chatStorage:getStatus'),
		planMove: (options) => ipcRenderer.invoke('chatStorage:planMove', options),
		move: (options) => ipcRenderer.invoke('chatStorage:move', options),
		cancelMove: () => ipcRenderer.invoke('chatStorage:cancelMove'),
		createDefault: () => ipcRenderer.invoke('chatStorage:createDefault'),
		previewRecover: (dir) =>
			ipcRenderer.invoke('chatStorage:previewRecover', dir),
		recover: (dir) => ipcRenderer.invoke('chatStorage:recover', dir),
		reconnect: (dir) => ipcRenderer.invoke('chatStorage:reconnect', dir),
		onMoveProgress: (callback) => {
			const subscription = (_event, data) => callback(data);
			ipcRenderer.on('chatStorage:moveProgress', subscription);
			return () =>
				ipcRenderer.removeListener('chatStorage:moveProgress', subscription);
		},
	},

	// Clears cookies, service workers and Cache Storage only
	clearSiteData: () => ipcRenderer.invoke('siteData:clear'),

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
		loadManifest: (extractionId) =>
			ipcRenderer.invoke('extraction:loadManifest', extractionId),
		deleteDir: (extractionId) =>
			ipcRenderer.invoke('extraction:deleteDir', extractionId),
		listOrphans: (keepExtractionIds) =>
			ipcRenderer.invoke('extraction:listOrphans', keepExtractionIds),
		deleteOrphans: (ids, keepExtractionIds) =>
			ipcRenderer.invoke('extraction:deleteOrphans', ids, keepExtractionIds),
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
