# Troubleshooting

Work top to bottom: bridge → helper → app → pairing → notifications.

## The app finds no computer

1. Phone and computer on the same Wi-Fi (not guest isolation, not a VPN-only network).
2. Bluetooth is on, on both sides.
3. The helper is running:
   - macOS: the menu-bar item exists and shows a rendezvous address.
   - Linux/Windows: `pgrep -fl opencode-informer-helper`.
4. The bridge answers locally:

   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:38963/status
   ```

   `401` is correct: the bridge is up and requires a token.
5. If the helper cannot advertise BLE (common on desktop adapters), connect by address:
   the app can use the rendezvous `host:port` directly. Background wake will not work.

## Pairing prompt never appears

- macOS: open the **OpenCode Informer** menu-bar item; the pending request is shown there.
- Linux/Windows: open `http://127.0.0.1:38964/` or answer `y`/`n` in the helper terminal.
- If nothing is pending, the phone may not have reached the helper. Retry pairing after
  restarting the app.

## App connects but shows no sessions

- The plugin is not loaded. Confirm the loader exists:
  `~/.config/opencode/plugins/open-island-mobile.js`, and that it points at
  `~/.config/opencode/open-island-mobile-plugin/open-island-mobile.js`.
- Restart OpenCode after installing or updating the plugin.
- Check that plugin and helper versions match the compatibility row for the app version.
- The bridge runs inside OpenCode; closing OpenCode stops it.

## Pairing was revoked

The app reports that re-pairing is required. Approve a new pairing on the computer. Do
not copy tokens between machines.

## No notifications when the phone is locked

- Allow notifications for OpenCode Informer in iOS Settings.
- The Live Activity and BLE wake need the helper running and in range (about 10 m).
- iOS force-quit stops BLE wake until the app is opened again. This is a platform limit,
  not a setup error.

## Live Activity is stale

Expected between wakes. It refreshes on the next BLE wake or when the app comes to the
foreground; the subtitle is marked `stale` after five minutes without a refresh. Turning
the Lock Screen activity off in the app ends it.

## Helper exits or logs about BLE

- Linux: BlueZ 5.43+ and `libdbus-1` are required; LE advertising must be supported by
  the adapter.
- Windows: Windows 10 1803+ and a compatible adapter.
- Without LE advertising the helper stays in LAN-only mode by design. Do not report it
  as a crash.

## Checksum mismatch

Delete the downloaded asset and download it again from the official release. Never
install a file whose SHA-256 does not match `SHA256SUMS`.

## Wrong versions

Compare the installed versions with `docs/compatibility.md` and reinstall the versions
from the row for the app version. Report the versions in the final summary instead of
guessing.
