import type { Configuration } from 'electron-builder';
import { copyFile, rm } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const steamPrebuildsToRemove: Readonly<Record<'linux' | 'win32' | 'darwin', readonly string[]>> = {
	linux: ['darwin-arm64', 'darwin-x64', 'win32-x64'],
	win32: ['darwin-arm64', 'darwin-x64', 'linux-x64'],
	darwin: ['linux-x64', 'win32-x64'],
} as const;

const config: Configuration = {
	appId: 'app.allornothing.game',
	productName: 'All or Nothing',
	directories: {
		output: 'dist/desktop',
	},
	files: [
		'dist/web/**/*',
		'dist-electron/**/*',
		'steamworks_sdk/**/*',
		'!steam_appid.txt',
	],
	asarUnpack: [
		'steamworks_sdk/**/*',
	],
	extraFiles: [
		{
			from: 'steam/controller_config',
			to: 'controller_config',
			filter: ['*.vdf'],
		},
	],
	electronLanguages: ['en-US'],
	icon: 'public/assets/android-chrome-512x512.png',
	linux: {
		target: ['AppImage', 'flatpak'],
		category: 'Game',
		executableArgs: ['--no-sandbox'],
	},
	flatpak: {
		runtimeVersion: '24.08',
	},
	win: {
		target: ['nsis', 'zip'],
		icon: 'public/assets/icon.ico',
	},
	nsis: {
		oneClick: true,
	},
	publish: null,
	extraMetadata: {
		main: 'dist-electron/main.js',
	},
	afterPack: async function removeUnneededFiles(context) {
		const { appOutDir, electronPlatformName } = context;

		const dirsToRemove = steamPrebuildsToRemove[electronPlatformName] ?? [];
		const steamBase = join(
			appOutDir, 'resources', 'app.asar.unpacked',
			'node_modules', 'steamworks-ffi-node', 'prebuilds',
		);

		await Promise.all([
			rm(join(appOutDir, 'LICENSES.chromium.html'), { force: true }),
			...dirsToRemove.map(dir => rm(join(steamBase, dir), { recursive: true, force: true })),
			...(electronPlatformName === 'linux'
				? [copyFile(join(__dirname, 'electron', 'launch.sh'), join(appOutDir, 'launch.sh'))]
				: []),
		]);
	},
};

export default config;
