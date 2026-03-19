import { app, BrowserWindow, Menu } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { registerSteamHandlers } from './steam-handlers';

if (process.platform === 'linux') {
	try {
		const lspci = execSync('lspci', { encoding: 'utf-8' });
		if (/nvidia/i.test(lspci)) {
			app.commandLine.appendSwitch('ozone-platform', 'x11');
		}
	} catch {
		// lspci not available, let Electron pick the platform
	}
}

const __dirname = dirname(fileURLToPath(import.meta.url));

const STEAM_APP_ID = 480; // Replace with real app ID

registerSteamHandlers(STEAM_APP_ID);

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
