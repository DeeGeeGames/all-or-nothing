import { ipcMain, app, type BrowserWindow } from 'electron';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import SteamworksSDK, { SteamInputType } from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
let steamInitialized = false;

function isSteamEnvironment(): boolean {
	// Steam sets SteamAppId when launching a game
	if (process.env['SteamAppId']) return true;

	// For development: check for steam_appid.txt next to the executable
	const exeDir = dirname(app.getPath('exe'));
	return existsSync(join(exeDir, 'steam_appid.txt'));
}

// TODO: Replace with real leaderboard names once a Steam App ID is registered.
const STEAM_LEADERBOARD_NAMES = {
	score: 'Highscores',
	time: 'BestTimes',
	combo: 'MaxCombo',
} as const;

const SORT_METHODS = {
	score: 'Descending',
	time: 'Ascending',
	combo: 'Descending',
} as const;

const FETCH_TYPE_MAP = {
	global: 'Global',
	'around-user': 'GlobalAroundUser',
	friends: 'Friends',
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
let mainWindow: BrowserWindow | null = null;

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

	// Prune stale controller entries
	previousStates.forEach((_, handle) => {
		if (!currentHandles.has(handle)) {
			previousStates.delete(handle);
		}
	});
}

export function shutdownSteamInput(): void {
	if (inputPollInterval) {
		clearInterval(inputPollInterval);
		inputPollInterval = null;
	}
	previousStates.clear();
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
		if (!steamClient) return false;
		try {
			const results = await Promise.all([
				steamClient.leaderboard.uploadScore(STEAM_LEADERBOARD_NAMES.score, data.score, SORT_METHODS.score),
				steamClient.leaderboard.uploadScore(STEAM_LEADERBOARD_NAMES.time, data.time, SORT_METHODS.time),
				steamClient.leaderboard.uploadScore(STEAM_LEADERBOARD_NAMES.combo, data.maxCombo, SORT_METHODS.combo),
			]);
			return results.every(Boolean);
		} catch {
			return false;
		}
	});

	ipcMain.handle('steam:fetchLeaderboard', async (_event, options: { leaderboard: string; fetchType: string; rangeStart: number; rangeEnd: number }) => {
		if (!steamClient) return [];
		try {
			const boardKey = options.leaderboard as keyof typeof STEAM_LEADERBOARD_NAMES;
			const fetchKey = options.fetchType as keyof typeof FETCH_TYPE_MAP;
			const steamName = STEAM_LEADERBOARD_NAMES[boardKey];
			const fetchType = FETCH_TYPE_MAP[fetchKey];
			if (!steamName || !fetchType) return [];

			const entries = await steamClient.leaderboard.getScores(steamName, fetchType, options.rangeStart, options.rangeEnd);
			return entries.map(entry => ({
				rank: entry.globalRank,
				playerName: entry.steamId.personaName,
				score: entry.score,
			}));
		} catch {
			return [];
		}
	});

	ipcMain.handle('steam:getPlayerName', () => {
		if (!steamClient) return null;
		try {
			return steamClient.localplayer.getName();
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
