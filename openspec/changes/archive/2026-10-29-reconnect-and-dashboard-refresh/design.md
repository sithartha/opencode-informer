# Design

## Context

See `proposal.md` for motivation and `specs/` for the behavioral contract.

Current implementation facts that shape the approach:

- `app/src/useBridge.ts` keeps the endpoint in `baseRef` and a token in `tokenRef`. `connect()` tries
  the remembered `lastHost`/`lastPort`, then falls back to BLE discovery; `connectRemembered()`
  only tries the remembered address. `scheduleReconnectRef` retries `baseRef` with exponential
  backoff (2 s → 30 s) and never re-discovers, so a network change leaves it retrying a dead IP
  indefinitely. The watchdog (10 s timer) feeds the same retry loop.
- `@react-native-community/netinfo` is already a dependency but is not used anywhere in `app/src`.
- `BleClient` (`app/src/bleClient.ts`) holds one connected `Device`, subscribes to doorbells, and
  parses `host:port` from the rendezvous characteristic. It has no way to re-read the characteristic
  or to rescan while keeping the doorbell subscription.
- The helper's BLE local name is the same on every host (`OpenCodeInformer`) and the rendezvous
  carries no host identity, so discovery cannot tell two computers apart by name. The bridge port
  is fixed (38963); only the host part changes.
- `fetchState(base, token)` already aborts after 8 s and throws `unauthorized` on 401.
  `reconnectWithToken` currently clears the stored token on 401 — appropriate for a genuinely revoked
  token, destructive when a stale address now belongs to another computer. The bridge
  (`plugin/src/pairing.js`) keeps issued tokens in an in-memory `Map`, so every plugin or OpenCode
  restart forgets pairings and forces a new code.
- The macOS helper resolves the rendezvous per read (`Contract.rendezvousValue()`), but only looks
  at `en0`/`en1`. The Rust helper caches `rendezvous_bytes` at startup (Linux) and uses a static
  GATT value (Windows).
- Session cards are one full-width `SessionCard` per session rendered inside a `ScrollView`; styles
  are generated per theme skin by `createStyles(theme)`; `orderSessions` defines the order. Tests
  run on `jest-expo` (`npm test` for node tests, `npm run test:components` for component tests) and
  there is no Skia or Reanimated today.

## Goals / Non-Goals

**Goals:**

- Recover from a network change without user action, keeping the existing pairing and the existing
  doorbell subscription behavior.
- Make re-discovery safe when several helpers are in range.
- Keep the compact and full session presentations consistent with all existing theme skins and
  accessibility, with no new persisted preference.
- Add Moodstone avatars without making the dashboard's list rendering expensive.

**Non-Goals:**

- Multiple simultaneous pairings / remembering more than one computer.
- Adding a stable helper identity characteristic or changing the contract (UUIDs, payloads,
  rendezvous format).
- Avatars in the Live Activity, notifications, hero, or agent/model switcher.
- Persisting the session layout choice (explicitly excluded by the spec).
- Reworking the bridge, plugin, or SSE protocol.

## Decisions

### 1. Detect network changes with NetInfo, keyed on a normalized network identity

Add `app/src/networkChange.ts` with pure helpers:

```ts
export interface NetworkIdentity {
  connected: boolean
  type: string | null
  ipAddress: string | null
}
export function networkIdentity(state: NetInfoState): NetworkIdentity | null
export function shouldRediscover(previous: NetworkIdentity | null, next: NetworkIdentity): boolean
```

`networkIdentity` returns `null` only while NetInfo reports an unknown connection
(`isConnected === null`), so transient values during a Wi-Fi switch do not count. Internet
reachability is ignored on purpose: the bridge lives on the local network, which may have no
internet (a hotspot, a lab LAN). `shouldRediscover` fires when the identity goes from disconnected
to connected, or when `type` or `ipAddress` changes while connected. The listener in `useBridge`
debounces by 1.5 s and dedupes on the normalized identity, because iOS emits several NetInfo updates
per switch.

Alternative considered: polling the bridge and re-scanning on failure only. Rejected because the
first failures can take 30 s of backoff and the dashboard would stay stale far longer than needed.
Polling `getLastHost()` cannot detect a change without an actual failure.

### 2. One re-discovery routine, shared by NetInfo and the failure counter

Add to `useBridge` a single-flight `rediscoverAddress()` used by both triggers:

1. Bail out when `manuallyDisconnected`, when unpaired (`!tokenRef.current`), or when a discovery is
   already running.
2. Ask `BleClient` for a fresh rendezvous (see 3). On failure: record a diagnostic, keep the current
   address, and let the normal backoff continue.
3. If the discovered base equals `baseRef.current`, probe it and finish.
4. Otherwise probe the candidate with `fetchState(candidate, token, 5000)` **before** touching the
   current endpoint:
   - success → `baseRef.current = candidate`, `rememberAddress(candidate)`, `fetchAndStream(...)`,
     reset `reconnectDelayRef` and the failure counter, `dispatch({type:"connected"})`.
   - `unauthorized` → the computer the helper points at rejects our token: call `requirePairing`
     (below). Do not delete the token; a later code replaces it.
   - network error → keep the current address and schedule the next retry.
5. A generation counter (`discoveryGenerationRef`) invalidates results if `disconnect()` ran while a
   scan was in flight.

`requirePairing(base)` stops the automatic loop (`pairingRequiredRef` suppresses
`scheduleReconnect`), sets `paired` false, dispatches `Pairing required`, and opens the pairing-code
dialog for that base. The token stays in `SecureStore`; entering a code calls `establish(base, code)`,
which skips token reuse and replaces the stored token. Any successful `fetchState` clears the flag.

The remembered-address path no longer treats 401 as revocation: `reconnectWithToken` returns
`revoked` with the token intact, `establish` returns `"revoked"`, and `connect()` continues into
Bluetooth discovery before offering pairing. Only a rejection from the helper's fresh address calls
`requirePairing`.

Alternative considered: trust the first advertised helper and let the 401 clear the token. Rejected
because a second Mac/PC in Bluetooth range would unpair the phone.

### 3. `BleClient` gains `refreshRendezvous()`

Refactor `BleClient` to accept an injectable manager factory (`constructor(createManager = () =>
new BleManager())`) so tests can supply a fake. Add:

```ts
async refreshRendezvous(timeoutMs = 6000): Promise<Rendezvous>
```

- If a device is connected and services are discovered, read the rendezvous characteristic with a
  Promise race against `timeoutMs`. On success, parse and return.
- If the read fails or no device is connected, cancel the stale connection and reuse
  `findAndConnect()`, which scans and re-subscribes the doorbell. Return the parsed rendezvous.
- Keep the existing doorbell callback wired on the new connection, so re-discovery does not lose
  wake signals.
- Validate a scan candidate before connecting: accept it only when its advertised service UUIDs
  contain `SERVICE_UUID` or its local name is `OpenCodeInformer`, and after discovery verify that the
  connected peripheral exposes the service. iOS can hand unrelated peripherals (AirPods, watches) to
  the listener despite the native service filter, and connecting to them fails with
  `Device <id> connection failed`. A failed connection is retried once against a different device
  instead of ending the whole attempt.

Alternative considered: always disconnect and rescan. Rejected because an existing link is fast and
avoids a 15 s scan; the spec asks for a re-read over the existing link.

### 4. Re-discover after three consecutive reconnect failures

`scheduleReconnectRef` gains `reconnectFailuresRef`:

- increment on each failed attempt, reset to 0 on any successful connect (`fetchAndStream`).
- when the counter reaches `REDISCOVER_AFTER_FAILURES = 3`, call `rediscoverAddress()` before the
  next plain retry, then continue the normal backoff schedule; do not reset the counter on a failed
  discovery (the next attempt will scan again at most once per backoff tick).

The watchdog keeps calling `scheduleReconnectRef` unchanged.

### 5. Network change handling while connected vs disconnected

- Unpaired or manually disconnected: ignore network changes.
- Paired and "connected": keep the current endpoint. Run a 5 s `fetchState` probe after the debounce;
  if it succeeds, do nothing (spec: "no needless discovery"). If it fails, mark the connection lost
  and run `rediscoverAddress()` immediately.
- Paired and "recovering"/"disconnected": run `rediscoverAddress()` immediately, then fall back to
  the normal backoff.
- Never tear down the BLE link on a network change; only the HTTP endpoint changes.

### 6. Keep the helper's rendezvous current

- **Linux** (`helper/src/peripheral/linux.rs`): drop `rendezvous_bytes`; the read closure calls
  `crate::lan::rendezvous_value()` on each request. `lan_address()` already walks interfaces and is
  cheap enough for a GATT read.
- **Windows** (`helper/src/peripheral/windows.rs`): stop passing a static value for the rendezvous
  characteristic; register `ReadRequested` and respond with the bytes of
  `crate::lan::rendezvous_value()`. Keep the characteristic properties as `Read`.
- **macOS** (`mac-helper/.../Contract.swift`): already resolves per read; add a fallback over all
  non-loopback IPv4 interfaces after `en0`/`en1`, mirroring `helper/src/lan.rs`, so Ethernet,
  Thunderbolt or hotspot interfaces are not reported as `127.0.0.1`.
- The loopback approval page's printed rendezvous stays a startup snapshot (cosmetic only); do not
  expand scope.
- Tests: a Rust unit test for `lan::rendezvous_value()` shape/port; existing `helper selftest` and
  `contract` checks stay green. Windows/Linux behavior is validated manually by switching networks.

### 7. Layout modes and the compact card

- `App.tsx` owns `sessionLayout: "compact" | "full"` (default `"compact"`) and
  `expandedSessionID: string | null`. Neither is persisted.
- The Sessions header renders a two-way control (`Grid` / `List`) in both the default text header and
  the `classic-os` pill header, using new themed styles (`layoutToggle*`). Tapping it only changes
  the layout; expansion state is kept.
- A new `SessionGrid` component (in `components.tsx` or its own file) renders a wrapping row and
  measures its width with `onLayout`; item width is `(width - gap) / 2`. Using a measured width
  avoids percentage-plus-gap rounding on different screen widths and skins.
- `CompactSessionCard` shows: avatar, the working-directory name (`dirName(cwd)`, falling back to
  the title or id), phase dot with the phase label, and one line of `lastActivity` (or
  `currentTool` when present). The directory is the compact card's identity: several sessions can
  share a title or an agent, but their directories differ. The whole card is a `PressableScale` with
  `accessibilityRole="button"` and a label of "`<directory>`, `<phase>`". Sessions with a pending
  request never render this card (see below).
- Compact cards reuse `GradientSurface` with the same radius, `nerv` and `rail` flags as the full
  `SessionCard`, and only the padding/content differ. That gives them the theme's real card chrome
  (gradient border, square/squircle corners, HUD corners, Star Wars rail) instead of a plain
  `View` with a border.
- Tapping expands: `expandedSessionID = session.id` and the same grid slot renders the existing
  `SessionCard` at `width: "100%"`, so it takes its own row and pushes later cards down. Tapping
  another compact card collapses the previous one (single expansion). A second tap on the expanded
  card's title area collapses it — attach the collapse handler to the title wrapper, leaving Stop,
  Close and the agent/model chip untouched.
- Sessions with a pending request stay as compact cards in the grid, highlighted through the same
  `GradientSurface` attention colours and pulse used by the full card, with their observing avatar.
  They are not expanded automatically, so the grid stays uniform; tapping one expands the full card
  with allow/deny or the answer controls. The expanded card can be collapsed even while a request is
  pending.
- `full` layout is exactly today's rendering.
- `SessionCard` gets optional `onCollapse`; when absent, behavior is unchanged (preview, demo,
  orphan attention cards).
- The demo/preview screens keep working; `PreviewScreen` gains one compact-grid sample.

Alternative considered: nested `FlatList` with two columns. Rejected: the dashboard is a single
`ScrollView` with a hero and extra sections, and nesting virtualized lists inside it is a known
source of scroll jank; session counts are small.

### 8. Avatars: Moodstone behind a thin wrapper

- Dependencies: `npx expo install @shopify/react-native-skia react-native-reanimated
  react-native-worklets`, then `npm install moodstone` (1.0.1). Expo-managed versions must satisfy
  moodstone's peers (Skia ≥ 2, Reanimated ≥ 4, Worklets ≥ 0.7). No `babel.config.js` change is
  needed: `babel-preset-expo` wires the worklets plugin automatically for Reanimated 4. iOS/Android
  need a native rebuild (`pod install` / `expo prebuild`), because the project is prebuilt.
- `app/src/avatar.ts` holds the pure mapping:
  - `avatarMood(phase, currentTool)` implements the spec table.
  - `avatarIdentity(agent, sessionId)` uses a stable string hash (FNV-1a) keyed by the session id
    (falling back to the agent) to produce the three-number light seed in `0..2π`. Every avatar has
    the `circle` cut; the seed makes each face subtly different while the silhouette stays uniform.
    The same session is stable; no `Math.random()` at render time.
  - `avatarColor(theme)` returns the active theme's `accent`, so every face belongs to the interface
    instead of carrying its own palette. The eye colour flips with `theme.dark` for contrast.
  - `useReduceMotion()` wraps `AccessibilityInfo.isReduceMotionEnabled()` and the
    `reduceMotionChanged` event.
- `app/src/AgentAvatar.tsx` is the only module importing `moodstone`. It renders `<Moodstone>` with
  the computed props and hides the canvas from assistive tech
  (`accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"`).
- Sizes: 32 dp compact (`animated={false}`), 40 dp expanded (`animated={!reduceMotion}`,
  `paused={reduceMotion}`).
- Performance: static rendering in the grid is the default; only one expanded card animates at a
  time. If a large session count shows cost, the fallback is to render the compact avatar with
  `useAvatarSpec`/static props (already static) and keep animation to the expanded card.
- Jest: `test/setup.ts` mocks `moodstone` with a plain `View` that exposes `testID` and
  `accessibilityLabel` built from `mood`, `cut` and `color`, so component tests can assert the mood
  without a Skia context. Skia/Reanimated mocks are only added if an import outside the mock requires
  them.

Alternative considered: drawing a local procedural face without Skia. Rejected by the user's choice
of the Moodstone package; the package also brings the exact mood presets and the UI-thread rendering.

### 9. Copy change for the connect action

`app/App.tsx`: "Connect to Mac" → "Find nearby computer"; the secondary button and hint stay
("or connect by address (no Bluetooth)"). Accessibility labels follow the visible label.

The action also has to behave like its label: `connect(true)` skips the remembered address and
starts discovery immediately, re-reading the rendezvous over the live Bluetooth link first (both
devices may have moved networks together without dropping the link) and scanning only when there is
no usable link. If another attempt is already running, a tap sets
`connectRequestedRef`, calls `BleClient.cancelScan()` (the pending scan rejects with
`ble scan cancelled`, which is not shown as an error), and the attempt restarts in the `finally`
block. The automatic launch path keeps `connectRemembered()` first plus a single `connect()`, so a
background attempt never locks the button for minutes. `BleClient` checks `manager.state()` first and
reports a specific error for off, unauthorized, resetting or unsupported Bluetooth.

### 10. Persist bridge pairing tokens

`PairingManager` gains a `storePath` option (default `null`, so unit tests stay in memory). The
production path is resolved in `configFromEnv`: `OPEN_ISLAND_MOBILE_PAIRING_FILE` or
`$XDG_STATE_HOME/open-island/pairing.json` (default `~/.local/state/open-island/pairing.json`),
matching the state-home convention already used by `serviceReply.js`, and passed by `buildBridge`.

- Format: `{ "version": 1, "tokens": [{ "token", "deviceName", "createdAt" }] }`, capped at the 50
  newest tokens.
- Load in the constructor; a missing or corrupt file starts empty and never throws.
- Persist on issue and revoke: write a sibling `.tmp` with mode `0600`, `rename` it into place, then
  `chmod 0600`. Any failure is swallowed so a read-only disk cannot stop the bridge.
- Tokens are never logged; diagnostics record only that persistence failed, if at all.

Alternative considered: the OS keychain. Rejected as a dependency and a per-platform code path for a
local-only bearer token; a `0600` file in the user's state directory matches what other local
services do. Alternative: disable auto-revocation entirely and keep tokens in memory. Rejected
because every OpenCode restart would still force a new pairing.

### 11. Local-network fallback when Bluetooth cannot connect

The app keeps the latest NetInfo identity (IP and subnet). When a stored token exists and a
Bluetooth attempt fails, `findBridgeOnLan` builds the host list for the phone's own /24
(`ipv4Candidates` narrows wider masks) and probes `GET /state` on port 38963 with the token, using
32 concurrent requests and an 800 ms timeout. Only a `200` counts: a bridge that rejects the token is
skipped, and the token stays stored. On success the app calls `fetchAndStream`, which now remembers
the address centrally and dispatches the new host into the connection state, so the status pill and
the next launch use the new address. This is also the fastest path when both machines move networks
and the Bluetooth link is stale; it runs only after a connection failure or on an explicit
"Find nearby computer" tap, never on a timer.

Alternative considered: a UDP broadcast or mDNS module. Rejected for now because it needs another
native dependency; the subnet probe uses `fetch` only, works with the existing local-network
permission, and stays inside the phone's own /24.

### 12. Seed the snapshot from OpenCode at startup

The V2 service exposes `GET /api/session` as `{data, cursor}`; the response includes every
historical session (50+ here), so hydration cannot adopt it wholesale. `bridge.hydrate()` runs before
the HTTP server starts, keeps sessions whose `time.updated` is within the last hour, sorts newest
first, caps at 20, applies them through `model.apply` directly (no broadcast or doorbell), and fills
title, directory, agent, model and cost. `location.directory` is the V2 field (not `directory`), and
`time.idle` marks a session as completed. Child sessions fold into their parent when the parent is in
the same recent window. This keeps an OpenCode restart from dropping sessions that were already open,
without dumping months of history.

Alternative considered: hydrate everything the API returns. Rejected because the dashboard would
fill with old sessions. Alternative: use the TUI's open-tab list. Rejected because the plugin context
does not expose it; recent activity is the available proxy.

## Risks / Trade-offs

- **New native dependencies require a new binary** → No OTA-only rollout. Mitigation: bump the app
  version, rebuild with EAS, and test on device before submission; rollback is reverting the
  dependency commit and rebuilding.
- **Skia canvases on many cards can cost memory/GPU** → Static avatars in the grid, a single
  animated expanded card, and no animation when Reduce Motion is on.
- **Bluetooth scans are slow (up to 15 s) and battery-costly** → scans run only on a network change
  or after three failures, serialized by single-flight, and never while the remembered address
  answers.
- **A different computer in range could be discovered first** → The candidate is probed with the
  stored token before the app commits; a rejection only offers re-pairing and never deletes the
  stored token, so the user can keep the old pairing if the real computer returns.
- **The persisted token file is a credential** → Owner-only `0600` file under the user's state
  directory, never logged, capped and rewritten atomically; a corrupt or unreadable file degrades to
  in-memory tokens instead of failing.
- **A restarted bridge accepts tokens forever** → Revocation removes the token from the file; the
  50-token cap drops the oldest entries on a long-lived install.
- **A rejected token pauses automatic recovery** → `pairingRequiredRef` stops the loop and opens the
  code dialog; dismissing it keeps the token and the user can reconnect later (the flag clears on
  the next successful request or an explicit connect).
- **iOS may suspend Bluetooth while backgrounded** → Re-discovery then happens on the next
  foreground; the existing watchdog/foreground paths still recover. The spec does not require
  background re-discovery.
- **NetInfo emits noisy intermediate states** → Ignore unknown connectivity, debounce 1.5 s, dedupe
  on the normalized identity.
- **Per-read LAN lookup on Linux/Windows** → `getifaddrs` per GATT read is negligible; it avoids a
  network-change watcher and service restart.
- **Moodstone peer versions vs Expo SDK 57** → Install with `expo install` and verify `npx expo
  doctor`; pin the versions that Expo resolves in `package.json`.
- **Theme skins differ in card chrome** → Compact cards render through `GradientSurface` with the
  same skin flags as the full card, so border gradients, square/HUD corners and the rail come from
  the theme; tests cover Default and Classic OS plus the theme avatar palette.
- **A single accent on a face** → The accent already carries the theme's identity, and eyes switch
  between white and black with `theme.dark` so the circle stays legible on light and dark skins.
- **A session idle for more than an hour is not seeded after a restart** → Opening it in OpenCode emits an event and it appears. The one-hour window keeps old history out; the alternative was flooding the dashboard.
- **A VPN or firewall on the computer can hide the local network** → CoreDevice/mDNS discovery and the
  LAN fallback may fail even though both devices are on the same Wi-Fi. The app reports that no
  computer was found and keeps the pairing; turning the VPN off (or allowing local traffic) restores
  the LAN path. BLE discovery is independent of the VPN but can still be blocked by a stale system
  bond.
- **Expanded/collapsed state after a snapshot refresh** → Expansion is keyed by session id, so a
  resync keeps the same card open; a closed session's id is ignored.

## Migration Plan

1. Land the pure modules and tests (`networkChange`, `avatar`) first, with no native dependency
   changes.
2. Add native dependencies and rebuild; verify a dev build starts on iOS and Android before the UI
   work.
3. Switch `App.tsx` to the compact default; keep the full layout one tap away.
4. Update the helpers independently of the app (Rust release `helper-crossplatform-vX.Y.Z`, macOS
   `helper-vX.Y.Z`); the app tolerates old helpers (it just gets a stale address and keeps
   retrying), so no ordering requirement.
5. Update the plugin alongside the app: the first run after the update has no token file, so a phone
   that pairs earlier keeps working from memory and is written to disk on its next pairing. A phone
   with an in-memory-only pairing from a previous run pairs once more; after that, restarts keep it.
6. Rollback: revert the native dependency commit and rebuild; helper and plugin changes are backward
   compatible with older apps (same contract). A leftover token file is ignored by older plugins.

## Open Questions

None.
