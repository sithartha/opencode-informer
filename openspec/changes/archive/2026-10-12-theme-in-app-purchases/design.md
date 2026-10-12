# Design

## Context

See `proposal.md` for motivation and the delta spec for requirements. Relevant current state:

- The theme catalog is in `app/src/theme.ts` (`SkinId`, `SKINS`, per-skin `options`, `resolve`); the
  picker is the inline card list plus a variant segment inside the Settings screen in `App.tsx`,
  currently hidden by `THEMES_ENABLED = false`.
- The app is local-only (BLE + LAN), no server, and uses a dev-client build (`app/ios` is generated
  by prebuild). Adding a native StoreKit module needs a new native build.
- The app is distributed free; the repo is public. Because **all themes stay free**, there is no
  paid content to protect.

## Goals / Non-Goals

**Goals:**
- Make every theme free, and accept optional tips from a section **inside Settings**.

**Non-Goals:**
- No paid themes, entitlements, restore, separate store screen, or theme preview screen.
- No Android/Play Billing in this change (future work).

## Decisions

**1. All themes free; remove the build gate.** Delete `THEMES_ENABLED`; the Settings appearance list
always shows all six themes. No locking, prices, or entitlement checks.

**2. Support tip jar via StoreKit 2 (`react-native-iap`).** Three consumable products
`ru.opencode.informer.tip.<1|2|3>` at $0.99 / $2.99 / $5.99; the middle tier is highlighted. A tip
grants nothing; the app only `finishTransaction`s the purchase. Consumables need no
`currentEntitlements` reconciliation, no cache, and no Restore. Prices are shown from
`localizedPrice`; the tip controls are disabled while products fail to load.

**3. Everything stays in Settings.** Keep the theme picker and the variant segment inline in
Settings. Show the themes in a **bordered area that scrolls vertically**, sized so exactly **three
cards plus half of the fourth** are visible (`cardHeight = (boxHeight - gaps) / 3.5`); each card
shows the theme's palette preview, name, and description. The area is `nestedScrollEnabled` so the
outer Settings scroll keeps working. Add a **Support development** section below with **three tip
cards**, each carrying an explicit **buy button with the price** on the right and text saying a tip
unlocks nothing, with the middle card highlighted — no separate screen or sheet.

**4. Switch selects System.** Selecting a theme sets its variant to the theme's System option; the
Nerv skin has no System option, so it sets Unit 01. The variant segment stays available afterwards.

**5. Testing.** A local `.storekit` configuration (`app/storekit/Tips.storekit`) drives StoreKit
Testing in a dev build; TestFlight uses a sandbox Apple ID. The three consumable products must exist
in App Store Connect for sandbox, but `.storekit` stands in for dev.

**6. No content protection needed.** Since no theme is sold, a source build from the public repo is
not a monetization leak; the bundled third-party character/art themes stay free.

## Risks / Trade-offs

- **Native dependency** → adding `react-native-iap` requires a fresh native build for dev and
  release; JS-only updates cannot add it.
- **StoreKit edge states** → handle `pending`/Ask-to-Buy (do not surface success until the
  transaction arrives), user-cancelled (silent), and product-load failure (disable the tip controls).
  Consumable tips cannot be restored — expected, and no Restore is offered.
- **App Review** → consumable tips with no content are straightforward; the copy makes clear the app
  is free and tips are optional.
- **Paid Applications agreement** → required in App Store Connect before any consumable IAP can be
  sold.

## Open Questions

- Final wording of the free/optional-tip copy (product/marketing call; does not change the specs or
  tasks).
