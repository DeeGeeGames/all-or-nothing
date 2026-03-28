# About Screen Crossplatform Redesign

## Problem

The About screen uses a plain web-page layout (fixed padding, hardcoded width, inline back button, no controller support) that doesn't match the crossplatform patterns established by HelpScreen and LeaderboardScreen.

## Design

Bring the About screen into line with the established crossplatform screen pattern used by HelpScreen and LeaderboardScreen. No new abstractions — just consistency.

### Layout

- Use `100vh` flex column container with `position: relative`
- Title ("All *or* Nothing", version, author) pinned at top
- Scrollable content area (`flex: 1`, `overflow: auto`) for credits
- Remove hardcoded `paddingTop: 10` and `width: 300`
- Content centers naturally; apply a reasonable max-width to the credits list within the scroll area

### Input & Navigation

- Add `useScrollable({ ref: contentRef })` so controller/keyboard users can scroll the credits
- `useBackAction` already present — keep it
- When `activeController` is truthy: show `ButtonPromptsBar` fixed bottom-left with a single "Back" prompt
- When `activeController` is falsy: show MUI `Fab` with `ArrowBackIcon` fixed bottom-right
- Remove the existing inline "Back" `Button` from the content area

### External Links

- Keep existing `target="_blank"` + `href` behavior unchanged
- No `openExternal` bridge needed at this time

### What Stays the Same

- All content (GitHub link, music credits, sound credits)
- All external link buttons and their icons
- The `useBackAction` hook call
- The controller-aware back button glyph logic (moves to the Fab / ButtonPromptsBar instead of the inline button)

### Viewport Adaptation

- No side-by-side layout. The about content is a single column of credits that reads fine vertically at all viewport sizes. The `100vh` container with scrollable content handles short viewports naturally.

## Files Changed

- `src/components/screens/about-screen.tsx` — sole file modified

## Reference

- `src/components/screens/help-screen.tsx` — primary pattern to match
- `src/components/screens/leaderboard-screen.tsx` — secondary reference
