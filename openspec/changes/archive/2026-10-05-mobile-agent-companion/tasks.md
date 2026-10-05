# Tasks

## 1. Workspace and shared contract

- [x] 1.1 Create the workspace skeleton (`plugin/`, `mac-helper/`, `app/`) with a top-level README describing the three pieces; verify the directories exist and each contains a README
- [x] 1.2 Define the shared wire contract (pairing, snapshot, SSE event names and payloads, resolution, BLE service/characteristic UUIDs) as machine-readable fixtures plus human docs; verify a plugin contract test parses every fixture and an app type test consumes the same fixtures

## 2. Plugin: activity model and snapshot

- [x] 2.1 Implement the session/activity state model from OpenCode events (phase `running` / `waiting-permission` / `waiting-answer` / `completed` / `ended`, current tool, last activity text); unit tests cover each phase transition
- [x] 2.2 Implement running-agent counting and reconciled session lifecycle (start, end, child-session folding); unit test asserts the count matches the set of running sessions
- [x] 2.3 Implement the `GET /state` snapshot serializer; unit test asserts sessions plus `activeSessionCount`, including the empty case
- [x] 2.4 Map events to the activity stream (session start/end, prompt, tool start/end, permission requested, question asked, completion); unit tests assert each event type and field shape against the contract fixtures

## 3. Plugin: HTTP/SSE server, auth, and resolution

- [x] 3.1 Implement the `node:http` server bound to the fixed LAN port with a process-global singleton guard; test that a second initialization does not double-bind or crash
- [x] 3.2 Implement the BLE-approved pairing flow and `POST /pair` issuing a random bearer token; test that unpaired requests get `401` and a valid token is accepted
- [x] 3.3 Implement `GET /events` SSE with keepalives; integration test drives a real client and asserts ordered delivery across an idle gap
- [x] 3.4 Implement `POST /resolution` applying `allow` / `deny` to permissions and an option to questions via `ctx.permission.reply` and the form reply path; test each path and the unknown/already-resolved case
- [x] 3.5 Implement first-answer-wins fan-out across the Open Island socket, the phone, and the timeout, with resolved-request bookkeeping; test phone-first and Open Island-first ordering, and stale suppression
- [x] 3.6 Verify fail-open: tests assert that no connected client and a mid-request disconnect neither block nor hang agent handling
- [x] 3.7 Document plugin endpoints, port, and configuration in `plugin/README.md`; verify every documented `curl` command behaves as written

## 4. Plugin: BLE trigger

- [x] 4.1 Implement the localhost ring client that signals the helper on permission, question, and completion; unit test asserts a missing helper produces no error and no agent impact
- [x] 4.2 Document the plugin-to-helper handshake in `plugin/README.md` and the wire contract; verify the documented payload matches the fixture

## 5. macOS Swift BLE helper

- [x] 5.1 Create the helper as a macOS menu-bar app (SPM/Xcode) that runs at login; verify it launches, shows a status item, and can be quit cleanly
- [x] 5.2 Implement the CoreBluetooth peripheral: advertise the service and expose the notify/read/write characteristics per the contract; verify discovery with a generic BLE scanner
- [x] 5.3 Implement the localhost ring endpoint and doorbell delivery to the connected central; verify a scanner receives the doorbell notification
- [x] 5.4 Implement the rendezvous read characteristic returning the bridge host and port; verify a scanner reads the correct value
- [x] 5.5 Implement the pairing approval prompt bound to the bridge flow; verify approve issues an approval and reject does not
- [x] 5.6 Handle client disconnect/re-advertise and cache pending attention when no client is connected; verify reconnection delivers a missed doorbell
- [x] 5.7 Document helper install, launch-at-login, and permissions in `mac-helper/README.md`; verify the documented launch steps work on a clean run

## 6. Expo app: foundation and networking

- [x] 6.1 Scaffold the Expo + TypeScript app and get a development build running on an iOS simulator; verify the build launches
- [x] 6.2 Add native config for BLE background mode, local-network usage, ATS local exception, and notifications; verify the generated `Info.plist` contains the required keys
- [x] 6.3 Implement BLE central connection, rendezvous-address read, and the pairing flow; test against a mocked peripheral and against the real helper
- [x] 6.4 Persist the token in SecureStore and implement auto-reconnect plus revoked-token handling; tests cover reconnect and clearing on `401`
- [x] 6.5 Implement the SSE client and `POST /resolution`; unit tests parse a sample stream and assert the posted body
- [x] 6.6 Implement the connection-state machine (connecting / connected / disconnected / recovering); unit tests cover each transition

## 7. Expo app: dashboard, notifications, and background wake

- [x] 7.1 Build the activity dashboard (sessions, phase, current tool, recent activity, running count, empty state); verify with component tests and a manual run against the live bridge
- [x] 7.2 Implement notification categories and actions for permission, question, and completion; unit tests assert the mapping per event
- [x] 7.3 Wire notification actions to `POST /resolution` and update the UI; tests cover allow, deny, and answer
- [x] 7.4 Implement the background wake handler (doorbell → fetch state → notify; unreachable → generic notification); verify with a simulated doorbell while backgrounded
- [x] 7.5 Handle `actionableStateResolved` by clearing the pending request and dismissing its notification; unit test asserts the clear path
- [x] 7.6 Document app setup, permissions, and the force-quit/range limitations in `app/README.md`; verify the documented setup reproduces a connected app
- [x] 7.7 Add the "OI" white-on-black app icon (and reuse the mark in notifications) and verify the home-screen icon renders

## 8. Android support

- [ ] 8.1 Implement an Android foreground service that maintains the connection and posts attention notifications; verify a background event is delivered with no internet
- [ ] 8.2 Implement Android BLE central pairing and wake on the same contract; verify pairing and a simulated doorbell
- [ ] 8.3 Document Android-specific setup and limitations in `app/README.md`; verify the documented steps on a device or emulator with BLE support

## 9. End-to-end integration

- [x] 9.1 Run the full local round trip from a locked iPhone: agent requests permission → phone wakes and notifies → allow → agent continues; record the observed latency and result
- [x] 9.2 Verify fail-open by stopping the helper and disabling the plugin bridge, confirming agents behave exactly as without the change
- [x] 9.3 Verify the running-agent count and activity feed stay correct across multiple concurrent sessions and a subagent fan-out
- [x] 9.4 Smoke-test that Open Island still works unchanged (its endpoint and existing notifications) with the mobile bridge active
- [x] 9.5 Record known limitations (iOS force-quit, BLE range, OpenCode-only coverage) in the change README and confirm they match design.md

## 10. Session detail

- [x] 10.1 Include pending permissions and questions in the `GET /state` snapshot; contract test asserts the pending list and its shape, including the empty case
- [x] 10.2 Emit a `session.activity` stream event on `session.text.ended`; add the event to the contract (schema + fixture) and unit-test the mapping from the activity model
- [x] 10.3 Include the snapshot's pending requests in the app state on reconnect (`stateFromSnapshot`); unit-test that pending is reconstructed
- [x] 10.4 Update `lastActivity` from `session.activity` in the app reducer; unit-test the transition
- [x] 10.5 Render per-session cards (phase, current tool, compact last activity) with inline pending controls; verify with a manual run against the live bridge
- [x] 10.6 Verify on a device that pending requests are reconstructed after a reconnect/wake
- [x] 10.7 Document the per-session detail view in `app/README.md`; verify the documented flow shows per-session pending and activity
- [x] 10.8 Show subagent and shell counts on each session card (bridge tracks them); verify on a device
- [x] 10.9 Keep at most one pending interaction per session (supersede the previous and report it resolved); unit-test the supersede path
- [x] 10.10 Move the device name and Live Activity toggle into a Settings screen with a description for each and an About section; verify on a device
- [x] 10.11 Rename the app to "OpenCode Informer" and the bundle id to `ru.opencode.informer`; verify the device build installs under the new id
- [x] 10.12 Add Light/Dark/System theming with a Settings switch; verify System follows the device appearance
- [x] 10.13 Redesign the UI with gradient surfaces, glow on attention, and motion (press scale, staggered fade/rise, pulsing dots) respecting Reduce Motion; verify on a device
- [x] 10.14 Add a card preview gallery covering every card state, reachable from the header and the empty state; verify on a device
- [x] 10.15 Differentiate attention variants by kind (blue gradient for questions, orange for permissions) across the hero, session, and needs-attention cards, with a more transparent inner block and a soft, slow glow + light-sweep; verify on a device
- [x] 10.16 Cards sweep once on appear; important borders (question/permission) get a continuously rotating gradient; the hero stays continuously animated; all motion off under Reduce Motion; verify on a device
- [x] 10.17 Count stopped sessions as "inactive" and show the hero breakdown on two rows (working + inactive, then permission + question) with a blinking working dot; verify on a device
- [x] 10.18 Refresh the snapshot on foreground and on notification tap so a permission/question that arrived while the stream was down still gets a card; verify on a device
- [x] 10.19 Single-flight, throttled snapshot sync so reconnects and repeated doorbells cannot hammer the Mac (fixes runaway polling); verify in the bridge log
- [x] 10.20 Notify only for requests still pending (ignore stale/superseded wakes) and keep only the latest buffered doorbell in the helper, so a push always has a card; verify on a device
