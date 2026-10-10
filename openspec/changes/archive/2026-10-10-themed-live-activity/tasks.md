# Tasks

## 1. Theme catalog: rename and de-trademark

- [x] 1.1 In `app/src/theme.ts`, rename the skin display names — Evangelion → **Nerv**, Hello Kitty → **Cat**, Star Wars → **The Force** (Default unchanged) — leaving internal skin/variant ids untouched.
- [x] 1.2 Rewrite each skin `description` so it uses neutral synonyms or abbreviations and contains no trademarked term (describe variants generically where needed).
- [x] 1.3 Check every place that shows the theme name/description (Settings picker, previews) reads correctly with the new strings.

## 2. Theme → Live Activity payload

- [x] 2.1 In `app/src/liveActivityState.ts`, build the activity config from the resolved `Theme`: background ← theme surface/background, title color ← theme text, subtitle color ← theme secondary text; keep the existing `contentFit` and image size.
- [x] 2.2 Set `imageName`/`dynamicIslandImageName` from the theme's mark asset name (Default keeps `"oi"`).
- [x] 2.3 Prepend the theme's hero header label as a marker-prefixed subtitle line (Default has none).

## 3. Widget rendering

- [x] 3.1 In `app/plugins/liveActivity/LiveActivityView.swift`, use the configured background/title/subtitle colors for the card.
- [x] 3.2 Render a marker-prefixed subtitle line as a dot-less header caption; keep the existing big count and per-state dot lines.
- [x] 3.3 Keep the stale and disconnected behavior (dimming, the "no connection" line) working under the theme.

## 4. Marks in the widget bundle

- [x] 4.1 The theme marks are bundled into the widget by `expo-live-activity`'s existing `assets/liveActivity/` mechanism (it copies each PNG into the target's asset catalog), so no custom plugin was needed; the marks were added there.
- [x] 4.2 Each mark has a stable asset name (`mark-kitty`, `mark-chococat`, `mark-eva00/01/02`, `mark-rebel`, `mark-empire`, `oi`) referenced by `activityMark()`.

## 5. Theme-change propagation

- [x] 5.1 Add `setTheme(theme)` to `LiveActivityController`: restart a running activity with the new config, and remember the theme when idle.
- [x] 5.2 Call it from `App.tsx` where the theme is resolved (`useEffect` on `theme`), so changing the theme or a variant re-themes a running activity.
- [x] 5.3 Cover the "theme change while running" and "while idle" scenarios from the spec.

## 6. Hero scroll transition

- [x] 6.1 Measure the hero's height (`onLayout`) and drive the expanded hero's fade/translate over that height instead of the fixed 72px range in `App.tsx`.
- [x] 6.2 Overlap the expanded-hero and compact-hero ranges so the compact form takes over as the expanded hero leaves, leaving no empty gap before the content below.
- [x] 6.3 Aim for a morph of the expanded hero into the compact form; if a true morph is not feasible, ensure the fade spans the full hero height, with a safe fallback when the height is unmeasured.

## 7. Verification

- [x] 7.1 `cd app && npm run typecheck`, `npm test`, and `npm run test:components` pass.
- [x] 7.2 Build a Release for the device and confirm the activity shows the current theme's colors and mark, and re-themes when the theme changes.
- [x] 7.3 Confirm Settings shows the new names and no trademarked terms in the descriptions.
- [x] 7.4 On the device, scroll past the hero and confirm there is no empty gap and the transition reads smoothly.
