# opencode-mobile-bridge Specification

## Purpose
Exposes OpenCode's agent activity and interactive prompts to paired mobile clients over the local network with token authentication, applies client resolutions back into OpenCode, and triggers a BLE wake when an agent needs attention.

## Requirements

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

The bridge SHALL expose a snapshot of current agent sessions, including each session's identifier, title (the session name OpenCode shows), agent name, model identifier, working directory, phase, current tool (if any), latest activity text, and the count of running agents.

#### Scenario: Snapshot while agents run
- **WHEN** a paired client requests the snapshot while one or more sessions are running
- **THEN** the response reports every tracked session and a running-agent count that matches the sessions in a running state

#### Scenario: Snapshot with no agents
- **WHEN** a paired client requests the snapshot with no active sessions
- **THEN** the response reports an empty session list and a running-agent count of zero

#### Scenario: Agent and model are reported
- **WHEN** a paired client requests the snapshot while a session is running under a particular agent and model
- **THEN** the snapshot reports that session's agent name and model identifier, and reflects a later switch to a different agent or model

#### Scenario: Session title is reported
- **WHEN** a session has a title in OpenCode
- **THEN** the snapshot reports that title for the session, and reflects a later change to it

### Requirement: Live activity stream

The bridge SHALL stream agent activity to paired clients as it occurs, including session start and end, user prompts, tool start and end, permission requests, questions, and turn completion, and SHALL keep the stream open with periodic keepalives until the client disconnects.

#### Scenario: Activity is delivered in order
- **WHEN** an agent emits several activity events while a client is streaming
- **THEN** the client receives them in the order they occurred and without requiring a page refresh

#### Scenario: Stream survives idle periods
- **WHEN** no agent activity occurs for an extended period
- **THEN** the stream remains connected and the client can still receive a later event

### Requirement: Resolution of permissions and questions from the phone

The bridge SHALL accept resolutions from an authorized client and apply them to the corresponding pending permission or question: permission `allow` or `deny` decides the prompt, and a question resolution supplies the answer. When a question form has several questions, a resolution SHALL carry an answer for every question, and the bridge SHALL apply them together as one reply; the bridge SHALL reject a resolution that answers only some of a form's questions.

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

#### Scenario: Every question of a form answered
- **WHEN** a client resolves a form that has several questions and supplies an answer for each
- **THEN** the bridge applies all answers as a single form reply and the agent continues

#### Scenario: Incomplete form answer
- **WHEN** a client resolves a form but omits an answer for one of its questions
- **THEN** the bridge does not apply a partial reply and reports the resolution as not applicable

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

The snapshot SHALL include the currently pending permissions and questions, so a client that reconnects or is woken can reconstruct the pending state without having been connected when the request arrived. For a question form, the snapshot SHALL include every question with its prompt, options, and free-form flag, so the client can answer the whole form.

#### Scenario: Snapshot with a pending permission
- **WHEN** a permission is pending and a paired client requests the snapshot
- **THEN** the snapshot includes that permission with its session, kind, title, and summary

#### Scenario: Snapshot with a pending question
- **WHEN** a question is pending and a paired client requests the snapshot
- **THEN** the snapshot includes that question with its session, title, and options

#### Scenario: No pending requests
- **WHEN** nothing is pending
- **THEN** the snapshot reports an empty pending list

#### Scenario: Snapshot with a multi-question form
- **WHEN** a form with several questions is pending and a paired client requests the snapshot
- **THEN** the snapshot includes every question of the form with its prompt, options, and free-form flag

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

### Requirement: Session lifecycle controls

The bridge SHALL accept authenticated requests from a paired client to start a new session, stop a session's current turn, and close a session, applying each through OpenCode, and SHALL never block or alter agent execution when such a request is unauthorized or fails. A start request MAY carry an agent and a model to apply to the new session; when present, the bridge SHALL apply them to the session it creates.

#### Scenario: Start a new session
- **WHEN** a paired client requests a new session
- **THEN** the bridge creates an OpenCode session and it appears in the snapshot as an active session

#### Scenario: Start with a mode and model
- **WHEN** a paired client requests a new session and supplies an agent and/or a model
- **THEN** the bridge creates the session with that agent and model selected

#### Scenario: Stop a running session
- **WHEN** a paired client requests to stop a running session
- **THEN** the bridge interrupts the session's current turn and the session's phase becomes inactive

#### Scenario: Close a session
- **WHEN** a paired client requests to close a session
- **THEN** the bridge removes the session and it no longer appears in the snapshot

#### Scenario: Unauthorized or failing lifecycle request
- **WHEN** a lifecycle request is made without a valid token, or the underlying OpenCode call fails
- **THEN** the bridge reports the request as not applied and does not affect agent execution

### Requirement: Agent and model options and switching

The bridge SHALL expose the agents (modes) and models currently available to a session, and SHALL accept authenticated requests to switch a session's agent or model, applying the switch through OpenCode. Because OpenCode modes and models are configurable, the bridge SHALL report them as discovered rather than a fixed set and SHALL never require a specific set of names.

#### Scenario: Options reported
- **WHEN** a paired client requests the selectable agents and models for a session
- **THEN** the bridge returns the agent names and model references currently available in OpenCode

#### Scenario: Switch agent
- **WHEN** a paired client requests a session switch to a different agent
- **THEN** the bridge applies the switch and the session's agent reflects the new value

#### Scenario: Switch model
- **WHEN** a paired client requests a session switch to a different model
- **THEN** the bridge applies the switch and the session's model reflects the new value

#### Scenario: Unknown agent or model
- **WHEN** a client requests a switch to an agent or model that OpenCode does not offer
- **THEN** the bridge does not change the session and reports the request as not applied

### Requirement: Child sessions fold into their parent

The bridge SHALL fold a child (subagent) session into its parent and SHALL NOT present a child as a separate session, even when a row was created for it before its parent link was known. The parent's subagent count SHALL include that child.

#### Scenario: Child created with a parent
- **WHEN** a session is created with a parent session
- **THEN** it does not appear as a separate session and the parent's subagent count includes it

#### Scenario: Adopted before the parent link is known
- **WHEN** events for a child session arrive before the bridge knows its parent link
- **THEN** once the link is known the child is folded into the parent and any previously created row for it is removed

#### Scenario: Removing a leaked child row is propagated
- **WHEN** a temporary row for a child is removed on folding
- **THEN** connected clients are told the session ended so its card disappears

### Requirement: Question option details

The bridge SHALL carry, for every offered question option, the option's label and, when OpenCode provides them, its value and description, in both the snapshot and the `question.asked` stream event, so clients can show what each option means.

#### Scenario: Option with a description
- **WHEN** OpenCode offers an option that has a description
- **THEN** the bridge reports that option with its label, value, and description in the snapshot and the stream event

#### Scenario: Option without a description
- **WHEN** OpenCode offers an option without a description
- **THEN** the bridge reports the option with its label and value and omits the description

#### Scenario: No offered option is dropped
- **WHEN** a question offers several options
- **THEN** every offered option appears in the snapshot and the stream event

### Requirement: Activity text preserved while a question is pending

While a session has a pending question, the bridge SHALL NOT overwrite the session's activity text with the question title, and SHALL append new activity text to the existing text instead of replacing it. When the question is resolved, the bridge SHALL resume replacing the activity text with the latest value.

#### Scenario: Question does not overwrite the message
- **WHEN** a form (question) is created after the assistant produced text
- **THEN** the session's activity text remains that text and is not set to the question title

#### Scenario: New activity is appended
- **WHEN** new activity text arrives while a question is pending
- **THEN** the bridge reports the existing text plus the new text, not only the new text

#### Scenario: Normal after resolution
- **WHEN** the question is resolved
- **THEN** later activity text replaces the previous text again

### Requirement: Pairing code and attempt limiting

The bridge SHALL generate a short pairing code, provide it to the local helper for display, and SHALL require a client pairing request to carry that current code before creating an approval. The bridge SHALL NOT include the code in any payload sent to a mobile client. The bridge SHALL limit repeated pairing requests and SHALL temporarily reject a source after repeated failed or missing codes.

#### Scenario: Valid code
- **WHEN** a client requests pairing with the current code
- **THEN** the bridge creates a pending approval for the user to confirm

#### Scenario: Missing or wrong code
- **WHEN** a client requests pairing without the current code or with a wrong one
- **THEN** the bridge rejects the request without creating an approval

#### Scenario: Code is not sent to clients
- **WHEN** the bridge provides the pairing code
- **THEN** it is delivered only to the helper and never to a mobile client

#### Scenario: Repeated failures are limited
- **WHEN** a source repeatedly fails the code check
- **THEN** the bridge temporarily rejects further pairing requests from that source

### Requirement: Session cost in the snapshot

The bridge SHALL report each session's accumulated cost (spent) in the snapshot and SHALL update it as turns complete, and SHALL omit it when OpenCode does not report a cost.

#### Scenario: Cost reported
- **WHEN** a session has an accumulated cost
- **THEN** the snapshot reports it and reflects a later increase

#### Scenario: Cost changes streamed
- **WHEN** a session's cost increases
- **THEN** the bridge streams a session cost event for that session

#### Scenario: No cost reported
- **WHEN** OpenCode does not report a cost for a session
- **THEN** the snapshot omits the cost rather than reporting zero
