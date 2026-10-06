# Spec Delta

## MODIFIED Requirements

### Requirement: BLE service advertisement

While running, the helper SHALL advertise a BLE peripheral service that a phone can discover and connect to, and SHALL resume advertising after a client disconnects. Where the host cannot advertise as a BLE peripheral (unsupported adapter or platform), the helper SHALL continue to run without advertising, report the limitation clearly, and remain usable for manual local connections.

#### Scenario: Discoverable while running
- **WHEN** the helper is running and no client is connected
- **THEN** a phone scanning for the service can discover it

#### Scenario: Re-advertise after disconnect
- **WHEN** a connected client disconnects
- **THEN** the helper returns to advertising and a phone can connect again

#### Scenario: BLE peripheral unavailable
- **WHEN** the host cannot advertise as a BLE peripheral
- **THEN** the helper reports this and keeps serving the local ring endpoint and rendezvous for manual connections, without advertising

### Requirement: Pairing approval

The helper SHALL present a pairing request from a client to the local user and SHALL allow pairing to proceed only after the user approves it, using the mechanism appropriate to the platform (a menu-bar prompt on macOS; a headless local approval on Linux and Windows).

#### Scenario: User approves pairing
- **WHEN** a client requests pairing and the user approves
- **THEN** the helper allows the bridge to issue a token to that client

#### Scenario: User rejects pairing
- **WHEN** a client requests pairing and the user rejects it
- **THEN** no token is issued and the client remains unauthorized

#### Scenario: Headless approval without a menu bar
- **WHEN** a client requests pairing on a platform without a menu-bar prompt
- **THEN** the helper surfaces the request through a local approval mechanism (for example a loopback page or the terminal) and issues a token only after the user approves it there
