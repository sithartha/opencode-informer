# Proposal

## Why

The two retro themes added by `add-tunes-classic-os-themes` landed as first cuts. Unlike the
other themes, neither exposes a **System** variant — they only offer a fixed dark/light pair.
The **Tunes** look still carries rounded corners even though the player it evokes is square,
and its dark variant's lightning mark is not the gold it should be. Separately, the lock-screen
activity can briefly show **two cards** when the connection returns or the theme changes.

## What Changes

- **System variants for both new themes**: **Tunes** gains a **System** option (following the
  iPhone: light → Bento, dark → Classic) and **Classic OS** gains a **System** option (light →
  Blue, dark → Dark), matching Default, Cat, and The Force.
- **Square Tunes**: while **Tunes** is selected, the interface uses square corners everywhere —
  no rounding on cards, buttons, inputs, badges/pills, segments, or the hero panel.
- **Gold mark**: the **Tunes** lightning-bolt mark is **yellow-gold** on the dark **Classic**
  variant (the light Bento variant keeps the theme accent).
- **Single Live Activity**: the app SHALL keep at most one lock-screen activity, ending the
  previous one before starting a replacement across reconnects, theme changes, and app
  relaunches.
- **Session card ordering**: the dashboard orders session cards by what the user needs first —
  sessions needing attention (a pending permission or question), then working sessions, then
  inactive sessions.
- **Classic OS window chrome**: while **Classic OS** is selected, section and card headers render
  as classic desktop window title bars, the session close control becomes the window close button
  (red, white cross), and the Stop control is styled as a window-control button.
- Default, Nerv, Cat, and The Force are unchanged.

## Capabilities

### New Capabilities
<!-- none: this refines the existing theming and Live Activity capabilities -->

### Modified Capabilities

- `mobile-companion-app`: the "Interface theme selection" requirement gains **System** variants
  for Tunes and Classic OS, and the "Tunes media-player styling" requirement gains square
  corners and the gold mark on the dark variant, and a new "Session list ordering" requirement orders
  the dashboard cards by attention tier.
- `agent-live-activity`: adds a "Single live activity" requirement guaranteeing exactly one
  activity across reconnect, theme change, and relaunch.

## Impact

- `app/src/theme.ts` — add a `system` option and a system-following `resolve` for `tunes` and
  `classic-os`.
- `app/src/styles.ts` — `createTunesStyles` zeroes every corner radius; `app/src/components.tsx`
  hero panel radius for Tunes becomes 0; `createClassicOSStyles` gains the window-chrome tokens
  and `app/src/components.tsx` renders the Classic OS card header as a window title bar.
- `app/src/themeMark.tsx` — a gold tint for the Tunes dark lightning bolt.
- `app/src/liveActivityController.ts`, `app/src/liveActivity.ts`, `app/src/useBridge.ts` —
  serialize end→start so a replacement never overlaps the activity it replaces, and clear a
  leftover activity before the first start.
- `app/App.tsx` — order the dashboard session cards by attention tier (needs-attention → working
  → inactive).
- Tests: `app/test/theme.test.ts` (System variants), `app/test/dashboard.test.tsx` (square/gold
  Tunes, Classic OS window chrome, and card ordering), `app/test/events.test.ts` (ordering), and
  `app/test/liveActivityController.test.ts` (no overlapping start).
