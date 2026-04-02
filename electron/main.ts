import { app, BrowserWindow, globalShortcut, ipcMain, Menu } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { registerSteamHandlers, setSteamInputWindow, shutdownSteamInput } from './steam-handlers';

const __dirname = dirname(fileURLToPath(import.meta.url));

declare const __STEAM_APP_ID__: number;

registerSteamHandlers(__STEAM_APP_ID__);

let win: BrowserWindow | null = null;

function createWindow() {
	Menu.setApplicationMenu(null);
	win = new BrowserWindow({
		width: 1280,
		height: 800,
		minWidth: 1280,
		minHeight: 800,
		title: 'All or Nothing',
		backgroundColor: '#000000',
		show: false,
		webPreferences: {
			preload: join(__dirname, 'preload.mjs'),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	setSteamInputWindow(win);
	win.setAspectRatio(16 / 10);
	win.once('ready-to-show', () => win?.show());
	globalShortcut.register('F12', () => win?.webContents.toggleDevTools());

	if (process.env['VITE_DEV_SERVER_URL']) {
		win.loadURL(process.env['VITE_DEV_SERVER_URL']);
	} else {
		win.loadFile(join(__dirname, '../dist/web/index.html'));
	}
}

ipcMain.on('app:quit', () => app.quit());
ipcMain.on('app:setFullscreen', (_event, enabled: boolean) => {
	win?.setFullScreen(enabled);
});
ipcMain.handle('app:isFullscreen', () => win?.isFullScreen() ?? false);

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => {
	shutdownSteamInput();
});
