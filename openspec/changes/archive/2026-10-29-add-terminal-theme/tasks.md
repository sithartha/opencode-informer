# Tasks

## 1. Theme catalog and palette

- [x] 1.1 Add `"terminal"` to `SkinId` and the variant type, define `terminalLight` and `terminalDark` palettes in `app/src/theme.ts` using the token table in `design.md` (flat gradients, transparent glow/shadow, indicator-only colors), and verify `node --import tsx --test app/test/theme.test.ts` still passes after adding entries.
- [x] 1.2 Register the Terminal skin in `SKINS` (name `Terminal`, description `Bash shell · Light, Dark, System`, options `light`/`dark`/`system`, default `system`, System resolution light→Light and dark→Dark), extend `isSkinId`, and verify the catalog test lists `terminal` with the expected options.
- [x] 1.3 Add tests to `app/test/theme.test.ts` for Terminal System resolution both ways, `selectThemeOption("terminal") === "system"`, and a monochrome assertion (ink/paper tones for background/border/text/accent, indicator tokens distinct) and verify `npm test` from `app/` passes.

## 2. Terminal style variant

- [x] 2.1 Dispatch `terminal` to a new `createTerminalStyles` in `app/src/styles.ts` and zero every radius (cards, buttons, inputs, chips, badges, segments, previews, modals, `themesFrame`) and every shadow/glow, matching the keys already covered by `createTunesStyles`; verify with `npm run typecheck` and `npm run test:components`.
- [x] 2.2 Apply `MONO` to all textual styles and switch selection/active states to inverted ink/paper blocks (`segmentSelected`, `layoutToggleItemActive`, primary buttons) and bordered chips/badges; verify the Terminal theme renders via `createStyles(resolveTheme("terminal", "dark"))` in a component test without missing style keys.
- [x] 2.3 Update the settings preview path in `app/App.tsx` (if needed) so the Terminal theme card uses its square, mono, monochrome thumbnail and add the Terminal description/copy branch (`Bash shell interface — monochrome with colored indicators.`); verify in the theme list test or a render test that the card appears with the new name and description.

## 3. ASCII mark, watermark, and backdrop

- [x] 3.1 Add `app/src/terminalArt.tsx` with the pure-ASCII `OI` figlet art, the compact `>_` header mark, and a static `TerminalBackdrop` character grid (dimensions from `useWindowDimensions`, `pointerEvents="none"`); verify it renders in a component test and that the art strings keep equal line lengths.
- [x] 3.2 Extend `ThemeMark` in `app/src/themeMark.tsx` to render the ASCII header mark for the Terminal skin and the figlet `OI` art at ~0.10 opacity for the hero watermark; verify a render test finds the mark for both Terminal variants and that other skins still use their bitmap marks.
- [x] 3.3 Render `TerminalBackdrop` behind the main screen and the settings modal in `app/App.tsx` only when `theme.skin === "terminal"`; verify by typecheck plus a render/DOM test that the backdrop is absent for the Default theme.

## 4. Terminal screen chrome

- [x] 4.1 Add an `isTerminal` branch to `HeroCard` in `app/src/components.tsx` with the title strip, `$ status --needs-you` prompt line, need-you figure, `running n · stopped n` readout, and the ASCII watermark slot; verify with a component test asserting the prompt text and existing figures/labels are both present.
- [x] 4.2 Add terminal markers to shared chrome: `> ` section labels, `[!]`/`[?]` attention markers, prompt-prefixed selected rows, and monospace glyph status indicators (`●`/`○` with colored `allow`/`deny`/pending tokens); verify with component tests for the attention card markers and the connection status glyph, and confirm no rounded views are introduced.
- [x] 4.3 Audit `app/src/components.tsx` and `app/src/ui.tsx` for hardcoded colors that would leak into the Terminal skin (Classic OS/NERV/Tunes-specific branches) and gate them by skin; verify by rendering the main components with `resolveTheme("terminal", "light")`/`("terminal", "dark")` and asserting only ink/paper and indicator tokens appear in the rendered styles.

## 5. Integration checks

- [x] 5.1 Run `cd app && npm test && npm run test:components && npm run typecheck` and fix any regressions, including the existing unique-accent and de-trademarked-name theme tests.
- [x] 5.2 Verify persistence and switching manually or via test: select Terminal, relaunch, confirm the variant; switch Terminal → Default → Terminal and confirm System is selected and no other theme's styling changes.
- [x] 5.3 Verify visually on sithPhone in Light and Dark, confirming: no rounded corners, monospace everywhere, ASCII backdrop and watermark visible without clipping, inverted selection, and colored indicators only.

## 6. Avatar mode language and Live Activity (device review)

- [x] 6.1 Make the avatar silhouette follow the theme's corner language — `square` for Nerv, Tunes, and Terminal, `circle` for the rounded themes — and verify `avatar.test.ts` covers both groups.
- [x] 6.2 Colour each avatar by the session mode (running, permission, question, completed/ended, fallback accent) instead of the theme accent and verify the avatar colour tests pass.
- [x] 6.3 Rebuild the compact session card as a full-width working-directory line on top, then a 48pt animated avatar on the left with phase and activity to its right, and no status dot; verify the component test asserts the larger animated avatar and the absence of dot glyphs.
- [x] 6.4 Make the Terminal Live Activity terminal-like: add the `mark-terminal` asset (square frame with `>_`), the `TERMINAL` caption, and bracketed status words; verify `liveActivityState.test.ts` and the generated asset.
- [x] 6.5 Rebuild and install the Release app on sithPhone, then confirm the new avatars, compact cards, and Live Activity on the device.
