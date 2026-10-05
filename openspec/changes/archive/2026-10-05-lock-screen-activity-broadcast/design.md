# Design

## Context

The phone app (from the `mobile-agent-companion` change) already keeps a live `AppState` of sessions, each with a `phase` (`running`, `waiting-permission`, `waiting-answer`, `completed`, `ended`), seeded from `GET /state` and updated by the SSE stream. The BLE doorbell already wakes the app on permission, question, and completion events, and a wake triggers a `/state` refetch. `expo-live-activity` (0.4.2) is available for iOS Live Activities. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- An iOS Live Activity (Lock Screen expanded + Dynamic Island compact/minimal) showing the total active sessions and the running / waiting-for-approval / waiting-for-answer breakdown.
- Keep it current while foregrounded (SSE) and on background wake (doorbell → refetch).
- Android parity as an ongoing notification.
- The "OI" white-on-black mark reused from the app icon.

**Non-Goals:**
- Continuous updates between wakes (would need the APNs push-to-update path; deferred).
- Interactive approve/deny buttons inside the activity itself (approval stays on the notification's actions).
- Per-session rows in v1 (the activity shows aggregate counts; the dashboard shows detail).
- Any change to the bridge, helper, or Open Island.

## Decisions

### `expo-live-activity` plus a widget-extension config plugin

- **Choice**: Use `expo-live-activity` for start/update/end, and a config plugin that adds the WidgetKit extension target and the `NSSupportsLiveActivities` Info.plist key.
- **Why**: Live Activity UI must live in a WidgetKit extension; the module handles the ActivityKit bridging, the plugin owns the native target so `prebuild` reproduces it.
- **Alternatives**: hand-write a native module and extension (more control, much more code); skip the Lock Screen and only use notifications (already exists, not always-visible).

### Aggregate computed in the app

- **Choice**: Derive `total`, `running`, `waitingApproval`, `waitingAnswer` from the existing session `phase` values.
- **Why**: `/state` already returns full sessions, so no bridge change is needed; keeps the capability app-only.
- **Alternatives**: add per-phase counts to `/state` (unnecessary now; revisit if the payload grows).

### Lifecycle: start / update / end on the aggregate

- **Choice**: Start when the aggregate becomes non-zero, update on change, end when it returns to zero.
- **Why**: A Live Activity has a limited lifetime and a user-visible presence; tying it to "there is something to watch" avoids a persistent empty activity.
- **Alternatives**: always-on while paired (noisy); only while waiting (misses "working").

### Update triggers: SSE (foreground) and doorbell wake (background)

- **Choice**: Foreground updates come from the stream; background updates come from the existing doorbell wake, which already refetches `/state`.
- **Why**: Reuses the wake channel the feature already depends on; no new networking.
- **Trade-off**: between wakes the Lock Screen holds the last snapshot; `lastUpdated` drives a stale indication. Continuous updates are the deferred APNs path.

### Staleness handling

- **Choice**: Persist the last aggregate and the time of the last successful refresh; if a refresh fails, keep the last-known counts and mark them stale.
- **Why**: A misleading "0 agents" is worse than a slightly old "1 waiting for approval".

### Android as an ongoing notification

- **Choice**: On Android, maintain an ongoing notification (from the foreground service established for the connection) with the same aggregate.
- **Why**: Android has no Lock Screen Live Activity; an ongoing notification is the equivalent always-visible surface. Reuses the service that keeps the socket alive.

### Privacy: counts only

- **Choice**: The Lock Screen shows only counts and states, never prompts, command text, or paths.
- **Why**: Lock Screens are visible to others; the dashboard (behind unlock) shows detail.

## Risks / Trade-offs

- **[Native widget extension is real work]** → The config plugin owns the target so it survives `prebuild`; verify by rebuilding and checking the extension is embedded.
- **[Updates only on wakes]** → Documented; stale indication covers gaps; APNs is the follow-up.
- **[Live Activity lifetime limits]** → The system may end an activity after hours; the app re-starts it on the next state change or wake.
- **[`expo-live-activity` maturity]** → Pin the version; keep the integration behind a thin module so it can be swapped.
- **[Battery from wakes]** → Reuse the existing doorbell cadence; do not add wakes for every tool event in v1.
- **[Dynamic Island space]** → The compact view shows the total plus the highest-priority state (approval > answer > working).

## Migration Plan

Additive app change: a new dependency, a config plugin, and app code. Requires `prebuild` + a device/simulator rebuild. Rollback is removing the plugin dependency and the lifecycle manager; existing notifications are unaffected.

## Open Questions

- Whether to add the APNs push-to-update path for continuous Lock Screen updates.
- Whether to add interactive approve/deny buttons to the activity via App Intents.
- The stale threshold before the activity is considered out of date.
- Whether the bridge should ring the doorbell on session start/end too, for tighter count accuracy.
