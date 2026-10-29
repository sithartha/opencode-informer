# Spec Delta

## MODIFIED Requirements

### Requirement: Rendezvous information

The helper SHALL expose the local bridge's reachable host and port to a connected client so the client can reach the bridge over the local network without manual address entry. The helper SHALL resolve the host and port from the host's current network at the time a client reads them, so a client that re-reads the characteristic after the host changes networks receives the new address, and SHALL NOT serve an address captured once at startup.

#### Scenario: Client reads bridge address
- **WHEN** a client connects to the helper before it has the bridge address
- **THEN** the helper provides the current host and port of the local bridge

#### Scenario: Address after a network change
- **WHEN** the host moves to a different network and a client reads the rendezvous characteristic
- **THEN** the helper returns the host's address on the new network

#### Scenario: Address re-read over an existing link
- **WHEN** a client that is already connected over Bluetooth re-reads the rendezvous characteristic after the host changed networks
- **THEN** the helper returns the new address without requiring the client to reconnect first

#### Scenario: Unchanged network
- **WHEN** the host's network has not changed and a client reads the rendezvous characteristic
- **THEN** the helper returns the same address it returned before
