# Design

## Context

The Swift helper (`mac-helper/`) is a macOS menu-bar app using CoreBluetooth as a BLE
peripheral (CoreBluetooth exposes a local GATT server on macOS). Linux and Windows have no
AppKit menu bar and different BLE stacks. The phone and the bridge are unchanged: the
contract (service/characteristic UUIDs, doorbell JSON, rendezvous value, `/pair/decision`)
is platform-agnostic.

Per-platform BLE peripheral support:

- **macOS**: CoreBluetooth (already implemented).
- **Linux**: BlueZ over D-Bus — register a GATT application (`org.bluez.GattManager1`) with
  the doorbell/dove/rendezvous characteristics and an LE advertisement
  (`org.bluez.LEAdvertisingManager1`). Requires BlueZ 5.43+ and an adapter that supports LE
  advertising.
- **Windows**: WinRT — a local GATT service via `GattServiceProvider` (with notify
  characteristics) plus `BluetoothLEAdvertisementPublisher`. Requires Windows 10 1803+ and a
  compatible adapter.

## Goals / Non-Goals

**Goals:**
- One helper that runs on Linux and Windows (and optionally macOS) against the same contract.
- Headless operation with a local approval mechanism.
- Prebuilt artifacts per platform; graceful degradation without BLE peripheral support.

**Non-Goals:**
- A GUI/tray on Linux/Windows (headless is enough).
- Guaranteeing advertising on every adapter.
- Changing the phone or the bridge.

## Decisions

### Rust, one codebase with cfg-gated BLE backends
- **Choice**: implement the helper in Rust with `cfg(target_os)` backends: Linux (BlueZ via
  `zbus`), Windows (WinRT via the `windows` crate), macOS (CoreBluetooth via `objc2`), and
  shared code for the ring server, rendezvous, approval page, and CLI.
- **Why**: Rust gives static, dependency-light binaries for Linux/Windows, a single
  cross-platform source of truth, and safe async for the ring server and D-Bus/WinRT.
- **Alternatives**: Node + `bleno` (macOS/Linux only; no Windows peripheral);
  separate per-platform apps (three codebases); Go (BLE peripheral support is weak).

### Headless approval via a loopback page
- **Choice**: the helper serves a minimal approval page at `http://127.0.0.1:38964/`
  (GET shows the pending request; POST approves/denies) and relays the decision to the
  bridge with `POST /pair/decision`. On a pairing ring it logs the URL and, with `--open`,
  opens the default browser. A terminal prompt is used when run interactively.
- **Why**: works consistently on Linux and Windows with no GUI toolkit; reuses the existing
  loopback `/pair/decision` path; keeps the trust model (loopback only).
- **Alternatives**: a system tray (per-platform UI, more work); desktop notifications (still
  needs an approve action).

### Graceful degradation to LAN-only
- **Choice**: if the BLE peripheral cannot be created/advertised, run anyway, log a clear
  message, and keep the ring server and rendezvous available; the phone can still use manual
  address entry, minus the wake.
- **Why**: many desktop adapters do not support LE advertising; failing hard would be worse.
- **Alternatives**: exit with an error (poor UX); pretend to advertise (dishonest).

### Prebuilt distribution via a build matrix
- **Choice**: a CI matrix (ubuntu, windows, macos) builds release binaries and attaches them
  to a Release; Linux/Windows artifacts are unsigned by default.
- **Why**: the author has no Linux/Windows machines to build or test on; CI is the only way
  to produce and smoke-test (compile + non-BLE self-test) artifacts.
- **Alternatives**: ask users to build (toolchain burden).

### Keep the Swift macOS app
- **Choice**: leave `mac-helper/` as the recommended macOS app (menu bar, signed,
  notarized); the cross-platform helper may also run on macOS, headless.
- **Why**: the notarized menu-bar app is the best macOS UX; no reason to regress it.

## Risks / Trade-offs

- [Desktop adapters often lack LE advertising] → document clearly; graceful LAN-only mode.
- [Untested on Linux/Windows by the author] → CI compiles and runs a hardware-free
  `--selftest`; `--scan`/`--advertise` modes for a user with hardware; ask users to report.
- [Windows GATT server limits] → Windows 10 1803+; document; keep payloads tiny.
- [Unsigned Windows binary] → SmartScreen warning; signing can be added later.
- [Two implementations drift] → both implement the single shared contract; add a contract
  parity self-test in the Rust helper.

## Migration Plan

Additive: build the new helper under `helper/`, keep `mac-helper/`. Distribute Linux/Windows
artifacts via Releases; document platform limitations. No changes to the phone or bridge.
