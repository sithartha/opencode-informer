# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Session lifecycle controls

The bridge SHALL accept authenticated requests from a paired client to start a new session, stop a session's current turn, and close a session, applying each through OpenCode, and SHALL never block or alter agent execution when such a request is unauthorized or fails.

#### Scenario: Start a new session
- **WHEN** a paired client requests a new session
- **THEN** the bridge creates an OpenCode session and it appears in the snapshot as an active session

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
