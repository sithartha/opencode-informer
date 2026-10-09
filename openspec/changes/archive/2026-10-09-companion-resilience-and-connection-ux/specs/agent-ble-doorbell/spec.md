# Spec Delta

## MODIFIED Requirements

### Requirement: Pairing approval

The helper SHALL present a pairing request from a client to the local user and SHALL allow pairing to proceed only after the user approves it, using the mechanism appropriate to the platform (a menu-bar prompt on macOS; a headless local approval on Linux and Windows). The helper SHALL display the pairing code supplied with the request so the local user can read it to the pairing client, and SHALL NOT transmit that code to the client.

#### Scenario: User approves pairing
- **WHEN** a client requests pairing and the user approves
- **THEN** the helper allows the bridge to issue a token to that client

#### Scenario: User rejects pairing
- **WHEN** a client requests pairing and the user rejects it
- **THEN** no token is issued and the client remains unauthorized

#### Scenario: Headless approval without a menu bar
- **WHEN** a client requests pairing on a platform without a menu-bar prompt
- **THEN** the helper surfaces the request through a local approval mechanism (for example a loopback page or the terminal) and issues a token only after the user approves it there

#### Scenario: Pairing code shown and not forwarded
- **WHEN** the helper receives a pairing request that carries a pairing code
- **THEN** the helper shows the code to the local user and does not transmit the code to the client
