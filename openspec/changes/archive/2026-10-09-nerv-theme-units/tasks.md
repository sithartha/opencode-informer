# Tasks

## 1. Theme catalog and persistence

- [x] 1.1 In `app/src/theme.ts`, define the skin model — `SkinId = "default" | "evangelion"`,
  a `SKINS` catalog (Default: light/dark/system; Evangelion: unit00/01/02) with per-skin
  `resolve`, and `resolveTheme(skin, option, systemScheme)`. Verify: `app/test/theme.test.ts`
  covers both skins, the system follow, and fallbacks.
- [x] 1.2 Persist the theme skin and variant (`app/src/tokenStore.ts`,
  `app/src/secureTokenStore.ts`) and migrate a legacy `light/dark/system` or unit value.
  Verify: tests cover read/write and the legacy migration.

## 2. Settings picker

- [x] 2.1 In `app/App.tsx`, add a **Theme** list (Default / Evangelion) plus a per-theme
  variant control (Default: Light/Dark/System; Evangelion: Unit 00/01/02) wired to the
  persisted theme. Verify: selecting a theme or variant applies it.

## 3. NERV design language

- [x] 3.1 Rewrite `app/src/styles.ts` for the NERV tokens: angular radii, 1px technical
  borders, monospace label/readout family, uppercase spaced section labels, hazard-stripe
  accent, corner ticks. Verify: `cd app && npm run typecheck` passes and the Demo renders
  without layout breakage.
- [x] 3.2 Update `app/src/ui.tsx` (`GradientSurface`) into a NERV panel (angular border +
  corner ticks) while keeping its API. Verify: component tests that render surfaces pass.

## 4. Restyle the screens

- [x] 4.1 Apply the NERV styling across `app/src/components.tsx` (hero, cards, options,
  modals) and `app/App.tsx` (header, status, connect block, settings), and update
  `app/src/DemoScreen.tsx`/`PreviewScreen` samples. Verify: `cd app && npm test` and `npm run
  test:components` pass with existing text/labels intact.
- [x] 4.2 Confirm contrast and tap targets in all three unit palettes (including long
  activity text staying sans). Verify: manual check in each unit.
- [x] 4.3 Style the Evangelion hero as a MAGI console: a MAGI header plus three triangular
  core indicators (MELCHIOR/BALTHASAR/CASPER) for the working, permission, and question
  states, above the needs-you figure. Verify: `cd app && npm run test:components` passes and
  the hero renders the cores on device.
- [x] 4.4 Style the Hello Kitty hero: a themed header (bow for Hello Kitty, paw for Chococat)
  with the theme name and a status word, above the needs-you figure. Verify: the hero renders
  it in the Hello Kitty theme.
- [x] 4.5 Add the Star Wars theme (Sith/Jedi/System) and style the hero with the faction name
  and a lightsaber bar; route the skin through the angular design system so all components are
  styled. Verify: `cd app && npm test`, `npm run test:components`, and `npm run typecheck`
  pass.
- [x] 4.6 Add per-theme marks: the NERV logo for Evangelion, the Rebel/Imperial emblems for
  Star Wars, the character heads for Hello Kitty, and the app mark for Default. Show the mark
  in the header and as a large, low-opacity cropped watermark on the hero. Verify:
  `cd app && npm run typecheck`, `npm test`, and `npm run test:components` pass.

## 5. Integration

- [x] 5.1 Run `cd app && npm test`, `cd app && npm run test:components`, `cd app && npm run
  typecheck`, and rebuild to `sithPhone`. Verify: every command exits 0 and the build
  installs.
