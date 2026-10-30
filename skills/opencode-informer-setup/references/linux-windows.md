# Linux and Windows helper

The cross-platform helper implements the same BLE + LAN contract as the macOS menu-bar
helper, without a GUI. Use it when OpenCode runs on Linux or Windows.

## Requirements

- **Linux**: BlueZ 5.43+, a Bluetooth adapter that supports LE advertising, and
  `libdbus-1` at build time. On Debian/Ubuntu the build dependency is
  `libdbus-1-dev pkg-config`; ask the user before running `sudo apt install`.
- **Windows**: Windows 10 1803+ and a compatible adapter.
- The plugin bridge running on the same computer (`127.0.0.1:38963`).

## Install and run

1. Download the binary for the platform from the release tagged
   `helper-crossplatform-v<version>`:
   - `opencode-informer-helper-linux-x86_64`
   - `opencode-informer-helper-windows-x86_64.exe`
   - `opencode-informer-helper-macos-aarch64` (LAN-only on macOS; prefer the signed
     menu-bar app)
2. Linux: `chmod +x opencode-informer-helper-linux-x86_64`.
3. Run it:

   ```bash
   ./opencode-informer-helper-linux-x86_64 --open
   ```

   `--open` opens the pairing approval page automatically.

The binaries are **unsigned**. On Windows, SmartScreen warns on first run; confirm the
file came from the project's release before allowing it.

## Options

| Flag | Purpose |
|---|---|
| `--port <PORT>` | Loopback ring port (default `38964`) |
| `--open` | Open the approval page on a pairing request |
| `--simulate` | LAN-only; do not advertise BLE |
| `--advertise` | Run in the default advertising mode |
| `--scan` | Scan for the helper's BLE service (diagnostics) |
| `--selftest` | Hardware-free checks, then exit |

Environment: `OC_INFORMER_BRIDGE` overrides the bridge base URL (default
`http://127.0.0.1:38963`).

## Pairing approval

There is no menu bar. When a phone asks to pair:

- open `http://127.0.0.1:38964/` and click **Allow** or **Deny**, or
- type `y` / `n` in the helper's terminal if it runs interactively.

The decision is relayed to the bridge; the approval code is shown only locally and is
never sent to the phone.

## LAN-only fallback

Many desktop adapters cannot advertise BLE. The helper then keeps running without BLE:
the ring endpoint and rendezvous still work, the phone can connect by address, but
background wake is unavailable. Do not present this as a broken install — it is a
documented limitation.

## Diagnostics

```bash
./opencode-informer-helper-linux-x86_64 --selftest
./opencode-informer-helper-linux-x86_64 --scan
```

`--selftest` needs no Bluetooth adapter.
