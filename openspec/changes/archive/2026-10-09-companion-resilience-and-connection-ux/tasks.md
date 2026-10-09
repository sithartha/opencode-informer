# Tasks

## 1. Contract — question option details

- [x] 1.1 Change the `question` schema in `contract/contract.json` so options are
  `{ label, value?, description? }` objects, update the `question.asked`,
  `question.asked.multi`, `state.*`, and `pending` fixtures (including a fixture option
  with a description), and bump `contract.version`. Verify: `node --test contract/` passes.
- [x] 1.2 Mirror the same option shape and version into `app/src/contract.json` and update
  `app/test/contract-parity.test.ts` so the app copy matches the shared contract. Verify:
  `cd app && npm test` passes.
- [x] 1.3 Update `contract/README.md` to document the option object shape and the pairing
  `code` on `POST /pair`. Verify: the README matches the fixtures and tests still pass.

## 2. Bridge — option descriptions and preserved activity

- [x] 2.1 In `plugin/src/activity.js`, make `fieldOptions` return `{ label, value,
  description }` objects (dedupe, keep the description), and carry them through
  `questionList`, `form.created`, and `snapshot()`. Update `plugin/test/activity.test.js`
  expectations. Verify: `cd plugin && npm test` passes.
- [x] 2.2 Update `plugin/src/serviceReply.js` `buildFormAnswer` so it accepts object
  options and still maps a submitted label or value to the option value. Verify: a new
  plugin test submits a label and a value and `cd plugin && npm test` passes.
- [x] 2.3 In `plugin/src/activity.js`, stop `form.created` writing the question title into
  `session.lastActivity`; while a session has a pending question, append new
  `session.text.ended` text (capped length) instead of replacing it, and resume replacement
  once the question is resolved. Verify: new tests cover "message kept", "appended", and
  "normal after resolution"; `cd plugin && npm test` passes.
- [x] 2.4 Bump `ENTRY_VERSION` in `plugin/open-island-mobile.js`. Verify: `cd plugin && npm
  test` passes and the entry version string changed.

## 3. Bridge — pairing code and attempt limiting

- [x] 3.1 In `plugin/src/pairing.js`, generate a short numeric pairing code, expose the
  current code, keep it stable while an approval is pending and rotate it otherwise, and
  include it in the approval callback payload. Verify: new unit tests cover code presence
  and rotation; `cd plugin && npm test` passes.
- [x] 3.2 In `plugin/src/server.js`, require a matching current `code` on `POST /pair`,
  and add per-remote-address failure counting with a rolling window and a temporary lockout
  (keep `/pair/decision` loopback-only). Verify: new server tests cover valid code creating
  an approval, missing/wrong code rejected, and a locked-out source rejected; `cd plugin &&
  npm test` passes.
- [x] 3.3 In `plugin/src/bridge.js`, pass the code in the pairing doorbell to the helper
  (`{ kind: "pairing", ..., code }`) and make sure no SSE-broadcast payload ever contains it.
  Verify: a test asserts the pairing doorbell carries the code and `broadcast` payloads do
  not; `cd plugin && npm test` passes.
- [x] 3.4 Update the doorbell payload documentation in `contract/README.md` to include
  `code` for `kind: "pairing"`. Verify: docs match the fixture/tests.

## 4. Helper — display the pairing code

- [x] 4.1 In `mac-helper/Sources/OpenCodeInformerHelper/AppController.swift`, parse `code`
  from the pairing payload and show it in the approval prompt, without writing it to the BLE
  pairing characteristic. Verify: `cd mac-helper && swift build` succeeds and the prompt
  text includes the code (documented manual check).
- [x] 4.2 In the Rust helper (`helper/src/loopback.rs`, `helper/src/lib.rs`), show the
  pairing `code` on the local approval page/terminal and never relay it to the client.
  Verify: `cd helper && cargo test` passes, including an updated `selftest.rs` case.
- [x] 4.3 Confirm the helper's BLE/peripheral paths do not forward the code. Verify:
  inspect the doorbell relay path and add/adjust a test that a client never receives `code`;
  `cd helper && cargo test` and `cd mac-helper && swift build` pass.

## 5. App — option descriptions, stable text, directory name

- [x] 5.1 In `app/src/events.ts`, change `Question.options` to the object shape and update
  `parseQuestions` to accept objects (and tolerate plain strings). Verify: updated
  `app/test/events.test.ts` passes with `cd app && npm test`.
- [x] 5.2 In `app/src/components.tsx`, render each option's label with its description
  beneath, using `ExpandableText` for long descriptions, and update
  `MultiQuestionForm`, `PendingActions`, `PreviewScreen`, and `DemoScreen` samples. Verify:
  `cd app && npm run test:components` passes with a case for label + description.
- [x] 5.3 Keep notification option actions label-based after the option shape change
  (`app/src/pushNotifications.ts`, `app/src/notifications.ts`). Verify: `cd app && npm test`
  passes.
- [x] 5.4 In `app/src/events.ts`, while a session has a pending request, append activity
  text from `session.activity` instead of replacing it, and do not let `question.asked`
  change `lastActivity`. Verify: new `events.test.ts` cases pass with `cd app && npm test`.
- [x] 5.5 Add a `dirName(cwd)` helper and show the working-directory name in the
  `SessionCard` header instead of the full path. Verify: a unit test for `dirName` and a
  component assertion that the card shows the basename; `cd app && npm test` and `cd app &&
  npm run test:components` pass.

## 6. App — remembered computer and manual dialog

- [x] 6.1 Add last-host/last-port keys and accessors to `app/src/secureTokenStore.ts`
  (`tokenStore.ts`). Verify: unit tests for read/write/clear pass with `cd app && npm test`.
- [x] 6.2 In `app/src/useBridge.ts`, on launch/foreground while not paired, try the
  remembered address first, fall back to BLE discovery and then manual entry, and clear the
  remembered address on a `401`. Verify: `useBridge`/`reconnect` tests cover hit, miss, and
  revoked cases; `cd app && npm test` passes.
- [x] 6.3 Add a `ManualConnectModal` to `app/src/components.tsx` (explanation + separate
  address and port fields) and wire it in `app/App.tsx`, removing the inline `host:port`
  input. Verify: `cd app && npm run test:components` and `cd app && npm run typecheck` pass.
- [x] 6.4 Join and validate the separate address and port in `app/src/manualConnect.ts`.
  Verify: updated `app/test/manualConnect.test.ts` passes with `cd app && npm test`.
- [x] 6.5 Add a pairing-code entry step to the app: ask for the Mac-shown code before a
  new pairing, send it with `POST /pair` (`app/src/bridgeClient.ts`, `app/src/useBridge.ts`,
  `app/App.tsx`), and surface a rejected code / lockout. Verify: `cd app && npm test` and
  `cd app && npm run test:components` pass with cases for required code, rejection, and
  lockout.

## 7. App — idle-session diagnostics

- [x] 7.1 Add `app/src/diagnostics.ts` storing a breadcrumb in SecureStore (lifecycle,
  connection, last error, background/foreground times) and expose the latest diagnostic.
  Verify: unit tests pass with `cd app && npm test`.
- [x] 7.2 Install a global JS error handler and wrap background notification scheduling and
  reconnect calls so failures are recorded and never escape. Verify: tests simulate a
  thrown notification/reconnect failure and assert the app records it and keeps running;
  `cd app && npm test` passes.
- [x] 7.3 Show the latest diagnostic (including "may have ended in the background") in the
  Settings screen in `app/App.tsx`. Verify: `cd app && npm run test:components` and `cd app
  && npm run typecheck` pass.

## 8. Integration checks and device build

- [x] 8.1 Run the full sweep: `node --test contract/`, `cd plugin && npm test`, `cd app &&
  npm test`, `cd app && npm run test:components`, `cd app && npm run typecheck`, `cd
  mac-helper && swift build`, `cd helper && cargo test`. Verify: every command exits 0.
- [x] 8.2 End-to-end on the running app: pair using the Mac-shown code, reconnect via the
  remembered address on relaunch, connect manually through the dialog, and answer a question
  whose options carry descriptions while confirming the message before it is preserved.
  Verify: the described behavior is observed.
- [x] 8.3 Build and install to the `sithPhone` device and confirm the app launches and
  connects. Verify: the build completes and the app runs on `sithPhone`.

## 9. Session cost (spent)

- [x] 9.1 Add `cost` to the `session` schema and a `session.cost` stream event (schema +
  fixture) in `contract/contract.json`, bump `contract.version`, and mirror the event and
  version into `app/src/contract.json` and `app/src/contract.ts`. Verify:
  `node --test contract/` and `cd app && npm test` pass.
- [x] 9.2 In `plugin/src/activity.js`, track each session's `cost` and expose it in the
  snapshot, and handle a `session.cost` event that sets it. Verify: new plugin tests pass
  with `cd plugin && npm test`.
- [x] 9.3 In `plugin/src/bridge.js`, fetch the cost with the existing session-info lookup
  (extended to return `{ title, cost }`), refresh it when a turn ends, and forward a
  `session.cost` event. Verify: a plugin test asserts the cost reaches the snapshot and the
  stream; `cd plugin && npm test` passes.
- [x] 9.4 In `app/src/events.ts`, carry `Session.cost` and apply `session.cost`; add a
  `formatCost` helper and show the amount on the `SessionCard`. Verify: `cd app && npm test`,
  `cd app && npm run test:components`, and `cd app && npm run typecheck` pass.
- [x] 9.5 Re-run the full sweep and rebuild to `sithPhone` so the cost shows on the device.
  Verify: every command exits 0 and the build installs.
- [x] 9.6 Replace the accumulate-while-pending rule with a recent-activity history: the card
  shows the latest message and can reveal the previous two, and shows the recent messages
  by default before a pending question. (Supersedes the append behavior of 5.4.) Verify:
  `cd app && npm test`, `cd app && npm run test:components`, and `cd app && npm run
  typecheck` pass.
- [x] 9.7 Fix snapshot option normalization so question options render when a pending request
  arrives from a snapshot whose options are plain strings (`stateFromSnapshot`). Verify: an
  `events.test.ts` regression test passes.
- [x] 9.8 Render each activity message as its own nested card, open the full message in a
  modal on tap, and show the cost as a label-free `$…` chip. Verify: `cd app && npm test`,
  `cd app && npm run test:components`, and `cd app && npm run typecheck` pass.
- [x] 9.9 Show a question option's description below its button (the button shows only the
  label; both wrap when long; the button hugs its content). Verify: `cd app && npm run
  test:components` passes with the description asserted outside the label.
- [x] 9.10 Reduce update latency: bridge title/cost debounce 1200→250 ms, new-session idle
  900→300 ms, and app resync throttle 1000→400 ms. Verify: plugin and app tests pass.
- [x] 9.11 Show the Stop control on any active session, including while a question or
  permission is pending, so the user can decline a question. Verify: `cd app && npm run
  test:components` passes with Stop shown for a waiting-answer session.
