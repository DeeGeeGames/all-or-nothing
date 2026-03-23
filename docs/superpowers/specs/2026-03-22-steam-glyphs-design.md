# Steam Glyph Support via steamworks-ffi-node Migration

## Goal

Replace the current `steamworks.js` dependency with `steamworks-ffi-node` and use Steam's native glyph PNG API to show controller button images when running on Steam. Fall back to the existing custom SVG glyphs on non-Steam platforms (web/PWA).

## Context

The project already has a complete custom SVG glyph system (45 SVGs across 5 controller types) in `src/components/button-prompts/assets/`. These are rendered via `ButtonGlyphMap` which maps `ControllerType × InputAction → SVGComponent`. The text labels in `ControllerButtonLabels` are used only for `aria-label` accessibility.

Steam provides official button glyph images via `ISteamInput::GetGlyphPNGForActionOrigin()`. The current library (`steamworks.js`) does not expose this API. `steamworks-ffi-node` does, along with a much more complete Steam Input implementation (35+ functions vs the current partial coverage).

## Decision: Library Migration

Migrate from `steamworks.js` to `steamworks-ffi-node` for the full Steamworks integration — input, leaderboards, and player info.

**Why steamworks-ffi-node:**
- Exposes `getGlyphPNGForActionOrigin`, `getGlyphSVGForActionOrigin`, and `getStringForActionOrigin`
- Complete Steam Input API (35+ functions) vs steamworks.js's partial coverage
- Uses Koffi FFI (pure JS/TS, no native compilation step)
- Actively maintained, growing adoption (~4,600 npm downloads/month)
- Electron-ready with no ABI mismatch issues

**Why not stay on steamworks.js:**
- No glyph APIs, and the [open issue #166](https://github.com/ceifa/steamworks.js/issues/166) has been unresolved since Sept 2024
- Adding glyph support would require contributing a PR to a slowly-maintained project

## Architecture

### Glyph Resolution (Main Process)

Glyphs are resolved in batch when a controller is first detected during the input polling loop.

**Flow:**
1. `pollSteamInput()` detects a new controller handle not seen in the previous cycle
2. For each of the 9 digital actions, call `steam.input.getDigitalActionOrigins(controllerHandle, actionSetHandle, actionHandle)` to get `EInputActionOrigin` values
3. For each origin, call `steam.input.getGlyphPNGForActionOrigin(origin, SteamInputGlyphSize.Medium, 0)` to get the filesystem path
4. Read each PNG from disk, convert to a base64 data URL
5. Send the full map `Record<InputAction, string>` to the renderer via `steam:glyphMap` IPC channel

**Re-resolution triggers:**
- New controller handle detected → resolve and send
- Controller disconnected → send null map (renderer falls back to custom SVGs)
- No re-resolution during gameplay (glyphs are tied to physical controller)

### IPC

**New channel:**
- `steam:glyphMap` (main → renderer) — carries `{ glyphs: Record<string, string> | null }`

**Preload additions:**
- `onGlyphMap(callback)` / `offGlyphMap(callback)` — same pattern as existing `onInputEvent`/`offInputEvent`

### Renderer State

**New Jotai atom** in `src/atoms.ts`:
- `steamGlyphMapAtom: Atom<Record<InputAction, string> | null>` — holds data URLs keyed by `InputAction`, or null when no Steam glyphs available
- `useSteamGlyphMap()` — read hook

**SteamInputManager** gains a second IPC listener for `steam:glyphMap`. The `useSteamInputManager` hook registers the glyph callback alongside the existing input event callback and sets the atom when glyphs arrive.

### Display Layer

`ButtonPrompt` component updated:
- Check `useSteamGlyphMap()` atom first
- If a data URL exists for the action → render `<img src={dataUrl} width={28} height={28} alt={buttonLabel} />`
- Otherwise → render existing `<FallbackGlyph />` SVG component from `ButtonGlyphMap`

## Migration: steamworks.js → steamworks-ffi-node

### Initialization

```
// Before (steamworks.js)
const steamworks = await import('steamworks.js');
const client = steamworks.init(appId);

// After (steamworks-ffi-node)
import SteamworksSDK from 'steamworks-ffi-node';
const steam = SteamworksSDK.getInstance();
steam.init({ appId });
const callbackInterval = setInterval(() => steam.runCallbacks(), 100);
```

The singleton pattern replaces the client-object pattern. `runCallbacks()` must be polled for async operations (leaderboards) to resolve.

### Input API Mapping

| steamworks.js | steamworks-ffi-node |
|---|---|
| `client.input.init()` | `steam.input.init()` |
| `client.input.getControllers()` → Controller[] | `steam.input.getConnectedControllers()` → bigint[] |
| `controller.getType()` | `steam.input.getInputTypeForHandle(handle)` |
| `controller.isDigitalActionPressed(h)` | `steam.input.getDigitalActionData(ctrl, action).state` |
| `controller.activateActionSet(h)` | `steam.input.activateActionSet(ctrl, set)` |
| `client.input.getActionSet(name)` | `steam.input.getActionSetHandle(name)` |
| `client.input.getDigitalAction(name)` | `steam.input.getDigitalActionHandle(name)` |

### Leaderboard API Mapping

steamworks-ffi-node uses a handle-based workflow: find/create the leaderboard first, then use the handle for uploads and downloads.

| steamworks.js | steamworks-ffi-node |
|---|---|
| `client.leaderboard.uploadScore(name, score, sort)` | `steam.leaderboards.findOrCreateLeaderboard(name, sort, display)` then `steam.leaderboards.uploadLeaderboardScore(handle, score, method)` |
| `client.leaderboard.getScores(name, fetch, start, end)` | `steam.leaderboards.downloadLeaderboardEntries(handle, request, start, end)` |

Leaderboard handles should be cached after first resolution.

### Player Name

`client.localplayer.getName()` → verify equivalent on `steam.friends` or `steam.user` during implementation.

### Package Changes

- Remove `steamworks.js` from `dependencies`
- Add `steamworks-ffi-node`
- Verify Steamworks SDK shared library distribution (`libsteam_api.so` / `steam_api.dll` / `libsteam_api.dylib`)

## Files Changed

### Modified
- `electron/steam-handlers.ts` — full rewrite (initialization, input polling, glyph resolution, leaderboards)
- `electron/preload.ts` — add `onGlyphMap`/`offGlyphMap`
- `src/input/steam-input-manager.ts` — add glyph map IPC listener
- `src/input/input-hooks.ts` — wire glyph callback in `useSteamInputManager`, set atom
- `src/atoms.ts` — add `steamGlyphMapAtom` + `useSteamGlyphMap()`
- `src/components/button-prompts/index.tsx` — conditional rendering (Steam PNG vs custom SVG)
- `package.json` — dependency swap

### Untouched
- All custom SVG assets in `src/components/button-prompts/assets/`
- `src/components/button-prompts/button-glyph-map.ts`
- `src/input/controller-mappings.ts`
- `src/input/input-types.ts`
- `steam/controller_config/game_actions.vdf`
- All game logic and UI components beyond `ButtonPrompt`
