# Steam Glyph Support via steamworks-ffi-node Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `steamworks.js` with `steamworks-ffi-node` and use Steam's native glyph PNG API for controller button images when running on Steam, falling back to custom SVGs on other platforms.

**Architecture:** Main process uses `steamworks-ffi-node` singleton for all Steamworks APIs. On controller connect, it batch-resolves glyph PNGs for all 9 actions via `getDigitalActionOrigins` + `getGlyphPNGForActionOrigin`, converts to base64 data URLs, and sends the map to the renderer over IPC. A Jotai atom holds the glyph map; `ButtonPrompt` and `PlatformButton` check it before falling back to the existing SVG components.

**Tech Stack:** steamworks-ffi-node, Electron IPC, Jotai, React, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-22-steam-glyphs-design.md`

---

## Task 1: Swap dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove steamworks.js and add steamworks-ffi-node**

```bash
npm uninstall steamworks.js && npm install steamworks-ffi-node
```

- [ ] **Step 2: Verify installation**

```bash
node -e "const SDK = require('steamworks-ffi-node'); console.log(typeof SDK)"
```

Expected: prints `function` or `object` (confirms the module loads)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: swap steamworks.js for steamworks-ffi-node"
```

---

## Task 2: Rewrite steam-handlers.ts — initialization and shutdown

**Files:**
- Modify: `electron/steam-handlers.ts`

**Context:** The current file uses `steamworks.js` with `steamworks.init(appId)` returning a client object. steamworks-ffi-node uses a singleton `SteamworksSDK.getInstance()` with `steam.init({ appId })`. A `runCallbacks()` interval is required for async operations (leaderboards). The file also stores a `steamworksClient` and `steamClient` — these get replaced by the singleton.

- [ ] **Step 1: Replace imports and module-level state**

Replace the top of `electron/steam-handlers.ts`. Remove the `steamworks.js` type import, remove `steamClient` and `steamworksClient` variables. Add the steamworks-ffi-node singleton. Keep `isSteamEnvironment()` unchanged. Keep the Steam action name constants unchanged.

Remove:
```typescript
let steamClient: SteamClient | null = null;

// Steam Input state — uses mutable Maps for performance (polled at 60Hz)
type SteamworksClient = Omit<import('steamworks.js').Client, 'init' | 'runCallbacks'>;
let steamworksClient: SteamworksClient | null = null;
```

Remove the `SteamClient` interface (lines 73-85).

Add after the constants:
```typescript
import SteamworksSDK from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
let steamInitialized = false;
```

- [ ] **Step 2: Rewrite the `steam:init` handler**

Replace the `steam:init` IPC handler inside `registerSteamHandlers`. The new version:
```typescript
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
```

- [ ] **Step 3: Update `shutdownSteamInput` to use new API**

Replace `steamworksClient` references with `steam.input`:
```typescript
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
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: May have errors in other parts of the file (input polling, leaderboards) that still reference old API — that's fine, those are addressed in later tasks.

- [ ] **Step 5: Commit**

```bash
git add electron/steam-handlers.ts
git commit -m "refactor: replace steamworks.js init with steamworks-ffi-node singleton"
```

---

## Task 3: Rewrite steam-handlers.ts — input polling

**Files:**
- Modify: `electron/steam-handlers.ts`

**Context:** The current `pollSteamInput()` gets controllers as objects with methods (`.getHandle()`, `.getType()`, `.isDigitalActionPressed()`). In steamworks-ffi-node, `getConnectedControllers()` returns `bigint[]` handles, and you call methods on `steam.input` passing the handle as the first argument.

- [ ] **Step 1: Rewrite `mapSteamInputType` to accept the enum instead of a string**

steamworks-ffi-node returns `SteamInputType` enum values (numbers) from `getInputTypeForHandle()` instead of strings. Update the mapping:

```typescript
function mapSteamInputType(inputType: number): string {
	const mapping: Record<number, string> = {
		2: 'xbox',   // XBox360Controller
		3: 'xbox',   // XBoxOneController
		12: 'playstation', // PS3Controller
		5: 'playstation',  // PS4Controller
		13: 'playstation', // PS5Controller
		8: 'switch',  // SwitchJoyConPair
		9: 'switch',  // SwitchJoyConSingle
		10: 'switch', // SwitchProController
		1: 'steamdeck',  // SteamController
		14: 'steamdeck', // SteamDeckController
	};
	return mapping[inputType] ?? 'generic';
}
```

Note: Ideally import `SteamInputType` enum from steamworks-ffi-node and use its named values. Check what the library exports and prefer named enum values if available. The numeric mapping above is the fallback.

- [ ] **Step 2: Rewrite `pollSteamInput()`**

Replace the function body:
```typescript
function pollSteamInput(): void {
	if (!steamInitialized || !actionSetHandle || !mainWindow) return;

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
```

- [ ] **Step 3: Rewrite `steam:initInput` handler**

```typescript
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
```

- [ ] **Step 4: Update `steam:shutdownInput` handler**

This should already work since `shutdownSteamInput()` was updated in Task 2. Verify it compiles.

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: Leaderboard handlers may still have errors (addressed in Task 4). Input-related code should compile.

- [ ] **Step 6: Commit**

```bash
git add electron/steam-handlers.ts
git commit -m "refactor: rewrite Steam Input polling for steamworks-ffi-node API"
```

---

## Task 4: Rewrite steam-handlers.ts — leaderboards and player name

**Files:**
- Modify: `electron/steam-handlers.ts`

**Context:** steamworks-ffi-node leaderboards use a handle-based workflow: `findOrCreateLeaderboard()` returns a `LeaderboardInfo` with a `handle` bigint, then `uploadLeaderboardScore()` and `downloadLeaderboardEntries()` use that handle. Leaderboard handles should be cached. The sort/display enums come from the library.

- [ ] **Step 1: Add leaderboard handle cache and update constants**

Replace the `SORT_METHODS` and `FETCH_TYPE_MAP` constants. These previously used string values that matched steamworks.js; now they need to use steamworks-ffi-node's enum values. Check what enums the library exports (likely `LeaderboardSortMethod`, `LeaderboardDisplayType`, `LeaderboardDataRequest`).

Add a handle cache:
```typescript
const leaderboardHandles: Map<string, bigint> = new Map();
```

Add a helper to get or create a leaderboard handle:
```typescript
async function getLeaderboardHandle(name: string, sortMethod: number, displayType: number): Promise<bigint | null> {
	const cached = leaderboardHandles.get(name);
	if (cached !== undefined) return cached;

	const info = await steam.leaderboards.findOrCreateLeaderboard(name, sortMethod, displayType);
	if (!info) return null;

	leaderboardHandles.set(name, info.handle);
	return info.handle;
}
```

Update `STEAM_LEADERBOARD_NAMES` to include sort method and display type per leaderboard:
```typescript
const STEAM_LEADERBOARDS = {
	score: { name: 'Highscores', sort: 2, display: 1 },   // Descending, Numeric
	time: { name: 'BestTimes', sort: 1, display: 3 },     // Ascending, TimeMilliseconds
	combo: { name: 'MaxCombo', sort: 2, display: 1 },     // Descending, Numeric
} as const;
```

Note: Use the actual enum values from steamworks-ffi-node if available. The numeric values above match `LeaderboardSortMethod` and `LeaderboardDisplayType`.

- [ ] **Step 2: Rewrite `steam:submitScore` handler**

```typescript
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
				const result = await steam.leaderboards.uploadLeaderboardScore(handle, value, 1); // KeepBest
				return result?.success ?? false;
			})
		);

		return results.every(Boolean);
	} catch {
		return false;
	}
});
```

- [ ] **Step 3: Rewrite `steam:fetchLeaderboard` handler**

```typescript
ipcMain.handle('steam:fetchLeaderboard', async (_event, options: { leaderboard: string; fetchType: string; rangeStart: number; rangeEnd: number }) => {
	if (!steamInitialized) return [];
	try {
		const boardKey = options.leaderboard as keyof typeof STEAM_LEADERBOARDS;
		const lb = STEAM_LEADERBOARDS[boardKey];
		if (!lb) return [];

		const fetchTypeMap: Record<string, number> = {
			'global': 0,        // Global
			'around-user': 1,   // GlobalAroundUser
			'friends': 2,       // Friends
		};
		const dataRequest = fetchTypeMap[options.fetchType];
		if (dataRequest === undefined) return [];

		const handle = await getLeaderboardHandle(lb.name, lb.sort, lb.display);
		if (!handle) return [];

		const entries = await steam.leaderboards.downloadLeaderboardEntries(handle, dataRequest, options.rangeStart, options.rangeEnd);

		return entries.map(entry => ({
			rank: entry.globalRank,
			playerName: entry.steamId, // steamId string — persona name resolution TBD
			score: entry.score,
		}));
	} catch {
		return [];
	}
});
```

Note: steamworks-ffi-node's `LeaderboardEntry` has `steamId` as a string, not a persona name object. The `playerName` field may need to use the friends API to resolve persona names. For now, use steamId and note this as a follow-up. The leaderboard screen is not fully fleshed out per the user.

- [ ] **Step 4: Rewrite `steam:getPlayerName` handler**

Discover the actual method for the local player's persona name. Check `steam.friends` for a `getPersonaName()` method, or check the library's TypeScript types / docs. The current behavior returns a string from `steamClient.localplayer.getName()` — the new handler must return a string, not null.

```typescript
ipcMain.handle('steam:getPlayerName', () => {
	if (!steamInitialized) return null;
	try {
		return steam.friends.getPersonaName();
	} catch {
		return null;
	}
});
```

If `getPersonaName()` does not exist on `steam.friends`, check `steam.user` or search the library's type exports. This must return the player's display name — do not leave it as a null placeholder.

- [ ] **Step 5: Remove old `SORT_METHODS`, `FETCH_TYPE_MAP` constants and `SteamClient` interface**

Clean up any remaining references to the old API. The file should have no references to `steamClient`, `steamworksClient`, or `SteamClient`.

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: `electron/steam-handlers.ts` should compile cleanly.

- [ ] **Step 7: Commit**

```bash
git add electron/steam-handlers.ts
git commit -m "refactor: rewrite leaderboard and player name handlers for steamworks-ffi-node"
```

---

## Task 5: Add glyph resolution to main process

**Files:**
- Modify: `electron/steam-handlers.ts`

**Context:** When a new controller is detected during input polling, resolve glyph PNGs for all 9 actions. Use `getDigitalActionOrigins()` to get the `EInputActionOrigin` for each action, then `getGlyphPNGForActionOrigin()` to get the filesystem path, then read the file and convert to a base64 data URL. Send the full map to the renderer.

- [ ] **Step 1: Add glyph resolution imports and state**

Add `readFileSync` import at the top of the file:
```typescript
import { existsSync, readFileSync } from 'fs';
```
(`existsSync` is already imported — just add `readFileSync` to the existing import.)

Add state to track which controllers have had glyphs resolved:
```typescript
const resolvedGlyphControllers: Set<bigint> = new Set();
```

- [ ] **Step 2: Add glyph resolution function**

Add after the `mapSteamInputType` function:

```typescript
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
				return [action, `data:image/png;base64,${pngData.toString('base64')}`] as const;
			} catch {
				return null;
			}
		})
		.filter((entry): entry is readonly [string, string] => entry !== null);

	return entries.length > 0 ? Object.fromEntries(entries) : null;
}
```

- [ ] **Step 3: Integrate glyph resolution into `pollSteamInput`**

Add the following blocks **in this exact order** after the main `controllerHandles.forEach` input-polling loop. The ordering matters — the disconnect check must come before pruning, otherwise pruning empties `resolvedGlyphControllers` and the null notification never fires.

**Block 1 — Resolve glyphs for newly connected controllers:**
```typescript
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
```

**Block 2 — Send null glyph map when all controllers disconnect (before prune):**
```typescript
if (controllerHandles.length === 0 && resolvedGlyphControllers.size > 0) {
	resolvedGlyphControllers.clear();
	win.webContents.send('steam:glyphMap', { glyphs: null });
}
```

**Block 3 — Prune stale controller entries:**
```typescript
// Prune stale controller entries
previousStates.forEach((_, handle) => {
	if (!currentHandles.has(handle)) {
		previousStates.delete(handle);
		resolvedGlyphControllers.delete(handle);
	}
});
```

- [ ] **Step 4: Clear glyph state on shutdown**

Update `shutdownSteamInput`:
```typescript
resolvedGlyphControllers.clear();
```

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: Clean compile for `electron/steam-handlers.ts`.

- [ ] **Step 6: Commit**

```bash
git add electron/steam-handlers.ts
git commit -m "feat: resolve Steam glyph PNGs and send to renderer on controller connect"
```

---

## Task 6: Add glyph IPC to preload and type definitions

**Files:**
- Modify: `electron/preload.ts`
- Modify: `src/global.d.ts`

- [ ] **Step 1: Add `onGlyphMap` and `offGlyphMap` to preload**

Add to the `steam` object in `electron/preload.ts`, after `offInputEvent`:

```typescript
onGlyphMap: (callback: (data: { glyphs: Record<string, string> | null }) => void): void => {
	ipcRenderer.on('steam:glyphMap', (_event, data) => callback(data));
},
offGlyphMap: (): void => {
	ipcRenderer.removeAllListeners('steam:glyphMap');
},
```

- [ ] **Step 2: Update `ElectronSteamAPI` type in `global.d.ts`**

Add to the `ElectronSteamAPI` interface in `src/global.d.ts`:

```typescript
onGlyphMap(callback: (data: { glyphs: Record<string, string> | null }) => void): void;
offGlyphMap(): void;
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: Clean compile.

- [ ] **Step 4: Commit**

```bash
git add electron/preload.ts src/global.d.ts
git commit -m "feat: expose Steam glyph map IPC channel to renderer"
```

---

## Task 7: Add glyph atom and hook

**Files:**
- Modify: `src/atoms.ts`

- [ ] **Step 1: Add the steam glyph map atom**

Add after the `activeControllerAtom` / `forcedPlatformAtom` section in `src/atoms.ts`:

```typescript
const steamGlyphMapAtom = atom<Readonly<Record<string, string>> | null>(null);

export
function useSteamGlyphMap() {
	return useAtomValue(steamGlyphMapAtom);
}

export
function useSetSteamGlyphMap() {
	return useSetAtom(steamGlyphMapAtom);
}
```

The atom is keyed by `InputAction` string values (e.g., `'SELECT'`, `'BACK'`) and holds base64 data URLs.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add src/atoms.ts
git commit -m "feat: add Jotai atom for Steam glyph map"
```

---

## Task 8: Wire glyph listener into SteamInputManager and hook

**Files:**
- Modify: `src/input/steam-input-manager.ts`
- Modify: `src/input/input-hooks.ts`

- [ ] **Step 1: Add glyph listener support to SteamInputManager**

Add a glyph callback type and registration to `SteamInputManager`:

```typescript
type GlyphListener = (glyphs: Readonly<Record<string, string>> | null) => void;
```

Add to the class:
```typescript
private glyphListeners: GlyphListener[] = [];
```

In the `init()` method, after the `api.onInputEvent(...)` call, add:
```typescript
api.onGlyphMap((data) => {
	this.glyphListeners.forEach(listener => listener(data.glyphs));
});
```

In `destroy()`, add before `this.listeners = []`:
```typescript
api.offGlyphMap();
this.glyphListeners = [];
```

Add methods:
```typescript
public addGlyphListener(listener: GlyphListener): this {
	this.glyphListeners.push(listener);
	return this;
}

public removeGlyphListener(listener: GlyphListener): this {
	this.glyphListeners = this.glyphListeners.filter(l => l !== listener);
	return this;
}
```

- [ ] **Step 2: Wire glyph listener in `useSteamInputManager` hook**

Update `useSteamInputManager` in `src/input/input-hooks.ts` to accept an optional glyph callback and register it with the manager.

Update the function signature:
```typescript
function useSteamInputManager(
	listener: InputListener,
	onGlyphs?: (glyphs: Readonly<Record<string, string>> | null) => void,
): void {
```

Add a ref for the glyph callback (alongside `listenerRef`):
```typescript
const glyphRef = useRef(onGlyphs);

useEffect(() => {
	glyphRef.current = onGlyphs;
}, [onGlyphs]);

const stableGlyphListener = useCallback((glyphs: Readonly<Record<string, string>> | null) => {
	glyphRef.current?.(glyphs);
}, []);
```

In the effect, after `manager.addListener(stableListener)`, add:
```typescript
manager.addGlyphListener(stableGlyphListener);
```

In the cleanup, after `manager.removeListener(stableListener)`, add:
```typescript
manager.removeGlyphListener(stableGlyphListener);
```

- [ ] **Step 3: Update the call site in `src/app.tsx`**

Find where `useSteamInputManager` is called and pass the glyph setter. Read `src/app.tsx` to find the exact call site. It will look something like:

```typescript
const setSteamGlyphMap = useSetSteamGlyphMap();
useSteamInputManager(handleInput, setSteamGlyphMap);
```

Import `useSetSteamGlyphMap` from `@/atoms`.

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: Clean compile.

- [ ] **Step 5: Commit**

```bash
git add src/input/steam-input-manager.ts src/input/input-hooks.ts src/app.tsx
git commit -m "feat: wire Steam glyph map IPC through manager and hook to Jotai atom"
```

---

## Task 9: Update ButtonPrompt and PlatformButton to render Steam glyphs

**Files:**
- Modify: `src/components/button-prompts/index.tsx`
- Modify: `src/components/platform-button.tsx`

- [ ] **Step 1: Update `ButtonPrompt` to check Steam glyphs first**

In `src/components/button-prompts/index.tsx`, import the glyph hook:
```typescript
import { useSteamGlyphMap } from '@/atoms';
```

Update the `ButtonPrompt` function body:
```typescript
export function ButtonPrompt({ action, controllerType, label }: ButtonPromptProps) {
	const steamGlyphs = useSteamGlyphMap();
	const steamGlyphUrl = steamGlyphs?.[action];
	const GlyphComponent = ButtonGlyphMap[controllerType]?.[action];
	const buttonLabel = ControllerButtonLabels[controllerType][action];

	if (!steamGlyphUrl && !GlyphComponent) return null;

	const glyphElement = steamGlyphUrl
		? <img src={steamGlyphUrl} width={28} height={28} alt={buttonLabel} style={{ display: 'block' }} />
		: GlyphComponent
			? <GlyphComponent width={28} height={28} viewBox="0 0 64 64" aria-label={buttonLabel} style={{ display: 'block' }} />
			: null;

	return (
		<Stack direction="row" spacing={0.5} alignItems="center">
			{glyphElement}
			<Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.7)' }}>
				{label}
			</Typography>
		</Stack>
	);
}
```

- [ ] **Step 2: Update `PlatformButton` to check Steam glyphs first**

In `src/components/platform-button.tsx`, import the glyph hook:
```typescript
import { useActiveController, useSteamGlyphMap } from '@/atoms';
```

Update the function body:
```typescript
export default
function PlatformButton({ label, action, onClick, disabled = false }: Props) {
	const activeController = useActiveController();
	const steamGlyphs = useSteamGlyphMap();
	const steamGlyphUrl = steamGlyphs?.[action];

	if (!activeController) {
		return null;
	}

	const GlyphComponent = ButtonGlyphMap[activeController]?.[action];

	if (!steamGlyphUrl && !GlyphComponent) {
		return null;
	}

	const glyphElement = steamGlyphUrl
		? <img src={steamGlyphUrl} width={40} height={40} alt={label} style={{ display: 'block' }} />
		: GlyphComponent
			? <GlyphComponent
				width={40}
				height={40}
				viewBox="0 0 64 64"
				display="block"
				style={activeController === ControllerType.KEYBOARD ? keyboardGlyphStyle : undefined}
			/>
			: null;

	return (
		<Button
			size="large"
			variant="text"
			onClick={onClick}
			startIcon={glyphElement}
			disabled={disabled}
		>
			{label}
		</Button>
	);
}
```

- [ ] **Step 3: Update `MultiplayerButtonPrompts`**

In `src/components/screens/multiplayer-game-screen/multiplayer-button-prompts.tsx`, import the glyph hook:
```typescript
import { useSteamGlyphMap } from '@/atoms';
```

Inside the component, add:
```typescript
const steamGlyphs = useSteamGlyphMap();
```

Update the glyph rendering inside the map. When Steam glyphs are available, render the Steam glyph once (not per controller type) to avoid duplicates:
```typescript
{(() => {
	const steamGlyphUrl = steamGlyphs?.[action];
	if (steamGlyphUrl) {
		return <img src={steamGlyphUrl} width={40} height={40} alt={label} style={{ display: 'block' }} />;
	}
	return uniqueTypes.map(type => {
		const GlyphComponent = ButtonGlyphMap[type]?.[action];
		if (!GlyphComponent) return null;
		return (
			<GlyphComponent
				key={type}
				width={40}
				height={40}
				viewBox="0 0 64 64"
				style={type === ControllerType.KEYBOARD ? keyboardGlyphStyle : undefined}
			/>
		);
	});
})()}
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: Clean compile.

- [ ] **Step 5: Commit**

```bash
git add src/components/button-prompts/index.tsx src/components/platform-button.tsx src/components/screens/multiplayer-game-screen/multiplayer-button-prompts.tsx
git commit -m "feat: render Steam glyph PNGs with fallback to custom SVGs"
```

---

## Task 10: Manual verification and cleanup

- [ ] **Step 1: Run full typecheck**

```bash
npm run typecheck
```

Expected: Clean compile, no errors.

- [ ] **Step 2: Run dev build**

```bash
npm run build
```

Expected: Successful build.

- [ ] **Step 3: Verify electron build**

```bash
npm run build:electron
```

Expected: Successful build.

- [ ] **Step 4: Verify no remaining references to steamworks.js**

Search for any leftover references to the old library:

```bash
grep -r "steamworks\.js" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules .
```

Expected: No results (only in docs/specs is acceptable).

- [ ] **Step 5: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore: clean up remaining steamworks.js references"
```
