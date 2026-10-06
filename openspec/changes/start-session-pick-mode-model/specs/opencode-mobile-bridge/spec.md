# Spec Delta

## MODIFIED Requirements

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
