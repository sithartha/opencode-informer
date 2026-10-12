# Tasks

## 1. Reply to the request's own session

- [x] 1.1 In `plugin/src/activity.js`, when a permission or a form arrives, store the request's own
  session (the `payload.sessionID` for a permission, the form's `sessionID` for a form) alongside
  the display root session, so the pending entry distinguishes the two. Keep `sessionID` as the
  root for snapshots and grouping. Verify: `plugin/test/activity.test.js` shows a child-raised
  request carrying the child session while still grouped under the parent.
- [x] 1.2 In `plugin/src/resolution.js`, apply a permission or question using the request's own
  session (falling back to the display session when absent). Verify: `plugin/test/resolution.test.js`
  asserts the reply targets the child session id.
- [x] 1.3 Confirm the app-facing snapshot and stream payloads are unchanged (they keep the root
  session), so no client change is needed. Verify: `plugin/test/activity.test.js` snapshot
  assertions still pass with the root session.

## 2. Integration

- [x] 2.1 Run `node --test plugin/test/*.test.js`, `node --test contract/contract.test.mjs`, and
  `cd app && npm test && npm run typecheck`. Verify: every command exits 0.
- [x] 2.2 On a device, trigger a subagent (child) session that requests a permission, and allow it
  from the phone. Verify: the permission is applied and the session continues (no "request not
  found" and no retry loop).
