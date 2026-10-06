# Proposal

## Why

Three correctness/resilience gaps surfaced while using the app against real OpenCode:

- A **child (subagent) session could appear as a separate card**: if its events arrived
  before the bridge learned its parent link, a row was created and never folded, so the
  phone showed more sessions than OpenCode/Open Island.
- **Connection loss was only noticed when the SSE socket closed.** When the Mac sleeps the
  socket can stay half-open, so the app kept showing stale counts and never resynced.
- Nothing drew the user's eye to a **new request while the app was already open**.

## What Changes

- The bridge **folds a child session into its parent** even when a row leaked before the
  parent link was known (removing the temporary row and counting the subagent on the
  parent).
- The app runs a **timer-based watchdog**: if there has been no activity for a while it
  probes the bridge; if the bridge does not answer it marks the connection lost, shows it,
  and **reconnects with backoff**, resyncing the snapshot on recovery.
- The **Live Activity shows a clear "No connection" state** (instead of stale counts) once
  the connection has been lost beyond a short timeout, and restores the counts on recovery.
- The app **vibrates** when a new permission or question arrives while it is in the
  foreground.
- The built-in **Demo** gains the mode/model switcher and a free-form question so its cards
  match the real ones.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities

- `opencode-mobile-bridge`: a child session always folds into its parent even if a row was
  adopted before the parent was known.
- `mobile-companion-app`: timer-based connection-loss detection with reconnect and resync;
  a foreground haptic for new attention events.
- `agent-live-activity`: a distinct connection-lost state that replaces the counts.

## Impact

- `plugin/src/activity.js` (child folding).
- `app/src/useBridge.ts` (watchdog, reconnect, resync, haptic), `app/src/bridgeClient.ts`
  (state fetch timeout), `app/src/notifications.ts`, `app/src/DemoScreen.tsx`.
- `app/ios/LiveActivity/LiveActivityView.swift` + `app/plugins/withLiveActivityView.js`
  (status rendering; the view is now tracked in the repo).
