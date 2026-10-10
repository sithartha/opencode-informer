# Tasks

## 1. System variants

- [x] 1.1 In `app/src/theme.ts`, add `{ id: "system", name: "System" }` to the `tunes` and
  `classic-os` `options`, and make each `resolve` follow `systemScheme`: Tunes `system` → dark ?
  `tunesClassic` : `tunesBento`; Classic OS `system` → dark ? `classicOSDark` : `classicOSBlue`.
  Verify: `app/test/theme.test.ts` covers the new options and light/dark resolution; `cd app && npm test`.

## 2. Square Tunes

- [x] 2.1 In `app/src/styles.ts`, make `createTunesStyles` zero every corner radius — including
  the full-pill tokens and `freeformInput` / `themeSwatch` — so the Tunes UI has square corners.
  Verify: `app/test/dashboard.test.tsx` asserts the radii are 0; `cd app && npm run typecheck`
  and `npm run test:components`.
- [x] 2.2 In `app/src/components.tsx`, set the hero panel and the session/pending card radii to
  `0` for Tunes. Verify: `cd app && npm run test:components` renders the Tunes hero square.

## 3. Gold mark

- [x] 3.1 In `app/src/themeMark.tsx`, tint the Tunes bolt **yellow-gold** on the dark Classic
  variant and with `theme.accent` on Bento. Verify: `app/test/dashboard.test.tsx` asserts the gold tint.
- [x] 3.2 Extend `app/scripts/make-theme-assets.swift` to also render `mark-bolt-gold.png` and
  `mark-bolt-orange.png` into `app/assets/liveActivity/`, and run it. Verify: both files exist.
- [x] 3.3 In `app/src/liveActivityState.ts`, make `activityMark` return `mark-bolt-gold` for
  Tunes dark and `mark-bolt-orange` for Tunes light. Verify: `app/test/liveActivityState.test.ts`.

## 4. Session card ordering

- [x] 4.1 In `app/src/events.ts`, add a pure `orderSessions(sessions, pendingRank)` helper that
  sorts by attention tier (pending request → running → inactive), most recent request first within
  the attention tier, stable otherwise; use it in `app/App.tsx`. Verify: `app/test/events.test.ts`.

## 5. Single Live Activity

- [x] 5.1 In `app/src/liveActivityController.ts`, gate `render()` from starting while a stop is
  settling and best-effort end the remembered id before any `startActivity`. Verify:
  `app/test/liveActivityController.test.ts` asserts no overlapping starts.
- [x] 5.2 Await the launch cleanup before the first start: `liveActivity.deferUntil(endStaleLiveActivity())`
  is armed before the first `update`. Verify: the controller test covers a leftover id being ended
  before the first start.

## 6. Classic OS window chrome

- [x] 6.1 In `app/src/styles.ts`, add window-chrome tokens (`osWindowBar`, `osWindowTitle`,
  `osWindowPhase`, `osCtlBtn`, `osCtlGlyph`, `osCloseBtn`, `osCloseGlyph`) to the base, and make
  `createClassicOSStyles` style `section` headers as title bars and the Stop control as a
  window-control button. Verify: `cd app && npm run typecheck` and `npm run test:components`.
- [x] 6.2 In `app/src/components.tsx` `SessionCard`, render the header as a classic desktop window
  title bar when the Classic OS theme is selected — a blue gradient bar with a white title, the
  close control as the red window close button with a white cross, and Stop as a window-control
  button — keeping the other themes' header unchanged. Verify: `app/test/dashboard.test.tsx`
  renders the Classic OS title bar and controls; `npm run test:components` passes.
- [x] 6.3 Refine the Classic OS chrome: the window title bar sits flush at the top of the card
  (moved outside the card padding), the phase status sits before the Stop control, and the
  "Sessions" header renders as a pill. Verify: `cd app && npm run typecheck` and
  `npm run test:components`.
- [x] 6.4 Style the session's current directory as a classic desktop path (an address-bar field
  with a folder icon) for the Classic OS theme in `app/src/styles.ts` and
  `app/src/components.tsx`. Verify: `app/test/dashboard.test.tsx` renders the address bar;
  `npm run test:components` passes.

## 7. Integration

- [x] 7.1 Run `cd app && npm test`, `cd app && npm run test:components`, and
  `cd app && npm run typecheck`. Verify: every command exits 0.
- [x] 7.2 Build to a device (local Release or EAS) and check on the phone: Tunes/Classic OS show
  a System variant, the Tunes UI is square with a gold dark mark, Classic OS shows window title
  bars with close/Stop window controls, the session cards order attention → working → inactive,
  and reconnecting / switching themes leaves exactly one Live Activity. Verify: the build installs
  and each check holds.
