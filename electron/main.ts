import { app, BrowserWindow, Menu } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync } from 'fs';
import { registerSteamHandlers } from './steam-handlers';

function needsX11Fallback(): boolean {
	if (process.platform !== 'linux') return false;
	if (process.argv.includes('--ozone-platform=x11')) return false;
	try {
		return readdirSync('/proc/driver/nvidia').length > 0;
	} catch {
		return false;
	}
}

if (needsX11Fallback()) {
	app.relaunch({ args: [...process.argv.slice(1), '--ozone-platform=x11'] });
	app.exit(0);
}

const __dirname = dirname(fileURLToPath(import.meta.url));

declare const __STEAM_APP_ID__: number;

registerSteamHandlers(__STEAM_APP_ID__);

function createWindow() {
	Menu.setApplicationMenu(null);
	const win = new BrowserWindow({
		width: 1280,
		height: 800,
		minWidth: 1280,
		minHeight: 800,
		title: 'All or Nothing',
		webPreferences: {
			preload: join(__dirname, 'preload.mjs'),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	win.setAspectRatio(16 / 10);

	if (process.env['VITE_DEV_SERVER_URL']) {
		win.loadURL(process.env['VITE_DEV_SERVER_URL']);
	} else {
		win.loadFile(join(__dirname, '../dist/web/index.html'));
	}
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
