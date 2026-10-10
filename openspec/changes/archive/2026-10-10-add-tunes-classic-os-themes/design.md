# Design

## Context

See `proposal.md` for motivation and `specs/mobile-companion-app/spec.md` for requirements.

The theming system is data-driven and already supports adding themes:

- `app/src/theme.ts` defines `SkinId`, the `Theme` shape (colors, gradients, attention kinds),
  two palettes per skin, a `SKINS` catalog of `SkinDef` entries (`id`, `name`, `description`,
  `options`, `defaultOption`, `resolve`), and `isSkinId` / `resolveTheme` / `skinDef`.
- `app/src/styles.ts` dispatches a per-skin design system in `createStyles(t)` —
  `createNervStyles`, `createStarWarsStyles`, `createSanrioStyles`, else `createDefaultStyles`.
- `app/src/components.tsx` branches on `theme.skin` for the hero and panel chrome
  (`nerv`, `rail`, `isSanrio`, …); `app/App.tsx` renders the theme list from `SKINS` and a
  per-theme variant segment from `skinDef(skin).options`.
- `app/src/themeMark.tsx` picks the header/hero mark per skin (Star Wars emblems are tinted,
  the character/unit art is full-color); `app/src/liveActivityState.ts` maps skin → Live
  Activity mark asset name, hero label, status word, and colors.
- Live Activity marks are plain PNGs in `app/assets/liveActivity/`; the `expo-live-activity`
  plugin copies that folder into the widget target's `Assets.xcassets` on prebuild
  (`getWidgetFiles.js` → `./assets/liveActivity`). Header/hero art lives in `app/assets/logos/`.
- The chosen theme is persisted as `skin` + `option` (`openisland.skin` /
  `openisland.themeOption`) with a legacy migration path; nothing else stores theme state.

## Goals / Non-Goals

**Goals:**
- Add two themes (Tunes, Classic OS) as first-class catalog entries, each with two palettes,
  a full-screen design language, a header/hero mark, and Live Activity wiring.
- Keep the change additive: existing skins, stored preferences, and screens keep working.

**Non-Goals:**
- No new theming engine, no per-screen bespoke components, no runtime skin downloads.
- No pixel-perfect reproduction of any third-party UI; we reproduce the *interface language*
  (chrome, bevels, readouts, title bars) with our own tokens and assets.
- No new persistence keys or migration steps.

## Decisions

**1. Add themes via the catalog, not a new mechanism.**
Extend `SkinId` with `"tunes"` and `"classic-os"`, add two palettes + a `SkinDef` each, and
extend `isSkinId`. `resolveTheme` / persistence pick them up unchanged. This is exactly the
"added without changing screens" contract the existing "Extensible theme catalog" requirement
promises. Alternative — a separate style-token registry — was rejected as needless.

**2. Variant ids.** Tunes: `classic` (dark) and `bento` (light); Classic OS: `blue` (light)
and `dark`. Option ids are only matched inside their own skin (`skinDef(skin).options`), and
the stored value is the `(skin, option)` pair, so reusing the literal `dark` alongside the
Default skin is unambiguous. Display labels: Classic, Bento; Blue, Dark.

**3. Design languages follow the existing `create*Styles` pattern.**
- `createTunesStyles`: dark chrome frame around panels, inset bevels (light top-left / dark
  bottom-right borders), monospace segmented readouts, square-to-slightly-rounded corners,
  and an accent level strip on the hero.
- `createClassicOSStyles`: gradient title bars (a header strip above each panel), rounded
  beveled buttons with a glossy highlight, window-like section frames, and a green
  start-style accent control.
Both preserve all `Styles` keys the screens use; the dispatch in `createStyles` gains two
branches. Alternatives — reusing `createNervStyles`/`createStarWarsStyles` — were rejected
because they read as HUD/lightsaber, not chrome/desktop.

**4. Palettes.**
- Tunes/Classic (dark): charcoal chrome, silver bevels, green LCD readouts with an amber
  secondary.
- Tunes/Bento (light): light silver/gray surfaces, dark text, amber/orange accents.
- Classic OS/Blue (light): blue gradient chrome, light window bodies, green accent.
- Classic OS/Dark: the same layout in a dark chrome/window palette.
Exact hex values are set during apply against the reference look; the `Theme` contract
(accent, secondaryAccent, gradients, attention kinds, error) must stay populated and each
theme's default variant must keep a distinct `accent`/`secondaryAccent` (the existing test
asserts this).

**5. Marks.**
- Tunes: a stylized lightning bolt, rendered as a single-color PNG and tinted with the theme
  accent (same approach as the Star Wars emblems), so it works on both palettes.
- Classic OS: a stylized four-color flag PNG shown full-color (same approach as the
  character/unit art).
Add both to `app/assets/logos/` (header/hero) and `app/assets/liveActivity/` as
`mark-bolt.png` / `mark-os.png` (widget), and extend `ThemeMark` and `activityMark`. Assets are
our own stylized drawings, not extracted brand files, and names/descriptions stay neutral.

**6. Live Activity.** `activityMark` returns `mark-bolt` / `mark-os`; `activityLabel` returns a
short player/desktop caption for each theme; `activityStatus` provides the hero status words.
`activityConfig` already themes from `theme.surface` / `text` / `accent`, so no change is needed
there beyond the palette. No `agent-live-activity` requirement changes: that spec is written
generically ("reflects the selected interface theme").

**7. Settings picker.** The theme list is generated from `SKINS`, so the two themes appear
automatically. `App.tsx` has a per-theme label (currently special-cases `evangelion` → "Unit")
and a per-theme description; add labels ("Variant"/"Look") and descriptions for the two new
skins so the control reads correctly.

## Risks / Trade-offs

- **3D chrome is hard in React Native** (no native bevels) → simulate with layered borders,
  small gradients, and shadows; accept an *evocative* rather than exact look.
- **Trademark/brand proximity** → keep theme names/descriptions neutral (the "De-trademarked
  names" requirement and its test), use our own stylized bolt/flag assets, and avoid brand
  names in code-facing copy.
- **Per-theme conditionals grow** in `components.tsx`/`App.tsx` → keep branches to a couple of
  booleans and push the bulk into the per-skin `styles.ts` functions.
- **Widget asset wiring only happens on prebuild** → new `assets/liveActivity/*.png` must exist
  before the next prebuild/build, or the widget falls back to a missing image.
- **Distinct-accent test** could fail if a new palette accidentally duplicates an existing
  accent → the apply tasks update `app/test/theme.test.ts` and pick distinct accents.

## Migration Plan

Additive; no data migration. Existing stored `skin`/`option` values remain valid and unknown
values still fall back via `isSkinId`/`resolveTheme`. Rollback is removing the two `SKINS`
entries (any stored Tunes/Classic OS value then resolves to Default).

## Open Questions

- Exact hex values and bevel depths are tuned during apply against the reference screenshots;
  they do not change the specs or the task breakdown.
- The flag mark's silhouette (the flatter 98-era flag vs the wavy XP-era flag) is chosen during
  asset creation; either satisfies the "four-color flag" requirement.
