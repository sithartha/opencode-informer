# Design

## Context

See proposal.md - Why. Today `app/src/theme.ts` exposes `ThemeMode = "light" | "dark" |
"system"` and two fixed palettes; `app/src/styles.ts` derives a `Styles` object from a
`Theme`; `app/src/ui.tsx` provides `GradientSurface`; Settings renders a Light/Dark/System
segment. The app has no theme catalog and no EVANGELION styling. This change reworks the
theme layer and the visuals; it does not touch the bridge, the data, or the flows.

## Goals / Non-Goals

**Goals:**

- A Settings picker for **Unit 00 / Unit 01 / Unit 02**, persisted.
- Three unit palettes drawn from the units' colors.
- A consistent NERV system-interface language across every screen.
- A data-driven theme catalog so more themes can be added later.

**Non-Goals:**

- No purchase/IAP flow in this change; only the catalog groundwork.
- No change to behavior, copy, controls, or the wire contract.
- No custom font files: use the platform monospace.

## Decisions

### Theme model: a skin catalog with per-skin variants

- **Choice**: model the appearance as **theme (skin) × variant**. `SkinId = "default" |
  "evangelion"`; the Default skin offers Light/Dark/System (System follows the OS), the
  Evangelion skin offers Unit 00/01/02. `SKINS` is a catalog of `{ id, name, options,
  defaultOption, resolve }`; `resolveTheme(skin, option, systemScheme)` returns the palette.
  Persist `skin` + `option`; a legacy `light/dark/system`/unit value migrates accordingly.
  Settings renders the catalog as a vertical **list of theme cards** (name + palette swatches
  + selected check), so many themes fit without a segmented control. Adding a theme — e.g.
  the Hello Kitty skin (Hello Kitty / Chococat) or the Star Wars skin (Sith / Jedi / System) —
  is one `SKINS` entry plus its palettes; Star Wars shares the HUD engine but differs
  structurally — rounded panels, a left **lightsaber rail** instead of corner ticks, and
  underlined section headers — plus a lightsaber hero, so it reads distinctly from NERV
  while theming every component without per-screen code.
- **Why**: this is the theme list the user asked for — the original look stays available as
  the Default theme, and the Evangelion look is a separate theme. Adding a theme is a
  catalog entry.
- **Alternatives**: replace Light/Dark/System entirely (loses the original); a flat list
  (no variant grouping).

### Theme marks and hero watermark

- **Choice**: a `ThemeMark` resolves the selected theme to a mark — Star Wars uses the
  public-domain Rebel/Imperial emblems (Wikimedia, tinted to the variant); Evangelion uses the
  **NERV** logo and Hello Kitty uses the character heads (bundled PNGs downloaded per
  request); Default keeps the app mark. The header shows the mark instead of the icon, and the
  hero renders a large (≈70%), low-opacity copy cropped by the panel as a backdrop.
- **Why**: each theme reads as itself, in the header and behind the hero.
- **Alternatives**: draw stylized marks (rejected — not authentic enough); a single generic
  mark (no per-theme identity).

### Two design systems, one entry point

- **Choice**: `createStyles(theme)` dispatches on `theme.skin` to the Default rounded design
  system or the NERV one; `GradientSurface` takes a `nerv` flag for corner ticks/angular
  radii, and the hazard stripe renders only for the Evangelion theme.
- **Why**: the two looks differ in structure (radii, typography, ticks), not just color, so
  the skin selects the design system. Components keep one `createStyles(theme)` call.
- **Alternatives**: a single parameterized system with many conditionals (messier).

### Unit palettes from the units

- **Choice**: Unit 00 — light blue/white steel; Unit 01 — deep purple with neon green; Unit 02 —
  dark red/orange. Each palette carries a `secondaryAccent` (Unit 01 `#39ff14` neon green,
  Unit 00 `#60a5fa` blue, Unit 02 `#ff8a00` orange) used on NERV headers, the status pill, the
  compact bar and section labels so the unit's color is visibly present.
- **Why**: each unit's real color scheme, so the three themes are instantly recognizable; the
  secondary accent keeps Unit 01's signature green from being lost to the purple.
- **Alternatives**: recolor one palette per mode (loses the unit identity); accent only
  (Unit 01 loses its green).

### NERV design language

- **Choice**: angular panels (small radii + clipped corners), 1px technical borders,
  **monospace** for labels/readouts/numbers (platform monospace: `Menlo`/`monospace`),
  uppercase section labels with wide letter spacing, hazard **warning stripes** as thin
  accent bands, corner tick marks, and thin accent rules. `GradientSurface` becomes a NERV
  panel while keeping its API.
- **Why**: evokes the MAGI/NERV terminals while staying a mobile UI; keeps a single shared
  surface so every screen updates at once.
- **Alternatives**: heavy skeuomorphic terminal (busy, hurts readability); colors only (the
  request asked for a full restyle).

### MAGI hero

- **Choice**: for the Evangelion theme the hero renders a MAGI console header plus three
  triangular core indicators — MELCHIOR (working), BALTHASAR (permission), CASPER (question) —
  each lit when its state is non-zero, above the needs-you figure and the controls.
- **Why**: MAGI is the show's iconic terminal; mapping its three brains to the three states
  reads as the system "evaluating" the agents while keeping the needs-you-first hierarchy.
- **Alternatives**: keep the generic hero with NERV colors only (less evocative).

### Behavior and readability are preserved

- **Choice**: keep every control, label, flow, and tap target; apply monospace only to
  short technical strings (labels, numbers, chips) and keep long body text in the system
  sans; verify contrast of neon-on-dark and white-on-Unit-00.
- **Why**: the restyle is cosmetic; accessibility and the existing behavior must not
  regress.
- **Alternatives**: monospace everywhere (worse for long messages).

## Risks / Trade-offs

- [Neon-on-dark contrast] → check text/background pairs; keep body text near-white, use neon
  only for accents/indicators.
- [Monospace hurting long text] → reserve it for labels/numbers; body stays sans.
- [Angular corners vs touch] → keep ≥44 pt targets and adequate padding.
- [Old stored preference] → migrate `light/dark/system` to a unit on first read.
