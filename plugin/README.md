# OpenCode Mobile Bridge (plugin)

OpenCode plugin that exposes agent activity and interactive prompts to paired phones
over the local network, applies their resolutions back into OpenCode, and rings the
BLE helper when an agent needs attention.

It is additive: the plugin's normal Open Island notifications are untouched, and the
phone path is fail-open (if it breaks, agents behave exactly as before).

## Configuration

| Setting | Default | Source |
|---|---|---|
| Listen host | `0.0.0.0` | `CONTRACT.bridge.host` |
| Listen port | `38963` | `CONTRACT.bridge.defaultPort` or `OPEN_ISLAND_MOBILE_PORT` |
| Helper ring URL | `http://127.0.0.1:38964/ring` | `CONTRACT.helper.*` or `OPEN_ISLAND_HELPER_URL` |
| SSE keepalive | 15000 ms | `OPEN_ISLAND_MOBILE_KEEPALIVE_MS` |

A process-global singleton guard ensures only one server binds even when OpenCode
loads the plugin per location/instance.

## HTTP API

All endpoints except `/pair` require `Authorization: Bearer <token>`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/pair` | no | `{deviceName}` → `202 {approvalID, status:"pending"}`; with `{approvalID}` once approved → `200 {status:"approved", token}` |
| `GET` | `/pair?approvalID=…` | no | `{status:"pending"\|"approved"\|"denied", token?}` |
| `POST` | `/pair/decision` | loopback | helper records the user's `{approvalID, decision:"approve"\|"deny"}` |
| `GET` | `/state` | yes | snapshot: `{activeSessionCount, sessions:[…], pending:[…]}`; each session includes `agent` (mode) and `model` |
| `GET` | `/status` | yes | `{connected, activeSessionCount}` |
| `GET` | `/events` | yes | SSE activity stream (`event:` + `data:` per line) |
| `POST` | `/resolution` | yes | `{requestID, action}` → `200 {status:"accepted"}` or `409 {status:"not_applicable", reason}` |
| `POST` | `/prompt` | yes | `{sessionID, text}` → `200 {status:"accepted"}` or `409 {status:"failed"}` |
| `POST` | `/sessions` | yes | `{title?}` → `200 {status:"accepted", sessionID?}` (starts a new session) |
| `POST` | `/stop` | yes | `{sessionID}` → `200 {status:"accepted"}` (interrupts the current turn) or `409 {status:"not_applied"}` |
| `POST` | `/close` | yes | `{sessionID}` → `200 {status:"accepted"}` (closes the session) or `409 {status:"not_applied"}` |
| `GET` | `/options` | yes | discovered modes and models: `{status:"accepted", agents:[…], models:[{providerID, id, variant?}]}` |
| `POST` | `/switch` | yes | `{sessionID, agent?, model?}` → `200 {status:"accepted"}` or `409 {status:"not_applied"}` |

### Activity stream events

`session.started`, `session.ended`, `prompt.submitted`, `tool.started`, `tool.ended`,
`permission.requested`, `question.asked`, `turn.completed`, `session.activity`,
`session.updated`, `actionable.resolved`.

`session.updated` carries the session's `agent` and `model` when they change.

Payload shapes are defined in `../contract/contract.json` (a copy of the fixtures).

`/events` is live-only and does not replay history; clients fetch `/state` on connect
and then follow the stream.

## BLE trigger (plugin → helper)

On `permission.requested`, `question.asked`, and `turn.completed` the bridge POSTs a
compact doorbell to the helper on localhost:

```json
{ "kind": "permission", "requestID": "req_1", "sessionID": "ses_1", "title": "Allow Bash" }
```

`kind` is one of `permission`, `question`, `completion`, `pairing`. A missing helper
produces no error and does not affect agents. The helper address is
`http://127.0.0.1:38964/ring` by default.

## Manual verification with curl

Replace `$TOKEN` with the token returned by the pairing flow.

```bash
# Start pairing (returns approvalID; approve it from the helper menu)
curl -s -X POST localhost:38963/pair -H 'content-type: application/json' \
  -d '{"deviceName":"Test"}'

# Poll pairing status
curl -s 'localhost:38963/pair?approvalID=<approvalID>'

# Snapshot (401 without a token)
curl -s localhost:38963/state -H "Authorization: Bearer $TOKEN"

# Stream activity
curl -N localhost:38963/events -H "Authorization: Bearer $TOKEN"

# Resolve a pending permission
curl -s -X POST localhost:38963/resolution -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"requestID":"req_1","action":"allow"}'
```

## Tests

```
npm test
```
