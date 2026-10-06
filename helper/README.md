# OpenCode Informer Helper (cross-platform)

A small companion process for **OpenCode Informer**. It lets the phone find your
OpenCode bridge on the local network and be woken when an agent needs attention.

It owns no business logic: it accepts ring signals from the plugin bridge on
`127.0.0.1:38964`, acts as a Bluetooth Low Energy **peripheral** so the phone can be
woken, serves the bridge address for **rendezvous**, and hosts the **pairing
approval** prompt.

This crate is the **Linux and Windows** helper. On macOS, use the signed menu-bar app
in [`../mac-helper`](../mac-helper) instead (this helper also runs on macOS, but only in
LAN-only mode).

## What it does

- **Ring server** — `POST http://127.0.0.1:38964/ring` receives a doorbell from the
  plugin bridge and forwards it to the connected phone.
- **BLE peripheral** — advertises the service and exposes:
  - doorbell (**notify**) — the wake signal;
  - rendezvous (**read**) — the `host:port` the phone needs to reach the bridge;
  - pairing (**write**) — the phone's pairing write.
- **Pairing approval** — surfaces a pairing request to the local user (see below).
- **Rendezvous** — reports the primary LAN IPv4 address (`host:38963`).

The wire values (UUIDs, ports, payloads) live in [`../contract/contract.json`](../contract/contract.json)
and are shared with the phone app, the plugin bridge, and the macOS helper.

## Run

```bash
# from the repository root
cd helper
cargo build --release
./target/release/opencode-informer-helper          # default: ring on 127.0.0.1:38964
```

Options:

| Flag | Purpose |
|---|---|
| `--port <PORT>` | Loopback ring port (default `38964`) |
| `--open` | Open the approval page in a browser on a pairing request |
| `--simulate` | LAN-only: no BLE advertising (also the fallback when BLE is unavailable) |
| `--advertise` | Run the helper (alias for the default mode) |
| `--scan` | Scan for the helper's BLE service (diagnostics) |
| `--selftest` | Hardware-free checks, then exit |
| `-h`, `--help` / `-V`, `--version` | Help / version |

Environment:

- `OC_INFORMER_BRIDGE` — override the plugin bridge base URL (default
  `http://127.0.0.1:38963`).

## Pairing approval (headless)

Linux and Windows have no menu bar, so pairing is approved locally:

- **Approval page** — a pairing request is shown at `http://127.0.0.1:38964/`, where you
  click **Allow** or **Deny**. Pass `--open` to open it automatically, or open it
  manually when the helper logs the pending request.
- **Terminal** — when running interactively, type `y` to approve or `n` to deny the
  pending request.

Both relay the decision to the bridge via `POST /pair/decision`.

## Diagnostics

```bash
# Hardware-free: contract parity, ring + approval flow, decision relay, HTML escaping.
cargo run --release -- --selftest

# With a Bluetooth adapter: scan for the advertised service.
cargo run --release -- --scan
```

`--selftest` does not need a Bluetooth adapter and is what CI runs.

## Requirements and limitations

- **Linux**: BlueZ 5.43+ and a Bluetooth adapter that supports **LE advertising**
  (BlueZ talks over D-Bus; the `bluer` crate needs `libdbus-1`). On Debian/Ubuntu:
  `sudo apt install libdbus-1-dev pkg-config`.
- **Windows**: Windows 10 1803+ and a compatible adapter. Windows uses a local GATT
  server (`GattServiceProvider`) with advertising.
- **macOS**: use the signed menu-bar app in `../mac-helper`; this helper runs LAN-only.

Many **desktop Bluetooth adapters do not support LE advertising**. When the helper
cannot advertise, it keeps running in **LAN-only mode**: it still serves the ring
endpoint and the rendezvous value, logs a clear message, and never fabricates events.
In that mode the phone can still connect by address, but background wake is disabled.

Other notes:

- Linux/Windows binaries are distributed **unsigned** (expect a SmartScreen prompt on
  Windows the first time).
- There is no local storage: the helper only forwards ring signals and the pairing
  decision.

## Build and release

Prebuilt binaries are produced by the CI matrix in
[`.github/workflows/helper.yml`](../.github/workflows/helper.yml) (Linux, Windows,
macOS): each job builds `--release` and runs `--selftest`, then uploads a downloadable
artifact. Attach those artifacts to a Release manually — releases are kept local, and
the helper needs no secrets.
