# agent-ble-doorbell Specification

## Purpose
A macOS helper that acts as a Bluetooth Low Energy peripheral so a paired phone can be woken when an agent needs attention, carries the local bridge address for rendezvous, and hosts the pairing approval prompt.

## Requirements

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

### Requirement: Doorbell delivery

The helper SHALL accept doorbell signals from the local bridge and deliver a compact notification to the connected client within a bounded latency, identifying the kind of event and the associated request.

#### Scenario: Permission doorbell
- **WHEN** the helper receives a permission doorbell signal while a client is connected
- **THEN** the client receives a notification identifying it as a permission event and naming the request

#### Scenario: Doorbell with no client connected
- **WHEN** a doorbell signal arrives with no client connected
- **THEN** the helper records the pending attention state and delivers a doorbell when a client next connects

### Requirement: Rendezvous information

The helper SHALL expose the local bridge's reachable host and port to a connected client so the client can reach the bridge over the local network without manual address entry.

#### Scenario: Client reads bridge address
- **WHEN** a client connects to the helper before it has the bridge address
- **THEN** the helper provides the current host and port of the local bridge

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

### Requirement: Operation without the bridge

The helper SHALL run independently of the bridge and SHALL remain discoverable, but SHALL not fabricate agent events when no bridge data is available.

#### Scenario: Bridge not running
- **WHEN** the bridge is not running
- **THEN** the helper still advertises and can deliver the bridge address, and reports no agent activity until the bridge is available
