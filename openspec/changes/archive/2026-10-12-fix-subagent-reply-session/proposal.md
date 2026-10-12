# Proposal

## Why

When a subagent (child) session raises a permission or a question, the bridge folds the request
into its parent row but stores the **parent's** session id. A reply is then applied to the parent
instead of the session that actually raised the request, so OpenCode answers "request not found"
and the phone's Allow / answer has no effect. The restart that taught the bridge child→parent
links made this reachable: `rootSession(child)` started returning the parent, so the stored id
diverged from the request's own session.

## What Changes

- The bridge SHALL apply a permission or question resolution to the **session that raised the
  request**, even when the request is presented under its root (parent) session.
- Presentation is unchanged: the request still appears under the parent row and the snapshot still
  groups it there.
- No change to single/parent-session resolutions.

## Capabilities

### New Capabilities
<!-- none: this refines existing bridge behavior -->

### Modified Capabilities

- `opencode-mobile-bridge`: a resolution is applied to the request's own session, not the parent it
  is displayed under.

## Impact

- `plugin/src/activity.js` — store the request's own session alongside the display (root) session
  for `permission.asked` and `form.created`.
- `plugin/src/resolution.js` — reply using the request's own session.
- Tests: `plugin/test/activity.test.js`, `plugin/test/resolution.test.js`.
