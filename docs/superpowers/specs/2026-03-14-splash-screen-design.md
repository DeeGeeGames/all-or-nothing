# Splash Screen Design

## Overview

Add a video-game-style splash screen sequence that plays on every cold start before the title screen. Two splash screens display sequentially — one for React, one for the open source libraries used in the project — then fade into the title screen. The title screen's card animation loop waits until the screen is fully visible before starting.

## Approach

New `Splash` screen type added to the existing `Screens` enum. A `SplashSequence` component manages the ordered sequence internally, then hands off to the title screen via `setActiveScreen`. This fits naturally into the existing Jotai-based screen routing.

## Splash Screen 1: React

- Black background, centered layout
- Official React logo (atom/orbital SVG) displayed prominently
- Tagline beneath: "Built with React"
- White text on black

## Splash Screen 2: Open Source Libraries

- Black background, centered grid layout
- 4 columns, 3 rows — bottom row centered if uneven
- Row 1: TypeScript, Vite, MUI, framer motion
- Row 2: Jotai, Dexie, Node, Electron
- Row 3 (centered): Howler, canvas-confetti
- Each library displayed as its logo/icon with name text beneath
- Logos use brand colors; placeholders used where official SVGs are unavailable (Jotai, Dexie, Howler, canvas-confetti)

## Timing

All fade durations are symmetrical (fade-in duration equals fade-out duration).

| Phase | Duration |
|-------|----------|
| Fade-in | 1s |
| Hold at full opacity | 2s |
| Fade-out | 1s |

Each splash screen: 4s total (skippable). Full sequence without skipping: ~9s (two 4s screens + 1s title fade-in).

## Transition to Title Screen

1. After the last splash screen fades out, `SplashSequence` sets `splashCompleteAtom` to `true` and calls `setActiveScreen(Screens.Title)`
2. The title screen fades in over 1s using a framer-motion opacity transition
3. The title screen's card demo animation loop reads `splashCompleteAtom` and only starts after the fade-in's `onAnimationComplete` callback fires
4. This guarantees: splash fade-out (1s) → title fade-in (1s) → card animation begins

## Skip/Advance Interaction

- Global event listeners registered on mount: `click`, `touchstart`, `keydown`
- Any event triggers advancement to the next screen in the sequence
- If currently in fade-in or hold phase: begins fade-out immediately
- If already in fade-out phase: no-op (let it finish)
- No visual affordance — fully undiscoverable
- Events gated so rapid double-tap does not skip two screens at once
- Listeners removed on unmount

## Component Architecture

### New Files

- `src/components/screens/splash-sequence.tsx` — Main sequence orchestrator, lazy-loaded
- `src/components/screens/splash-screens/react-splash.tsx` — React logo + tagline content
- `src/components/screens/splash-screens/libraries-splash.tsx` — Library grid content

### Modified Files

- `src/types.ts` — Add `Splash` to `Screens` enum
- `src/atoms.ts` — Add `splashCompleteAtom` (boolean, default `false`); change initial `activeScreenAtom` value to `Screens.Splash`
- `src/app.tsx` — Add `Splash` to the screen component map with lazy import
- `src/components/screens/title-screen.tsx` — Read `splashCompleteAtom`; gate card animation start behind splash completion + fade-in complete

### Sequence Configuration

The splash sequence is defined as an array, making it easy to add, remove, or reorder screens:

```ts
const splashScreens = [
  { id: 'react', content: <ReactSplash />, holdDuration: 2000 },
  { id: 'libraries', content: <LibrariesSplash />, holdDuration: 2000 },
] as const
```

Fade duration (1000ms) is a shared constant.

## Animation

- All transitions use framer-motion `motion.div` with `animate={{ opacity }}` and `AnimatePresence`
- Fade-in: opacity 0 → 1 over 1s ease
- Fade-out: opacity 1 → 0 over 1s ease
- Title screen fade-in uses the same pattern, with `onAnimationComplete` to signal readiness

## Audio

Silent. No sound effects during splash screens.

## Persistence

No persistent state. The splash sequence runs on every cold start. No IndexedDB involvement.
