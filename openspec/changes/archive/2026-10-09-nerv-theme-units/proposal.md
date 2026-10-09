# Proposal

## Why

The app offers only a generic Light/Dark/System appearance, and its visuals are a standard
React Native look. The user wants a full Evangelion/NERV restyle and a theme picker that can
later host more themes. The first theme is the Evangelion (NERV) skin with three unit
palettes, and the existing Light/Dark/System control is replaced by a direct **Unit 00 /
Unit 01 / Unit 02** choice.

## What Changes

- **Theme picker**: Settings offers **Unit 00 / Unit 01 / Unit 02** (replacing Light/Dark/
  System), and the choice persists across launches.
- **Evangelion (NERV) skin**: the first theme, with three unit palettes taken from the
  units — Unit 00 (blue/white steel), Unit 01 (purple with neon green), Unit 02 (red/orange).
- **Full NERV restyle**: every screen is restyled as a NERV system interface — angular
  panels, technical typography (monospace labels/numbers), warning stripes, corner ticks,
  and HUD labels — while behavior, text, and controls stay the same.
- **Theme catalog (extensible)**: palettes are resolved from a data catalog keyed by theme
  id, so more themes can be added later without touching the screens. No purchase flow is
  built in this change; the catalog is the groundwork only.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities

- `mobile-companion-app`: the appearance control becomes a Unit 00/01/02 theme picker with
  NERV palettes, and the whole UI is restyled as NERV interfaces.

## Impact

- `app/src/theme.ts` (unit palettes + theme catalog), `app/src/styles.ts` and `app/src/ui.tsx`
  (NERV design tokens and surfaces), `app/src/components.tsx`, `app/App.tsx` (Settings
  picker), `app/src/DemoScreen.tsx`, and `app/src/secureTokenStore.ts` / `app/src/tokenStore.ts`
  (persist the selected theme id).
- Tests: theme resolution/catalog, persistence, and component tests.
