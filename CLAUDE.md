# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"All or Nothing" is a card-based puzzle game built with React, TypeScript, and Vite. It's a Progressive Web App (PWA) that uses Material-UI for components and implements the classic "Set" card game mechanics.

## Common Commands

### Development
```bash
npm run dev          # Start Vite development server
npm run build        # Build for production
npm run preview      # Preview production build locally
npm run typecheck    # Ensure there are not typescript errors
```

## Architecture

### State Management
- **Jotai** is used for global state management (see `src/atoms.ts`)
- State atoms include: sound/music toggles, active screen, and pause state
- Custom hooks in `atoms.ts` provide access to state (e.g., `useActiveScreen()`, `useSetIsSoundEnabled()`)

### Database Layer
- **Dexie.js** (IndexedDB wrapper) stores game state persistently in the browser
- Database schema defined in `src/core.ts` with two collections:
  - `setorders`: Stores deck and discard pile card orders
  - `gamedata`: Stores time and shuffle count
- Database is initialized on app load with `initDb()`
- Key functions: `resetGameCore()`, `shuffleDeck()`, `discardCards()`, `updateTime()`

### Game Logic (src/core.ts)
- **Card representation**: Each card has 4 attributes (shape, color, fill, count) using bitwise values (1, 2, 4)
- **Set validation**: `isSet()` checks if 3 cards form a valid set using `allSameOrDifferent()` which uses bitwise operations
  - Valid set: Each attribute is either all the same OR all different across the 3 cards
  - Bitwise logic: All same = bits AND to original value; All different = bits OR to 7 (binary 111)
- **Set detection**: `setExists()` checks if any valid set exists in the current card array
- Card deck generation: Creates all 81 possible combinations (3 shapes × 3 colors × 3 fills × 3 counts)

### Screen Navigation
- Screen routing handled via Jotai atom (`activeScreenAtom`) in `src/app.tsx`
- Four screens: Title, Game, About, Help (defined in `src/types.ts`)
- Game and About screens are lazy-loaded with React.lazy()
- Use `useSetActiveScreen()` to navigate between screens

### Component Structure
- **Main screens**: Located in `src/components/screens/`
  - `title-screen.tsx`: Entry point
  - `game-screen/`: Main game area with nested components (timer, play area, card area, options)
  - `about-screen.tsx`: Information screen
  - `help-screen.tsx`: Help/tutorial content
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
