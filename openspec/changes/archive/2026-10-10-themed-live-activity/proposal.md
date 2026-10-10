# Proposal

## Why

The lock-screen Live Activity ignores the app's themes: it is always a black "OI" card, so it looks detached from the themed app instead of extending its current look. At the same time, the theme catalog exposes trademarked names in its display names and descriptions (Evangelion, NERV, Hello Kitty, Chococat, Sanrio, Star Wars, Sith, Jedi), which we want to stop showing.

## What Changes

- **Themed Live Activity**: the lock-screen activity reflects the active theme — its colors, its mark, and a per-theme header/label — mirroring the dashboard hero as closely as the widget allows.
- **Theme changes propagate to the Live Activity**: changing the selected theme (or a theme's look) re-themes any running activity. Because the activity's colors/mark are fixed when it starts, a theme change restarts the activity with the new theme.
- **Theme display names renamed**: Evangelion → **Nerv**, Hello Kitty → **Cat**, Star Wars → **The Force** (Default unchanged).
- **Theme descriptions de-trademarked**: theme names and descriptions use neutral synonyms or abbreviations instead of trademarked terms.
- **Hero scroll transition**: the dashboard hero collapses into its pinned compact form tracking its own height, so it no longer fades out early and leaves empty space before the content below (aiming to morph the expanded hero into the compact form, with a full-height fade as the minimum).
- Internal theme ids (`default`/`evangelion`/`sanrio`/`starwars`, and the variant ids) are **unchanged**, so stored selections keep working (no migration).

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `agent-live-activity`: the activity reflects the active theme (colors and mark) and re-themes when the theme changes.
- `mobile-companion-app`: theme display names/descriptions are renamed and de-trademarked, the selected theme applies to the Live Activity, and the hero collapses into its compact form across its full height without an empty gap.

## Impact

- App theme catalog and labels: `app/src/theme.ts` (skin `name`/`description`), the Settings picker.
- Theme → Live Activity mapping: `app/src/liveActivityState.ts`, `app/src/liveActivityController.ts`, `app/src/liveActivity.ts`, and `app/src/useBridge.ts` (re-render on theme change).
- Live Activity widget: `app/plugins/liveActivity/LiveActivityView.swift` and its config plugin, plus making the theme mark available to the widget (bundle asset catalog or the shared App Group container).
- Dashboard hero scroll: `app/App.tsx` (the `heroScrollY` interpolation ranges), driven by the hero's measured height.
- No `helper/`, `mac-helper/`, or bridge changes.
