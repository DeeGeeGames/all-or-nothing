# Steam Input Integration Design

## Problem

The game directly accesses the browser Gamepad API for controller input. When running on Steam, Steam Input translates physical controller buttons into virtual gamepad events, but the browser's native Gamepad API also sees the physical controller. This causes every button press to fire twice — once from the raw hardware and once from Steam's virtual controller.

To earn the "Steam Input" support declaration on Steam, the game must use the Steam Input API for controller handling when running in the Steam/Electron environment.

## Approach

Use the existing `steamworks.js` dependency's `input` namespace to poll Steam Input from the Electron main process, forwarding input events to the renderer via IPC. When Steam Input is active, disable the raw Gamepad API polling to eliminate double-input. Keyboard and mouse/touch input remain unchanged on all platforms.

## Design

### IGA File (In-Game Actions)

A single action set `GameControls` with all-digital actions. File location: `steam/controller_config/game_actions.vdf`.

| Steam Action Name | Maps to `InputAction` | Default Binding |
|---|---|---|
| `select` | `SELECT` | A / Cross |
| `back` | `BACK` | B / Circle |
| `hint` | `HINT` | X / Square |
| `shuffle` | `SHUFFLE` | Y / Triangle |
| `pause` | `PAUSE` | Start / Options |
| `navigate_up` | `NAVIGATE_UP` | D-Pad Up |
| `navigate_down` | `NAVIGATE_DOWN` | D-Pad Down |
| `navigate_left` | `NAVIGATE_LEFT` | D-Pad Left |
| `navigate_right` | `NAVIGATE_RIGHT` | D-Pad Right |

No analog actions. Stick-based navigation is configured as digital actions in the IGA file, delegating deadzone/threshold handling to Steam.

### Main Process Polling (`electron/steam-handlers.ts`)

**Accessing the `input` namespace:** The `steamworks.js` `input` functions are called as direct imports from the module namespace (e.g., `import('steamworks.js').then(sw => sw.input.init())`), not through the `SteamClient` interface used for leaderboards. The existing `SteamClient` interface is not extended.

**Lifecycle:**
- `steam:initInput` IPC handler — called after `steam:init` succeeds. Calls `input.init()`, resolves the action set handle via `input.getActionSet('GameControls')` and all digital action handles via `input.getDigitalAction()`. Stores handles in module state.
- A `setInterval` poll loop at ~60Hz (16ms) reads controller state and sends changed actions to the renderer via `webContents.send('steam:inputEvent', ...)`. The 16ms interval is not vsync-aligned like `requestAnimationFrame` in the renderer, but this is acceptable for rising-edge detection on a card game.
- `steam:shutdownInput` IPC handler — stops the poll loop, calls `input.shutdown()`.
- `input.shutdown()` is best-effort on app close — Steam cleans up on process exit. A `before-quit` handler in `electron/main.ts` calls `input.shutdown()` directly from the main process as a safety net, since React effect cleanups are not guaranteed to run on window close.

**Polling logic:**
- Each tick: call `input.getControllers()`. For each controller, call `controller.activateActionSet(gameControlsHandle)` (idempotent and cheap — ensures newly connected controllers are immediately active) and then call `isDigitalActionPressed()` on each action handle.
- Track previous pressed state per controller handle to detect rising edges (just pressed). Prune stale entries from the previous-state map when a controller handle is no longer in the `getControllers()` result, preventing a minor memory leak on repeated connect/disconnect cycles.
- On rising edge, send `{ action: InputAction, controllerType: ControllerType }` to the renderer. Both are string constants that serialize naturally over IPC.
- Map `steamworks.js` `InputType` to the existing `ControllerType` enum values (see mapping table below).

**Why poll:** The Steam Input API is poll-based with no callback mechanism.

### Controller Type Mapping

Performed in the main process so the renderer receives `ControllerType` values directly.

| `steamworks.js` `InputType` | `ControllerType` |
|---|---|
| `XBox360Controller`, `XBoxOneController` | `'xbox'` |
| `PS3Controller`, `PS4Controller`, `PS5Controller` | `'playstation'` |
| `SwitchJoyConPair`, `SwitchJoyConSingle`, `SwitchProController` | `'switch'` |
| `SteamController`, `SteamDeckController` | `'steamdeck'` |
| `GenericGamepad`, `Unknown`, all others | `'generic'` |

### Preload / IPC Bridge (`electron/preload.ts`)

Expose four new methods on `window.electronAPI.steam`:
- `initInput(): Promise<boolean>` — wraps `ipcRenderer.invoke('steam:initInput')`
- `shutdownInput(): Promise<void>` — wraps `ipcRenderer.invoke('steam:shutdownInput')`
- `onInputEvent(callback: (event: { action: string; controllerType: string }) => void): void` — wraps `ipcRenderer.on('steam:inputEvent', ...)`
- `offInputEvent(): void` — wraps `ipcRenderer.removeAllListeners('steam:inputEvent')`

Type definitions added to `ElectronSteamAPI` in `src/global.d.ts`. The callback receives `{ action: InputAction; controllerType: ControllerType }` (string constants that map directly to the existing enums).

### Steam Input Manager (`src/input/steam-input-manager.ts`)

New file. Follows the existing input manager pattern (class-based, matching `GamepadManager` and `KeyboardManager` — the input subsystem uses classes despite the project's general preference for pure functions):
- `init()` — calls `window.electronAPI.steam.initInput()`, registers the IPC event listener via `onInputEvent()`
- `destroy()` — calls `steam.shutdownInput()`, removes IPC listener via `offInputEvent()`
- `addListener(listener)` / `removeListener(listener)` — manages `InputListener` callbacks
- On receiving `steam:inputEvent` with payload `{ action: InputAction, controllerType: ControllerType }`, constructs an `InputEvent` and emits to all listeners

### Input Hooks (`src/input/input-hooks.ts`)

**New `useSteamInputManager` hook:**
- Same reference-counting lifecycle pattern as `useGamepadManager` and `useKeyboardManager`
- Only activates when `window.electronAPI` exists (Electron/Steam environment)
- No-op in web/PWA builds

**Gamepad manager gating:**
- Module-level boolean `steamInputActive` (set to `true` when `SteamInputManager.init()` succeeds)
- `useGamepadManager` checks this flag lazily inside its `useEffect` — if `true` at the time the effect runs, skips `GamepadManager.init()`, preventing raw Gamepad API polling
- Since `SteamInputManager.init()` is async (IPC round-trip), `steamInputActive` may not be `true` on the first render. `useGamepadManager`'s effect should re-check the flag, and if Steam Input activates later, the gamepad manager should be destroyed at that point
- This is the fix for the double-input bug

### App Wiring (`src/app.tsx`)

Add `useSteamInputManager(handleInput)` before the existing `useGamepadManager(handleInput)` and `useKeyboardManager(handleInput)` calls. Hook call order matters — `useSteamInputManager` must be first so its async init can set the `steamInputActive` flag before `useGamepadManager` checks it (though the lazy check handles the race if the flag isn't set yet). The same `handleInput` function processes all input sources identically since they all produce `InputEvent` objects.

## File Changes

**Modified files:**
- `electron/steam-handlers.ts` — Steam Input IPC handlers, poll loop, controller type mapping
- `electron/preload.ts` — expose new input IPC methods
- `src/global.d.ts` — extend `ElectronSteamAPI` type
- `src/input/input-hooks.ts` — add `useSteamInputManager`, add Steam Input active flag gating `useGamepadManager`
- `src/app.tsx` — wire up `useSteamInputManager(handleInput)`

**New files:**
- `steam/controller_config/game_actions.vdf` — IGA action set definition
- `src/input/steam-input-manager.ts` — `SteamInputManager` class

**Unchanged files:**
- `src/input/gamepad-manager.ts` — untouched, still works for web/PWA
- `src/input/keyboard-manager.ts` — untouched
- `src/input/controller-mappings.ts` — untouched
- `src/platform/steam-platform-service.ts` — untouched

## Manual Steps (Steamworks Dashboard)

After implementation, the IGA file and default controller configurations must be uploaded via the Steamworks partner site. This cannot be automated in code.

## Out of Scope

- **Steam Input glyph API** — returns actual button images for the player's controller. Nice enhancement for later but not required for the Steam Input declaration. Current text labels in `ControllerButtonLabels` work correctly since they describe actions, not physical buttons.
- **Multiple action sets** — the game's controls are consistent across all screens. One action set covers everything.
