# Promotion concepts

Run `bun run dev --host 0.0.0.0`, then open `/docs/promotion-concepts/` for the interactive comparison. These isolated HTML/CSS/JavaScript mocks preserve the original design exploration, including rotation controls and placeholder games. Main-menu buttons are visual context. Promotion browsing, dismissal, the game shelf, and destination previews work.

The implemented version uses one dismissible Steam banner on non-Steam title menus, with no rotation controls. Extra → More from DeeGee Games opens the shelf on every platform. The shelf currently links to All or Nothing on Steam for web and standalone players, and to its free web release for Steam players. Math Marsh can be added when its store listing is ready. The proposals below describe the original concepts rather than the final implementation.

## Three treatments

| Concept | Placement | Benefit | Tradeoff |
| --- | --- | --- | --- |
| **Menu ribbon — recommended** | Below the title-menu composition, in normal layout flow | Visible without competing with Play; the same component works across platforms | Needs a reserved slot and responsive title-menu spacing |
| Corner postcard | Lower right on roomy desktop/TV screens; below the menu on mobile and short landscape screens | More space for game artwork; uses otherwise empty space | Visually detached from the menu; more placement and controller-navigation work |
| Optional game shelf | “More games” title-menu entry; opens a separate catalog screen | Most discreet; scales to a larger catalog | Less exposure; adds a menu action |

Suggested combination: ribbon plus optional shelf. A card can link to its store page; a small “More games” entry can lead to the full catalog when there are enough games to justify it. The mock demonstrates the treatments separately for comparison.

## Platform and layout behavior

- **Browser / PWA:** Steam edition of this game plus eligible other games. Open an HTTPS Steam store page in a new tab after an explicit click. Mobile uses a compact card below the menu, with no fixed overlay. One next arrow cycles the catalog; its touch target remains 44px.
- **Standalone Electron:** same eligible content as the web build, plus the existing Quit action. Route store links through a narrow, validated main-process handler to the default browser. The current `electron/main.ts` does not expose a general external-link handler.
- **Steam desktop, Deck, or TV:** exclude this game's Steam app ID regardless of Steam API initialization, network availability, or overlay availability. Show other released games only. If none qualify, omit the card entirely. TV text and focus rings are larger, with generous edge margins. At handheld resolutions, use the compact desktop layout with controller navigation.
- Do not infer Steam distribution from `window.electronAPI`: both desktop releases use it. Do not infer it from `usePlatform().isAvailable`: Steam initialization failure must not cause the Steam build to advertise itself. Add an explicit distribution identity (`web`, `standalone`, `steam`) during packaging, optionally supplemented by the existing main-process Steam launch checks.
- The couch mock is a layout proposal at 1920×1080, not proof of readability on a physical TV. Arrow-key navigation demonstrates a possible controller path; it does not wire the game's input managers or verify Steam Input.

Steam store activation can use [`ISteamFriends::ActivateGameOverlayToStore`](https://partner.steamgames.com/doc/api/ISteamFriends#ActivateGameOverlayToStore), with the default store flag. Opening a store is always user initiated. If the overlay is unavailable, offer a deliberate browser fallback; do not launch an external browser silently.

## Rotation and nonintrusive behavior

1. Only show passive recommendations on the title menu. Consider an optional results-screen row later, below Replay and Return to menu. Keep active gameplay, pause, tutorials, first-run prompts, and multiplayer setup clear.
2. Reserve stable space so a loaded card does not move menu controls. Bundle the initial catalog and artwork. Remote refreshes, if added, may update the next menu visit; the menu must not wait for them.
3. Filter by distribution, publication status, optional launch/expiry dates, and current game ID **before** choosing the featured entry. Hide an empty catalog; hide arrows for a single entry.
4. Prefer rotation on a later title-menu visit, with a per-session cap such as at most once every five minutes. First non-Steam visit favors this game's Steam edition; later eligible visits cycle through the catalog. No timed rotation in the current view and no automatic focus changes. Manual browsing stays available.
5. If timed rotation is desired later, make it slow (20–30 seconds), pause while focused/hovered or after interaction, and disable it under reduced-motion preferences. The mocks intentionally keep entries still.
6. Hide applies to the session and never auto-reopens. The mocks include a compact restore action. A shipping “Hide recommendations” preference can persist across sessions while leaving the optional shelf available.
7. Keep the initial focus on Single Player. Promotion controls come after game actions in navigation order, with an obvious focus ring. Restore focus to the same card after returning from the store, and to “More games” after leaving the shelf.

## Suggested implementation boundary

A bundled, typed catalog with `id`, `steamAppId`, `title`, `description`, `artwork`, `releaseStatus`, and optional availability dates feeds a pure eligibility filter and selector. Keep the display component separate from platform-aware store opening and from rotation/session state. Validate any remote catalog at runtime; a failed fetch uses the bundled version.

The existing `src/components/ad-link-section.tsx` is an affiliate-link drawer: it fetches content, can reveal after 15 seconds during gameplay, and sits above modal backdrops. `src/components/screens/game-screen/game-play-area.tsx` also opens it for paused/completed games. A developer promotion slot needs a separate placement and behavior contract; reusing that reveal behavior would conflict with this proposal.

Actual game names, artwork, release status, and Steam app IDs are required for implementation. “Your next puzzle game” and “Your next arcade game” are deliberately generic catalog placeholders. The mock does not assert that either exists or is released, and self-promotion copy makes no unverified feature claims.

## Review surfaces

The comparison includes 390×844 and 360×640 portrait phones, 844×390 landscape, 1280×800 desktop/handheld, and 1920×1080 couch layouts. Also check 320px-wide browsers, intermediate tablet widths, standalone Electron with five menu actions, Steam catalog filtering, dismissed state, keyboard focus, and the scrollable mobile catalog.

`recommended-layouts.png` compares the recommended ribbon on desktop, phone, and Steam TV. `alternative-layouts.png` compares the postcard and optional shelf. These are static vector interpretations of the rendered mocks, exported with `export-vector.js` and rasterized with `rsvg-convert`; font metrics, shadows, and transformed artwork are approximate. The HTML comparison is the reference for interaction and exact rendering. T3 preview screenshot capture failed during this session, so these exports are not screenshots.

`validation.json` records browser DOM geometry and mock-interaction checks. `bun run typecheck` also passed. Native Electron link opening, the Steam overlay, Steam Input, and physical TV readability remain implementation/acceptance work.
