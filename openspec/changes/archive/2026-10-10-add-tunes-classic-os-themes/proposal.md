# Proposal

## Why

The theme catalog currently ships four themes (Default, Nerv, Cat, The Force), all of which
are character/HUD-flavored. Users have asked for two retro-computing looks that are widely
recognized by their interface, not by a franchise: a **classic media-player** skin and a
**classic desktop** skin. The theme catalog was built to be extensible, so these are additive
entries rather than a new theming system.

## What Changes

- **New theme "Tunes"** — a classic media-player look that reproduces the stock player's UI:
  beveled chrome windows, segmented LED/numeric readouts, transport buttons, a spectrum/level
  strip, and the distinctive lightning-bolt mark. Two variants:
  - **Classic** (dark): the stock default player colors (charcoal chrome, silver bevels,
    green/amber LCD readouts).
  - **Bento** (light): the same layout and chrome recolored to the player's most popular light
    skin — light silver/gray surfaces with amber/orange accents.
- **New theme "Classic OS"** — a classic desktop-OS look as close as possible to the Windows XP
  Luna interface: blue gradient title bars, rounded beveled controls, a green Start button,
  and the stylized four-color flag mark. Two variants:
  - **Blue** (light): the classic blue Luna palette.
  - **Dark**: a dark counterpart of the same desktop chrome.
- **Theme picker** offers the two new themes and their variants, following the existing
  pattern (a theme list plus a per-theme variant control).
- **Full per-theme styling** for both: every screen is restyled in that theme's design
  language (chrome/bevels for Tunes; desktop window/taskbar for Classic OS), while behavior,
  text, and controls are preserved.
- **Marks**: the lightning bolt for Tunes and the flag for Classic OS, shown in the header and
  as the hero watermark, and wired into the lock-screen Live Activity (mark + accent colors).
- Display names stay trademark-safe (the existing requirement bans trademarked terms in theme
  names/descriptions): the theme is named **Tunes** (not the player brand) and **Classic OS**
  (not the OS brand).

## Capabilities

### New Capabilities
<!-- none: this extends the existing theming capability -->

### Modified Capabilities

- `mobile-companion-app`: the "Interface theme selection" requirement gains the **Tunes**
  (Classic, Bento) and **Classic OS** (Blue, Dark) themes and their variants; the "Theme mark
  and hero watermark" requirement gains their marks; and two new requirements describe the
  "Tunes" media-player styling and the "Classic OS" desktop styling.

## Impact

- `app/src/theme.ts` — new `SkinId` entries, two palettes per theme, `SKINS` catalog entries,
  `isSkinId`, and option typing.
- `app/src/styles.ts` — new per-skin design systems (media-player chrome; desktop window chrome)
  and the dispatch in `createStyles`.
- `app/src/components.tsx` / `app/App.tsx` — hero variants and the Settings theme picker
  (per-theme field label, variants, description).
- `app/src/themeMark.tsx` — lightning-bolt and flag marks; `app/src/liveActivityState.ts` —
  mark asset names, hero labels/status words, and activity colors for both themes.
- `app/assets/logos/` (header/hero marks) and `app/assets/liveActivity/` (Live Activity marks,
  copied into the widget target on prebuild by the `expo-live-activity` plugin).
- Tests: `app/test/theme.test.ts` (catalog, variants, distinct accents, de-trademarked names),
  `app/test/liveActivityState.test.ts` (mark/label/status), and `app/test/dashboard.test.tsx`.
- No new persistence keys are needed; the chosen skin and variant reuse the existing
  `openisland.skin` / `openisland.themeOption` storage.
