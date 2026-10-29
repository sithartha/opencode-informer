# Tasks

## 1. Reconnect primitives

- [x] 1.1 Add `app/src/networkChange.ts` with `networkIdentity(state)` and `shouldRediscover(previous, next)`: ignore unknown/unreachable states, fire on reconnect and on a type or IPv4 change. Add `app/test/networkChange.test.ts` covering disconnected→connected, Wi-Fi IP change, type change, identical refresh, and `isInternetReachable: false`; verify with `cd app && node --import tsx --test test/networkChange.test.ts`.
- [x] 1.2 Make `BleClient` accept an injectable manager factory and add `refreshRendezvous(timeoutMs)`: re-read the characteristic over the existing link with a timeout, fall back to `findAndConnect()` while keeping the doorbell callback wired. Add `app/test/bleRendezvous.test.ts` covering the re-read, failure, timeout and malformed-value paths; verify with `cd app && node --import tsx --test test/bleRendezvous.test.ts`.
- [x] 1.3 Add `app/src/rediscover.ts` with the pure policy pieces: `REDISCOVER_AFTER_FAILURES`, failure-counter transitions, and the candidate-probe decision (`accept` on snapshot, `keep-token` on 401, `retry` on network error). Add `app/test/rediscover.test.ts`; verify with `cd app && node --import tsx --test test/rediscover.test.ts`.

## 2. Recovery wiring in the app

- [x] 2.1 Subscribe to `NetInfo.addEventListener` in `useBridge`, normalize with `networkIdentity`, debounce 1.5 s and dedupe, and ignore events while unpaired or manually disconnected; when connected, probe the current base with a 5 s `fetchState` and only rediscover on failure. Verify with `cd app && npm run typecheck` and confirm no network listener work runs after `disconnect()` by reviewing the cleanup path.
- [x] 2.2 Add the failure counter to `scheduleReconnectRef`: increment on failure, reset on a successful `fetchAndStream`, and run `rediscoverAddress()` before the next retry at three failures. Verify the counter transitions with the tests from 1.3 and `cd app && npm run typecheck`.
- [x] 2.3 Implement single-flight `rediscoverAddress()` in `useBridge`: refresh the rendezvous, probe a changed candidate with the stored token before switching, update `baseRef` and `rememberAddress` on success, keep the token on a candidate 401, and invalidate in-flight results after `disconnect()` with a generation counter. Verify with `cd app && npm test && npm run typecheck`.
- [x] 2.4 Surface the discovery state: keep the `recovering` status while a scan runs, record a diagnostic breadcrumb on scan/probe failures, and ensure a failed scan falls back to the normal backoff. Verify with `cd app && node --import tsx --test test/diagnostics.test.ts` and `npm run typecheck`.
- [x] 2.5 Add `app/src/lanScan.ts`: derive the phone's /24 from NetInfo, probe `GET /state` with the stored token, accept only a `200`, and return the found base URL; snip add `app/test/lanScan.test.ts` and verify with `cd app && node --import tsx --test test/lanScan.test.ts`.
- [x] 2.6 Use the LAN fallback in `connect`/`rediscoverAddress` when Bluetooth fails, make `fetchAndStream` remember the address and dispatch the found host, and verify on the device that the status shows the new address and the next launch reuses it.
- [x] 2.7 Seed the bridge snapshot at startup from `GET /api/session` (last hour, newest 20, silent), fill title/directory/agent/model/cost, and fold children; add `plugin/test/hydrate.test.js`; verify after a service restart that the snapshot lists both open sessions (`/state`).

## 3. Helper rendezvous freshness

- [x] 3.1 In `helper/src/peripheral/linux.rs`, remove the cached `rendezvous_bytes` and answer each GATT read from `crate::lan::rendezvous_value()`. Add a `lan` unit test for the `host:port` shape and fixed bridge port; verify with `cd helper && cargo test`.
- [x] 3.2 In `helper/src/peripheral/windows.rs`, stop setting a static rendezvous value and respond to `ReadRequested` with freshly resolved `lan::rendezvous_value()` bytes. Verify with `cd helper && cargo check --target x86_64-pc-windows-msvc` if the toolchain is available, otherwise `cargo check` on the host and record the Windows target check as a manual follow-up.
- [x] 3.3 In `mac-helper/Sources/OpenCodeInformerHelper/Contract.swift`, keep the per-read rendezvous and extend `lanAddress()` to fall back to any non-loopback IPv4 interface after `en0`/`en1`, mirroring `helper/src/lan.rs`. Verify with `cd mac-helper && swift build`.
- [x] 3.4 Document the rendezvous refresh behavior in `helper/README.md` and `mac-helper/README.md` (one short paragraph each) and verify the commands they name still match the scripts in the repo.

## 4. Neutral connect label

- [x] 4.1 Change the primary connect button to "Find nearby computer" in `app/App.tsx`, keep the address action and hint, and mirror the label in the accessibility label. Add a component/dashboard assertion for the visible label; verify with `cd app && npm run test:components`.
- [x] 4.2 Make the action start a Bluetooth scan immediately (skip the remembered address), cancel and re-queue an in-flight attempt, and report off/unauthorized/resetting Bluetooth with a specific message; verify on the device that a tap starts "discovering" and either pairs or shows the Bluetooth error.

## 5. Native avatar dependencies

- [x] 5.1 Install `@shopify/react-native-skia`, `react-native-reanimated` and `react-native-worklets` with `npx expo install`, then `moodstone@1.0.1` with npm; verify the resolved versions satisfy moodstone's peers and `npx expo install --check` reports no mismatches.
- [x] 5.2 Refresh the native projects (`pod install` in `app/ios`, or `npx expo prebuild` if pods drift) and boot a dev build on the iOS simulator; verify the app reaches the dashboard without a crash (observable).

## 6. Avatars

- [x] 6.1 Add `app/src/avatar.ts` with `avatarMood(phase, currentTool)`, deterministic `avatarIdentity(agent, fallbackId)` (cut, palette colour, three-value seed) and `useReduceMotion()`. Add `app/test/avatar.test.ts` for the full mood table, identity stability across calls, distinct identities for distinct agents, and seed ranges; verify with `cd app && node --import tsx --test test/avatar.test.ts`.
- [x] 6.2 Add `app/src/AgentAvatar.tsx` as the only `moodstone` importer, hide the canvas from assistive tech, and mock `moodstone` in `app/test/setup.ts` with a View exposing mood/cut/colour via testID. Verify with `cd app && npm run test:components` and `npm run typecheck`.
- [x] 6.3 Show the avatar in the full `SessionCard` and in the compact card: 32 dp still in compact, 40 dp animated only when expanded, paused under Reduce Motion. Extend `app/test/dashboard.test.tsx` to assert the mood for running/with-tool, running/without-tool, waiting, completed and ended sessions; verify with `cd app && npm run test:components`.
- [x] 6.4 Ensure the demo and card preview screens show avatars for their sample cards, and add a component assertion; verify with `cd app && npm run test:components`.
- [x] 6.5 Make every avatar circular, vary only its light seed per session, take the surface colour from the active theme accent, and flip the eye colour with the theme; update `avatar.test.ts` and the dashboard avatar tests; verify with `cd app && npm test && npm run test:components`.

## 7. Session layout modes

- [x] 7.1 Add `sessionLayout` state in `App.tsx` defaulting to compact, without persistence, plus a Grid/List control in both the default and `classic-os` Sessions headers. Add a dashboard test for the default layout and the toggle; verify with `cd app && npm run test:components`.
- [x] 7.2 Add `CompactSessionCard` and a measuring `SessionGrid` (flex-wrap, measured item width, one-line activity, attention marker, button role with name and phase). Tapping expands the full `SessionCard` at full width, tapping another collapses the first, and a second tap on the expanded title collapses it; verify with new dashboard tests for expand, collapse and single-expansion.
- [x] 7.3 Keep sessions with pending permissions or questions compact in the grid, highlight them with the attention colour and avatar instead of auto-expanding, and expand their controls on tap; add a layout test for the compact default and verify with `cd app && npm run test:components`.
- [x] 7.4 Add themed compact/toggle styles for every skin in `app/src/styles.ts`, preserving the full-layout output, and cover Default plus Classic OS in component tests; verify with `cd app && npm run test:components`.
- [x] 7.5 Confirm ordering and the empty state are unchanged in the compact layout (same `orderSessions` call, same empty card) and add assertions; verify with `cd app && npm run test:components`.
- [x] 7.6 Render compact cards through `GradientSurface` with the skin's radius/HUD/rail flags and show the working-directory name instead of the title; add a component test for the title-vs-directory rule and run `cd app && npm run test:components`.

## 9. Durable pairing

- [x] 9.1 Persist issued tokens in `plugin/src/pairing.js` (store path option, atomic owner-only write, load at startup, corrupt file tolerated, 50-token cap, revoke updates the file), resolve the path in `configFromEnv`, and pass it from `buildBridge`. Add restart/revoke/corrupt/permission tests to `plugin/test/pairing.test.js`, keep test bridges in memory with `pairingStorePath: null`, and document the path in `plugin/README.md`; verify with `cd plugin && npm test`.
- [x] 9.2 Stop clearing the stored token on a 401: `reconnectWithToken` returns the token with `revoked`, `establish` returns `"revoked"`, and a supplied pairing code skips token reuse. Update `app/test/reconnect.test.ts` to assert the token survives; verify with `cd app && node --import tsx --test test/reconnect.test.ts && npm run typecheck`.
- [x] 9.3 Add the `requirePairing` flow to `useBridge`: pause automatic retries while pairing is required, keep the token, open the code dialog for the rejecting address, replace the token on a successful code, and reset the flag on any successful request or explicit connect. Verify with `cd app && npm test && npm run typecheck`.
- [x] 9.4 Verify manually that a paired phone reconnects after restarting OpenCode/the plugin or the helper without a code, and that a deliberately revoked token offers re-pairing without deleting the stored token until a new code is entered. Verified: `pairing.json` keeps 1 token; after a second OpenCode restart the phone reconnected automatically (established TCP) without a code.

## 10. Integration verification

- [x] 10.1 Run the full app suite and typecheck: `cd app && npm test && npm run test:components && npm run typecheck`.
- [x] 10.2 Run the helper and contract suites: `cd helper && cargo test` and `cd contract && node --test`.
- [ ] 10.3 Build and install an iOS release on the test device, then verify on device: switching the Mac between Wi-Fi networks reconnects without pressing anything; the three-failure path re-discovers; the Grid/List control, expansion, pending cards and avatars render under Default and Classic OS; Reduce Motion stops avatar animation.
- [ ] 10.4 Verify the helpers with a real network change: macOS menu-bar helper and the Linux/Windows helper report the new address on a fresh rendezvous read (for example with the helper's `--scan` path and a phone re-read), and an unreachable Bluetooth host does not strand the app in a reconnect loop.
