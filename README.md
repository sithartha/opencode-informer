# Mobile Agent Companion

Local (no server) bridge that puts OpenCode agent activity and permission/question
handling on an iPhone — and Android where feasible — over WiFi with a Bluetooth Low
Energy wake channel.

Three pieces, plus a shared contract:

| Path | Role |
|---|---|
| `plugin/` | OpenCode plugin: models agent activity, serves the LAN HTTP/SSE API, applies phone resolutions, triggers the BLE doorbell. Dependency-free (`node:*` only). |
| `mac-helper/` | Standalone macOS menu-bar helper: BLE peripheral for the wake channel, rendezvous address, and pairing approval. |
| `app/` | Expo + React Native phone client: discovery/pairing, live activity, notifications, replies. iOS first, Android where feasible. |
| `contract/` | The single wire contract shared by all three: endpoints, event names, payload shapes, BLE UUIDs. |

The design and requirements live in the OpenSpec change
`openspec/changes/mobile-agent-companion/`.

The existing Open Island macOS app and its protocols are left untouched; this is
additive and OpenCode-only in v1.

## Layout

```
plugin/       OpenCode plugin bridge (Node, ESM, node:* only)
mac-helper/   Swift menu-bar BLE helper
app/          Expo + React Native client
contract/     Shared contract (contract.json + validator + tests)
```

## Running the plugin tests

```
cd plugin && npm test
```
