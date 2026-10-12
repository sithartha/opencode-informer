# Tasks

## 1. Persist the theme and its variant together

- [x] 1.1 In `app/src/useBridge.ts`, add a combined setter (e.g. `setSkinAndOption(next: SkinId, option: ThemeOption)`)
  that sets both `skin` and `themeOption` state and persists them with **one**
  `persistTheme(next, option)` call. Export it from the hook's return value. Verify:
  `cd app && npm run typecheck` passes.
- [x] 1.2 In `app/App.tsx`, make `selectTheme` use that combined setter:
  `setSkinAndOption(next, selectThemeOption(next, systemScheme))`, and drop the two
  separate calls. Leave `setThemeOption` for the variant switcher. Verify: the variant
  switcher still updates and persists the current skin's variant.
- [x] 1.3 Add a test that switching a theme persists the pair for the **selected** skin
  (not the previous one) — including switching away from Wizard, which must not leave
  `(wizard, "system")` (the pair that resolves back to Gryffindor). Verify:
  `cd app && npm run test:components` passes.

## 2. Integration

- [x] 2.1 Run `cd app && npm test`, `cd app && npm run test:components`, and
  `cd app && npm run typecheck`. Verify: every command exits 0.
- [x] 2.2 On a device or simulator, pick a theme and a variant, switch to another theme,
  terminate the app, and relaunch. Verify: the app comes back on the **last chosen**
  theme and variant (specifically, it does not return to Gryffindor after switching
  away from the Wizard theme).
