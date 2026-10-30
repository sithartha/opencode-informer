# macOS helper

Requirements: macOS 14 or later, Bluetooth on, the OpenCode plugin installed and running.

## Install

1. Download `OpenCodeInformerHelper-<version>.dmg` from the release tagged
   `helper-v<version>`.
2. Open the disk image and drag **OpenCode Informer** into **Applications**.
3. Launch it from Applications (or Spotlight).
4. Approve the **Bluetooth** prompt. Approve **Local Network** when macOS asks, usually
   on the first phone connection.
5. The menu-bar item appears. Menu items:
   - **Copy rendezvous** — the `host:port` the phone uses to reach the bridge.
   - **Refresh phone** — asks the phone to resync every card.
   - **Launch at Login** — toggles the modern login item.
   - **Quit**.

The `.dmg` is signed with a Developer ID and notarized, so Gatekeeper should not block
it. If it does, do not disable Gatekeeper globally; re-download from the official
release and check the version.

## Verify

```bash
defaults read "/Applications/OpenCode Informer.app/Contents/Info.plist" CFBundleShortVersionString
pgrep -fl OpenCodeInformerHelper
```

The rendezvous must be the computer's current LAN address. It is resolved when the phone
reads it, so a network change (Wi-Fi → Ethernet) is picked up on the next read.

## Update

Quit the helper, replace the app in Applications with the new build, launch it again.
Login-item state and pairing are kept.

## Uninstall

Quit from the menu, drag **OpenCode Informer** from Applications to the Trash, and remove
the login item if it remains under **System Settings → General → Login Items**.
