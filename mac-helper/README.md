# OpenCode Informer Helper (macOS)

Standalone macOS menu-bar helper that acts as a Bluetooth Low Energy **peripheral**
so the phone can be woken when an agent needs attention. It owns no business logic:
it receives ring signals from the plugin bridge on localhost and forwards a compact
doorbell to the connected phone. It also serves the bridge address for rendezvous and
hosts the pairing approval prompt.

## Requirements

- macOS 14+
- Bluetooth on
- The plugin bridge running (`../plugin/`) on the same Mac

## Build and run

```bash
cd mac-helper
swift build
./scripts/package-app.sh          # produces "dist/OpenCode Informer.app"
open "dist/OpenCode Informer.app"
```

The menu-bar item ("OI") shows BLE status and the rendezvous address, and offers:

- **Copy rendezvous** — copies the `host:port` the bridge listens on.
- **Refresh phone** — asks the phone to resync every card from the Mac.
- **Launch at Login** — toggles starting the helper automatically at login (modern
  login-item API, no manual Login Items setup).
- **Quit**.

## Release (signed + notarized .dmg)

```bash
# Requires a "Developer ID Application" certificate and an app-specific password file.
./scripts/release-helper.sh
```

This builds, signs with hardened runtime, packages a `.dmg` containing the app and an
**Applications** shortcut for drag-install, notarizes it, and staples the ticket.

## Run at login (manual alternative)

Use the **Launch at Login** menu item, or add the app in
**System Settings → General → Login Items**.

## Permissions

The bundle declares `NSBluetoothAlwaysUsageDescription` and
`NSLocalNetworkUsageDescription`. macOS will ask for Bluetooth access the first time
the helper advertises.

## How it talks to the plugin

The plugin POSTs a doorbell to `http://127.0.0.1:38964/ring`:

```json
{ "kind": "permission", "requestID": "req_1", "sessionID": "ses_1", "title": "Allow Bash" }
```

`kind` is one of `permission`, `question`, `completion`, `pairing`, `refresh`.
