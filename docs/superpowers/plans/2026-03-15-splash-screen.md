# Splash Screen Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a video-game-style splash screen sequence (React logo, then open source libraries) that plays on every cold start before fading into the title screen.

**Architecture:** New `Splash` screen in the existing Jotai-based screen routing. A `SplashSequence` component orchestrates fade-in/hold/fade-out for each splash screen in order, then hands off to the title screen. A `splashCompleteAtom` gates title screen animations until the post-splash fade-in finishes.

**Tech Stack:** React, TypeScript, framer-motion, Jotai, MUI

**Spec:** `docs/superpowers/specs/2026-03-14-splash-screen-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types.ts` | Modify | Add `Splash` to `Screens` enum |
| `src/atoms.ts` | Modify | Add `splashCompleteAtom`, change initial screen to `Splash` |
| `src/components/screens/splash-screens/react-splash.tsx` | Create | React logo + "Built with React" tagline |
| `src/components/screens/splash-screens/libraries-splash.tsx` | Create | 4-column grid of 10 library logos |
| `src/components/screens/splash-sequence.tsx` | Create | Sequence orchestrator: fade phases, skip handling, screen progression |
| `src/app.tsx` | Modify | Add `Splash` to `ScreenComponents` map with lazy import |
| `src/components/screens/title-screen.tsx` | Modify | Gate all animations behind `splashCompleteAtom` + fade-in wrapper |

---

## Chunk 1: Foundation and Content Components

### Task 1: Add Splash screen type and atom

**Files:**
- Modify: `src/types.ts:19-29`
- Modify: `src/atoms.ts:96`

- [ ] **Step 1: Add `Splash` to the Screens enum**

In `src/types.ts`, add `Splash` to the `Screens` object:

```ts
export
const Screens = {
	Splash: 'splash',
	Title: 'title',
	Game: 'game',
	About: 'about',
	Help: 'help',
	Leaderboard: 'leaderboard',
	Tutorial: 'tutorial',
	Lobby: 'lobby',
	Multiplayer: 'multiplayer',
	Daily: 'daily',
} as const;
```

- [ ] **Step 2: Add `splashCompleteAtom` and change default screen**

In `src/atoms.ts`, add a new atom and change the initial screen:

```ts
// Change existing line:
const activeScreenAtom = atom<Screens>(Screens.Splash);

// Add new atom and hooks after the activeScreenAtom section:
const splashCompleteAtom = atom(false);

export
function useSplashComplete() {
	return useAtomValue(splashCompleteAtom);
}

export
function useSetSplashComplete() {
	return useSetAtom(splashCompleteAtom);
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: Errors about missing `Splash` in `ScreenComponents` (in `app.tsx`). This is expected — we'll fix it in Task 5.

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/atoms.ts
git commit -m "feat: add Splash screen type and splashCompleteAtom"
```

---

### Task 2: Create React splash content component

**Files:**
- Create: `src/components/screens/splash-screens/react-splash.tsx`

- [ ] **Step 1: Create the React splash component**

Create `src/components/screens/splash-screens/react-splash.tsx`:

```tsx
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function ReactSplash() {
	return (
		<Box
			display="flex"
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			height="100vh"
			width="100vw"
			bgcolor="#000"
			gap={3}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="-11.5 -10.23174 23 20.46348"
				width={120}
				height={120}
			>
				<circle cx="0" cy="0" r="2.05" fill="#61dafb" />
				<g stroke="#61dafb" strokeWidth="1" fill="none">
					<ellipse rx="11" ry="4.2" />
					<ellipse rx="11" ry="4.2" transform="rotate(60)" />
					<ellipse rx="11" ry="4.2" transform="rotate(120)" />
				</g>
			</svg>
			<Typography
				color="#ffffff"
				fontFamily="'Roboto', sans-serif"
				fontSize={18}
				letterSpacing={2}
				sx={{ opacity: 0.85 }}
			>
				Built with React
			</Typography>
		</Box>
	);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/screens/splash-screens/react-splash.tsx
git commit -m "feat: add React splash screen content component"
```

---

### Task 3: Create Libraries splash content component

**Files:**
- Create: `src/components/screens/splash-screens/libraries-splash.tsx`

- [ ] **Step 1: Create the libraries splash component**

Create `src/components/screens/splash-screens/libraries-splash.tsx`. This component renders a 4-column flexbox grid of 10 library logos with brand colors. Each library entry is an object in a `libraries` array for easy maintenance. Use actual SVG logos where available (TypeScript, Vite, MUI, framer motion, Node, Electron) and placeholder representative icons for the rest (Jotai, Dexie, Howler, canvas-confetti).

The layout uses flexbox with `flexWrap: 'wrap'` and `justifyContent: 'center'`, with each item having a fixed width of `25%` of the container (4 columns). The container is capped at a reasonable max-width so items don't spread too far on large screens. The bottom row (2 items) is automatically centered by `justifyContent: 'center'`.

Each library entry structure:

```ts
interface LibraryEntry {
	name: string;
	color: string;
	logo: React.ReactNode; // SVG element
}
```

The component:

```tsx
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function LibrariesSplash() {
	return (
		<Box
			display="flex"
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			height="100vh"
			width="100vw"
			bgcolor="#000"
		>
			<Box
				display="flex"
				flexWrap="wrap"
				justifyContent="center"
				maxWidth={500}
				gap={4}
			>
				{libraries.map(({ name, color, logo }) => (
					<Box
						key={name}
						display="flex"
						flexDirection="column"
						alignItems="center"
						width={90}
						gap={0.5}
					>
						{logo}
						<Typography
							color={color}
							fontFamily="'Roboto', sans-serif"
							fontSize={11}
						>
							{name}
						</Typography>
					</Box>
				))}
			</Box>
		</Box>
	);
}
```

The `libraries` array contains 10 entries in this order: TypeScript, Vite, MUI, framer motion, Jotai, Dexie, Node, Electron, Howler, canvas-confetti. Each has an inline SVG element sized at 48x48 (or proportional).

SVG sources for actual logos:
- **TypeScript**: Blue rounded rect with white "TS" lettering
- **Vite**: Lightning bolt with purple-to-blue and yellow-to-orange gradients
- **MUI**: Blue stylized "M" shape from the official MUI logo
- **framer motion**: Three-segment "F" mark in red/magenta/purple
- **Node.js**: Green hexagonal Node.js wordmark path
- **Electron**: Atom orbital shape (3 ellipses + center dot) in light cyan

Placeholder icons:
- **Jotai**: Ghost-face circle (the Jotai mascot) in light gray
- **Dexie**: Database/table rounded rect in amber (#e8a427)
- **Howler**: Sound wave circle in yellow (#f7df1e)
- **canvas-confetti**: Scattered colored rectangles representing confetti pieces

- [ ] **Step 2: Commit**

```bash
git add src/components/screens/splash-screens/libraries-splash.tsx
git commit -m "feat: add libraries splash screen content component"
```

---

## Chunk 2: Orchestrator and Integration

### Task 4: Create SplashSequence orchestrator

**Files:**
- Create: `src/components/screens/splash-sequence.tsx`

- [ ] **Step 1: Create the splash sequence component**

Create `src/components/screens/splash-sequence.tsx`. This is the core orchestrator that manages the fade-in → hold → fade-out cycle for each splash screen.

**State machine:**
- `phase`: `'fade-in' | 'hold' | 'fade-out'`
- `screenIndex`: which splash screen is currently showing (0-based)
- `isTransitioning`: boolean flag to gate skip input during fade-out

**Phase flow:**
1. Start with `phase: 'fade-in'`, `screenIndex: 0`
2. On fade-in complete (`onAnimationComplete`): set `phase: 'hold'`, start hold timer
3. On hold timer complete: set `phase: 'fade-out'`, `isTransitioning: true`
4. On fade-out complete (`onAnimationComplete`):
   - If more screens: increment `screenIndex`, set `phase: 'fade-in'`, `isTransitioning: false`
   - If no more screens: call `setActiveScreen(Screens.Title)`

**Skip handling:**
- Register `click`, `touchstart` (passive), `keydown` listeners on `document` via `useEffect`
- On any event:
  - If `isTransitioning` (fade-out in progress): no-op
  - If `phase === 'fade-in'`: set `phase: 'fade-out'`, `isTransitioning: true`. The fade-out duration should be proportional to current progress (use a ref tracking the animation start time to compute elapsed fraction, then fade out for `FADE_DURATION * elapsedFraction`)
  - If `phase === 'hold'`: clear hold timer, set `phase: 'fade-out'`, `isTransitioning: true`

**Animation approach:**
- Single `motion.div` wrapper with `animate={{ opacity }}` controlled by phase state
- `opacity: 1` for fade-in/hold, `opacity: 0` for fade-out
- `transition: { duration, ease: 'easeInOut' }`
- `onAnimationComplete` callback drives phase transitions
- Content swapped by rendering `splashScreens[screenIndex].content` as a component

**Constants:**

```ts
const FADE_DURATION = 1000; // ms, but framer-motion uses seconds: 1

const splashScreens = [
	{ id: 'react', content: ReactSplash, holdDuration: 2000 },
	{ id: 'libraries', content: LibrariesSplash, holdDuration: 2000 },
];
```

**Component skeleton:**

```tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSetActiveScreen } from '@/atoms';
import { Screens } from '@/types';
import ReactSplash from './splash-screens/react-splash';
import LibrariesSplash from './splash-screens/libraries-splash';

const FADE_SECONDS = 1;

const splashScreens = [
	{ id: 'react', content: ReactSplash, holdDuration: 2000 },
	{ id: 'libraries', content: LibrariesSplash, holdDuration: 2000 },
];

type Phase = 'fade-in' | 'hold' | 'fade-out';

export default function SplashSequence() {
	const [screenIndex, setScreenIndex] = useState(0);
	const [phase, setPhase] = useState<Phase>('fade-in');
	const isTransitioning = useRef(false);
	const holdTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const fadeStartRef = useRef(Date.now());
	const setActiveScreen = useSetActiveScreen();

	const currentScreen = splashScreens[screenIndex];

	// Handle skip/advance input
	// ... register click, touchstart (passive), keydown on document
	// ... on event: check isTransitioning, compute proportional fade-out if in fade-in, etc.

	// Hold timer effect
	// ... when phase === 'hold', start timeout for currentScreen.holdDuration

	// onAnimationComplete handler
	// ... drives phase transitions and screen advancement

	// Compute opacity and transition duration from phase
	const opacity = phase === 'fade-out' ? 0 : 1;
	// For proportional fade-out during skip, track with a ref and compute duration

	const Content = currentScreen?.content;
	if (!Content) return null;

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity }}
			transition={{ duration: FADE_SECONDS, ease: 'easeInOut' }}
			onAnimationComplete={handleAnimationComplete}
			style={{ position: 'fixed', inset: 0, zIndex: 1 }}
		>
			<Content />
		</motion.div>
	);
}
```

The full implementation fills in the skip handler, hold timer effect, animation complete handler, and proportional fade-out duration tracking as described above. Use refs for mutable state that shouldn't trigger re-renders (`isTransitioning`, `holdTimerRef`, `fadeStartRef`).

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: Pass (or only the pre-existing `app.tsx` error about missing Splash in ScreenComponents).

- [ ] **Step 3: Commit**

```bash
git add src/components/screens/splash-sequence.tsx
git commit -m "feat: add SplashSequence orchestrator component"
```

---

### Task 5: Wire up splash screen in app.tsx

**Files:**
- Modify: `src/app.tsx:25-44`

- [ ] **Step 1: Add lazy import and ScreenComponents entry**

In `src/app.tsx`, add the lazy import alongside the other screen imports:

```ts
const SplashSequence = lazy(() => import('./components/screens/splash-sequence'));
```

Add `Splash` to the `ScreenComponents` map:

```ts
const ScreenComponents = {
	[Screens.Splash]: SplashSequence,
	[Screens.Title]: TitleScreen,
	[Screens.Game]: Game,
	// ... rest unchanged
} as const;
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: Pass (all `Screens` enum values now mapped in `ScreenComponents`).

- [ ] **Step 3: Commit**

```bash
git add src/app.tsx
git commit -m "feat: wire splash screen into app routing"
```

---

### Task 6: Gate title screen animations behind splashCompleteAtom

**Files:**
- Modify: `src/components/screens/title-screen.tsx`

- [ ] **Step 1: Import splash atoms**

Add imports at the top of `title-screen.tsx`:

```ts
import { useSplashComplete, useSetSplashComplete } from '../../atoms';
```

(Add to the existing import from `'../../atoms'`.)

- [ ] **Step 2: Add splash-aware fade-in wrapper and animation gating**

Inside the `Landing` component function body:

```ts
const splashComplete = useSplashComplete();
const setSplashComplete = useSetSplashComplete();
```

**Gate the demo phase initialization:** Change the initial state of `phase`:

```ts
// Before:
const [phase, setPhase] = useState<DemoPhase>('dealing');

// After:
const [phase, setPhase] = useState<DemoPhase>(splashComplete ? 'dealing' : 'waiting');
```

Add `'waiting'` to the `DemoPhase` type:

```ts
type DemoPhase = 'waiting' | 'dealing' | 'idle' | 'selecting' | 'matched' | 'empty';
```

The `'waiting'` phase is not in `timedPhases`, so the existing timed-phase `useEffect` will be a no-op. No card animations play.

**Gate the title/button animations:** The existing `initialState` variable controls whether title text and buttons animate. Modify it:

```ts
// Before:
const initialState = prefersReducedMotion ? false as const : 'hidden' as const;

// After:
const initialState = (prefersReducedMotion || splashComplete) ? false as const : 'hidden' as const;
```

When `splashComplete` is `true` (non-cold-start), animations render immediately without stagger — matching current behavior. When `false` (arriving from splash), `initialState` is `'hidden'` and the `animate="visible"` triggers after the fade-in completes.

**Fade-in wrapper:** Wrap the entire `<Container>` return in a `motion.div` that fades in only on first arrival from splash:

```tsx
const handleFadeInComplete = useCallback(() => {
	if (splashComplete) return;
	setSplashComplete(true);
	setPhase('dealing');
}, [splashComplete, setSplashComplete]);

return (
	<motion.div
		initial={{ opacity: splashComplete ? 1 : 0 }}
		animate={{ opacity: 1 }}
		transition={splashComplete ? { duration: 0 } : { duration: 1, ease: 'easeInOut' }}
		onAnimationComplete={handleFadeInComplete}
	>
		<Container sx={{textAlign: 'center'}}>
			{/* ... existing content unchanged ... */}
		</Container>
	</motion.div>
);
```

When `splashComplete` is `true`: initial opacity is 1, duration is 0, so nothing animates and `handleFadeInComplete` is a no-op. When `false`: fades in over 1s, then sets `splashComplete` to `true` and starts the demo loop.

- [ ] **Step 3: Gate button animation start behind splashComplete**

The button container's `animate` prop currently references `isPlatformReady`. It should also wait for splash completion:

```ts
// Before:
animate={isPlatformReady ? 'visible' : initialState}

// After:
animate={(isPlatformReady && splashComplete) ? 'visible' : initialState}
```

This ensures buttons don't stagger-animate while the screen is still fading in.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: Pass.

- [ ] **Step 5: Run dev server and verify manually**

Run: `npm run dev`

Verify:
1. App starts on black screen with React logo + "Built with React" — fades in over 1s, holds 2s, fades out 1s
2. Libraries grid appears — fades in over 1s, holds 2s, fades out 1s
3. Title screen fades in over 1s
4. Card demo animation starts only after title is fully visible
5. Title text and buttons appear after fade-in (stagger animations)
6. Clicking/tapping/pressing a key during any splash screen advances to the next
7. Navigating away and back to title screen shows no fade-in, animations start immediately

- [ ] **Step 6: Commit**

```bash
git add src/components/screens/title-screen.tsx
git commit -m "feat: gate title screen animations behind splash completion"
```
