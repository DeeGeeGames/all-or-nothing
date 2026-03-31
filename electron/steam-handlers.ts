import { ipcMain, app, type BrowserWindow } from 'electron';
import { existsSync, readFileSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';

let debugLogPath: string | null = null;
function debugLog(msg: string): void {
	if (!debugLogPath) {
		debugLogPath = join(app.getPath('userData'), 'steam-input-debug.log');
	}
	const line = `[${new Date().toISOString()}] ${msg}\n`;
	try { appendFileSync(debugLogPath, line); } catch { /* best effort */ }
}
import { SteamworksSDK, SteamInputType, LeaderboardSortMethod, LeaderboardDisplayType, LeaderboardDataRequest, LeaderboardUploadScoreMethod } from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
let steamInitialized = false;
let callbackInterval: ReturnType<typeof setInterval> | null = null;

const exeDir = dirname(app.getPath('exe'));

function isSteamEnvironment(): boolean {
	if (process.env['SteamAppId']) return true;

	return existsSync(join(exeDir, 'steam_appid.txt'));
}

function isCloudAvailable(): boolean {
	return steam.cloud.isCloudEnabledForAccount() && steam.cloud.isCloudEnabledForApp();
}

const leaderboardHandles: Map<string, bigint> = new Map();

async function getLeaderboardHandle(name: string, sortMethod: LeaderboardSortMethod, displayType: LeaderboardDisplayType): Promise<bigint | null> {
	const cached = leaderboardHandles.get(name);
	if (cached !== undefined) return cached;

	const info = await steam.leaderboards.findOrCreateLeaderboard(name, sortMethod, displayType);
	if (!info) return null;

	leaderboardHandles.set(name, info.handle);
	return info.handle;
}

const STEAM_LEADERBOARDS = {
	score: { name: 'Highscores', sort: LeaderboardSortMethod.Descending, display: LeaderboardDisplayType.Numeric },
	time: { name: 'BestTimes', sort: LeaderboardSortMethod.Ascending, display: LeaderboardDisplayType.TimeMilliseconds },
	combo: { name: 'MaxCombo', sort: LeaderboardSortMethod.Descending, display: LeaderboardDisplayType.Numeric },
} as const;

const FETCH_TYPE_MAP: Readonly<Record<string, LeaderboardDataRequest>> = {
	'global': LeaderboardDataRequest.Global,
	'around-user': LeaderboardDataRequest.GlobalAroundUser,
	'friends': LeaderboardDataRequest.Friends,
};

const STEAM_ACTION_NAMES = [
	'select',
	'back',
	'hint',
	'shuffle',
	'pause',
	'navigate_up',
	'navigate_down',
	'navigate_left',
	'navigate_right',
] as const;

const STEAM_ACTION_TO_INPUT_ACTION: Record<string, string> = {
	select: 'SELECT',
	back: 'BACK',
	hint: 'HINT',
	shuffle: 'SHUFFLE',
	pause: 'PAUSE',
	navigate_up: 'NAVIGATE_UP',
	navigate_down: 'NAVIGATE_DOWN',
	navigate_left: 'NAVIGATE_LEFT',
	navigate_right: 'NAVIGATE_RIGHT',
};

function mapSteamInputType(inputType: SteamInputType): string {
	const mapping: Partial<Record<SteamInputType, string>> = {
		[SteamInputType.XBox360Controller]: 'xbox',
		[SteamInputType.XBoxOneController]: 'xbox',
		[SteamInputType.PS3Controller]: 'playstation',
		[SteamInputType.PS4Controller]: 'playstation',
		[SteamInputType.PS5Controller]: 'playstation',
		[SteamInputType.SwitchJoyConPair]: 'switch',
		[SteamInputType.SwitchJoyConSingle]: 'switch',
		[SteamInputType.SwitchProController]: 'switch',
		[SteamInputType.SteamController]: 'steamdeck',
		[SteamInputType.SteamDeckController]: 'steamdeck',
	};
	return mapping[inputType] ?? 'generic';
}

// Steam Input state — uses mutable Maps for performance (polled at 60Hz)
let inputPollInterval: ReturnType<typeof setInterval> | null = null;
let actionSetHandle: bigint | null = null;
let digitalActionHandles: ReadonlyArray<{ name: string; handle: bigint }> = [];
const previousStates: Map<bigint, Map<string, boolean>> = new Map();
const resolvedGlyphControllers: Set<bigint> = new Set();
let mainWindow: BrowserWindow | null = null;

function resolveGlyphs(): Record<string, string> | null {
	if (!actionSetHandle) return null;

	const controllers = steam.input.getConnectedControllers();
	const controller = controllers[0];
	if (!controller) return null;

	const setHandle = actionSetHandle;

	const entries = digitalActionHandles
		.map(({ name, handle: actionHandle }) => {
			const action = STEAM_ACTION_TO_INPUT_ACTION[name];
			if (!action) return null;

			const origins = steam.input.getDigitalActionOrigins(controller, setHandle, actionHandle);
			const origin = origins[0];
			if (origin === undefined) return null;

			const pngPath = steam.input.getGlyphPNGForActionOrigin(origin, 1, 0); // Medium size, no flags
			if (!pngPath) return null;

			try {
				const pngData = readFileSync(pngPath);
				return [action, `data:image/png;base64,${pngData.toString('base64')}`] as [string, string];
			} catch {
				return null;
			}
		})
		.filter((entry): entry is [string, string] => entry !== null);

	return entries.length > 0 ? Object.fromEntries(entries) : null;
}

export function setSteamInputWindow(win: BrowserWindow): void {
	mainWindow = win;
}

let pollDebugCountdown = 0;

function pollSteamInput(): void {
	if (!steamInitialized || !actionSetHandle || !mainWindow) return;

	steam.input.runFrame();

	// Assign to local consts after the null guard so TypeScript narrows
	// inside the forEach callbacks without needing non-null assertions
	const setHandle = actionSetHandle;
	const win = mainWindow;

	const controllerHandles = steam.input.getConnectedControllers();
	const currentHandles = new Set(controllerHandles);

	// Log once per second for debugging
	const shouldLog = pollDebugCountdown <= 0;
	if (shouldLog) pollDebugCountdown = 60;
	pollDebugCountdown--;

	if (shouldLog) {
		debugLog(`controllers: ${controllerHandles.length}, handles: [${controllerHandles.join(', ')}]`);
	}

	controllerHandles.forEach(handle => {
		steam.input.activateActionSet(handle, setHandle);

		if (shouldLog) {
			const currentSet = steam.input.getCurrentActionSet(handle);
			const inputType = steam.input.getInputTypeForHandle(handle);
			const selectOrigins = digitalActionHandles[0]
				? steam.input.getDigitalActionOrigins(handle, setHandle, digitalActionHandles[0].handle)
				: [];
			debugLog(`controller ${handle}: type=${inputType} (${mapSteamInputType(inputType)}), currentActionSet=${currentSet}, expectedActionSet=${setHandle}, selectOrigins=[${selectOrigins.join(', ')}]`);
		}

		const prevButtonStates = previousStates.get(handle) ?? new Map<string, boolean>();
		const controllerType = mapSteamInputType(steam.input.getInputTypeForHandle(handle));

		digitalActionHandles.forEach(({ name, handle: actionHandle }) => {
			const actionData = steam.input.getDigitalActionData(handle, actionHandle);
			const { state: pressed } = actionData;

			if (shouldLog && name === 'select') {
				debugLog(`"select" data: ${JSON.stringify(actionData)}`);
			}
			const wasPressed = prevButtonStates.get(name) ?? false;

			if (pressed && !wasPressed) {
				const action = STEAM_ACTION_TO_INPUT_ACTION[name];
				if (action) {
					win.webContents.send('steam:inputEvent', {
						action,
						controllerType,
					});
				}
			}

			prevButtonStates.set(name, pressed);
		});

		previousStates.set(handle, prevButtonStates);
	});

	// Resolve glyphs for newly connected controllers
	controllerHandles.forEach(handle => {
		if (!resolvedGlyphControllers.has(handle)) {
			resolvedGlyphControllers.add(handle);
			const glyphs = resolveGlyphs();
			if (glyphs) {
				win.webContents.send('steam:glyphMap', { glyphs });
			}
		}
	});

	if (controllerHandles.length === 0 && resolvedGlyphControllers.size > 0) {
		resolvedGlyphControllers.clear();
		win.webContents.send('steam:glyphMap', { glyphs: null });
	}

	// Prune stale controller entries
	previousStates.forEach((_, handle) => {
		if (!currentHandles.has(handle)) {
			previousStates.delete(handle);
			resolvedGlyphControllers.delete(handle);
		}
	});
}

export function shutdownSteamInput(): void {
	if (inputPollInterval) {
		clearInterval(inputPollInterval);
		inputPollInterval = null;
	}
	previousStates.clear();
	resolvedGlyphControllers.clear();
	if (steamInitialized) {
		try {
			steam.input.shutdown();
		} catch {
			// Best-effort — Steam cleans up on process exit
		}
		try {
			steam.shutdown();
		} catch {
			// Best-effort — Steam cleans up on process exit
		}
		if (callbackInterval) {
			clearInterval(callbackInterval);
			callbackInterval = null;
		}
		steamInitialized = false;
	}
}

function ensureSteamInitialized(appId: number): boolean {
	if (steamInitialized) return true;

	debugLog(`ensureSteamInitialized: isSteamEnvironment: ${isSteamEnvironment()}, SteamAppId env: ${process.env['SteamAppId'] ?? 'undefined'}`);
	if (!isSteamEnvironment()) return false;

	try {
		steam.init({ appId });
		steamInitialized = true;
		debugLog('steam.init succeeded');
		if (callbackInterval) clearInterval(callbackInterval);
		// Required for async operations (leaderboards) to resolve
		callbackInterval = setInterval(() => steam.runCallbacks(), 100);
		return true;
	} catch (e) {
		debugLog(`steam.init failed: ${e}`);
		return false;
	}
}

export function registerSteamHandlers(appId: number) {
	ipcMain.handle('steam:init', () => {
		return ensureSteamInitialized(appId);
	});

	ipcMain.handle('steam:submitScore', async (_event, data: { score: number; time: number; maxCombo: number }) => {
		if (!steamInitialized) return false;
		try {
			const entries = [
				{ key: 'score' as const, value: data.score },
				{ key: 'time' as const, value: data.time },
				{ key: 'combo' as const, value: data.maxCombo },
			];

			const results = await Promise.all(
				entries.map(async ({ key, value }) => {
					const lb = STEAM_LEADERBOARDS[key];
					const handle = await getLeaderboardHandle(lb.name, lb.sort, lb.display);
					if (!handle) return false;
					const result = await steam.leaderboards.uploadScore(handle, value, LeaderboardUploadScoreMethod.KeepBest);
					return result?.success ?? false;
				})
			);

			return results.every(Boolean);
		} catch {
			return false;
		}
	});

	ipcMain.handle('steam:fetchLeaderboard', async (_event, options: { leaderboard: string; fetchType: string; rangeStart: number; rangeEnd: number }) => {
		if (!steamInitialized) return [];
		try {
			const boardKey = options.leaderboard as keyof typeof STEAM_LEADERBOARDS;
			const lb = STEAM_LEADERBOARDS[boardKey];
			if (!lb) return [];

			const dataRequest = FETCH_TYPE_MAP[options.fetchType];
			if (dataRequest === undefined) return [];

			const handle = await getLeaderboardHandle(lb.name, lb.sort, lb.display);
			if (!handle) return [];

			const entries = await steam.leaderboards.downloadLeaderboardEntries(handle, dataRequest, options.rangeStart, options.rangeEnd);

			return entries.map(entry => ({
				rank: entry.globalRank,
				playerName: steam.friends.getFriendPersonaName(entry.steamId) || entry.steamId,
				score: entry.score,
			}));
		} catch {
			return [];
		}
	});

	ipcMain.handle('steam:getPlayerName', () => {
		if (!steamInitialized) return null;
		try {
			return steam.friends.getPersonaName();
		} catch {
			return null;
		}
	});

	ipcMain.handle('steam:initInput', () => {
		if (!ensureSteamInitialized(appId)) return false;
		try {
			// NOTE: setInputActionManifestFilePath was attempted here but produced 0 handles
			// for all actions, likely because the game is unpublished. The IGA and default
			// configurations must be published on the Steamworks partner site for Steam Input
			// to work. If Steam Input still doesn't work after publishing, re-enable this:
			//
			//   const manifestPath = app.isPackaged
			//     ? join(exeDir, 'controller_config', 'game_actions.vdf')
			//     : join(app.getAppPath(), 'steam', 'controller_config', 'game_actions.vdf');
			//   steam.input.setInputActionManifestFilePath(manifestPath);
			//
			// Diagnostics from pre-publish testing (2026-03-27):
			// - Without manifest call: handles valid (1-9), active:true, origins bound,
			//   but state always false — Steam partially loads draft IGA but doesn't
			//   forward actual button data for unpublished titles.
			// - With manifest call: set returns true, file exists, but all handles are 0.
			// - Generic gamepad template works because it bypasses Steam Input entirely
			//   and emits XInput events to the browser Gamepad API.

			steam.input.init(true);

			actionSetHandle = steam.input.getActionSetHandle('GameControls');
			digitalActionHandles = STEAM_ACTION_NAMES.map(name => ({
				name,
				handle: steam.input.getDigitalActionHandle(name),
			}));

			debugLog(`actionSetHandle: ${actionSetHandle}`);
			digitalActionHandles.forEach(({ name, handle }) => {
				debugLog(`action "${name}" handle: ${handle}`);
			});

			inputPollInterval = setInterval(pollSteamInput, 16);
			return true;
		} catch {
			return false;
		}
	});

	ipcMain.handle('steam:shutdownInput', () => {
		shutdownSteamInput();
	});

	ipcMain.handle('steam:activateAchievement', async (_event, achievementId: string) => {
		if (!steamInitialized) return false;
		try {
			return await steam.achievements.unlockAchievement(achievementId);
		} catch {
			return false;
		}
	});

	ipcMain.handle('steam:cloudSave', (_event, json: string) => {
		debugLog(`cloudSave: initialized=${steamInitialized}, accountCloud=${steamInitialized && steam.cloud.isCloudEnabledForAccount()}, appCloud=${steamInitialized && steam.cloud.isCloudEnabledForApp()}, bytes=${json.length}`);
		if (!steamInitialized || !isCloudAvailable()) return false;
		const result = steam.cloud.fileWrite('savegame.json', Buffer.from(json, 'utf8'));
		debugLog(`cloudSave: fileWrite result=${result}`);
		return result;
	});

	ipcMain.handle('steam:cloudLoad', () => {
		debugLog(`cloudLoad: initialized=${steamInitialized}, accountCloud=${steamInitialized && steam.cloud.isCloudEnabledForAccount()}, appCloud=${steamInitialized && steam.cloud.isCloudEnabledForApp()}`);
		if (!steamInitialized || !isCloudAvailable()) return null;
		const result = steam.cloud.fileRead('savegame.json');
		debugLog(`cloudLoad: success=${result.success}, bytesRead=${result.bytesRead}`);
		if (!result.success || !result.data) return null;
		return result.data.toString('utf8');
	});
}
