# About Screen Crossplatform Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the About screen into line with the crossplatform screen pattern used by HelpScreen and LeaderboardScreen — 100vh flex layout, scrollable content, controller-aware navigation.

**Architecture:** Single-file refactor of `about-screen.tsx`. Replace the current `Container` with a `100vh` flex column layout, swap the inline back button for a fixed `Fab` (mouse/touch) or `ButtonPromptsBar` (controller), and add `useScrollable` for controller scrolling.

**Tech Stack:** React, MUI, Jotai, existing project hooks (`useScrollable`, `useBackAction`, `useActiveController`)

---

### Task 1: Refactor About Screen Layout and Navigation

**Files:**
- Modify: `src/components/screens/about-screen.tsx`

**Reference files (read before starting):**
- `src/components/screens/help-screen.tsx` — primary pattern to replicate
- `src/components/screens/leaderboard-screen.tsx` — secondary reference
- `src/components/screens/about-screen.tsx` — current implementation

- [ ] **Step 1: Read reference files**

Read `help-screen.tsx` and `leaderboard-screen.tsx` to confirm the exact pattern. Key elements to replicate:
- `Container` with `sx={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}`
- `useRef<HTMLDivElement>(null)` for content ref
- `useScrollable({ ref: contentRef })` call
- Scrollable `Box` with `ref={contentRef}`, `flex={1}`, `overflow="auto"`
- Conditional `ButtonPromptsBar` (controller) vs `Fab` (no controller) fixed at bottom

- [ ] **Step 2: Rewrite about-screen.tsx**

Replace the full contents of `src/components/screens/about-screen.tsx` with:

```tsx
import { Box, Container, Fab, Typography, Button } from '@mui/material';
import {
	MusicNote as MusicNoteIcon,
	ArrowBack as ArrowBackIcon,
	GitHub as GitHubIcon,
	GraphicEq as GraphicEqIcon,
	Launch as LaunchIcon,
} from '@mui/icons-material';
import { useSetActiveScreen, useActiveController } from '@/atoms';
import { Screens } from '@/types';
import { useScrollable } from '@/focus/useScrollable';
import { useBackAction } from '@/input/useBackAction';
import { InputAction } from '@/input/input-types';
import { ButtonPromptsBar } from '@/components/button-prompts';
import { useRef } from 'react';

export default
function AboutScreen() {
	const setActiveScreen = useSetActiveScreen();
	const activeController = useActiveController();
	const contentRef = useRef<HTMLDivElement>(null);

	useScrollable({ ref: contentRef });
	useBackAction(() => setActiveScreen(Screens.Title));

	return (
		<Container sx={{
			height: '100vh',
			display: 'flex',
			flexDirection: 'column',
			position: 'relative',
		}}>
			<Typography
				fontWeight={100}
				variant="h1"
				fontSize={40}
				paddingTop={2}
				textAlign="center"
			>
				All <em>or</em> Nothing
			</Typography>
			<Box
				ref={contentRef}
				flex={1}
				overflow="auto"
				paddingBottom={2}
			>
				<Box maxWidth={400} margin="0 auto" textAlign="center">
					<Typography>
						version {__APP_VERSION__}
					</Typography>
					<Typography>
						By David Granado
					</Typography>
					<Box paddingTop={5}>
						<Button
							fullWidth
							startIcon={<GitHubIcon/>}
							endIcon={<LaunchIcon />}
							target="_blank"
							href="https://github.com/david0178418/all-or-nothing"
						>
							Github Repo
						</Button>
					</Box>
					<Box paddingTop={3}>
						<Typography component="em">
							Theme for a One-Handed Piano Concerto
						</Typography>
						<Typography component="em">
							Little Prelude and Fugue
						</Typography>
						<Button
							fullWidth
							startIcon={<MusicNoteIcon/>}
							endIcon={<LaunchIcon />}
							target="_blank"
							href="https://www.youtube.com/channel/UC3edSSIDJPTZmBM-m9_G3Nw"
						>
							by Sir Cubworth
						</Button>
					</Box>
					<Box paddingTop={3}>
						<Typography component="em">
							No.9_Esther's Waltz
						</Typography>
						<Button
							fullWidth
							startIcon={<MusicNoteIcon/>}
							endIcon={<LaunchIcon />}
							target="_blank"
							href="https://www.youtube.com/channel/UCOFrldzxeKGG8fTpN5_d75Q"
						>
							By Esther Abrami
						</Button>
					</Box>
					<Box paddingTop={3}>
						<Typography component="em">
							Baroque Coffee House
						</Typography>
						<Button
							fullWidth
							startIcon={<MusicNoteIcon/>}
							endIcon={<LaunchIcon />}
							target="_blank"
							href="https://www.youtube.com/watch?v=Spo9h2opVAs&list=RDSpo9h2opVAs"
						>
							By Doug Maxwell/Media Right Productions
						</Button>
					</Box>
					<Box paddingTop={3}>
						<Typography component="em">
							Sonatina No 2 in F Major Allegro
						</Typography>
						<Button
							fullWidth
							startIcon={<MusicNoteIcon/>}
							endIcon={<LaunchIcon />}
							target="_blank"
							href="https://www.youtube.com/channel/UCKgGBUFCIZjmC-Lqy8kmJ5w"
						>
							By Joel Cummins
						</Button>
					</Box>
					<Box paddingTop={3}>
						<Button
							fullWidth
							startIcon={<GraphicEqIcon/>}
							endIcon={<LaunchIcon />}
							target="_blank"
							href="https://pixabay.com/sound-effects/book-foley-turn-pages-7-189812/"
						>
							Sounds by floraphonic
						</Button>
					</Box>
					<Box paddingTop={3}>
						<Button
							fullWidth
							startIcon={<GraphicEqIcon/>}
							endIcon={<LaunchIcon />}
							target="_blank"
							href="https://pixabay.com/sound-effects/success-221935/"
						>
							Also by updatepelgo
						</Button>
					</Box>
				</Box>
			</Box>
			{activeController && (
				<Box
					sx={{
						position: 'fixed',
						bottom: 16,
						left: 16,
					}}
				>
					<ButtonPromptsBar
						controllerType={activeController}
						prompts={[
							{ action: InputAction.BACK, label: 'Back' },
						]}
					/>
				</Box>
			)}
			{!activeController && (
				<Fab
					color="primary"
					aria-label="back"
					onClick={() => setActiveScreen(Screens.Title)}
					sx={{
						position: 'fixed',
						bottom: 16,
						right: 16,
					}}
				>
					<ArrowBackIcon />
				</Fab>
			)}
		</Container>
	);
}
```

Key changes from current implementation:
- Container uses `100vh` flex column layout instead of plain centered container with `paddingTop: 10`
- Content wrapped in a scrollable `Box` with `ref={contentRef}`, `flex={1}`, `overflow="auto"`
- Inner content uses `maxWidth={400}` instead of hardcoded `width={300}`
- Removed inline "Back" button from content area
- Added `Fab` (no controller) and `ButtonPromptsBar` (controller) fixed at bottom — matching help-screen pattern exactly
- Added `useScrollable` for controller/keyboard scrolling
- Removed unused imports: `InputAction` from old back button glyph logic, `ButtonGlyphMap`, `useBackAction` (wait — `useBackAction` is still used), removed `ButtonGlyphMap` and the glyph rendering logic since the `ButtonPromptsBar` handles that internally

- [ ] **Step 3: Verify types**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 4: Manual verification**

Run: `npm run dev`

Verify:
- About screen fills viewport height
- Credits content scrolls within the middle area on short viewports
- Back FAB appears bottom-right (when no controller active)
- Clicking FAB or pressing Escape returns to title screen
- External links still open in new tab
- Title stays pinned at top while content scrolls

- [ ] **Step 5: Commit**

```bash
git add src/components/screens/about-screen.tsx
git commit -m "refactor: make about screen crossplatform-friendly

Match help-screen/leaderboard-screen pattern: 100vh flex layout,
scrollable content area, controller-aware navigation (ButtonPromptsBar
or Fab), useScrollable for gamepad/keyboard scrolling."
```
