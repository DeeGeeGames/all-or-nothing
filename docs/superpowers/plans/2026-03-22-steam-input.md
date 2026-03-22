# Steam Input Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Steam Input API support to fix the double-input bug on Steam and earn the Steam Input support declaration.

**Architecture:** The Electron main process polls Steam Input via `steamworks.js`'s `input` namespace at ~60Hz, forwarding rising-edge button events to the renderer via IPC. A new `SteamInputManager` in the renderer receives these events and emits them as standard `InputEvent` objects. When Steam Input is active, the raw Gamepad API (`GamepadManager`) is disabled to prevent duplicate input.

**Tech Stack:** steamworks.js, Electron IPC, React hooks, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-22-steam-input-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `steam/controller_config/game_actions.vdf` | Create | IGA file defining the `GameControls` action set with 9 digital actions |
| `electron/steam-handlers.ts` | Modify | Add Steam Input init/shutdown IPC handlers, poll loop, controller type mapping |
| `electron/main.ts` | Modify | Add `before-quit` handler for `input.shutdown()` safety net |
| `electron/preload.ts` | Modify | Expose 4 new Steam Input IPC methods to renderer |
| `src/global.d.ts` | Modify | Extend `ElectronSteamAPI` with input method types |
| `src/input/steam-input-manager.ts` | Create | Renderer-side manager that receives IPC events and emits `InputEvent` objects |
| `src/input/input-hooks.ts` | Modify | Add `useSteamInputManager` hook, add `steamInputActive` flag to gate `useGamepadManager` |
| `src/app.tsx` | Modify | Wire up `useSteamInputManager(handleInput)` |

---

### Task 1: IGA File

**Files:**
- Create: `steam/controller_config/game_actions.vdf`

This is the Steam In-Game Actions file that declares action sets and actions for the Steam Input configurator. It uses Valve's VDF (KeyValues) format. The action names here must match exactly what the main process passes to `input.getActionSet()` and `input.getDigitalAction()`.

- [ ] **Step 1: Create the IGA file**

```vdf
"In Game Actions"
{
	"actions"
	{
		"GameControls"
		{
			"title"		"#Set_GameControls"
			"StickPadGyro"
			{
			}
			"AnalogTrigger"
			{
			}
			"Button"
			{
				"select"
				{
					"title"		"#Action_select"
					"input_mode"	"button"
				}
				"back"
				{
					"title"		"#Action_back"
					"input_mode"	"button"
				}
				"hint"
				{
					"title"		"#Action_hint"
					"input_mode"	"button"
				}
				"shuffle"
				{
					"title"		"#Action_shuffle"
					"input_mode"	"button"
				}
				"pause"
				{
					"title"		"#Action_pause"
					"input_mode"	"button"
				}
				"navigate_up"
				{
					"title"		"#Action_navigate_up"
					"input_mode"	"button"
				}
				"navigate_down"
				{
					"title"		"#Action_navigate_down"
					"input_mode"	"button"
				}
				"navigate_left"
				{
					"title"		"#Action_navigate_left"
					"input_mode"	"button"
				}
				"navigate_right"
				{
					"title"		"#Action_navigate_right"
					"input_mode"	"button"
				}
			}
		}
	}
	"localization"
	{
		"english"
		{
			"Set_GameControls"		"Game Controls"
			"Action_select"			"Select / Confirm"
			"Action_back"			"Back / Cancel"
			"Action_hint"			"Show Hint"
			"Action_shuffle"		"Shuffle Deck"
			"Action_pause"			"Pause"
			"Action_navigate_up"		"Navigate Up"
			"Action_navigate_down"		"Navigate Down"
			"Action_navigate_left"		"Navigate Left"
			"Action_navigate_right"		"Navigate Right"
		}
	}
}
```

- [ ] **Step 2: Commit**

```bash
git add steam/controller_config/game_actions.vdf
git commit -m "feat: add Steam Input IGA file with GameControls action set"
```

---

### Task 2: Main Process Steam Input Handlers

**Files:**
- Modify: `electron/steam-handlers.ts`

Add Steam Input initialization, polling, and shutdown to the existing Steam handlers module. The `input` namespace is accessed directly from the `steamworks.js` module import (not through the `SteamClient` interface). A `BrowserWindow` reference is needed to send events to the renderer.

**Key details:**
- `steamworks.js` exposes `input.init()`, `input.shutdown()`, `input.getControllers()`, `input.getActionSet(name)`, `input.getDigitalAction(name)` as top-level namespace functions
- `Controller` instances have `.activateActionSet(handle)`, `.isDigitalActionPressed(handle)`, `.getType()`, `.getHandle()`
- `input.InputType` is a string enum with values like `'XBox360Controller'`, `'PS5Controller'`, etc.
- Controller handles are `bigint` values used as map keys for tracking previous state
- The `BrowserWindow` reference is passed via a new `setSteamInputWindow()` export called from `electron/main.ts`

- [ ] **Step 1: Add the Steam action name to InputAction mapping constant**

At the top of `electron/steam-handlers.ts`, below the existing constants, add:

```typescript
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
```

- [ ] **Step 2: Add the controller type mapping function**

```typescript
function mapSteamInputType(inputType: string): string {
	const mapping: Record<string, string> = {
		XBox360Controller: 'xbox',
		XBoxOneController: 'xbox',
		PS3Controller: 'playstation',
		PS4Controller: 'playstation',
		PS5Controller: 'playstation',
		SwitchJoyConPair: 'switch',
		SwitchJoyConSingle: 'switch',
		SwitchProController: 'switch',
		SteamController: 'steamdeck',
		SteamDeckController: 'steamdeck',
	};
	return mapping[inputType] ?? 'generic';
}
```

- [ ] **Step 3: Add module state for Steam Input and the window reference**

Add `BrowserWindow` to the existing electron import at line 1 of `electron/steam-handlers.ts`:

```typescript
import { ipcMain, app, type BrowserWindow } from 'electron';
```

Then add module state below the existing `let steamClient` declaration:

```typescript
// Steam Input state — uses mutable Maps for performance (polled at 60Hz)
let steamworksModule: typeof import('steamworks.js') | null = null;
let inputPollInterval: ReturnType<typeof setInterval> | null = null;
let actionSetHandle: bigint | null = null;
let digitalActionHandles: ReadonlyArray<{ name: string; handle: bigint }> = [];
const previousStates: Map<bigint, Map<string, boolean>> = new Map();
let mainWindow: BrowserWindow | null = null;

export function setSteamInputWindow(win: BrowserWindow): void {
	mainWindow = win;
}
```

Update the existing `steam:init` handler to also store the module reference. In the `try` block, after `const steamworks = await import('steamworks.js');`, add:

```typescript
steamworksModule = steamworks;
```

**Important:** `steam:initInput` depends on `steam:init` having been called first (to populate `steamworksModule`). The renderer's `SteamInputManager.init()` calls `initInput()` only after the platform service's `init()` succeeds, which ensures this ordering.

- [ ] **Step 4: Add the poll function**

```typescript
function pollSteamInput(): void {
	if (!steamworksModule || !actionSetHandle || !mainWindow) return;

	// Assign to local consts after the null guard so TypeScript narrows
	// inside the forEach callbacks without needing non-null assertions
	const setHandle = actionSetHandle;
	const win = mainWindow;

	const controllers = steamworksModule.input.getControllers();
	const currentHandles = new Set<bigint>();

	controllers.forEach(controller => {
		const handle = controller.getHandle();
		currentHandles.add(handle);
		controller.activateActionSet(setHandle);

		const prevButtonStates = previousStates.get(handle) ?? new Map<string, boolean>();
		const controllerType = mapSteamInputType(controller.getType());

		digitalActionHandles.forEach(({ name, handle: actionHandle }) => {
			const pressed = controller.isDigitalActionPressed(actionHandle);
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

- [ ] **Step 5: Add the exported shutdown function**

Place this above `registerSteamHandlers` so both the IPC handler and the `before-quit` handler can call it:

```typescript
export function shutdownSteamInput(): void {
	if (inputPollInterval) {
		clearInterval(inputPollInterval);
		inputPollInterval = null;
	}
	previousStates.clear();
	if (steamworksModule) {
		try {
			steamworksModule.input.shutdown();
		} catch {
			// Best-effort — Steam cleans up on process exit
		}
	}
}
```

- [ ] **Step 6: Add the `steam:initInput` and `steam:shutdownInput` IPC handlers**

Inside the `registerSteamHandlers` function, after the existing handlers:

```typescript
ipcMain.handle('steam:initInput', () => {
	if (!steamworksModule) return false;
	try {
		const sw = steamworksModule;
		sw.input.init();

		actionSetHandle = sw.input.getActionSet('GameControls');
		digitalActionHandles = STEAM_ACTION_NAMES.map(name => ({
			name,
			handle: sw.input.getDigitalAction(name),
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
```

- [ ] **Step 7: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors in `electron/` files. Fix any type issues before proceeding.

- [ ] **Step 8: Commit**

```bash
git add electron/steam-handlers.ts
git commit -m "feat: add Steam Input polling and IPC handlers"
```

---

### Task 3: Electron Main Process Wiring

**Files:**
- Modify: `electron/main.ts`

Wire the `BrowserWindow` reference to the Steam Input handlers and add a `before-quit` safety net.

- [ ] **Step 1: Import and wire**

Add import of `setSteamInputWindow` and `shutdownSteamInput` from `./steam-handlers`:

```typescript
import { registerSteamHandlers, setSteamInputWindow, shutdownSteamInput } from './steam-handlers';
```

In `createWindow()`, after the `BrowserWindow` is created, add:

```typescript
setSteamInputWindow(win);
```

After `app.on('window-all-closed', ...)`, add:

```typescript
app.on('before-quit', () => {
	shutdownSteamInput();
});
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add electron/main.ts
git commit -m "feat: wire Steam Input window ref and before-quit shutdown"
```

---

### Task 4: Preload and Type Definitions

**Files:**
- Modify: `electron/preload.ts`
- Modify: `src/global.d.ts`

Expose the new Steam Input IPC methods to the renderer and add their type definitions.

- [ ] **Step 1: Add input methods to preload**

In `electron/preload.ts`, add these four methods inside the `steam` object, after the existing `getPlayerName` method:

```typescript
initInput: (): Promise<boolean> => ipcRenderer.invoke('steam:initInput'),
shutdownInput: (): Promise<void> => ipcRenderer.invoke('steam:shutdownInput'),
onInputEvent: (callback: (event: { action: string; controllerType: string }) => void): void => {
	ipcRenderer.on('steam:inputEvent', (_event, data) => callback(data));
},
offInputEvent: (): void => {
	ipcRenderer.removeAllListeners('steam:inputEvent');
},
```

- [ ] **Step 2: Add type definitions**

In `src/global.d.ts`, add these methods to the `ElectronSteamAPI` interface, after `getPlayerName`:

```typescript
initInput(): Promise<boolean>;
shutdownInput(): Promise<void>;
onInputEvent(callback: (event: { action: string; controllerType: string }) => void): void;
offInputEvent(): void;
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add electron/preload.ts src/global.d.ts
git commit -m "feat: expose Steam Input IPC methods to renderer"
```

---

### Task 5: Steam Input Manager (Renderer)

**Files:**
- Create: `src/input/steam-input-manager.ts`

This follows the same class pattern as `GamepadManager` and `KeyboardManager`. It receives IPC events from the main process and emits standard `InputEvent` objects.

Reference the existing `GamepadManager` pattern in `src/input/gamepad-manager.ts` for the listener management API.

- [ ] **Step 1: Create the Steam Input Manager**

```typescript
import {
	ControllerType,
	InputAction,
	InputEvent,
	InputListener,
} from './input-types';

export class SteamInputManager {
	private listeners: InputListener[] = [];
	private initialized = false;

	public async init(): Promise<boolean> {
		const api = window.electronAPI?.steam;
		if (!api) return false;

		try {
			const success = await api.initInput();
			if (!success) return false;

			api.onInputEvent((data) => {
				const event: InputEvent = {
					action: data.action as InputAction,
					source: data.controllerType as ControllerType,
					timestamp: Date.now(),
				};
				this.listeners.forEach(listener => listener(event));
			});

			this.initialized = true;
			return true;
		} catch {
			return false;
		}
	}

	public destroy(): void {
		const api = window.electronAPI?.steam;
		if (api) {
			api.offInputEvent();
			api.shutdownInput();
		}
		this.listeners = [];
		this.initialized = false;
	}

	public addListener(listener: InputListener): this {
		this.listeners.push(listener);
		return this;
	}

	public removeListener(listener: InputListener): this {
		this.listeners = this.listeners.filter(l => l !== listener);
		return this;
	}

	public isInitialized(): boolean {
		return this.initialized;
	}
}

let steamInputManager: SteamInputManager | null = null;

export function getSteamInputManager(): SteamInputManager {
	if (!steamInputManager) {
		steamInputManager = new SteamInputManager();
	}
	return steamInputManager;
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/input/steam-input-manager.ts
git commit -m "feat: add SteamInputManager for renderer-side Steam Input handling"
```

---

### Task 6: Input Hooks Integration

**Files:**
- Modify: `src/input/input-hooks.ts`

Add the `useSteamInputManager` hook and modify `useGamepadManager` to check the `steamInputActive` flag.

**Key behavior:**
- `useSteamInputManager` is async (IPC round-trip), so `steamInputActive` won't be `true` on first render
- `useGamepadManager` checks the flag lazily inside its effect — if Steam Input activates after the gamepad manager has already started, it tears down the gamepad manager
- `useSteamInputManager` is a no-op (returns immediately) when `window.electronAPI` doesn't exist (web/PWA)

- [ ] **Step 1: Add the `steamInputActive` flag and `useSteamInputManager` hook**

At the top of the file, add imports:

```typescript
import { getSteamInputManager } from './steam-input-manager';
```

Add module-level state after the existing reference counts:

```typescript
let steamInputInitCount = 0;
let steamInputActive = false;
```

Add a callback set that `useSteamInputManager` will call when Steam Input activates, to notify all `useGamepadManager` consumers to shut down:

```typescript
const steamInputActivatedCallbacks: Set<() => void> = new Set();
```

Add the hook after `useKeyboardManager`:

```typescript
export
function useSteamInputManager(listener: InputListener): void {
	const listenerRef = useRef(listener);

	useEffect(() => {
		listenerRef.current = listener;
	}, [listener]);

	const stableListener = useCallback((event: InputEvent) => {
		listenerRef.current(event);
	}, []);

	useEffect(() => {
		// No-op in non-Electron environments
		if (!window.electronAPI) return;

		const manager = getSteamInputManager();

		if (!steamInputInitCount) {
			manager.init().then(success => {
				if (success) {
					steamInputActive = true;
					steamInputActivatedCallbacks.forEach(cb => cb());
					steamInputActivatedCallbacks.clear();
				}
			});
		}

		steamInputInitCount++;
		manager.addListener(stableListener);

		return () => {
			manager.removeListener(stableListener);
			steamInputInitCount--;

			if (!steamInputInitCount) {
				manager.destroy();
				steamInputActive = false;
			}
		};
	}, [stableListener]);
}
```

- [ ] **Step 2: Modify `useGamepadManager` to check the `steamInputActive` flag**

Replace the existing `useGamepadManager` function with:

```typescript
export
function useGamepadManager(listener: InputListener): void {
	const listenerRef = useRef(listener);

	useEffect(() => {
		listenerRef.current = listener;
	}, [listener]);

	const stableListener = useCallback((event: InputEvent) => {
		listenerRef.current(event);
	}, []);

	useEffect(() => {
		// Skip if Steam Input is already active
		if (steamInputActive) return;

		const manager = getGamepadManager();

		if (!gamepadInitCount) manager.init();

		gamepadInitCount++;

		manager.addListener(stableListener);

		// If Steam Input activates later, tear down this consumer's gamepad listener
		const teardown = () => {
			manager.removeListener(stableListener);
			gamepadInitCount--;
			if (!gamepadInitCount) manager.destroy();
		};

		steamInputActivatedCallbacks.add(teardown);

		return () => {
			steamInputActivatedCallbacks.delete(teardown);
			teardown();
		};
	}, [stableListener]);
}
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/input/input-hooks.ts
git commit -m "feat: add useSteamInputManager hook and gamepad manager gating"
```

---

### Task 7: App Wiring

**Files:**
- Modify: `src/app.tsx`

Wire the Steam Input hook into the root `App` component.

- [ ] **Step 1: Add the import**

Update the import from `./input/input-hooks` to include `useSteamInputManager`:

```typescript
import { useGamepadManager, useKeyboardManager, useSteamInputManager } from './input/input-hooks';
```

- [ ] **Step 2: Add the hook call**

In the `App` function body, add `useSteamInputManager` **before** the existing `useGamepadManager` call (line 84). The three hooks should appear in this order:

```typescript
useSteamInputManager(handleInput);
useGamepadManager(handleInput);
useKeyboardManager(handleInput);
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Run full build to verify everything compiles**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app.tsx
git commit -m "feat: wire Steam Input into App component"
```

---

### Task 8: Verification and Cleanup

- [ ] **Step 1: Run full typecheck (both renderer and electron)**

```bash
npm run typecheck
```

- [ ] **Step 2: Run full build**

```bash
npm run build
```

- [ ] **Step 3: Verify Electron build (if environment supports it)**

```bash
npm run build:electron
```

- [ ] **Step 4: Manual verification checklist**

Verify these behaviors (requires Steam running):
- Electron app launches without errors
- Steam Input initializes (check console for no errors from `steam:initInput`)
- Controller input works through Steam Input (no double-input)
- Keyboard input still works normally
- Mouse/touch input still works normally
- When running as PWA (non-Electron), gamepad input still works via raw Gamepad API

- [ ] **Step 5: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore: Steam Input integration cleanup"
```
