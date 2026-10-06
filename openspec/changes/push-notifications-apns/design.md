# Design

## Context

See proposal.md - Why.

- The bridge already runs in the OpenCode plugin (Node, `node:*` only) and knows when a
  permission, question, or completion occurs; it also knows how many SSE clients are
  connected (`server.clientCount()`).
- The app already presents local notifications with permission/question actions and keeps a
  `notifiedRef` to avoid duplicates.
- `expo-notifications` can return the **native APNs device token** via
  `getDevicePushTokenAsync()` (unlike `getExpoPushTokenAsync`, which routes through Expo's
  servers — not acceptable here).

## Goals / Non-Goals

**Goals:**
- Notify away from the LAN with **no added server**: the Mac sends the push to Apple.
- Never duplicate a live event, and never let a push failure affect agents.

**Non-Goals:**
- Richer remote payloads or a hosted push service.
- Background resolution from a push when the phone is truly offline from the Mac (the action
  still needs the LAN unless the Mac becomes reachable).

## Decisions

### The Mac sends APNs directly (token auth), no relay
- **Choice**: The bridge sends pushes over HTTP/2 to `api.push.apple.com` with a **JWT
  (ES256)** signed by an APNs `.p8` auth key (key id + team id), using `node:http2` and
  `node:crypto`.
- **Why**: Keeps the "no server" property; the Mac already has the events.
- **Alternatives**: A relay service (extra infra, contradicts the design); routing via Expo's
  push service (third-party, and another endpoint to trust).
- **Config**: `OPEN_ISLAND_APNS_KEY_PATH`, `OPEN_ISLAND_APNS_KEY_ID`,
  `OPEN_ISLAND_APNS_TEAM_ID`; if unset, APNs is simply disabled (fail-open).

### Only push when no client is streaming
- **Choice**: Send an APNs push only when `clientCount() === 0`; otherwise rely on the live
  stream.
- **Why**: Prevents duplicate and stale alerts; the connected app already shows the change.
- **Alternatives**: Always push and dedupe in the app (noisy, wastes battery).

### Token registration over an authenticated endpoint
- **Choice**: Add `POST /device` (`{ token, platform }`), stored in memory per paired client,
  re-sent by the app on each connect (tokens are short and rotate).
- **Why**: Simple, no persistence needed; the app re-registers whenever it connects.
- **Alternatives**: Persist tokens to disk (survives restarts but the app re-sends anyway).

### Minimal, actionless payload
- **Choice**: `aps.alert { title, body }` plus `kind`, `requestID`, `sessionID`; `apns-topic`
  = `ru.opencode.informer`, `apns-push-type: alert`, priority 10.
- **Why**: Notifications carry no sensitive content; the same in-app notification category and
  actions are used when the app handles the push.
- **Alternatives**: Full state in the payload (larger, staler, redundant).

### App entitlement and capability
- **Choice**: Enable the Push Notifications capability on the bundle id and add the
  `aps-environment` entitlement to device builds (via the config plugin / EAS credentials).
- **Why**: Required for `getDevicePushTokenAsync` to return a token on device.
- **Alternatives**: None — required by iOS.

## Risks / Trade-offs

- [APNs needs internet] → expected; without internet the phone simply gets no remote alert.
- [Simulator has no APNs] → verify on a real device.
- [Token/JWT handling] → cache the JWT for < 1 hour, regenerate on 403; treat 410 Unregistered
  by dropping the token.
- [Push/live duplicate] → the existing `notifiedRef` dedupe plus the "only when no client"
  rule cover both directions.
- [Dev vs prod `aps-environment`] → use `development` for dev builds and `production` for
  release; the entitlement must match the provisioning profile.

## Migration Plan

Additive. If the APNs key or entitlement is absent, everything behaves as today (BLE + LAN).
