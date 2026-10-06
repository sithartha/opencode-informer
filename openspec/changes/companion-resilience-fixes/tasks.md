# Tasks

## 1. Bridge: fold child sessions

- [x] 1.1 In `plugin/src/activity.js`, when `session.created` carries a `parentID`, delete any row already created for the child, emit `session.ended` for it, and increment the parent's subagent count; unit test asserts the child does not appear and the parent counts it
- [x] 1.2 Unit test the "adopted before the parent link is known" path: a child event first creates a row, then `session.created(parentID)` removes it and emits `session.ended`

## 2. App: connection watchdog and reconnect

- [x] 2.1 Add an 8s timeout to `fetchState`; add a periodic watchdog in `useBridge` that probes the bridge when idle and, on failure, marks the connection lost and reconnects with backoff; unit-level verification via the existing state/session tests
- [x] 2.2 Resync the snapshot on recovery so cards are current; verified on device (Mac sleep → recover)

## 3. Live Activity: no-connection state

- [x] 3.1 Add a `disconnected` flag to the controller and a "No connection" content state in `activityState`; unit tests assert the title/subtitle and that a running activity is kept alive while disconnected
- [x] 3.2 Render a non-numeric title as a plain status line in `LiveActivityView.swift` (no big number/dots); verified on device — no artifacts; the view is tracked via `plugins/withLiveActivityView.js`

## 4. App: foreground attention haptic

- [x] 4.1 Add `isAttentionEvent` and vibrate on a permission/question while the app is active; unit test asserts the classification (permission/question vs other)

## 5. Demo parity

- [x] 5.1 Add the mode/model switcher to `DemoScreen` and seed the demo question with `allowFreeform`; component test asserts the switcher opens from a card chip

## 6. Verification

- [x] 6.1 On device: the phone's session count matches OpenCode/Open Island (a subagent no longer shows as its own card); confirmed by the user
- [x] 6.2 On device: the Live Activity shows "No connection" on loss and recovers; the app vibrates on new requests in the foreground; confirmed by the user
