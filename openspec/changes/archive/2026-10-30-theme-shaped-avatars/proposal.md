# Proposal

## Why

Agent avatars currently pick between just two silhouettes: square for Nerv, Tunes and Terminal, circle for every other skin. That collapses four different shape languages into one and contradicts the skins themselves — Nerv draws hexagonal HUD chrome, Tunes and Terminal have no rounding at all, The Force and Classic OS sit in between, while Cat, Default and Wizard are fully round. The avatar is the most repeated shape on the dashboard, so it is exactly where a skin's corner language should be visible. The bundled `moodstone` avatar renderer already ships seven silhouettes (`circle`, `squircle`, `square`, `diamond`, `hexagon`, `badge`, `burst`), so no new dependency is needed.

## What Changes

- Each skin gets its own avatar silhouette instead of sharing one of two groups:
  - **Nerv** (`evangelion`) — hexagon, matching its hexagonal HUD chrome.
  - **Tunes** and **Terminal** — square, matching their zero-radius surfaces.
  - **The Force** (`starwars`) and **Classic OS** — squircle, the mildly-rounded middle ground.
  - **Cat** (`sanrio`), **Default** and **Wizard** — circle, the strongly-rounded skins.
- The mapping becomes one explicit table of skin → silhouette rather than a hand-written condition, so a ninth skin cannot silently fall into a default.
- Nothing else about an avatar changes: the light seed still comes from the session, the colour still comes from the session phase, the mood still comes from the phase and current tool, and Reduce Motion still freezes it.
- **BREAKING** for the `Agent avatars` requirement only: the earlier grouping (square in Nerv, Tunes, Terminal; circle elsewhere) is replaced.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mobile-companion-app`: the `Agent avatars` requirement's silhouette rule and its scenarios now describe a per-skin silhouette (hexagon, square, squircle, circle) instead of the square-versus-circle grouping.

## Impact

- `app/src/avatar.ts` — the silhouette mapping (`avatarCut`).
- `app/test/avatar.test.ts` — the silhouette expectations for every skin.
- `openspec/specs/mobile-companion-app/spec.md` — the `Agent avatars` requirement and its scenarios.
- No change to the plugin, the contract, the mac helper, or the persisted settings: the skin is already part of the saved theme, so no migration is required.
- No new dependency: all four silhouettes already exist in `moodstone`.
