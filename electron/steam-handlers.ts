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

const CLOUD_SAVE_FILE = 'savegame.json';

function isCloudAvailable(): boolean {
	return steam.cloud.isCloudEnabledForAccount() && steam.cloud.isCloudEnabledForApp();
}

// Cloud subsystem may need multiple callback cycles after init to populate.
// Poll with callback flushes until available or timeout, then resolve regardless:
// fileRead/fileWrite may still succeed even when isCloudAvailable() reports false
// (e.g. when retryRemoteStorageInterface populated the interface pointer manually,
// or Steam serves a cached copy). Returns void deliberately — callers must not bail.
function waitForCloud(maxAttempts = 10, intervalMs = 50): Promise<void> {
	if (isCloudAvailable()) return Promise.resolve();

	return new Promise(resolve => {
		let attempts = 0;
		const poll = setInterval(() => {
			steam.runCallbacks();
			attempts++;
			if (isCloudAvailable() || attempts >= maxAttempts) {
				clearInterval(poll);
				resolve();
			}
		}, intervalMs);
	});
}

// Single chokepoint for cloud file ops: gates on steamInitialized, waits for the
// cloud subsystem, then runs the op. Use this for any new cloud handler so the
// "do I bail on !cloudAvailable?" question can't be answered wrong.
async function withCloud<T>(notReady: T, op: () => T): Promise<T> {
	if (!steamInitialized) return notReady;
	await waitForCloud();
	return op();
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
	score: { name: 'Highscores_v3', sort: LeaderboardSortMethod.Descending, display: LeaderboardDisplayType.Numeric },
	time: { name: 'BestTimes_v3', sort: LeaderboardSortMethod.Ascending, display: LeaderboardDisplayType.TimeMilliseconds },
	combo: { name: 'MaxCombo_v3', sort: LeaderboardSortMethod.Descending, display: LeaderboardDisplayType.Numeric },
	fastestMatch: { name: 'FastestMatch_v3', sort: LeaderboardSortMethod.Ascending, display: LeaderboardDisplayType.TimeSeconds },
} as const;

const FETCH_TYPE_MAP: Readonly<Record<string, LeaderboardDataRequest>> = {
	'global': LeaderboardDataRequest.Global,
	'around-user': LeaderboardDataRequest.GlobalAroundUser,
	'friends': LeaderboardDataRequest.Friends,
};

function getISOWeek(date: Date): { year: number; week: number } {
	const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	// Set to nearest Thursday (ISO weeks start on Monday, week 1 contains Jan 4)
	target.setUTCDate(target.getUTCDate() + 3 - ((target.getUTCDay() + 6) % 7));
	const jan4 = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
	const week = 1 + Math.round(((target.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
	return { year: target.getUTCFullYear(), week };
}

function getCurrentMonthSuffix(): string {
	const now = new Date();
	return `Monthly_${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getCurrentWeekSuffix(): string {
	const { year, week } = getISOWeek(new Date());
	return `Weekly_${year}W${String(week).padStart(2, '0')}`;
}

const PERIOD_SUFFIX_RESOLVERS: Readonly<Record<string, (() => string) | null>> = {
	'alltime': null,
	'monthly': getCurrentMonthSuffix,
	'weekly': getCurrentWeekSuffix,
};

function resolveBoardName(baseName: string, period: string): string {
	const resolver = PERIOD_SUFFIX_RESOLVERS[period];
	return resolver ? `${baseName}_${resolver()}` : baseName;
}

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
const loggedControllers: Set<bigint> = new Set();
let firstPressLogged = false;

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

	steam.input.runFrame();

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

		if (!loggedControllers.has(handle)) {
			loggedControllers.add(handle);
			const snapshot = digitalActionHandles.map(({ name, handle: actionHandle }) => {
				const data = steam.input.getDigitalActionData(handle, actionHandle);
				return { name, state: data.state, active: data.active };
			});
			debugLog(`pollSteamInput: controller ${handle.toString()} type=${controllerType} firstSnapshot=${JSON.stringify(snapshot)}`);
		}

		digitalActionHandles.forEach(({ name, handle: actionHandle }) => {
			const { state: pressed } = steam.input.getDigitalActionData(handle, actionHandle);
			const wasPressed = prevButtonStates.get(name) ?? false;

			if (pressed && !wasPressed) {
				const action = STEAM_ACTION_TO_INPUT_ACTION[name];
				if (action) {
					if (!firstPressLogged) {
						firstPressLogged = true;
						debugLog(`pollSteamInput: first press observed action=${action} controller=${handle.toString()}`);
					}
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
	loggedControllers.clear();
	firstPressLogged = false;
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

// steamworks-ffi-node caches the ISteamRemoteStorage interface pointer during
// init(). On some machines the subsystem isn't ready yet, leaving a null pointer
// cached forever. This function reaches into the library internals to re-acquire
// the pointer after additional callback cycles.
function retryRemoteStorageInterface(): boolean {
	const sdk = steam as unknown as Record<string, unknown>;
	const apiCore = sdk['apiCore'];
	const loader = sdk['libraryLoader'];

	if (
		typeof apiCore !== 'object' || apiCore === null ||
		typeof loader !== 'object' || loader === null
	) return false;

	const core = apiCore as Record<string, unknown>;
	const lib = loader as Record<string, unknown>;
	const acquireFn = lib['SteamAPI_SteamRemoteStorage_v016'];

	if (typeof acquireFn !== 'function') return false;

	const iface: unknown = acquireFn();
	if (iface !== null && iface !== undefined) {
		core['remoteStorageInterface'] = iface;
		return isCloudAvailable();
	}

	return false;
}

function ensureSteamInitialized(appId: number): boolean {
	if (steamInitialized) return true;

	if (!isSteamEnvironment()) return false;

	try {
		const initResult = steam.init({ appId });
		if (!initResult) {
			debugLog('steam.init failed — SDK library not found or Steam not running');
			return false;
		}
		steam.runCallbacks();

		if (!isCloudAvailable()) {
			for (let attempt = 1; attempt <= 5; attempt++) {
				steam.runCallbacks();
				if (retryRemoteStorageInterface()) {
					debugLog(`cloud available after ${attempt} retry(s)`);
					break;
				}
			}
		}

		steamInitialized = true;
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

	ipcMain.handle('steam:submitScore', async (_event, data: { score: number; time: number; maxCombo: number; fastestMatch: number }) => {
		if (!steamInitialized) return false;
		try {
			const metrics = [
				{ key: 'score' as const, value: data.score },
				{ key: 'time' as const, value: data.time },
				{ key: 'combo' as const, value: data.maxCombo },
				...(data.fastestMatch > 0 ? [{ key: 'fastestMatch' as const, value: data.fastestMatch }] : []),
			];
			const periods = Object.keys(PERIOD_SUFFIX_RESOLVERS);

			const results = await Promise.allSettled(
				metrics.flatMap(({ key, value }) => {
					const lb = STEAM_LEADERBOARDS[key];
					return periods.map(async (period) => {
						const boardName = resolveBoardName(lb.name, period);
						const handle = await getLeaderboardHandle(boardName, lb.sort, lb.display);
						if (!handle) return false;
						const result = await steam.leaderboards.uploadScore(handle, value, LeaderboardUploadScoreMethod.KeepBest);
						return result?.success ?? false;
					});
				})
			);

			return results.every(r => r.status === 'fulfilled' && r.value);
		} catch {
			return false;
		}
	});

	ipcMain.handle('steam:fetchLeaderboard', async (_event, options: { leaderboard: string; fetchType: string; period: string; rangeStart: number; rangeEnd: number }) => {
		if (!steamInitialized) return [];
		try {
			const boardKey = options.leaderboard as keyof typeof STEAM_LEADERBOARDS;
			const lb = STEAM_LEADERBOARDS[boardKey];
			if (!lb) return [];

			const dataRequest = FETCH_TYPE_MAP[options.fetchType];
			if (dataRequest === undefined) return [];

			const boardName = resolveBoardName(lb.name, options.period ?? 'alltime');
			const handle = await getLeaderboardHandle(boardName, lb.sort, lb.display);
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

	ipcMain.on('steam:activateOverlay', () => {
		if (!steamInitialized) return;
		try {
			steam.overlay.activateGameOverlay('');
		} catch { /* overlay may be disabled */ }
	});

	ipcMain.handle('steam:initInput', () => {
		if (!ensureSteamInitialized(appId)) return false;
		try {
			// Re-enabled to retest Steam Input now that the Steamworks SDK is actually
			// bundled into packaged builds (electron-builder.config.ts asarUnpack). Prior
			// "unpublished IGA" diagnostics were collected when the SDK load path was
			// inconsistent, so they may not have reflected the real failure mode.
			const manifestPath = app.isPackaged
				? join(exeDir, 'controller_config', 'game_actions.vdf')
				: join(app.getAppPath(), 'steam', 'controller_config', 'game_actions.vdf');
			debugLog(`initInput: manifestPath=${manifestPath} exists=${existsSync(manifestPath)}`);
			const manifestSet = steam.input.setInputActionManifestFilePath(manifestPath);
			debugLog(`initInput: setInputActionManifestFilePath returned ${manifestSet}`);

			steam.input.init(true);
			debugLog('initInput: steam.input.init(true) completed');

			actionSetHandle = steam.input.getActionSetHandle('GameControls');
			digitalActionHandles = STEAM_ACTION_NAMES.map(name => ({
				name,
				handle: steam.input.getDigitalActionHandle(name),
			}));
			debugLog(`initInput: actionSetHandle=${actionSetHandle}`);
			debugLog(`initInput: digitalActionHandles=${JSON.stringify(digitalActionHandles.map(({ name, handle }) => ({ name, handle: handle.toString() })))}`);

			inputPollInterval = setInterval(pollSteamInput, 16);
			return true;
		} catch (e) {
			debugLog(`initInput: threw ${e}`);
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

	ipcMain.handle('steam:cloudSave', (_event, json: string) =>
		withCloud(false, () =>
			steam.cloud.fileWrite(CLOUD_SAVE_FILE, Buffer.from(json, 'utf8'))
		)
	);

	ipcMain.handle('steam:cloudLoad', () =>
		withCloud<string | null>(null, () => {
			const result = steam.cloud.fileRead(CLOUD_SAVE_FILE);
			if (!result.success || !result.data) return null;
			return result.data.toString('utf8');
		})
	);
}
