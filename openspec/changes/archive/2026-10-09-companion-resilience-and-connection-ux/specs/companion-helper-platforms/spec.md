# Spec Delta

## MODIFIED Requirements

### Requirement: Headless operation and approval

On platforms without a graphical menu-bar shell, the helper SHALL run headless and SHALL surface a pairing request through a local mechanism (a loopback approval page and/or the terminal), allowing pairing to proceed only after the local user approves it there. The helper SHALL display the pairing code supplied with the request at that local mechanism and SHALL NOT send the code to the client.

#### Scenario: Pairing on a headless host
- **WHEN** a phone requests pairing and the helper is running headless on Linux or Windows
- **THEN** the request is surfaced locally (for example at `http://127.0.0.1:38964/`) and a token is issued only after the user approves it there

#### Scenario: Pairing code shown locally
- **WHEN** a pairing request that carries a code is surfaced headlessly
- **THEN** the code is shown at the local approval mechanism and is not sent to the client
