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
- 4-column grid — bottom row centered when it has fewer than 4 items
- Row 1: TypeScript, Vite, MUI, framer motion
- Row 2: Jotai, Dexie, Node, Electron
- Row 3 (centered): Howler, canvas-confetti
- Each library displayed as its logo/icon with name text beneath
- Logos use brand colors where official SVGs are available (TypeScript, Vite, MUI, framer motion, Node, Electron)
- For libraries without readily available SVG logos, use representative placeholder icons: Jotai (ghost face — the Jotai mascot), Dexie (database/table icon), Howler (sound wave icon), canvas-confetti (scattered confetti pieces). These can be replaced with official logos later.

## Timing

All fade durations are symmetrical (fade-in duration equals fade-out duration).

| Phase | Duration |
|-------|----------|
| Fade-in | 1s |
| Hold at full opacity | 2s |
| Fade-out | 1s |

With the default config (2s hold), each splash screen totals 4s (skippable). Full sequence without skipping: ~9s (two 4s screens + 1s title fade-in). These totals change if `holdDuration` is adjusted per-screen in the config array.

## Transition to Title Screen

1. After the last splash screen fades out, `SplashSequence` calls `setActiveScreen(Screens.Title)` — but does **not** set `splashCompleteAtom` yet
2. The title screen reads `splashCompleteAtom`. If `false`, it renders with a fade-in (opacity 0 → 1 over 1s). If `true`, it renders immediately with no fade-in.
3. On the fade-in's `onAnimationComplete`, the title screen sets `splashCompleteAtom` to `true`. The card demo animation loop's initial phase is gated behind this atom — it initializes in a `waiting` state instead of `dealing`, and only transitions to `dealing` once `splashCompleteAtom` becomes `true`. All other title screen animations (title text stagger, button stagger) are also deferred until after the fade-in completes, so nothing animates behind a partially transparent screen.
4. This guarantees: splash fade-out (1s) → title fade-in (1s) → atom set to `true` → card animation begins

**Non-cold-start behavior:** When navigating back to the title screen from other screens (Game, About, etc.), `splashCompleteAtom` is already `true`. The title screen renders immediately with no fade-in and the card animation starts right away — matching the existing behavior.

## Skip/Advance Interaction

- Global event listeners registered on mount: `click`, `touchstart` (with `{ passive: true }`), `keydown`
- Any event triggers advancement to the next screen in the sequence
- Events call `stopPropagation()` to prevent conflicts with app-level input handlers (e.g., the `activeController` logic in `app.tsx`)
- If currently in fade-in phase: begins fade-out from current opacity, with duration proportional to current opacity (e.g., if at 0.3 opacity, fade-out takes 0.3s instead of full 1s)
- If currently in hold phase: begins full 1s fade-out immediately
- If already in fade-out phase: no-op (let it finish)
- No visual affordance — fully undiscoverable
- Events gated with a boolean flag: input is ignored while a fade-out transition is in progress, preventing rapid double-tap from skipping two screens
- Listeners removed on unmount

## Component Architecture

### New Files

- `src/components/screens/splash-sequence.tsx` — Main sequence orchestrator, lazy-loaded
- `src/components/screens/splash-screens/react-splash.tsx` — React logo + tagline content
- `src/components/screens/splash-screens/libraries-splash.tsx` — Library grid content

### Modified Files

- `src/types.ts` — Add `Splash` to `Screens` enum
- `src/atoms.ts` — Add `splashCompleteAtom` (boolean, default `false`); change initial `activeScreenAtom` value to `Screens.Splash`. The title screen sets `splashCompleteAtom` to `true` after its fade-in completes.
- `src/app.tsx` — Add `Splash` to the screen component map with lazy import
- `src/components/screens/title-screen.tsx` — Read `splashCompleteAtom`; gate card animation start behind splash completion + fade-in complete

### Sequence Configuration

The splash sequence is defined as an array, making it easy to add, remove, or reorder screens:

```ts
const splashScreens = [
  { id: 'react', content: ReactSplash, holdDuration: 2000 },
  { id: 'libraries', content: LibrariesSplash, holdDuration: 2000 },
]
```

Each entry's `content` is a component reference (not a JSX element), rendered by the sequence orchestrator.

Fade duration (1000ms) is a shared constant.

## Animation

- `SplashSequence` uses a single `motion.div` wrapper that animates opacity for each screen. Screen transitions are driven by updating the current index and re-animating opacity (fade-out → swap content → fade-in), not by `AnimatePresence` with keyed children
- Layout approach for the libraries grid: flexbox rows with `justify-content: center` and `flex-wrap: wrap`
- Fade-in: opacity 0 → 1 over 1s with `easeInOut` easing
- Fade-out: opacity 1 → 0 over 1s with `easeInOut` easing
- Title screen fade-in uses the same pattern, with `onAnimationComplete` to signal readiness

## Audio

Silent. No sound effects during splash screens.

## Persistence

No persistent state. The splash sequence runs on every cold start. No IndexedDB involvement.
