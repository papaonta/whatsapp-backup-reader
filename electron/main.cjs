const {
	app,
	BrowserWindow,
	ipcMain,
	dialog,
	protocol,
	Menu,
	shell,
} = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('node:path');
const fs = require('node:fs');
const {
	getExtractionRoot,
	isValidExtractionId,
	extractZipToDirectory,
	createMergedChatFolder,
	peekChatEntry,
	loadManifest: loadExtractionManifest,
	deleteExtractionDir,
	pruneOrphans: pruneOrphanedExtractions,
	getDirectorySize,
	resolveMediaFilePath,
	buildMediaFileResponse,
} = require('./lib/extract-zip.cjs');

let mainWindow;

// Configure auto-updater
autoUpdater.autoDownload = false; // Manual download control
autoUpdater.autoInstallOnAppQuit = true; // Install when app quits

// Get the build directory path
const getBuildPath = () => {
	// In production, __dirname is inside the app.asar
	return path.join(__dirname, '../build');
};

const createWindow = () => {
	// Build window options
	const windowOptions = {
		width: 1200,
		height: 800,
		minWidth: 800,
		minHeight: 600,
		webPreferences: {
			preload: path.join(__dirname, 'preload.cjs'),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
		},
		titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
		backgroundColor: '#ECE5DD',
		icon: path.join(
			__dirname,
			'../static',
			process.platform === 'win32' ? 'icon.ico' : 'icon.png',
		),
		// Hide menu bar on Windows
		autoHideMenuBar: true,
	};

	// Only apply trafficLightPosition on macOS
	if (process.platform === 'darwin') {
		windowOptions.trafficLightPosition = { x: 15, y: 12 };
	}

	// Remove menu bar completely on Windows
	if (process.platform === 'win32') {
		Menu.setApplicationMenu(null);
	}

	// Create the browser window.
	mainWindow = new BrowserWindow(windowOptions);

	// In development, load from Vite dev server
	// In production, load from built files using custom protocol
	if (process.env.NODE_ENV === 'development') {
		mainWindow.loadURL('http://localhost:5173');
		mainWindow.webContents.openDevTools();
	} else {
		// Load root path, not /index.html - SvelteKit router needs the path to be /
		mainWindow.loadURL('app://localhost/');
	}
};

// Register custom protocols for serving local files
// This allows absolute paths like /favicon.ico to work
protocol.registerSchemesAsPrivileged([
	{
		scheme: 'app',
		privileges: {
			standard: true,
			secure: true,
			supportFetchAPI: true,
		},
	},
	{
		// Serves extracted chat media (images/video/audio/documents) straight
		// from disk instead of buffering them into Blobs - net.fetch()'s
		// file:// support forwards Range requests, which is what lets
		// <video>/<audio> elements scrub without pre-loading the whole file.
		scheme: 'media',
		privileges: {
			standard: true,
			secure: true,
			supportFetchAPI: true,
			corsEnabled: true,
		},
	},
]);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
	// Register protocol handler for 'app://' scheme
	protocol.handle('app', async (request) => {
		// Parse the URL to get just the pathname
		const requestUrl = new URL(request.url);
		let pathname = requestUrl.pathname;

		// Remove leading slash and decode
		pathname = decodeURIComponent(pathname.replace(/^\/+/, ''));

		// Default to index.html for empty path or root
		if (!pathname || pathname === '' || pathname === '.') {
			pathname = 'index.html';
		}

		const buildPath = getBuildPath();
		const filePath = path.join(buildPath, pathname);

		// Determine MIME type based on extension
		const ext = path.extname(pathname).toLowerCase();
		const mimeTypes = {
			'.html': 'text/html',
			'.js': 'text/javascript',
			'.mjs': 'text/javascript',
			'.css': 'text/css',
			'.json': 'application/json',
			'.png': 'image/png',
			'.jpg': 'image/jpeg',
			'.jpeg': 'image/jpeg',
			'.gif': 'image/gif',
			'.svg': 'image/svg+xml',
			'.ico': 'image/x-icon',
			'.woff': 'font/woff',
			'.woff2': 'font/woff2',
			'.ttf': 'font/ttf',
			'.wasm': 'application/wasm',
			'.webmanifest': 'application/manifest+json',
		};
		const mimeType = mimeTypes[ext] || 'application/octet-stream';

		try {
			// Read file using fs (works with ASAR)
			const data = fs.readFileSync(filePath);
			return new Response(data, {
				headers: { 'Content-Type': mimeType },
			});
		} catch (err) {
			console.error('[Protocol] Error reading file:', filePath, err.message);
			return new Response('Not Found', { status: 404 });
		}
	});

	// Register protocol handler for 'media://' scheme - serves files from an
	// extraction folder (see electron/lib/extract-zip.cjs) at
	// media://<extractionId>/<relative-path-within-media-dir>
	protocol.handle('media', async (request) => {
		const requestUrl = new URL(request.url);
		const extractionId = requestUrl.hostname;
		const relPath = decodeURIComponent(requestUrl.pathname.replace(/^\/+/, ''));

		const resolved = await resolveMediaFilePath(
			getExtractionRoot(app),
			extractionId,
			relPath,
		);
		if (!resolved) {
			return new Response('Not Found', { status: 404 });
		}

		return buildMediaFileResponse(
			resolved,
			relPath,
			request.headers.get('Range'),
		);
	});

	createWindow();

	// Setup auto-updater (production only)
	if (process.env.NODE_ENV !== 'development') {
		setupAutoUpdater();
	}

	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

// IPC Handlers for file operations
ipcMain.handle('dialog:openFile', async () => {
	const result = await dialog.showOpenDialog(mainWindow, {
		properties: ['openFile'],
		filters: [
			{ name: 'WhatsApp Exports', extensions: ['zip'] },
			{ name: 'All Files', extensions: ['*'] },
		],
	});

	if (result.canceled || result.filePaths.length === 0) {
		return null;
	}

	const filePath = result.filePaths[0];
	const fileName = path.basename(filePath);

	// Deliberately does NOT read the file here - the renderer streams large
	// imports to disk via the extraction:extract IPC channel instead of
	// buffering the whole ZIP in memory (see electron/lib/extract-zip.cjs).
	// Callers that genuinely need the raw bytes (e.g. ReselectFileModal's
	// legacy re-select flow) fetch them separately via readFileFromPath.
	return {
		path: filePath,
		name: fileName,
	};
});

ipcMain.handle('dialog:openFolder', async () => {
	const result = await dialog.showOpenDialog(mainWindow, {
		properties: ['openDirectory'],
	});

	if (result.canceled || result.filePaths.length === 0) {
		return null;
	}

	return result.filePaths[0];
});

ipcMain.handle('fs:readFile', async (_event, filePath) => {
	try {
		const content = fs.readFileSync(filePath);
		return { success: true, data: content.buffer };
	} catch (error) {
		return { success: false, error: error.message };
	}
});

ipcMain.handle('fs:readDir', async (_event, dirPath) => {
	try {
		const files = fs.readdirSync(dirPath, { withFileTypes: true });
		return {
			success: true,
			data: files.map((f) => ({
				name: f.name,
				isDirectory: f.isDirectory(),
				path: path.join(dirPath, f.name),
			})),
		};
	} catch (error) {
		return { success: false, error: error.message };
	}
});

ipcMain.handle('fs:fileExists', async (_event, filePath) => {
	return fs.existsSync(filePath);
});

// Validates a user-facing absolute path to a .zip file: rejects non-strings,
// relative paths, traversal segments, non-.zip extensions, and symlinks.
// Shared by every IPC handler that reads a zip file directly from disk.
async function validateAbsoluteZipPath(filePath) {
	if (typeof filePath !== 'string') {
		throw new Error('Invalid file path');
	}
	if (!path.isAbsolute(filePath)) {
		throw new Error('Invalid file path');
	}
	if (filePath.split(/[/\\]+/).includes('..')) {
		throw new Error('Invalid file path');
	}
	const normalized = path.resolve(filePath);
	if (path.extname(normalized).toLowerCase() !== '.zip') {
		throw new Error('Only .zip files are allowed');
	}
	// Pre-check with lstat to reject symlinks (works cross-platform including Windows)
	const lst = await fs.promises.lstat(normalized);
	if (!lst.isFile() || lst.isSymbolicLink()) {
		throw new Error('Path is not a regular file');
	}
	return normalized;
}

// Read file from absolute path (for persistence)
ipcMain.handle('file:readFromPath', async (_event, filePath) => {
	try {
		const normalized = await validateAbsoluteZipPath(filePath);

		// Use O_NOFOLLOW when available to reject symlinks atomically (not supported on Windows)
		const openFlags =
			typeof fs.constants.O_NOFOLLOW === 'number'
				? fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW
				: fs.constants.O_RDONLY;
		const fd = await fs.promises.open(normalized, openFlags);
		try {
			const content = await fd.readFile();
			return {
				success: true,
				buffer: content.buffer.slice(
					content.byteOffset,
					content.byteOffset + content.byteLength,
				),
				name: path.basename(normalized),
			};
		} finally {
			await fd.close();
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
});

// Extraction IPC handlers
const activeExtractions = new Map();

ipcMain.handle(
	'extraction:extract',
	async (_event, zipFilePath, extractionId) => {
		const controller = new AbortController();
		// Registered before any `await` so a cancel arriving while
		// validateAbsoluteZipPath is still resolving isn't lost - ipcMain
		// handlers only run synchronously up to their first await, and a
		// second invoke on another channel can be processed in that gap.
		activeExtractions.set(extractionId, controller);
		try {
			const normalized = await validateAbsoluteZipPath(zipFilePath);
			if (!isValidExtractionId(extractionId)) {
				return { success: false, error: 'Invalid extraction id' };
			}

			const result = await extractZipToDirectory({
				zipPath: normalized,
				extractionId,
				extractionRoot: getExtractionRoot(app),
				signal: controller.signal,
				onProgress: (progress) => {
					if (mainWindow && !mainWindow.isDestroyed()) {
						mainWindow.webContents.send('extraction:progress', {
							extractionId,
							...progress,
						});
					}
				},
			});

			return { success: true, ...result };
		} catch (error) {
			return {
				success: false,
				cancelled: controller.signal.aborted,
				error: error instanceof Error ? error.message : String(error),
			};
		} finally {
			activeExtractions.delete(extractionId);
		}
	},
);

ipcMain.handle('extraction:cancelExtract', async (_event, extractionId) => {
	const controller = activeExtractions.get(extractionId);
	if (!controller) return { success: false };
	controller.abort();
	return { success: true };
});

ipcMain.handle('extraction:peekChatText', async (_event, zipFilePath) => {
	try {
		const normalized = await validateAbsoluteZipPath(zipFilePath);
		const result = await peekChatEntry(normalized);
		return result;
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
});

ipcMain.handle(
	'extraction:createMergedChat',
	async (_event, extractionId, chatFileName, chatText, mediaEntries) => {
		try {
			if (!isValidExtractionId(extractionId)) {
				throw new Error('Invalid extraction id');
			}
			if (
				typeof chatFileName !== 'string' ||
				chatFileName.length === 0 ||
				chatFileName.split(/[/\\]+/).includes('..')
			) {
				throw new Error('Invalid chat file name');
			}
			if (typeof chatText !== 'string') {
				throw new Error('Invalid chat text');
			}
			if (!Array.isArray(mediaEntries)) {
				throw new Error('Invalid media entries');
			}
			for (const entry of mediaEntries) {
				if (
					typeof entry?.relPath !== 'string' ||
					entry.relPath.length === 0 ||
					entry.relPath.split(/[/\\]+/).includes('..')
				) {
					throw new Error('Invalid media entry path');
				}
			}

			const result = await createMergedChatFolder({
				extractionRoot: getExtractionRoot(app),
				extractionId,
				chatFileName,
				chatText,
				mediaEntries,
			});

			return { success: true, ...result };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	},
);

ipcMain.handle('extraction:loadManifest', async (_event, extractionDir) => {
	try {
		if (typeof extractionDir !== 'string') {
			throw new Error('Invalid extraction directory');
		}
		const resolved = path.resolve(extractionDir);
		const root = getExtractionRoot(app);
		if (resolved !== root && !resolved.startsWith(root + path.sep)) {
			throw new Error('Path escapes extraction root');
		}
		const result = await loadExtractionManifest(resolved);
		return { success: true, ...result };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
});

ipcMain.handle('extraction:deleteDir', async (_event, extractionDir) => {
	try {
		if (typeof extractionDir !== 'string') {
			throw new Error('Invalid extraction directory');
		}
		await deleteExtractionDir(getExtractionRoot(app), extractionDir);
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
});

ipcMain.handle('extraction:pruneOrphans', async (_event, keepExtractionIds) => {
	try {
		const ids = Array.isArray(keepExtractionIds) ? keepExtractionIds : [];
		const result = await pruneOrphanedExtractions(getExtractionRoot(app), ids);
		return { success: true, ...result };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
});

ipcMain.handle('extraction:getStorageUsage', async () => {
	try {
		const bytes = await getDirectorySize(getExtractionRoot(app));
		return { success: true, bytes };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
});

ipcMain.handle('shell:openExternal', async (_event, url) => {
	// Validate URL before opening
	if (!url.startsWith('https://github.com/papaonta/whatsapp-backup-reader')) {
		throw new Error('Invalid URL');
	}
	await shell.openExternal(url);
});
// Auto-updater setup and IPC handlers
function setupAutoUpdater() {
	// Check for updates on startup (after 5 seconds to let app stabilize)
	setTimeout(() => {
		autoUpdater.checkForUpdates().catch((err) => {
			console.error('Auto-updater check failed:', err);
		});
	}, 5000);

	// Auto-updater events
	autoUpdater.on('checking-for-update', () => {
		sendUpdateStatusToRenderer('checking-for-update');
	});

	autoUpdater.on('update-available', (info) => {
		sendUpdateStatusToRenderer('update-available', info);
	});

	autoUpdater.on('update-not-available', (info) => {
		sendUpdateStatusToRenderer('update-not-available', info);
	});

	autoUpdater.on('error', (err) => {
		sendUpdateStatusToRenderer('error', { message: err.message });
	});

	autoUpdater.on('download-progress', (progressObj) => {
		sendUpdateStatusToRenderer('download-progress', progressObj);
	});

	autoUpdater.on('update-downloaded', (info) => {
		sendUpdateStatusToRenderer('update-downloaded', info);
	});
}

function sendUpdateStatusToRenderer(event, data = {}) {
	if (mainWindow && !mainWindow.isDestroyed()) {
		mainWindow.webContents.send('auto-update-status', { event, data });
	}
}

// IPC handlers for manual update control
ipcMain.handle('updater:checkForUpdates', async () => {
	try {
		const result = await autoUpdater.checkForUpdates();
		return { success: true, data: result };
	} catch (error) {
		return { success: false, error: error.message };
	}
});

ipcMain.handle('updater:downloadUpdate', async () => {
	try {
		await autoUpdater.downloadUpdate();
		return { success: true };
	} catch (error) {
		return { success: false, error: error.message };
	}
});

ipcMain.handle('updater:quitAndInstall', () => {
	autoUpdater.quitAndInstall(false, true);
});
