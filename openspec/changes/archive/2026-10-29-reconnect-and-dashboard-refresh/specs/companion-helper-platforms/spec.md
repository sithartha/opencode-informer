# Spec Delta

## MODIFIED Requirements

### Requirement: Cross-platform helper

The helper SHALL be buildable and runnable on macOS, Linux, and Windows, and on each platform it SHALL implement the same contract: advertise the BLE peripheral service (doorbell, rendezvous, pairing), serve the local ring endpoint, provide the rendezvous value, and relay the pairing decision to the bridge. The rendezvous value SHALL describe the bridge address on the host's current network at the moment a client reads it, including after the host changes networks, so a Linux or Windows helper that outlives a network change does not hand out a stale address.

#### Scenario: Runs on Linux
- **WHEN** the helper runs on Linux with a BLE adapter that supports LE advertising
- **THEN** it advertises the service and delivers a doorbell to a connected phone

#### Scenario: Runs on Windows
- **WHEN** the helper runs on Windows with a BLE adapter that supports LE advertising
- **THEN** it advertises the service and delivers a doorbell to a connected phone

#### Scenario: Same contract everywhere
- **WHEN** the helper runs on any supported platform
- **THEN** the BLE service and characteristic UUIDs, the doorbell payload, the rendezvous value, and the pairing decision flow match the shared contract used by the phone and the bridge

#### Scenario: Rendezvous follows a network change
- **WHEN** the helper runs on Linux or Windows, the host changes networks, and a phone reads the rendezvous characteristic
- **THEN** the helper reports the bridge address on the new network rather than the address captured at startup
