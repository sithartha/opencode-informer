# Proposal

## Why

The interface themes are currently hidden behind a build flag (`THEMES_ENABLED = false`) for the
TestFlight build, and nothing is monetized. The app is free and should **stay free**, so the themes
should simply be available to everyone. Instead of selling themes, the app offers an optional tip
jar — **Support development** — so people who want to support the project can, with no content
gated, no server, and no commercial use of the bundled (third-party) character/art themes.

## What Changes

- **Themes become free**: Default, Nerv, Cat, The Force, Tunes, and Classic OS are all available;
  the `THEMES_ENABLED` build gate is removed.
- **Theme list**: a scrollable list showing **three cards fully and the top half of the next**;
  every card has a **Preview** control that opens the interactive demo rendered in that theme.
- **Switching a theme selects its System variant** (the Nerv theme, which has no System, selects
  **Unit 01**); the variant selector stays available afterwards.
- **Support development**: an optional tip jar with three **consumable** tiers — **$0.99 / $2.99 /
  $5.99** — with the middle tier highlighted as the most attractive; a tip grants no content.
- **Serverless**: StoreKit 2 on device is used only for the tips. There are no theme purchases, no
  entitlements, and no restore path for consumables.
- **Evangelion Unit 00 palette**: correct Unit 00 to a **yellow** accent with a **green** secondary
  (it was blue), matching the unit's colors.
- The app stays free: the support copy states the app is free and there are no plans to charge.

## Capabilities

### New Capabilities
<!-- none: this extends the existing theming capability -->

### Modified Capabilities

- `mobile-companion-app`: "Interface theme selection" gains the scrollable three-and-a-half-card
  list and the System-on-switch rule; new requirements cover theme preview and the support tip jar.

## Impact

- `app/src/theme.ts` (remove the build gate; a System-on-switch resolver).
- `app/App.tsx` / `app/src/components.tsx` / `app/src/styles.ts` (theme list, preview modal,
  support sheet).
- A new `app/src/purchases.ts` (StoreKit wrapper for the tip consumable), `app/package.json`
  (`react-native-iap`, StoreKit 2 → a new native build for dev and release).
- Tests: theme switch-to-System, the list (3.5 layout), preview, and tips.
- **Non-code prerequisites**: three consumable products in App Store Connect
  (`ru.opencode.informer.tip.<1|2|3>`) and the **Paid Applications agreement** (tax/banking); a local
  `.storekit` configuration for testing.
