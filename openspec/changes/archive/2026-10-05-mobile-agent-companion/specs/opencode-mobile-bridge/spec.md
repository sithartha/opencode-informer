# Spec Delta

## Purpose

Exposes OpenCode's agent activity and interactive prompts to paired mobile clients over the local network with token authentication, applies client resolutions back into OpenCode, and triggers a BLE wake when an agent needs attention.

## ADDED Requirements

### Requirement: Pairing and token authentication

The bridge SHALL require an explicit pairing approval before issuing a client token, and SHALL reject any state, stream, or resolution request that does not carry a valid bearer token with `401 Unauthorized`.

#### Scenario: Successful pairing
- **WHEN** a client requests pairing with a valid, current pairing challenge
- **THEN** the bridge returns a bearer token and the client is authorized for subsequent requests

#### Scenario: Unpaired request
- **WHEN** a client calls a protected endpoint without a token or with an invalid token
- **THEN** the bridge responds `401 Unauthorized` and discloses no session data

#### Scenario: Tokens are independent of Open Island
- **WHEN** a client is paired to the mobile bridge
- **THEN** the bridge does not require, reuse, or modify Open Island's own pairing token

### Requirement: Agent state snapshot

The bridge SHALL expose a snapshot of current agent sessions, including each session's identifier, agent name, working directory, phase, current tool (if any), latest activity text, and the count of running agents.

#### Scenario: Snapshot while agents run
- **WHEN** a paired client requests the snapshot while one or more sessions are running
- **THEN** the response reports every tracked session and a running-agent count that matches the sessions in a running state

#### Scenario: Snapshot with no agents
- **WHEN** a paired client requests the snapshot with no active sessions
- **THEN** the response reports an empty session list and a running-agent count of zero

### Requirement: Live activity stream

The bridge SHALL stream agent activity to paired clients as it occurs, including session start and end, user prompts, tool start and end, permission requests, questions, and turn completion, and SHALL keep the stream open with periodic keepalives until the client disconnects.

#### Scenario: Activity is delivered in order
- **WHEN** an agent emits several activity events while a client is streaming
- **THEN** the client receives them in the order they occurred and without requiring a page refresh

#### Scenario: Stream survives idle periods
- **WHEN** no agent activity occurs for an extended period
- **THEN** the stream remains connected and the client can still receive a later event

### Requirement: Resolution of permissions and questions from the phone

The bridge SHALL accept resolutions from an authorized client and apply them to the corresponding pending permission or question: permission `allow` or `deny` decides the prompt, and a question action supplies the selected answer.

#### Scenario: Permission allowed
- **WHEN** a client resolves a pending permission with `allow`
- **THEN** the agent continues without waiting for a decision on the Mac

#### Scenario: Permission denied
- **WHEN** a client resolves a pending permission with `deny`
- **THEN** the tool call is rejected and the agent is notified of the denial

#### Scenario: Question answered
- **WHEN** a client resolves a pending question with one of its offered options
- **THEN** the agent receives that option as the answer and continues

#### Scenario: Duplicate or unknown resolution
- **WHEN** a client resolves a request that is unknown or already resolved
- **THEN** the bridge does not re-apply the decision and reports the request as not applicable

### Requirement: External resolution is reflected

When a pending permission or question is answered somewhere other than the phone (such as the OpenCode TUI or Open Island), the bridge SHALL mark the request resolved and SHALL stop presenting it as pending, so the phone never shows a stale actionable request.

#### Scenario: Resolved on the Mac first
- **WHEN** a pending request is answered on the Mac while the phone still shows it
- **THEN** the bridge notifies connected clients that the request is resolved and the phone clears it

### Requirement: Fail-open behavior

The bridge SHALL never block, delay past the configured wait, or alter agent execution when no client is connected or when the mobile path fails.

#### Scenario: No paired client
- **WHEN** OpenCode emits a permission request and no phone is connected
- **THEN** the agent's normal OpenCode interaction path handles the request and the agent proceeds as it would without the bridge

#### Scenario: Client disconnects mid-request
- **WHEN** a client disconnects while a permission or question is pending
- **THEN** the pending request is left for the normal OpenCode interaction path without hanging the agent

### Requirement: BLE doorbell triggering

When an agent requests a permission, asks a question, or completes a turn, the bridge SHALL notify the local BLE helper so a paired phone can be woken, and SHALL tolerate the helper being absent.

#### Scenario: Doorbell on permission request
- **WHEN** an agent requests a permission
- **THEN** the bridge signals the BLE helper for a permission event

#### Scenario: Helper absent
- **WHEN** the BLE helper is not running
- **THEN** the bridge continues to serve connected clients and does not error or block the agent

### Requirement: Pending requests in the snapshot

The snapshot SHALL include the currently pending permissions and questions, so a client that reconnects or is woken can reconstruct the pending state without having been connected when the request arrived.

#### Scenario: Snapshot with a pending permission
- **WHEN** a permission is pending and a paired client requests the snapshot
- **THEN** the snapshot includes that permission with its session, kind, title, and summary

#### Scenario: Snapshot with a pending question
- **WHEN** a question is pending and a paired client requests the snapshot
- **THEN** the snapshot includes that question with its session, title, and options

#### Scenario: No pending requests
- **WHEN** nothing is pending
- **THEN** the snapshot reports an empty pending list

### Requirement: Session activity event

The bridge SHALL emit a session activity event when a session's latest activity changes (such as the assistant's latest text), carrying the session identifier and the activity text, so clients can show a compact per-session summary without waiting for a tool event.

#### Scenario: Assistant text changes
- **WHEN** a session emits new activity text
- **THEN** the bridge streams a session activity event with that session and text

#### Scenario: Activity text is current in the snapshot
- **WHEN** a client requests the snapshot after activity text changed
- **THEN** the session reports the latest activity text

### Requirement: One pending interaction per session

The bridge SHALL keep at most one pending permission or question per session, superseding a session's previous pending request when a new one arrives, and SHALL report the superseded request as resolved so clients clear it.

#### Scenario: New request supersedes the previous
- **WHEN** a session already has a pending request and a new one arrives
- **THEN** the snapshot and stream present only the new request for that session, and the previous request is reported resolved

#### Scenario: Subagent and shell counts
- **WHEN** a session spawns subagents and runs tools
- **THEN** the session reports its subagent count and its count of active shells
