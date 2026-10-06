# Tasks

## 1. Bridge: device token registration

- [x] 1.1 Add `POST /device` (`{ token, platform }`) to `plugin/src/server.js`, bearer-authenticated; server test asserts `401` without a token and storage with one
- [x] 1.2 Store the token per paired client in the bridge (in memory, replaced on each registration); unit test asserts a new registration replaces the previous token

## 2. Bridge: APNs sender

- [x] 2.1 Implement an APNs sender in the plugin (`node:http2` + ES256 JWT from a `.p8`), configured by `OPEN_ISLAND_APNS_KEY_PATH/KEY_ID/TEAM_ID`; unit test builds and caches a valid JWT and signs without the real network
- [x] 2.2 Send a push for permission, question, and completion events **only when `clientCount() === 0`**, with the minimal payload (`aps.alert`, `kind`, `requestID`, `sessionID`) and `apns-topic`/`apns-push-type` headers; unit test asserts a push is attempted when no client is connected and skipped when one is
- [x] 2.3 Fail-open: a failing or unconfigured sender logs and returns without affecting event handling; unit test asserts no throw and no agent impact; handle `410 Unregistered` by dropping the token

## 3. Contract and plugin docs

- [x] 3.1 Add the `device` endpoint and the push payload shape to `contract/contract.json` and the app's `src/contract.ts`; parity test passes
- [x] 3.2 Document APNs setup (key, env vars) and the fallback rule in `plugin/README.md`; verify the documented env vars match the code

## 4. App: remote push registration

- [x] 4.1 Register for remote notifications and obtain the APNs device token with `expo-notifications` (`getDevicePushTokenAsync`); send it to the bridge on connect and when it changes; unit test asserts the posted body
- [x] 4.2 Add the `aps-environment` entitlement for device builds (config plugin / EAS credentials) and document the Push capability on the bundle id

## 5. App: remote push handling

- [x] 5.1 Handle a received remote push by presenting the same notification category and actions as the local path, with the `notifiedRef` dedupe so a live event and its push yield one notification; unit test asserts the dedupe

## 6. Verification

- [ ] 6.1 Create the APNs auth key, enable Push Notifications on the bundle id, and rebuild credentials; confirm the device returns a token
- [ ] 6.2 On a real device away from the LAN (stream disconnected, BLE out of range), confirm a permission/question/completion push arrives and the action works when the Mac becomes reachable
- [ ] 6.3 Confirm no push is delivered while the app is streaming on the LAN, and update `app/README.md` with the limitation (remote push needs internet and a configured key)
