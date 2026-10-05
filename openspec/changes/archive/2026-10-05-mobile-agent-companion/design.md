# Design

## Context

OpenCode on the Mac already runs as a persistent background service and loads plugins. The existing `open-island.js` plugin proves the plugin API can observe the full event stream (session lifecycle, prompts, tool use, permissions, questions, turn completion) and can reply to permissions and forms. Open Island's own phone bridge (Bonjour `_openisland._tcp`, SSE `/events`, `POST /resolution`) exists but is notification-only and cannot wake a suspended iOS app. See proposal.md for motivation.

Constraints that shape this design:

- **No server.** Everything is local: WiFi for data, BLE for wake.
- **No fork of Open Island.** The installed app and its protocols stay untouched.
- The phone app is a development build; Expo Go cannot provide BLE or local-network configuration.
- The plugin runtime should stay dependency-free, so the bridge uses `node:*` modules only.

## Goals / Non-Goals

**Goals:**
- One shared wire contract (pairing, snapshot, activity events, resolution, BLE layout) across plugin, helper, and phone app.
- Reliable local wake within BLE range and a data plane over the same WiFi.
- Rich activity + running-agent count for OpenCode, beyond Open Island's three event types.
- A phone client that is iOS-first and Android-viable with shared application code.

**Non-Goals:**
- Cross-agent coverage (Claude Code, Codex, Cursor). v1 is OpenCode-only; Open Island's SSE may be merged later for those.
- Notifying or responding while away from the local network. Deferred.
- Changing Open Island, its plugin, or its Unix-socket protocol.
- Persisting a full transcript or history beyond a bounded recent-activity buffer.

## Decisions

### Bridge runs inside the OpenCode plugin, not a macOS app fork

- **Choice**: The plugin hosts the LAN HTTP/SSE server and owns the activity model and resolutions; the plugin's existing Open Island socket notifications remain.
- **Why**: No Swift fork to maintain; the plugin already receives every event and can already reply via `ctx.permission.reply` and the form reply path; `node:http` is dependency-free.
- **Alternatives**: Forking Open Island.app (best integration/multi-agent, but GPL Swift fork, fast-moving upstream); a separate standalone server (extra process, no event access without re-plumbing).
- **Cost accepted**: OpenCode-only coverage in v1.

### BLE doorbell as the wake channel; LAN carries the payload

- **Choice**: The Mac helper is the BLE peripheral; the phone is the central with the `bluetooth-central` background mode. The BLE notification carries a compact "kind + requestID + short title"; the phone fetches the full snapshot over WiFi.
- **Why**: BLE is the only local, Apple-sanctioned way to wake a suspended app within range; keeping the payload off BLE avoids MTU limits and keeps the doorbell cheap.
- **Alternatives**: APNs sent directly from the Mac (notifies anywhere, but needs internet and cannot carry a reply when away); SSE-only (cannot wake a suspended iOS app).
- **Deferred**: APNs-direct as a later "notify while away" add-on.

### Fixed port + BLE rendezvous instead of mDNS

- **Choice**: The bridge listens on a fixed LAN port; the helper exposes the bridge host and port to the phone as a BLE characteristic. Manual address entry is the fallback.
- **Why**: Avoids mDNS/Bonjour flakiness and IP volatility on the phone; the BLE link is already established for wake. The upstream design used Bonjour because its server port was ephemeral; ours is fixed, so rendezvous over BLE is simpler and more robust.
- **Alternatives**: mDNS/zeroconf (`react-native-zeroconf`), `.local` hostname resolution, QR/manual entry.

### SSE + HTTP POST as the data plane

- **Choice**: `GET /events` as Server-Sent Events and `POST /resolution` as plain JSON HTTP.
- **Why**: SSE is trivial to serve with `node:http` (no WebSocket framing or dependency), mirrors Open Island's existing protocol, and has small RN clients; replies are ordinary `fetch` POSTs.
- **Alternatives**: WebSocket (native RN API, but needs handshake/framing code or a dependency in the plugin); long-poll (simpler but laggier).

### Pairing by BLE-range approval + bearer token

- **Choice**: Pairing is initiated over BLE, approved once by the Mac user in the helper menu, after which the bridge issues a random bearer token that the app stores in Keychain/SecureStore. All data and resolution requests require it.
- **Why**: Proximity (≈10 m) plus a single explicit approval is simple, local, and avoids typing codes; matches the threat model of a home/office LAN.
- **Alternatives**: 4-digit code shown on the Mac (extra step); no auth (unacceptable on a shared WiFi).

### Resolution fan-out with first-answer-wins

- **Choice**: When a permission or question is pending, the plugin races the Open Island socket, the phone resolution, and the existing timeout; the first answer applies and the others are dismissed via the existing resolved-request bookkeeping.
- **Why**: Preserves the current Open Island workflow while adding the phone as an equal responder; a resolution on either side must clear the other.
- **Alternatives**: Phone-exclusive handling (breaks Open Island parity); Open Island-primary only (defeats the feature).

### Single bridge instance and fail-open behavior

- **Choice**: Guard server startup with a process-global flag so multiple plugin instances bind once; all mobile-path failures are swallowed and the normal OpenCode interaction path remains authoritative.
- **Why**: OpenCode may load the plugin per location/instance; a double bind or a hung mobile path would break agents.

### Phone app: Expo dev build with native config

- **Choice**: One Expo + React Native app; iOS and Android share networking, state, and UI. Native config via prebuild/config plugins: BLE background mode and usage descriptions, local-network usage, ATS local exception, and notifications. BLE via `react-native-ble-plx`; SSE via a small SSE client.
- **Why**: Required — BLE and local-network access are not available in Expo Go.
- **Alternatives**: Separate native apps (rejected: the user wants cross-platform RN).

### Pending requests travel in the snapshot

- **Choice**: Include the currently pending permissions and questions in `GET /state`.
- **Why**: A client that reconnects or is woken by a doorbell needs to reconstruct the pending state; without it, a session that was already waiting when the app was closed shows no pending request.
- **Alternatives**: a separate `/pending` endpoint (extra round trip); rely on stream history (not replayed).

### A dedicated session-activity event

- **Choice**: Emit a `session.activity` stream event when a session's latest activity text changes, and keep the latest text in the snapshot.
- **Why**: The per-session compact summary should update live without waiting for a tool event; tool start/end already exist but do not carry assistant text.
- **Alternatives**: derive the summary only from tool events (misses assistant text); poll `/state` (chatty).

### Notification policy: only interaction and completion

- **Choice**: The app raises a notification only when an agent requires interaction (a permission or a question) or finishes a turn successfully. Activity/tool/prompt updates, and turns that end by failure or interrupt, do not notify.
- **Why**: Every other update is noise; the phone should buzz only when the user must act or a task is done. The helper also caps and de-duplicates its buffered doorbells so a reconnect cannot flush a flood.

## Risks / Trade-offs
- **[iOS kills background BLE after force-quit]** → Re-arm BLE on every app launch and on foreground; surface connection/pairing state so the user knows to reopen the app; document the limitation.
- **[BLE range ≈10 m]** → Accept for v1; APNs-direct is the future answer for out-of-range notification (cannot carry replies anyway).
- **[OpenCode-only coverage]** → Explicit v1 boundary; merge Open Island's SSE later to cover other agents.
- **[Plugin runtime restricts dependencies]** → Bridge uses only `node:*`; if a dependency is later required, fall back to a self-contained implementation.
- **[Plaintext LAN + token]** → Random token, BLE-approved pairing, no data without token; optional TLS/self-signed is a later hardening step.
- **[OpenCode V2 plugin API drift]** → Keep the bridge in its own module alongside the existing plugin, with focused tests for the event mapping and resolution paths.
- **[Expo native config friction]** → Use a dev build from the start; treat BLE/local-network/ATS/notification config as a first-class deliverable, not an afterthought.
- **[Two responders double-notify]** → The plugin dedupes resolved requests and closes the losing channel, mirroring the existing `closePendingSocket` / resolved-id logic.

## Migration Plan

Greenfield, additive; nothing existing is modified. Suggested order: (1) plugin bridge + contract, testable with `curl`; (2) Swift BLE helper, testable against a BLE scanner; (3) Expo app against the live bridge; (4) end-to-end permission/question round-trip from a locked phone. Rollback is disabling the plugin and quitting the helper; OpenCode and Open Island behave exactly as before.

## Open Questions

- Exact fixed port and whether it should be user-configurable.
- Whether to add a short pairing code in addition to the BLE approval prompt.
- When to add APNs-direct-from-Mac for out-of-range notification.
- Whether to surface a pending-count Live Activity / Dynamic Island on iOS.
- Where the token/credential file and the helper's handshake secret live on disk.
