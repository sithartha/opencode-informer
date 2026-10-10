# Design

## Context

The lock-screen activity is rendered by the `LiveActivity` widget extension (created by `expo-live-activity`, with the view customized in `app/plugins/liveActivity/LiveActivityView.swift`). The app drives it through `app/src/liveActivity.ts` and `liveActivityController.ts`, building the payload in `liveActivityState.ts`. Today the payload is theme-blind: `LIVE_ACTIVITY_CONFIG` is a fixed black/white card and `activityState()` always returns the `"oi"` image.

Constraints observed in the code and the library:

- `expo-live-activity` splits data into a **`LiveActivityConfig`** set when the activity **starts** (`backgroundColor`, `titleColor`, `subtitleColor`, `contentFit`, `imageSize`, padding, …) and a **`LiveActivityState`** that can be updated (`title`, `subtitle`, `imageName`, `dynamicIslandImageName`). Colors are fixed at start, so a theme change requires restarting the activity.
- The widget resolves `imageName` from the shared App Group container (`group.expoLiveActivity.sharedData`) or `UIImage(named:)` in the **widget's own bundle** — not the app bundle.
- Themes live in `app/src/theme.ts` (`SKINS` with per-skin palettes and `name`/`description`), resolved by `resolveTheme(skin, option, systemScheme)`. The dashboard hero (`HeroCard`) already renders a per-skin look.

## Goals / Non-Goals

**Goals:**
- The activity mirrors the active theme: its palette (background, text) and its mark, plus the theme's hero label where the hero shows one.
- A theme change (selection or a theme's look) updates a running activity; when it cannot change in place, the activity restarts.
- Theme display names/descriptions are de-trademarked (Default / Nerv / Cat / The Force).

**Non-Goals:**
- Pixel-perfect reproduction of every hero element (chips, buttons) — the activity keeps its count + per-state summary; only its look is themed.
- The Android ongoing-notification equivalent (kept as-is here).
- Renaming internal skin/variant ids or migrating stored selections.

## Decisions

### 1. Theme data reaches the activity through config + state
Map the resolved `Theme` to the widget: `backgroundColor` ← theme background/surface, `titleColor` ← theme text, `subtitleColor` ← theme secondary text, and `imageName` ← the theme mark. Keep `contentFit: "contain"` and the fixed image size (the existing layout fix).

- Alternatives: a JSON blob in `subtitle` (rejected: brittle, no color channel); colors only (rejected: loses the hero's mark identity).

### 2. Marks reach the widget through the widget bundle
Copy the theme mark PNGs into the Live Activity widget's asset catalog during prebuild by extending `withLiveActivityView` (which already ships tracked files into the generated target). The activity references each mark by asset name.

- Alternatives: copy the mark into the shared App Group container at runtime (rejected: extra file I/O and a second source of truth); keep only `"oi"` (rejected: no per-theme identity).

### 3. A theme change restarts the activity
Add `LiveActivityController.setTheme(theme)`: when the theme changes while an activity runs, stop and start it with the new config; when idle, remember it for the next start. Observe the theme where the app already tracks `skin`/`themeOption` (`useBridge`/`App`).

- Alternatives: rely on `updateActivity` alone (rejected: colors are fixed at start); look for a config-update API (none exposed by the library).

### 4. Hero label inside the activity
Surface the theme's hero header text (the Sanrio / faction / MAGI header) as a header line: the app prepends a marker-prefixed line to the subtitle and the widget renders a marker-prefixed line as a dot-less caption. The numeric count stays the activity title.

- Alternatives: overload the title with the label (rejected: the widget derives the big number from the title); skip the label (rejected: the goal is "as close to the hero as possible").

### 5. Renames and de-trademarks are catalog-only
Change `SKINS[].name`/`description` in `theme.ts` (Default / Nerv / Cat / The Force; descriptions use neutral synonyms or abbreviations). Keep internal ids (`default`/`evangelion`/`sanrio`/`starwars`) and variant ids unchanged so stored selections keep working.

- Alternatives: rename the ids too (rejected: needs a migration and touches persistence for no user-visible gain).

### 6. Hero collapse tracks the hero's height
Drive the expanded hero's fade/translate from the hero's measured height (via `onLayout`) instead of a fixed pixel range, overlapping it with the compact form's range so the compact header takes over exactly as the expanded hero leaves the viewport. `App.tsx` already drives `heroExpandedOpacity`/`heroCompactOpacity` from `heroScrollY`; the change widens those ranges to the measured height. Where feasible, morph the expanded hero into the compact form rather than only fading it.

- Alternatives: keep the fixed 72px fade (rejected: it leaves a gap of empty space before the cards); a full shared-element morph across both trees (deferred — costly, and the full-height fade already removes the gap).

## Risks / Trade-offs

- Restarting the activity on a theme change causes a brief disappear/reappear — acceptable for a rare, explicit action.
- Adding marks to the widget asset catalog grows the widget bundle slightly.
- The marker-prefixed subtitle line couples the app payload to the widget renderer; both live in this repo and the payload stays human-readable.
- De-trademark wording must be reviewed so no trademarked term remains in theme names/descriptions.
- The hero collapse depends on a measured hero height; if the measurement is missing the fade range must fall back to a sensible default so the transition never breaks.
