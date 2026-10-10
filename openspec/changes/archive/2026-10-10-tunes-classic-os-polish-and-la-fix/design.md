# Design

## Context

See `proposal.md` for motivation and the two delta specs for requirements:
`specs/mobile-companion-app/spec.md` and `specs/agent-live-activity/spec.md`.

Relevant current state:

- `app/src/theme.ts` — `SkinId` includes `tunes` and `classic-os`; each `SkinDef` has `options`
  and a `resolve(option, systemScheme)`. `Tunes` options are `classic`/`bento`; `Classic OS`
  options are `blue`/`dark`. The other themes that support System (`default`, `sanrio`,
  `starwars`) already resolve `system` from `systemScheme`.
- `app/src/styles.ts` — `createTunesStyles` spreads `createDefaultStyles` and currently sets
  small radii (4/2/1); `createClassicOSStyles` sets 6/4. Many base tokens use full pills
  (`borderRadius: 999`). The hero panel radius is chosen in `app/src/components.tsx`
  (`isTunes ? 4 : …`).
- `app/src/themeMark.tsx` — the Tunes mark is the white `bolt.png` tinted with `theme.accent`.
- `app/src/liveActivityState.ts` — `activityMark` returns `mark-bolt` for Tunes; the widget
  renders the asset as-is (`contentFit: "contain"`, no tint) from `app/assets/liveActivity/`.
- `app/src/liveActivityController.ts` — `stop()` sets `this.id = null` immediately after the
  fire-and-forget `stopActivity`; `render()` starts when `!this.id`. `refreshTheme()` already
  guards its restart with `restarting` + a 1.5 s delay ("otherwise both cards linger"), but the
  plain `stop()`/reconnect paths have no such guard. `app/src/useBridge.ts` calls
  `endStaleLiveActivity()` (async) at mount without awaiting, and the controller can start in
  that window.
- `app/App.tsx` — `sessions` is sorted so sessions with a pending request sort above those
  without (most recent request first); sessions without a request keep `Object.values` order.
  There is no working-vs-inactive tiering today.

## Goals / Non-Goals

**Goals:**
- Tunes and Classic OS get a System variant consistent with the other themes.
- Tunes renders with square corners everywhere and a yellow-gold dark mark.
- The app never shows two lock-screen activity cards for the same app.

**Non-Goals:**
- No change to Default/Nerv/Cat/The Force behavior or palettes.
- No native widget rewrite; the Live Activity mark stays a bundled PNG (no runtime tint).

## Decisions

**1. System variants through the catalog.** Add `system` to each new skin's `options` and make
`resolve` follow `systemScheme`: Tunes `system` → dark ? `tunesClassic` : `tunesBento`; Classic
OS `system` → dark ? `classicOSDark` : `classicOSBlue`. `ThemeOption` already includes `system`
(via `DefaultMode`) and `resolveTheme` already threads `systemScheme`, so only the two `SkinDef`
entries change. `defaultOption` stays `classic` / `blue` (matching how Cat/The Force keep a
non-System default); recorded as an assumption, not a requirement.

**2. Square corners for Tunes via the existing override pattern.** `createTunesStyles` already
spreads the base and overrides tokens, so zero the radii there rather than writing a new design
system: every token with a radius — including the `999` pills (`statusPill`, `badge`,
`metaChip`, `dirChip`, `costChip`, `stopButton`, `heroSecondary`, `heroAdd`) — gets
`borderRadius: 0`. The hero panel radius in `components.tsx` becomes `0` for Tunes. Alternative
(a dedicated `createSquareStyles` base) was rejected as a larger diff for the same result.

**3. Gold mark, per-variant assets for the widget.** The in-app bolt is a white PNG tinted at
render, so `themeMark` simply tints it gold on the dark Tunes variant and with `theme.accent` on
Bento. The Live Activity widget renders its PNG untinted, so a white bolt would be invisible on
the light Bento surface: produce two pre-colored bolt assets with the existing generator
(`app/scripts/make-theme-assets.swift`) — `mark-bolt-gold.png` (Classic) and `mark-bolt-orange.png`
(Bento, matching the Bento accent) — and have `activityMark` return the matching name. Alternative
(native tint in the Swift view) was rejected as a native change for a purely cosmetic need.

**4. One activity at a time.** Two mechanisms:
- **Serialize end→start in the controller.** Generalize the `refreshTheme` guard into an
  `ending`/`restarting` gate: while a stop is settling, `render()` does not start. `stop()`
  enters the gate and leaves it after the settle interval (and immediately when nothing is
  running); `refreshTheme()` and the disconnect-timeout stop both use this path. Before any
  `startActivity`, the controller best-effort ends its remembered id so a lingering card cannot
  produce a second one.
- **Clear leftovers before the first start.** Move the launch cleanup so the first `render`
  cannot start until `endStaleLiveActivity()` has completed: expose an awaited cleanup from
  `liveActivity.ts` and have `useBridge` await it before wiring activity updates (or have the
  controller gate its first start on it). This closes the mount-time race after a reinstall or
  relaunch, which is the likely cause of the reported duplicate.

Alternatives considered: relying only on the existing 1.5 s delay (doesn't cover `stop()` on the
disconnect path); or catching the "Maximum number of activities" native error and retrying
(fixes the symptom only when the platform raises).

**5. Tiered card ordering.** Replace the inline sort in `App.tsx` with a small pure
`orderSessions(sessions, pendingRank)` helper (attention → working → inactive, most recent
request first within attention, stable otherwise) so it can be unit-tested. Alternatives: an
inline comparator (untestable) or a components-level test (awkward).

**6. Classic OS window chrome.** Render headers as desktop window title bars: the base styles get
`osWindowBar` / `osWindowTitle` / `osWindowPhase` / `osCtlBtn` / `osCtlGlyph` / `osCloseBtn` /
`osCloseGlyph` tokens, `createClassicOSStyles` turns the `section` text into a solid accent title
bar and the Stop control into a window button, and `SessionCard` wraps its header in the theme's
gradient title bar for the Classic OS skin (blue gradient, white title, the close control as a
red button with a white cross, Stop as a window-control button). Only the Classic OS skin changes;
the other skins keep the plain header. Reusing the existing hero title bar (`osTitleRow`) instead
of a new component keeps it consistent.

**7. Tests.** Extend `app/test/theme.test.ts` for the new `system` options and their
light/dark resolution; `app/test/dashboard.test.tsx` for a square Tunes hero and the gold mark;
`app/test/events.test.ts` for the `orderSessions` tiers; `app/test/liveActivityController.test.ts`
to assert a replacement (theme change, reconnect after a timeout stop) never results in two
overlapping starts and that a left-over id is ended before the first start.

## Risks / Trade-offs

- **The exact settle interval is empirical** → keep the existing 1.5 s constant, shared by all
  replacement paths, and make it a named constant so it is tunable.
- **Static per-variant widget assets don't follow a future accent change** → acceptable for a
  cosmetic mark; note it next to the asset generator.
- **The duplicate is timing-dependent and hard to reproduce in unit tests** → assert the
  invariant (no start while an end is settling) rather than the racing wall-clock behavior.
- **Adding a third option changes the picker width** → the existing segmented control already
  renders three options for Default/Cat/The Force.

## Open Questions

- Whether Tunes/Classic OS should default to System rather than Classic/Blue is a product call
  that does not change the specs or the task breakdown; keep the current default unless asked.
