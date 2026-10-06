# Design

## Context

See proposal.md - Why. The bridge learns parent links only from `session.created` (with
`parentID`); the app's stream only signals loss on the socket's close event; the Live
Activity view parses `title`/`subtitle` assuming a numeric count; `expo-haptics` is not
installed but React Native's `Vibration` is available without a native rebuild.

## Decisions

### Fold children when the parent link is learned, and drop leaked rows
- **Choice**: in `session.created`, when `parentID` is present, delete any existing row for
  the child, emit `session.ended` for it, and increment the parent's subagent count.
- **Why**: a child's events can be processed (lazy adoption) before its `session.created`
  arrives; without the delete the row persists and the count is wrong.
- **Alternatives**: never lazily adopt sessions (loses pre-existing sessions); reorder
  events (not under our control).

### Timer watchdog instead of the stream-close event alone
- **Choice**: a periodic timer probes the bridge (`GET /state`, 8s timeout) when there has
  been no activity; on failure it marks the connection lost and reconnects with backoff.
- **Why**: a half-open socket (Mac asleep) never fires close, so the app would otherwise
  show stale state forever.
- **Alternatives**: rely on TCP keepalive/close (unreliable here).

### A distinct "No connection" Live Activity state
- **Choice**: the controller tracks a `disconnected` flag; `activityState` returns a plain
  status ("No connection / Can't reach OpenCode on your Mac"); the Swift view renders a
  non-numeric title as a status line (no big number, no dots).
- **Why**: the user asked for an explicit no-connection message; the previous stale-count
  view was confusing and the count parser produced an artifact.
- **Alternatives**: keep stale counts with a marker (less clear).

### Foreground haptic via RN Vibration
- **Choice**: `Vibration.vibrate(200)` when a permission/question arrives while
  `AppState === "active"`, gated by a small `isAttentionEvent` helper.
- **Why**: no native module/rebuild needed and it is easy to test the gating logic.
- **Alternatives**: `expo-haptics` (nicer, but a native dependency and a rebuild).

### Demo parity
- **Choice**: the demo passes `onOpenSwitcher` and seeds `allowFreeform`, so its cards match
  the real dashboard.
- **Why**: screenshots and first-run exploration should be representative.

## Risks / Trade-offs

- [Watchdog false positives] → only probe when idle for a while, and treat a single failed
  probe as a hint while the reconnect loop keeps trying.
- [Extra /state traffic] → one probe every ~15s only when otherwise idle; negligible.
- [Vibration on iOS] → `Vibration.vibrate` plays the standard vibration; acceptable without
  a native dependency.
