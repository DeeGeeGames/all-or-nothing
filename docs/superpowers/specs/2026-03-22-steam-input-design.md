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

**Lifecycle:**
- `steam:initInput` IPC handler — called after `steam:init` succeeds. Calls `input.init()`, resolves the action set handle via `input.getActionSet('GameControls')` and all digital action handles via `input.getDigitalAction()`. Stores handles in module state.
- A `setInterval` poll loop at ~60Hz (16ms) reads controller state and sends changed actions to the renderer via `webContents.send('steam:inputEvent', ...)`.
- `steam:shutdownInput` IPC handler — stops the poll loop, calls `input.shutdown()`.

**Polling logic:**
- Each tick: call `input.getControllers()`, for each controller call `isDigitalActionPressed()` on each action handle.
- Track previous pressed state per controller handle to detect rising edges (just pressed).
- On rising edge, send `{ action, controllerType }` to the renderer.
- Map `steamworks.js` `InputType` to the existing `ControllerType` enum values (see mapping table below).

**Why poll:** The Steam Input API is poll-based with no callback mechanism. 16ms matches the existing `requestAnimationFrame` cadence in `GamepadManager`.

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
- `onInputEvent(callback): void` — wraps `ipcRenderer.on('steam:inputEvent', ...)`
- `offInputEvent(): void` — wraps `ipcRenderer.removeAllListeners('steam:inputEvent')`

Type definitions added to `ElectronSteamAPI` in `src/global.d.ts`.

### Steam Input Manager (`src/input/steam-input-manager.ts`)

New file. Same interface pattern as `GamepadManager`:
- `init()` — calls `window.electronAPI.steam.initInput()`, registers the IPC event listener via `onInputEvent()`
- `destroy()` — calls `steam.shutdownInput()`, removes IPC listener via `offInputEvent()`
- `addListener(listener)` / `removeListener(listener)` — manages `InputListener` callbacks
- On receiving `steam:inputEvent`, constructs an `InputEvent` with the action and `ControllerType`, emits to all listeners

### Input Hooks (`src/input/input-hooks.ts`)

**New `useSteamInputManager` hook:**
- Same reference-counting lifecycle pattern as `useGamepadManager` and `useKeyboardManager`
- Only activates when `window.electronAPI` exists (Electron/Steam environment)
- No-op in web/PWA builds

**Gamepad manager gating:**
- Module-level boolean `steamInputActive` (set to `true` when `SteamInputManager.init()` succeeds)
- `useGamepadManager` checks this flag — if `true`, skips `GamepadManager.init()`, preventing raw Gamepad API polling
- This is the fix for the double-input bug

### App Wiring (`src/app.tsx`)

Add `useSteamInputManager(handleInput)` alongside the existing `useGamepadManager(handleInput)` and `useKeyboardManager(handleInput)` calls. The same `handleInput` function processes all input sources identically since they all produce `InputEvent` objects.

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
