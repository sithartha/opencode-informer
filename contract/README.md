# Wire Contract

The single source of truth shared by the plugin bridge, the Mac helper, and the phone
app. Machine-readable form: `contract.json`; validator: `validate.mjs`.

## Ports

| Piece | Default |
|---|---|
| Plugin bridge HTTP (LAN) | `0.0.0.0:38963` |
| Mac helper ring (localhost) | `127.0.0.1:38964/ring` |

## HTTP API (plugin bridge)

All endpoints except `/pair` require `Authorization: Bearer <token>`.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/pair` | begin pairing (`{deviceName}`) or complete it (`{approvalID}`) |
| `GET` | `/pair?approvalID=…` | pairing status |
| `GET` | `/state` | session snapshot + active count |
| `GET` | `/status` | connection + active count |
| `GET` | `/events` | SSE activity stream |
| `POST` | `/resolution` | apply `{requestID, action}` |

## Session phases

`running`, `waiting-permission`, `waiting-answer`, `completed`, `ended`.

`activeSessionCount` counts sessions in `running`, `waiting-permission`, or
`waiting-answer` (non-terminal).

## Stream events

`session.started`, `session.ended`, `prompt.submitted`, `tool.started`, `tool.ended`,
`permission.requested`, `question.asked`, `turn.completed`, `actionable.resolved`.

Required payload fields for each are declared under `schemas` in `contract.json`.

## Resolution

`POST /resolution` body is `{requestID, action}`. For a permission, `action` is
`allow` or `deny`. For a question, `action` is the chosen option text.

## BLE layout (Mac = peripheral, phone = central)

| Role | UUID |
|---|---|
| Service | `7b1e5a20-6c1a-4f4e-9c3a-2d5f8b9a1c01` |
| Doorbell (notify) | `7b1e5a21-6c1a-4f4e-9c3a-2d5f8b9a1c02` |
| Rendezvous (read: `host:port`) | `7b1e5a22-6c1a-4f4e-9c3a-2d5f8b9a1c03` |
| Pairing (write/notify) | `7b1e5a23-6c1a-4f4e-9c3a-2d5f8b9a1c04` |

## Doorbell payload (plugin → helper → phone)

`{ "kind": "permission"|"question"|"completion"|"pairing", "requestID"?, "sessionID"?, "title"?, "approvalID"?, "deviceName"? }`

## Tests

```
node --test
```
