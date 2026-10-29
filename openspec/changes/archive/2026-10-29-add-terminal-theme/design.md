# Design

## Context

See `proposal.md` for motivation and `specs/mobile-companion-app/spec.md` for the required behavior.

The app resolves a palette from `SKINS` in `app/src/theme.ts` (skin id + variant → `Theme` tokens), then maps the tokens to a `Styles` object in `app/src/styles.ts` through a per-skin dispatcher. Header and hero use `ThemeMark` (`app/src/themeMark.tsx`), the hero composition is `HeroCard` in `app/src/components.tsx`, and screens are rendered inside a `LinearGradient` in `app/App.tsx` with the theme's `bgGradient`. Themes already support System-following variants and persistence, so the new skin only has to supply a palette, a style variant, an ASCII mark, and a small amount of chrome.

The Terminal skin is the first theme whose identity is typographic rather than chromatic, so it relies on: (a) a flat monochrome palette with semantic colors reserved for indicators, (b) a style pass that removes every radius, shadow, and glow, and (c) ASCII art rendered as text instead of bitmap assets.

## Goals / Non-Goals

**Goals:**

- Add the Terminal skin end to end (catalog, palette, styles, mark, backdrop, hero, preview) without touching other themes or flows.
- Keep every visual decision expressible through the existing `Theme` tokens plus small, local chrome overrides — no new token fields unless proven necessary.
- Make the look recognizable as a bash/TUI: mono type, square frames, prompt/bracket markers, inverted selection, ASCII art.
- Preserve accessibility: AA contrast for body text in both variants, and color never the only signal.

**Non-Goals:**

- No new bitmap logo assets, icon changes, or App Store screenshot regeneration in this change.
- No interactive terminal, command input, or keyboard behavior — this is a visual theme only.
- No font bundling: use platform monospace fonts.
- No redesign of the theme list layout or the settings flow.

## Decisions

### 1. Skin id `terminal`, variants `light` | `dark` | `system`

The skin follows the Default theme's variant pattern: options Light, Dark, System, `defaultOption: "system"`. `selectThemeOption` then already picks System on switch, and `resolveTheme` maps System from `useColorScheme()` (light → Light, dark → Dark). No migration work is needed; an unknown stored skin still falls back to Default.

Display name **Terminal**, description `Bash shell · Light, Dark, System` (the settings screen splits descriptions on ` · ` into two lines). Alternative names (Shell, Console, TUI) were rejected by the user in favor of Terminal.

### 2. Monochrome tokens with colored indicator tokens only

The palette is built from near-white/near-black plus neutral greys; semantic tokens keep terminal-style colors. Everything used for chrome, controls, and typography is ink/paper. Colored tokens exist only for signals: `allow` (green), `deny`/`error` (red), `pendingBorder`/`permissionBorder` (amber), `questionBorder` (cyan). Their matching `*Text` tokens stay ink so attention titles remain monochrome and the color reads as an indicator, not decoration.

| Token | Light | Dark |
| --- | --- | --- |
| `background` | `#f7f7f7` | `#0b0b0b` |
| `surface` | `#ffffff` | `#111111` |
| `border` | `#0b0b0b` | `#f5f5f5` |
| `text` | `#0b0b0b` | `#f5f5f5` |
| `textSecondary` | `#3d3d3d` | `#c9c9c9` |
| `textMuted` | `#6b6b6b` | `#9a9a9a` |
| `accent` | `#0b0b0b` | `#f5f5f5` |
| `secondaryAccent` | `#5c5c5c` | `#b0b0b0` |
| `badgeBg` / `badgeText` | `#ededed` / `#0b0b0b` | `#1a1a1a` / `#f5f5f5` |
| `inputBg` / `inputBorder` | `#ffffff` / `#0b0b0b` | `#111111` / `#f5f5f5` |
| `allow` / `deny` / `error` | `#0a7d32` / `#b3261e` / `#b3261e` | `#51cf66` / `#ff6b6b` / `#ff6b6b` |
| `pendingBorder` / `permissionBorder` | `#b7791f` / `#b7791f` | `#e5c07b` / `#e5c07b` |
| `questionBorder` | `#0b6b8a` | `#56b6c2` |
| `pendingTitle` / `pendingBody` / `permissionText` | ink / secondary / ink | ink / secondary / ink |
| `shadow` | `transparent` | `transparent` |
| `scrim` | `rgba(11,11,11,0.55)` | `rgba(0,0,0,0.65)` |
| `bgGradient` | `["#f7f7f7","#f7f7f7"]` | `["#0b0b0b","#0b0b0b"]` |
| `cardBorder` / `accentGradient` | `[ink, ink]` | `[paper, paper]` |
| `glow` / `questionGlow` / `permissionGlow` | `"transparent"` | `"transparent"` |
| `questionBgGradient` / `permissionBgGradient` | `[surface, surface]` | `[surface, surface]` |

Flat `bgGradient`/`accentGradient` arrays keep the existing `LinearGradient` call sites working while rendering a solid fill; no conditional gradient component is required. `glow: "transparent"` disables halos without touching `GradientSurface`. `accent` is intentionally monochrome, so selection, links, and primary buttons must be rendered by inversion (see decision 4), not by hue.

Colors reserved for indicators: green `allow` (connected), red `deny` (disconnected/denied), amber permission frame, cyan question frame, plus the matching indicator glyphs/badges. `error` stays red.

### 3. Typography: platform console fonts, one style pass

Use the existing `MONO` constant (`Menlo` on iOS, `monospace` on Android). The Terminal style variant applies `fontFamily: MONO` to all textual keys (headings, body, labels, buttons, chips, meta, inputs) rather than only a few, with normal letter spacing and uppercase reserved for section labels and compact meta (matching the HUD conventions already in `styles.ts`).

Sizes stay close to the default skin (body 14/20, meta 12) so layouts do not reflow; the look comes from the typeface, square chrome, and markers, not from shrinking text.

### 4. Square, flat, marker-driven style variant

`createStyles` gains `if (t.skin === "terminal") return createTerminalStyles(t)`. `createTerminalStyles` builds on `createDefaultStyles` the way `createTunesStyles` does: spread the base, then override every key with a radius, shadow, or glow. The override table is centralized:

- `square = { borderRadius: 0 }` applied to cards, buttons, inputs, chips, badges, pills, segments, previews, modals, and `themesFrame`.
- `mono = { fontFamily: MONO }` applied to every text style.
- Shadows/glows zeroed (`shadowOpacity: 0`, `elevation: 0`, transparent glow tokens).
- `segmentSelected` and `layoutToggleItemActive` become inverted blocks (`backgroundColor: t.text`, text `backgroundColor`/`color: t.background`) instead of accent-filled with white text; `themeCardSelected` becomes a 2px ink border plus a `>` marker supplied by the card content.
- Badges/chips become transparent with a 1px ink border instead of filled pills; the status pill becomes a square `[ status ]`-style strip.
- `button`-like text stays ink/paper inversion: primary = filled ink (light) or filled paper (dark) with inverse label; secondary = 1px ink border on surface.

Because `Styles` is derived from the default style object, the variant must cover every key it changes explicitly (same approach as `createTunesStyles`), rather than mutating the `StyleSheet.create` result at runtime.

### 5. ASCII art: pure ASCII, rendered as text

Avoid box-drawing/block glyphs that can fall back to tofu on some Android monospace faces; use pure ASCII.

- Header mark (30×30): a 1px square frame with `>_` centered in monospace bold. It replaces the app mark like other skins' `ThemeMark`s.
- Hero watermark: the figlet "OI" art below, rendered in monospace ink at ~0.10 opacity, positioned cropped inside the hero like the existing watermark images:

```
  ___  ___
 / _ \|_ _|
| | | || |
| |_| || |
 \___/|___|
```

- Backdrop: a new `TerminalBackdrop` component (`app/src/terminalArt.tsx`) renders an absolute, non-interactive, screen-sized grid of faint `.` characters (line height ~18, opacity ~0.07). It sits behind the scroll content and inside the settings modal. Dimensions come from `useWindowDimensions`; the grid is static (no animation) so it costs one text block per screen.
- Hero chrome: a title strip `+-- open-island --+`, a prompt line `$ status --needs-you`, the existing need-you figure, a readout `running 2 · stopped 1`, and the framing borders. Status word stays a text word (`idle`, `needs you`, `working`) with a colored indicator glyph beside it.
- Section headings get a `> ` prefix; attention blocks get a `[!]` / `[?]` marker; selected rows get `>` and are inverted. Prefixes are added in the shared components (hero, section labels, attention cards) only, so all other text stays unchanged.

`ThemeMark` dispatches on `theme.skin === "terminal"` to the ASCII header mark; `HeroCard` gets an `isTerminal` branch for the title/prompt/readout chrome and passes the ASCII watermark through the existing watermark slot.

### 6. Indicators as glyphs

The connection indicator and attention markers render as monospace glyphs (`●` filled, `○` hollow, blinking `◌`/`?`/`!` variants) in `GlowDot` consumers or a small terminal-specific wrapper, colored by `allow`/`deny`/pending tokens. This keeps "no rounding" literal (no circular views in the Terminal skin) and makes color the indicator's only special property.

### 7. Settings preview and copy

The theme list preview is generated from `createStyles(preview)`, so the Terminal card automatically gets square, mono bars; the third preview bar uses ink instead of an accent hue. The variant description under the segment control gets a Terminal-specific sentence: `Bash shell interface — monochrome with colored indicators.` The theme card description is `Bash shell · Light, Dark, System`.

### 8. Avatar mode language

Avatar silhouette follows the theme's corner language: `avatarCut(theme)` returns `square` for the square-cornered skins (`evangelion`, `tunes`, `terminal`) and `circle` otherwise. The session seed is unchanged, so only the silhouette differs between themes. `avatarColor(theme, phase)` picks the mode colour from theme tokens — `allow` for running, `permissionBorder[0]` for a permission wait, `questionBorder[0]` for an answer wait, `textMuted` for completed/ended, `accent` for anything else — instead of always using the accent. The compact session card shows the working-directory name across the full card width on top, then a 48pt animated avatar on the left with phase and activity in a right-hand column, and no separate status dot.

### 9. Terminal Live Activity

The Live Activity can only receive colors, text, and a bundled image, so the Terminal treatment is carried by those: `activityLabel` returns `TERMINAL`, `activityStatus` returns bracketed words (`[ needs you ]`, `[ idle ]`, `[ ready ]`), and `activityMark` returns a new `mark-terminal` asset — a square frame with `>_` rendered in a monospace face by `scripts/make-theme-assets.swift`. Prebuild copies it from `assets/liveActivity/` into the widget's asset catalog. The widget's native font stays the system font, since the config surface has no font field.


### 8. Tests

Extend `app/test/theme.test.ts`: expected skin id list and options, Terminal variant resolution (including System both ways), `selectThemeOption("terminal") === "system"`, and a Terminal-specific contract test asserting that the two variants are monochrome outside indicator tokens (background/border/text/accent greys) and that indicator tokens differ from the ink/paper tone. Existing unique-accent and de-trademarked-name tests must keep passing (Terminal's `#0b0b0b`/`#f5f5f5` accents are unique in the catalog).

## Risks / Trade-offs

- **Hardcoded colors in shared components** (for example Classic OS white title bars, NERV phase colors) could leak into the Terminal skin. → Audit `components.tsx`/`ui.tsx` for literal colors and gate them by skin; Terminal branches must only use theme tokens.
- **Monospace font metrics on Android** differ from Menlo, so tall ASCII art and fixed-height cards may clip. → Use fixed line heights, `numberOfLines`, and generous card heights; verify on both platforms.
- **Pure-ASCII figlet loses some visual punch** compared with block-character art. → It guarantees rendering everywhere; block-character variant can be a later enhancement behind a glyph-availability check.
- **Inverted selection reduces the affordance that colored accents gave.** → Pair inversion with a `>` marker and a 2px border so selected state is never conveyed by color alone.
- **Contrast on near-white paper** can fail for muted text. → `#6b6b6b` on `#f7f7f7` is ≈ 5.0:1; secondary `#3d3d3d` is higher; verify with the design tokens before shipping.
- **Backdrop text blocks add render cost.** → Static, one text node per screen, `pointerEvents="none"`, and no re-render on scroll; hide in the Live Activity (not applicable there).

## Migration Plan

No persisted-data migration: a new skin id is additive, Terminal has a System option (default), and an unknown stored value still resolves to Default. Rollback is removing the catalog entry and dispatch branch; persisted `terminal` preferences would then fall back to Default via `isSkinId`.

## Open Questions

None blocking. The exact ASCII figlet variant and backdrop density can be tuned during implementation without changing the spec.
