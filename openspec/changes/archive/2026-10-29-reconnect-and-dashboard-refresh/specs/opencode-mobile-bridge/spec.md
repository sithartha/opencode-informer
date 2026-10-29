# Spec Delta

## MODIFIED Requirements

### Requirement: Pairing and token authentication

The bridge SHALL require an explicit pairing approval before issuing a client token, and SHALL reject any state, stream, or resolution request that does not carry a valid bearer token with `401 Unauthorized`. The bridge SHALL persist every issued token on the computer so the token survives a bridge, plugin, or host restart, SHALL load the persisted tokens at startup, and SHALL store them in a file readable by the owner only. Revoking a token SHALL update the persisted store, and issuing a token SHALL persist it. When the persisted store cannot be read or written, the bridge SHALL keep serving requests with its in-memory tokens and SHALL NOT fail to start.

#### Scenario: Successful pairing
- **WHEN** a client requests pairing with a valid, current pairing challenge
- **THEN** the bridge returns a bearer token and the client is authorized for subsequent requests

#### Scenario: Unpaired request
- **WHEN** a client calls a protected endpoint without a token or with an invalid token
- **THEN** the bridge responds `401 Unauthorized` and discloses no session data

#### Scenario: Tokens are independent of Open Island
- **WHEN** a client is paired to the mobile bridge
- **THEN** the bridge does not require, reuse, or modify Open Island's own pairing token

#### Scenario: Pairing survives a bridge restart
- **WHEN** the bridge restarts and a previously paired client presents its stored token
- **THEN** the bridge accepts the token and serves the request without asking the user to pair again

#### Scenario: A revoked token stays revoked
- **WHEN** the bridge revokes a client token and restarts
- **THEN** that token is still rejected with `401 Unauthorized`

#### Scenario: Token store is unavailable
- **WHEN** the bridge cannot read or write its persisted token store
- **THEN** it starts, keeps serving with in-memory tokens, and does not expose session data to unpaired clients

#### Scenario: Token store is owner-only
- **WHEN** the bridge writes the persisted token store
- **THEN** the file is readable and writable only by the user running the bridge

### Requirement: Agent state snapshot

The bridge SHALL expose a snapshot of current agent sessions, including each session's identifier, title (the session name OpenCode shows), agent name, model identifier, working directory, phase, current tool (if any), latest activity text, and the count of running agents. On startup the bridge SHALL seed the snapshot from OpenCode's session list so sessions opened before the bridge started are not missing: it SHALL include sessions active within the last hour, at most 20, newest first, and SHALL NOT raise notifications or doorbells for seeded sessions. Sessions opened later SHALL continue to appear through the normal event flow.

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

#### Scenario: Session opened before the bridge started
- **WHEN** the bridge starts while a session opened earlier is still recent
- **THEN** the first snapshot includes that session with its title, directory, agent and model

#### Scenario: Old history is not seeded
- **WHEN** the bridge starts and OpenCode has months of old sessions
- **THEN** only sessions active within the last hour are seeded, at most 20

#### Scenario: Seeding is silent
- **WHEN** the bridge seeds recent sessions at startup
- **THEN** it does not raise completion or attention notifications for them
