# Spec Delta

## ADDED Requirements

### Requirement: Client device token registration

The bridge SHALL accept and store an authenticated client's APNs device token associated with that client, replacing any previous token for it, and SHALL stop using a token once the client reports it invalid or it is known to be stale.

#### Scenario: Register a token
- **WHEN** a paired client sends its APNs device token
- **THEN** the bridge stores it and uses it for subsequent remote pushes

#### Scenario: Replace a token
- **WHEN** a paired client sends a new token
- **THEN** the bridge replaces the previously stored token for that client

### Requirement: Remote push fallback (APNs)

The bridge SHALL send an APNs push for permission, question, and turn-completion events when no streaming client is connected, and SHALL NOT send a push for an event while a client is streaming over the LAN. It SHALL authenticate with token-based APNs credentials and SHALL NOT block, delay, or alter agent execution when a push fails.

#### Scenario: An event occurs away from the LAN
- **WHEN** an attention event occurs while no client is connected
- **THEN** the bridge sends an APNs push to the registered device token

#### Scenario: An event occurs on the LAN
- **WHEN** an attention event occurs while at least one client is connected
- **THEN** the bridge does not send an APNs push for it

#### Scenario: Push failure is ignored
- **WHEN** the APNs request fails (network, auth, or an unregistered token)
- **THEN** the bridge records the failure and agent execution continues unaffected
