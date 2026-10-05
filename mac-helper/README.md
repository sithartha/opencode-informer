# Open Island BLE Helper

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
./scripts/package-app.sh          # produces "dist/OpenIsland BLE.app"
open "dist/OpenIsland BLE.app"
```

The menu-bar item ("OI") shows BLE status, the rendezvous address, and a Quit action.

## Run at login

Add the bundled app to **System Settings -> General -> Login Items**, or install a
LaunchAgent that opens it:

```xml
<!-- ~/Library/LaunchAgents/app.openisland.ble-helper.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>app.openisland.ble-helper</string>
  <key>ProgramArguments</key>
  <array>
    <string>/Applications/Open Island BLE.app/Contents/MacOS/OpenIslandBLE</string>
  </array>
  <key>RunAtLoad</key><true/>
</dict>
</plist>
```

## Permissions

The bundle declares `NSBluetoothAlwaysUsageDescription` and
`NSLocalNetworkUsageDescription`. macOS will ask for Bluetooth access the first time
the helper advertises.

## How it talks to the plugin

The plugin POSTs a doorbell to `http://127.0.0.1:38964/ring`:

```json
{ "kind": "permission", "requestID": "req_1", "sessionID": "ses_1", "title": "Allow Bash" }
```

`kind` is `permission`, `question`, `completion`, or `pairing`. On `pairing`, the
helper shows an Allow/Deny alert and records the answer at the bridge's loopback-only
`POST /pair/decision`. If no phone is subscribed, doorbells are buffered and flushed
when a central subscribes.

## Wire contract

Service and characteristic UUIDs, the rendezvous value (`host:port`), and the
doorbell payload are defined in `../contract/contract.json`.

## Verification status

- Builds (`swift build`) and packages (`scripts/package-app.sh`) — verified.
- Launches as a menu-bar process and the localhost `/ring` endpoint answers — verified.
- BLE advertising, rendezvous read, and doorbell notify require a BLE scanner or the
  phone; CoreBluetooth central does not initialize from a headless shell, so these
  are verified on-device (tasks 5.2, 5.4, 5.5, 5.6).
