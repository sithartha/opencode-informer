# Proposal

## Why

Two things break the everyday loop of the companion app.

First, when the Mac — or a Linux/Windows PC running the cross-platform helper — moves to a
different network, its bridge address changes. The app keeps retrying the remembered address
forever, because only a user-initiated connect ever scans Bluetooth again, so the dashboard stays
disconnected until the app is killed or the user presses the connect button. On top of that, the
Linux and Windows helpers cache the rendezvous address at startup, so even a fresh Bluetooth read
can return the old, unreachable address.

Second, the dashboard shows every session as a full-height card, so a handful of agents pushes the
working ones off screen. The user asked for a compact two-column mode that expands on tap, and for
agent avatars in the style of [Moodstone](https://moodstone.expo.app/) so a session's state is
recognisable at a glance. The connect button also names one vendor ("Connect to Mac") although the
helper runs on Linux and Windows too.

## What Changes

- **Recover after a network change.** The app detects a network change (NetInfo) and re-reads the
  rendezvous address over Bluetooth, then reconnects to the new address with the stored token — no
  re-pairing and no manual action. The same re-discovery runs after three consecutive failed
  reconnects to the remembered address, and the newly discovered address becomes the remembered
  one.
- **Keep the advertised rendezvous current.** The Linux and Windows helpers resolve the host's LAN
  address when the rendezvous characteristic is read instead of caching it at startup; the macOS
  helper's existing per-read resolution is verified and extended with a non-`en0`/`en1` fallback.
- **Local-network fallback.** When Bluetooth discovery cannot produce a usable connection (for
  example a stale system Bluetooth bond), the app probes the phone's own subnet for a bridge that
  accepts the stored token, connects to it, and updates the remembered address. This is also the
  fastest recovery when both devices moved networks together.
- **Paired devices survive a network change.** The bridge persists issued pairing tokens on the
  computer, so a bridge or OpenCode restart no longer forces the phone to pair again. The app stops
  discarding the stored pairing because a *remembered* address answers `401`: it first re-reads the
  address over Bluetooth, and only a rejection from the computer the helper points at clears the
  pairing and asks for a new code. Entering a code replaces an old token instead of being blocked by
  it.
- **Neutral connection wording.** The Bluetooth connect button reads "Find nearby computer" instead
  of naming a single vendor.
- **Compact session grid.** The dashboard offers a compact two-column session layout as the default
  on every launch, plus the current full-width list; a control in the Sessions header switches
  between them. Tapping a compact card expands it to the full card in place; a session with a
  pending permission or question is shown expanded so its controls stay reachable.
- **Agent avatars.** Every session card shows a Moodstone avatar whose silhouette, colour and light
  seed are stable for that agent and whose mood follows the session phase. Compact cards render a
  still avatar; the expanded card animates it; Reduce Motion pauses it.
- **Dependencies.** Add `moodstone` with its Expo-managed peers: `@shopify/react-native-skia`,
  `react-native-reanimated`, `react-native-worklets`. This requires a native rebuild (pods) and jest
  mocks for Skia/Reanimated. **BREAKING** for the build: a new native binary is required; OTA-only
  updates are no longer enough.

## Capabilities

### New Capabilities

- none

### Modified Capabilities

- `opencode-mobile-bridge`: issued pairing tokens survive a bridge restart; revoked tokens stay
  revoked across restarts; the first snapshot after a restart seeds the sessions that were already
  open.
- `mobile-companion-app`: connection recovery re-discovers the computer over Bluetooth after a
  network change and after repeated failures; the primary connect action uses vendor-neutral
  wording; the dashboard gains a compact two-column layout with expand-on-tap; session cards show
  phase-driven agent avatars.
- `agent-ble-doorbell`: the rendezvous value reported to a phone reflects the host's current
  network address, including after the host changes networks.
- `companion-helper-platforms`: the cross-platform helper's rendezvous reflects the current network
  address after a change, matching the macOS helper.

## Impact

- `app/src/useBridge.ts` — network-change listener, re-discovery flow, failure counter, address
  refresh.
- `app/src/bleClient.ts` — re-read the rendezvous characteristic from the existing connection and
  re-scan when needed.
- `app/src/networkChange.ts` (new) — pure change detection over NetInfo state, unit-testable.
- `app/src/avatar.ts` (new) — phase→mood, agent→colour/cut/seed mapping and reduce-motion handling.
- `app/src/components.tsx`, `app/src/styles.ts` — compact card, sessions layout switch, avatar
  placement, all theme skins.
- `app/App.tsx` — layout state and header control; connect button label.
- `app/package.json`, `app/ios/Podfile.lock`, `app/android` — new native dependencies.
- `app/test/setup.ts`, `app/test/dashboard.test.tsx`, new tests — Skia/Reanimated/moodstone mocks,
  layout and avatar coverage.
- `helper/src/peripheral/linux.rs`, `helper/src/peripheral/windows.rs`, `helper/src/lan.rs` — resolve
  the LAN address per read.
- `mac-helper/Sources/OpenCodeInformerHelper/Contract.swift` — interface fallback when the active
  network is not `en0`/`en1`.
- `plugin/src/pairing.js` — persist issued tokens (and load them at startup) with owner-only
  permissions; keep the in-memory map as the fast path.
- `plugin/src/bridge.js` — hydrate the session model from `GET /api/session` before the bridge
  starts serving.
- No contract (`contract/`) changes: the rendezvous format, UUIDs and payloads stay as they are.
