# Proposal

## Why

The app already ships seven themes with distinct visual worlds, but none of them speaks the language of the tool the product is built around: a shell. A bash/TUI theme lets the app feel native to developers and terminal users, and adds a deliberately plain, high-signal monochrome option for people who find the current gradients and glows noisy. The theme is cheap to add because the catalog, styling dispatch, mark, and persistence layer already exist and are proven by six prior themes.

## What Changes

- Add a new free theme, **Terminal**, to the theme catalog with three variants: **Light**, **Dark**, and **System** (System follows the iPhone setting: light → Light, dark → Dark).
- Render it as a bash shell / TUI: monospace typography throughout, square corners (no rounding anywhere), 1px ink borders, inverted-block selection, bracketed/`$`-prompt chrome, and no gradients, glows, or drop shadows.
- Keep the palette monochrome in everything except indicators: ink-on-paper for Light, paper-on-ink for Dark. Colored only: the connection status indicator, attention indicators/badges, and question/permission attention frames. Action buttons, links, titles, chips, and selection stay black/white, using inversion instead of color.
- Add ASCII art for the theme: a faint character-grid backdrop (dot/scan pattern) behind screens, a figlet-style `OI` watermark on the hero, and a compact `>_` mark in the header instead of the app icon.
- Style the dashboard hero as a terminal window with a title bar, a `$` prompt line, and a monospace readout, keeping the existing figures, labels, and controls.
- Style the theme card preview as a square monochrome TUI thumbnail so the list shows the theme's own shape and palette.
- Leave every existing theme, screen flow, label, and control unchanged.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `mobile-companion-app`: the theme catalog and theme-selection requirement gains the **Terminal** theme and its three variants; the theme-mark/hero-watermark requirement gains the ASCII mark and watermark; and a new styling requirement defines the bash/TUI look, monochrome rule, indicator color exception, and no-rounding rule.

## Impact

- `app/src/theme.ts` — new skin id, palette definitions, catalog entry, variant resolution, selection default, `isSkinId` guard.
- `app/src/styles.ts` — new `createTerminalStyles` dispatch (square corners, monospace, inverted selection, no shadows/glows).
- `app/src/themeMark.tsx` — ASCII `>_` header mark and figlet `OI` watermark for the new skin.
- `app/src/components.tsx`, `app/src/ui.tsx` — terminal chrome for hero, sections, cards, chips, and status glyph; backdrop pattern.
- `app/App.tsx` — settings preview/copy for the new skin; render the ASCII backdrop behind screens.
- `app/test/theme.test.ts` — catalog, resolution, persistence, and monochrome/indicator assertions.
- No new dependencies, no native changes, no API/contract changes.
