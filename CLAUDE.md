# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"All or Nothing" is a card-based puzzle game built with React, TypeScript, and Vite. It's a Progressive Web App (PWA) that uses Material-UI for components and implements the classic "Set" card game mechanics.

## Common Commands

### Development
```bash
bun run dev          # Start Vite development server
bun run typecheck    # tsc for app + electron
bun test src         # Unit tests
bun run build        # Production web build
```

## Architecture

### State Management
- **Jotai** is used for global state management (see `src/atoms.ts`)
- State atoms include: sound/music toggles, active screen, and pause state
- Custom hooks in `atoms.ts` provide access to state (e.g., `useActiveScreen()`, `useSetIsSoundEnabled()`)

### Single-player persistence
- **Dexie.js** (IndexedDB) stores the single-player run in `src/core.ts`:
  - `setorders`: deck and discard card orders
  - `gamedata`: time, score, combo, misses, audio flags
  - `gamehistory` / `achievements`: finished-run records
  - `gamerun`: current run identity and completion flags (`src/game-run.ts`)
- Database is initialized on app load with `initDb()`
- `resetGameCore()`, `shuffleDeck()`, `discardCards()`, `updateTime()`, and `exportGameState()` are single-player only. Do not call them from local multiplayer.

### Deck operations
- Pure shuffle/deal/discard helpers live in `src/deck.ts` (`generateCanonicalDeck`, `generateDeck`, `applyDiscard`)
- Single-player `core.ts` persists those operations to IndexedDB
- Local multiplayer applies them to an in-memory session

### Local multiplayer
- Match state is in-memory in `src/multiplayer/multiplayer-match.ts` (deck, discard, scores, rematch generation)
- Multiplayer screens must not import single-player persistence APIs; `src/multiplayer/multiplayer-isolation.test.ts` enforces that
- Rematch deals a new 81-card isolated deck. Do not fix rematch by calling `resetGameCore()`

### Steam leaderboards
- Game time and fastest match are whole seconds in IndexedDB, `GameCompletionData`, and the in-game UI (`formatDuration`)
- `BestTimes_v4` is Steam `TimeMilliseconds`. Convert only at the Steam boundary in `src/platform/steam-leaderboard-units.ts`: submit `time * 1000`, divide downloads by 1000 before the UI
- `FastestMatch_v3` stays `TimeSeconds`. Score and combo are numeric and unconverted
- `BestTimes_v3` is abandoned. Production mixed seed milliseconds with live second scores; ascending `KeepBest` keeps the contaminated smaller value, so a corrected upload is not a migration
- `scripts/seed-leaderboards.ts` must use the same board names and units as `STEAM_LEADERBOARD_BASE_NAMES`

### Game Logic (src/core.ts)
- **Card representation**: Each card has 4 attributes (shape, color, fill, count) using bitwise values (1, 2, 4)
- **Set validation**: `isSet()` checks if 3 cards form a valid set using `allSameOrDifferent()` which uses bitwise operations
  - Valid set: Each attribute is either all the same OR all different across the 3 cards
  - Bitwise logic: All same = bits AND to original value; All different = bits OR to 7 (binary 111)
- **Set detection**: `setExists()` checks if any valid set exists in the current card array
- Card deck generation: Creates all 81 possible combinations (3 shapes × 3 colors × 3 fills × 3 counts)

### Screen Navigation
- Screen routing handled via Jotai atom (`activeScreenAtom`) in `src/app.tsx`
- Screens are defined in `src/types.ts` (Title, Game, Daily, Lobby, Multiplayer, plus help/stats/etc.)
- Use `useSetActiveScreen()` to navigate between screens

### Component Structure
- **Main screens**: Located in `src/components/screens/`
  - `title-screen/`: Entry point
  - `game-screen/`: Single-player run (timer, play area, results overlay)
  - `lobby-screen/` and `multiplayer-game-screen/`: Local multiplayer
  - `daily-screen/`, `stats-screen/`, `achievements-screen/`, `leaderboard-screen/`
- **Reusable components**: Dialogs, sound/music toggles, playing cards
- **Playing cards**: `src/components/playing-card/` renders cards with SVG shapes based on card properties

### Path Aliases
- `@/*` maps to `src/*` (configured in tsconfig.json and vite.config.ts)
- Use imports like `import { Card } from '@/types'`

### PWA Configuration
- Configured in `vite.config.ts` with vite-plugin-pwa
- Manifest includes app name, icons, screenshots, and orientation settings
- Auto-updates enabled with `registerType: 'autoUpdate'`

## TypeScript Configuration
- Strict mode enabled with additional checks: `noUncheckedIndexedAccess`, `noUnusedLocals`, `noImplicitReturns`
- Module resolution: `nodenext` (Node.js ESM)
- JSX preserved for Vite to handle

## Key Type Patterns
- **Enum pattern**: Constants defined as objects with `as const`, accessed via `Enum<typeof T>` helper type
- **Bitwise values**: Used for card attributes to enable efficient set validation (see `BitwiseValue` type)
- Cards serialized as JSON strings for storage in IndexedDB
