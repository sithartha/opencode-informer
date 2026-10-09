# companion-helper-platforms Specification

## Purpose
A companion helper that runs on macOS, Linux, and Windows and implements the same local
BLE + LAN contract the phone relies on, so the companion works regardless of the platform
the user runs OpenCode on.

## Requirements

### Requirement: Cross-platform helper

The helper SHALL be buildable and runnable on macOS, Linux, and Windows, and on each platform it SHALL implement the same contract: advertise the BLE peripheral service (doorbell, rendezvous, pairing), serve the local ring endpoint, provide the rendezvous value, and relay the pairing decision to the bridge.

#### Scenario: Runs on Linux
- **WHEN** the helper runs on Linux with a BLE adapter that supports LE advertising
- **THEN** it advertises the service and delivers a doorbell to a connected phone

#### Scenario: Runs on Windows
- **WHEN** the helper runs on Windows with a BLE adapter that supports LE advertising
- **THEN** it advertises the service and delivers a doorbell to a connected phone

#### Scenario: Same contract everywhere
- **WHEN** the helper runs on any supported platform
- **THEN** the BLE service and characteristic UUIDs, the doorbell payload, the rendezvous value, and the pairing decision flow match the shared contract used by the phone and the bridge

### Requirement: Prebuilt distribution

The helper SHALL be distributed as prebuilt, self-contained artifacts per platform so a user does not need the platform's build toolchain, and the artifacts SHALL be produced by an automated build matrix.

#### Scenario: Download and run without building
- **WHEN** a user on a supported platform downloads the helper artifact for that platform
- **THEN** they can run it without installing a compiler or SDK

### Requirement: Headless operation and approval

On platforms without a graphical menu-bar shell, the helper SHALL run headless and SHALL surface a pairing request through a local mechanism (a loopback approval page and/or the terminal), allowing pairing to proceed only after the local user approves it there. The helper SHALL display the pairing code supplied with the request at that local mechanism and SHALL NOT send the code to the client.

#### Scenario: Pairing on a headless host
- **WHEN** a phone requests pairing and the helper is running headless on Linux or Windows
- **THEN** the request is surfaced locally (for example at `http://127.0.0.1:38964/`) and a token is issued only after the user approves it there

#### Scenario: Pairing code shown locally
- **WHEN** a pairing request that carries a code is surfaced headlessly
- **THEN** the code is shown at the local approval mechanism and is not sent to the client
