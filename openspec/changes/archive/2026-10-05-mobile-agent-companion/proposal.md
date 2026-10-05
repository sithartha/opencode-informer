# Proposal

## Why

OpenCode runs on the Mac, and Open Island already surfaces agent state in the macOS notch. But when the developer steps away from the desk, agent progress is invisible and blocked agents (waiting on a permission or a question) stall until someone returns to the Mac. The goal is to carry that control surface to the phone: see agent activity and running-agent count, and approve/deny/answer **from the iPhone**, with **no server** — purely over the local WiFi and Bluetooth.

The Mac-side phone bridge that Open Island ships (`_openisland._tcp` + Bonjour + SSE `/events` + `/resolution`) is notification-oriented (only permission/question/completion) and cannot reliably wake a suspended iOS app. Reliable wake requires a Bluetooth Low Energy doorbell, which does not exist in Open Island today. So this change introduces a small, self-owned local bridge rather than forking the macOS app:

- the **OpenCode plugin** becomes the data and interaction server (rich activity, agent count, replies back into OpenCode),
- a **standalone Swift helper** carries the BLE wake channel,
- an **Expo + React Native app** is the phone client for iOS first and Android where possible.

## What Changes

- Add an **OpenCode plugin** that serves a LAN HTTP API to the phone: `GET /state` (session/agent snapshot), `GET /events` (SSE activity stream), `POST /pair` (approve → token), `POST /resolution` (`{requestID, action}` → applied via `ctx.permission.reply` / form reply). It also triggers a BLE doorbell and stays fail-open so agents never block if the phone path is down.
- Add a **standalone macOS Swift helper** (menu-bar app) that acts as a BLE peripheral: advertises a service, delivers a compact doorbell notification, exposes the plugin server's host/port for rendezvous, and hosts the pairing approval prompt.
- Add an **Expo + React Native app** (`ios/` and Android) with BLE central (background `bluetooth-central`), LAN SSE for live activity, local notifications for permission/question/completion, `POST /resolution` replies, and a foreground live dashboard.
- Define one **wire contract** shared by plugin, helper, and app: pairing/token auth, event and snapshot schemas, resolution semantics, and BLE service/characteristic layout.
- Add **per-session detail** to the app: each session shows its phase, current tool, a compact latest-activity summary, and any pending question/permission inline. This needs `GET /state` to include pending requests and a `session.activity` stream event for the latest text.
- Leave the existing Open Island app and its endpoint untouched. Cross-agent coverage (Claude Code, Codex, …) is explicitly out of scope for v1 and may be added later by also consuming Open Island's SSE.

### Assumptions recorded

- Target environment is Mac + phone on the same WiFi and in BLE range (≈10 m) for the local path.
- A paid Apple developer team is available (BLE background mode and, if added later, APNs-direct-from-Mac).
- Replies require the phone to reach the Mac on the LAN; "notify while away" is a possible later add-on, not part of v1.
- The phone app is a development build (Expo Go cannot provide BLE or local-network config).

## Capabilities

### New Capabilities

- `opencode-mobile-bridge`: OpenCode plugin that models agent activity, serves the LAN HTTP/SSE API with pairing and token auth, applies phone resolutions back into OpenCode, and triggers the BLE doorbell. Singleton across plugin instances and fail-open.
- `agent-ble-doorbell`: macOS Swift helper that advertises a BLE peripheral, delivers doorbell notifications to the paired phone, provides the plugin server address for rendezvous, and owns the pairing-approval UX.
- `mobile-companion-app`: Expo + React Native client that discovers/pairs with the Mac, receives activity over LAN, delivers local notifications, wakes on BLE doorbells, and sends permission/question resolutions. iOS first, Android where feasible.

### Modified Capabilities

- None.

## Impact

- **New subprojects**: an OpenCode plugin (TypeScript/JS, `node:*` only), a macOS Swift helper (CoreBluetooth, menu-bar/launchd), and an Expo app (`ios/`, Android target).
- **No changes** to the installed Open Island app or its protocols; the plugin's existing Open Island Unix-socket notifications remain intact and the phone path is additive.
- **New runtime surface**: a LAN-bound HTTP server in the OpenCode service process and a long-running BLE peripheral helper on the Mac.
- **Security surface**: LAN HTTP with a random bearer token plus BLE-range pairing approval; no cloud dependency.
- **Dependencies**: Expo dev build with native config for BLE background mode, local-network usage, and ATS local exceptions; `react-native-ble-plx` (or equivalent) and an SSE client.
