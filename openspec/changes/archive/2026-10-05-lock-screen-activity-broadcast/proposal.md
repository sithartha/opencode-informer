# Proposal

## Why

When the phone is locked or set down, the app's foreground dashboard is invisible, so the user cannot tell at a glance whether agents are working or blocked. A glanceable Lock Screen summary — how many sessions are active and which are working versus waiting for an approval or an answer — lets the user decide whether to act without unlocking or opening the app.

## What Changes

- Add an iOS **Live Activity** (Lock Screen expanded view + Dynamic Island) showing the total number of active sessions and a breakdown: **running**, **waiting for approval**, **waiting for answer**.
- Compute the aggregate inside the app from the existing `/state` snapshot (each session already carries a `phase`), so no bridge change is required.
- Lifecycle: start the activity when the first active session appears, update it as the aggregate changes, and end it when no active sessions remain.
- Update sources: while the app is in the foreground, update from the SSE stream; while the app is backgrounded, update from the BLE doorbell wake (refetch `/state`, then update).
- Provide Android parity through an ongoing (foreground-service) notification with the same summary.
- Add the native Live Activity widget extension via a config plugin, using `expo-live-activity`.
- No changes to the plugin bridge, the BLE helper, or Open Island: the app derives everything from `/state` and existing wakes.

### Assumptions recorded

- Between wakes the Lock Screen shows the last snapshot; continuous updates would require the APNs push-to-update path and are deferred.
- Target is iOS 16.1+ for the Live Activity; Android uses an ongoing notification.
- The summary shows counts and states, not command text or session content.

## Capabilities

### New Capabilities

- `agent-live-activity`: surfaces aggregate agent activity (total, running, waiting-for-approval, waiting-for-answer) on the iOS Lock Screen and Dynamic Island, and as an Android ongoing notification, driven by `/state` and BLE doorbell wakes.

### Modified Capabilities

- None.

## Impact

- **App only**: a new native widget-extension target and config plugin, an `expo-live-activity` dependency, an aggregate selector, an activity lifecycle manager, and an Android foreground-service notification.
- **Depends on** the existing mobile-companion change (`mobile-agent-companion`): `/state` with per-session phases and the BLE doorbell wake.
- **No** bridge, helper, or Open Island protocol changes.
