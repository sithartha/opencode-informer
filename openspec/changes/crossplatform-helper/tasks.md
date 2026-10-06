# Tasks

## 1. Scaffold the cross-platform helper

- [x] 1.1 Create the Rust helper crate under `helper/` with shared modules: ring HTTP server (`127.0.0.1:38964`), rendezvous provider (reads the bridge address), loopback approval page (`GET /` / `POST /pair/decision` relay), and CLI (`--open`, `--selftest`, `--scan`, `--advertise`)
- [x] 1.2 Add the shared contract constants (service/characteristic UUIDs, doorbell payload, rendezvous encoding) as a single module, with a parity self-test against `contract/contract.json`
- [x] 1.3 Implement `--selftest` (hardware-free: ring server, rendezvous, approval page, token relay) and make it exit non-zero on failure

## 2. Linux BLE backend (BlueZ)

- [x] 2.1 Register a GATT application over D-Bus (`org.bluez.GattManager1`) exposing the doorbell (notify), rendezvous (read) and pairing (write) characteristics
- [x] 2.2 Register an LE advertisement (`org.bluez.LEAdvertisingManager1`) and re-advertise after a client disconnects
- [x] 2.3 If the adapter cannot advertise, fall back to LAN-only mode with a clear log message (no fabricated events)

## 3. Windows BLE backend (WinRT)

- [x] 3.1 Create a local GATT service with `GattServiceProvider` (notify characteristic) and advertise it with `GattServiceProviderAdvertisingParameters`
- [x] 3.2 Relay the pairing write to the bridge and keep advertising after a client disconnects
- [x] 3.3 If the provider/adapter cannot advertise, fall back to LAN-only mode with a clear message

## 4. macOS backend (optional)

- [x] 4.1 Document that macOS uses the signed `mac-helper/` app; the cross-platform helper runs LAN-only there (simulated backend)

## 5. Approval UX and docs

- [x] 5.1 Implement the loopback approval page and an interactive terminal prompt; log the URL on a pairing ring and support `--open`
- [x] 5.2 Write `helper/README.md`: install/run per platform, BLE adapter limitations, LAN-only fallback, and the self-test/scan/advertise diagnostics

## 6. Packaging and release

- [x] 6.1 Add a CI build matrix (ubuntu, windows, macos) that builds release binaries and runs `--selftest`
- [x] 6.2 Upload per-platform artifacts for manual Release attachment, and document that Linux/Windows artifacts are unsigned
- [x] 6.3 Update `docs/release-checklist.md` with the cross-platform build/release steps

## 7. Verification

- [ ] 7.1 CI green: all platforms compile and the hardware-free self-test passes (requires pushing the workflow)
- [x] 7.2 Contract parity self-test confirms the BLE UUIDs, doorbell payload, rendezvous, and `/pair/decision` flow match the phone and bridge (runs in `--selftest`)
- [ ] 7.3 Real-hardware smoke test on Linux and Windows by a user with an LE-advertising adapter (the author cannot test locally); document results and known adapter caveats
