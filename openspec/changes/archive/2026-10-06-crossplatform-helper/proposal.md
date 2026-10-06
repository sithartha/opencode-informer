# Proposal

## Why

The companion helper is macOS-only (Swift, CoreBluetooth, a menu-bar app), so a developer
running OpenCode on **Linux or Windows** cannot use the phone companion at all — no BLE
wake, no rendezvous, no pairing. The phone side and the wire contract are already
platform-agnostic; only the helper needs to exist on those platforms.

## What Changes

- Add a **cross-platform helper** (Linux, Windows, and optionally macOS) that implements the
  same contract as the macOS helper: it advertises the same BLE service with the doorbell
  (notify), rendezvous (read) and pairing (write) characteristics, serves the local ring
  endpoint on `127.0.0.1:38964`, and relays the pairing decision to the bridge.
- Because Linux and Windows have **no menu bar**, the helper runs **headless**: a pairing
  request is surfaced through a **local approval page** (served at `127.0.0.1:38964`) and/or
  the terminal, and only an approval there allows pairing.
- Where the host cannot advertise as a **BLE peripheral** (many desktop adapters/drivers do
  not support LE advertising), the helper **degrades gracefully** to LAN-only: it keeps
  serving the ring endpoint and rendezvous for manual connections and reports the
  limitation; it never fabricates agent events.
- Ship **prebuilt artifacts** per platform via a build matrix (no code signing is required
  on Linux/Windows). The existing signed/notarized macOS menu-bar app stays the recommended
  macOS distribution; the cross-platform helper is the Linux/Windows one.

## Capabilities

### New Capabilities

- `companion-helper-platforms`: the helper runs on macOS, Linux, and Windows, is distributed
  as prebuilt binaries per platform, and operates headless where there is no menu bar.

### Modified Capabilities

- `agent-ble-doorbell`: generalize the helper from macOS-only; add a headless pairing
  approval path and a graceful-degradation path when BLE peripheral advertising is
  unavailable.

## Impact

- New helper source (proposed: Rust, one codebase with per-platform BLE backends) under
  `helper/`; the Swift `mac-helper/` is unchanged.
- A build/release workflow (CI matrix) producing Linux/Windows artifacts.
- `contract/contract.json` and the phone app are **unchanged** (same BLE UUIDs, doorbell
  payload, rendezvous, and `/pair/decision` flow).
- Docs: install/run/limitations for Linux and Windows.

## Non-Goals

- Android/iOS changes, APNs, or a hosted service.
- Guaranteeing BLE peripheral support on every host adapter (documented limitation).
- Replacing the signed macOS app.
