import { ipcMain, app, type BrowserWindow } from 'electron';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import SteamworksSDK, { SteamInputType, LeaderboardSortMethod, LeaderboardDisplayType, LeaderboardDataRequest, LeaderboardUploadScoreMethod } from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
let steamInitialized = false;

function isSteamEnvironment(): boolean {
	// Steam sets SteamAppId when launching a game
	if (process.env['SteamAppId']) return true;

	// For development: check for steam_appid.txt next to the executable
	const exeDir = dirname(app.getPath('exe'));
	return existsSync(join(exeDir, 'steam_appid.txt'));
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

function pollSteamInput(): void {
	if (!steamInitialized || !actionSetHandle || !mainWindow) return;

	// Assign to local consts after the null guard so TypeScript narrows
	// inside the forEach callbacks without needing non-null assertions
	const setHandle = actionSetHandle;
	const win = mainWindow;

	const controllerHandles = steam.input.getConnectedControllers();
	const currentHandles = new Set(controllerHandles);

	controllerHandles.forEach(handle => {
		steam.input.activateActionSet(handle, setHandle);

		const prevButtonStates = previousStates.get(handle) ?? new Map<string, boolean>();
		const controllerType = mapSteamInputType(steam.input.getInputTypeForHandle(handle));

		digitalActionHandles.forEach(({ name, handle: actionHandle }) => {
			const { state: pressed } = steam.input.getDigitalActionData(handle, actionHandle);
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
	}
}

export function registerSteamHandlers(appId: number) {
	ipcMain.handle('steam:init', async () => {
		if (!isSteamEnvironment()) return false;

		try {
			steam.init({ appId });
			steamInitialized = true;
			// Required for async operations (leaderboards) to resolve
			setInterval(() => steam.runCallbacks(), 100);
			return true;
		} catch {
			return false;
		}
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

			const fetchTypeMap: Record<string, LeaderboardDataRequest> = {
				'global': LeaderboardDataRequest.Global,
				'around-user': LeaderboardDataRequest.GlobalAroundUser,
				'friends': LeaderboardDataRequest.Friends,
			};
			const dataRequest = fetchTypeMap[options.fetchType];
			if (dataRequest === undefined) return [];

			const handle = await getLeaderboardHandle(lb.name, lb.sort, lb.display);
			if (!handle) return [];

			const entries = await steam.leaderboards.downloadLeaderboardEntries(handle, dataRequest, options.rangeStart, options.rangeEnd);

			return entries.map(entry => ({
				rank: entry.globalRank,
				playerName: entry.steamId,
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
		if (!steamInitialized) return false;
		try {
			steam.input.init();

			actionSetHandle = steam.input.getActionSetHandle('GameControls');
			digitalActionHandles = STEAM_ACTION_NAMES.map(name => ({
				name,
				handle: steam.input.getDigitalActionHandle(name),
			}));

			inputPollInterval = setInterval(pollSteamInput, 16);
			return true;
		} catch {
			return false;
		}
	});

	ipcMain.handle('steam:shutdownInput', () => {
		shutdownSteamInput();
	});
}
