# Tasks

## 1. Support tip purchases (StoreKit)

- [x] 1.1 Add `react-native-iap` (StoreKit 2) to `app/package.json` and wire the native module
  (prebuild; dev-client build). Verify: `cd app && npx expo prebuild -p ios` succeeds and a dev
  build compiles with the module linked.
- [x] 1.2 Create `app/src/purchases.ts` + `app/src/iapAdapter.ts` for the three **consumable** tips
  only: load products, `buyTip(id)` returning `success | pending | cancelled | error`, and
  `finishTransaction` on every completed consumable; no entitlements, no restore. Verify: unit tests
  with a mocked adapter cover success, pending, cancel, and errors.

## 2. Free themes and the System-on-switch rule

- [x] 2.1 Remove the `THEMES_ENABLED` build gate and add a "select theme → System variant" helper
  (Nerv → Unit 01) in `app/src/theme.ts`. Verify: tests cover System-on-switch for each skin and
  Nerv → unit01.
- [x] 2.2 Keep the theme picker and the variant segment inline in Settings, with the themes in a
  bordered vertically scrolling area showing three cards fully and half of the next (each with the
  theme's palette preview, name, and description), wired to the System-on-switch selection. Verify:
  `cd app && npm run typecheck` and `npm run test:components`.

## 3. Support development section

- [x] 3.1 Add a **Support development** section inline in Settings (below the appearance controls)
  with three tip **cards** ($0.99 / $2.99 / $5.99), each with an explicit buy button and price on the
  right and text saying the tip unlocks nothing, the middle card highlighted, wired to `buyTip`, and
  no separate screen. Verify: `cd app && npm run typecheck` and a manual check in Settings.

## 4. App Store Connect products and metadata

- [ ] 4.1 Create the three consumable products `ru.opencode.informer.tip.<1|2|3>`
  ($0.99 / $2.99 / $5.99) in App Store Connect with localized names/descriptions and review
  screenshots, and sign the **Paid Applications agreement** (tax/banking). Verify: the products are
  "Ready to Submit" and a sandbox tip purchase succeeds.

## 5. Integration

- [x] 5.1 Run `cd app && npm test`, `cd app && npm run test:components`, and
  `cd app && npm run typecheck`. Verify: every command exits 0.
- [x] 5.2 Add a local `.storekit` configuration (`app/storekit/Tips.storekit`) for StoreKit Testing.
  Verify: the file defines the three consumable products.
- [ ] 5.3 Build to a device/TestFlight and verify with a sandbox account: the appearance list shows
  all six themes with no purchase, switching a theme selects System (Nerv → Unit 01), and a tip
  purchase completes and grants nothing. Verify: the build installs and each check holds.
