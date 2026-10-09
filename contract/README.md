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

`POST /pair` also requires the current pairing `code` (shown on the Mac by the helper); a
missing or wrong code is rejected, and repeated failures from one source are locked out.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/pair` | begin pairing (`{deviceName, code}`) or complete it (`{approvalID}`) |
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

## Question options

A question option is an object:

```
{ "label": "<shown to the user>", "value": "<sent when answering>", "description": "<optional helper text>" }
```

`label` is required; `value` defaults to `label` when absent; `description` is optional.
`options` on a question (and on `question.asked`) is an array of these objects.

## BLE layout (Mac = peripheral, phone = central)

| Role | UUID |
|---|---|
| Service | `7b1e5a20-6c1a-4f4e-9c3a-2d5f8b9a1c01` |
| Doorbell (notify) | `7b1e5a21-6c1a-4f4e-9c3a-2d5f8b9a1c02` |
| Rendezvous (read: `host:port`) | `7b1e5a22-6c1a-4f4e-9c3a-2d5f8b9a1c03` |
| Pairing (write/notify) | `7b1e5a23-6c1a-4f4e-9c3a-2d5f8b9a1c04` |

## Doorbell payload (plugin → helper → phone)

`{ "kind": "permission"|"question"|"completion"|"pairing", "requestID"?, "sessionID"?, "title"?, "approvalID"?, "deviceName"?, "code"? }`

`code` is present only for `kind: "pairing"`, is shown to the local user by the helper, and
is never forwarded to the phone.

## Tests

```
node --test
```
