# Proposal

## Why

The BLE wake channel only reaches the phone within about 10 metres of the Mac. When the
user is away from the Mac (a different room, network, or city) they get no alert when an
agent needs a permission, a question, or finishes. APNs closes that gap without adding a
server: the Mac itself sends the push to Apple, and Apple delivers it to the phone.

## What Changes

- The app registers for remote notifications and reports its **APNs device token** to the
  bridge when it pairs/connects.
- The bridge sends an **APNs push** for the same attention events (permission, question,
  completion) directly from the Mac, using an APNs auth key (`.p8`) — in addition to the
  BLE doorbell.
- No push is sent while the phone is **connected to the bridge over the LAN** (it already
  gets the event live), to avoid duplicate/stale alerts.
- The push carries only a short title/body and the request id; the app still fetches the
  full state when it can, and offers the same allow/deny/answer actions.
- Still no third-party server: the only network hop is Apple's APNs, which is inherent to
  push notifications.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities

- `opencode-mobile-bridge`: register and store the client's APNs device token; send APNs
  pushes as a fallback when no client is connected.
- `mobile-companion-app`: register for remote notifications, report the device token, and
  handle a remote push like a local notification.

## Impact

- `plugin/`: an APNs sender (Node `http2` + ES256 JWT), device-token storage, config for the
  APNs key (path, key id, team id), and the decision to skip pushes while a client is live.
- `app/`: `expo-notifications` remote registration (`getDevicePushTokenAsync`), sending the
  token to the bridge, and the `aps-environment` entitlement for device builds.
- Apple: an **APNs auth key** (`.p8`) from the developer account, and the Push Notifications
  capability on the app's bundle id.
- `contract/contract.json`: a device-registration endpoint and the push payload shape.
- BLE doorbell and Live Activity are unchanged; APNs is additive.
