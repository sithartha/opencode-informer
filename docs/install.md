# Install OpenCode Informer

One app, one OpenCode plugin, one helper on the computer that runs OpenCode. Install
them in this order: **plugin → helper → app → pair → verify**.

Versions are not interchangeable. Pick the plugin and helper versions from the
[compatibility table](./compatibility.md) for your app version. The newest app build is
the [latest release](https://github.com/sithartha/opencode-informer/releases/latest).

## Choose the app channel

| Channel | Updates | Signing lifetime | When to use |
|---|---|---|---|
| App Store / TestFlight | Automatic | Apple-managed | Normal use; requires the build to be available |
| Direct IPA (GitHub Releases) | Manual — download and re-install | 7 days with a free Apple ID, 1 year with a paid account | The App Store build is not available yet, or you want the newest build immediately |

The direct IPA is unsigned. You sign it yourself with your Apple ID using Sideloadly or
AltStore — no App Store review, TestFlight, or paid developer account is involved.

## 1. Install the OpenCode plugin

The plugin runs inside OpenCode and serves the local bridge on port `38963`.

Download the plugin zip from the app release that matches your app version, unpack it,
and add a loader so OpenCode picks it up:

```bash
# Versions from the compatibility table; replace both.
APP_VERSION=0.1.2
PLUGIN_VERSION=0.1.0
mkdir -p ~/.config/opencode/plugins ~/.config/opencode/open-island-mobile-plugin
curl -fL -o /tmp/open-island-mobile-plugin.zip \
  "https://github.com/sithartha/opencode-informer/releases/download/app-v${APP_VERSION}/open-island-mobile-plugin-${PLUGIN_VERSION}.zip"
unzip -o /tmp/open-island-mobile-plugin.zip -d ~/.config/opencode/open-island-mobile-plugin
cat > ~/.config/opencode/plugins/open-island-mobile.js <<EOF
export { default } from "${HOME}/.config/opencode/open-island-mobile-plugin/open-island-mobile.js"
EOF
```

Restart OpenCode. The bridge should answer on `127.0.0.1:38963`; the plugin keeps working
normally if the helper is absent, so a missing helper is not an error at this step.

## 2. Install the helper for your computer

The helper advertises Bluetooth, hands the phone the bridge address, and asks you to
approve pairing.

### macOS

Download `OpenCodeInformerHelper-<version>.dmg` from the matching
[helper release](https://github.com/sithartha/opencode-informer/releases?q=helper-v), open
it, drag **OpenCode Informer** to **Applications**, and launch it. Approve the Bluetooth
and Local Network prompts. The menu-bar item shows BLE status and the rendezvous address.

### Linux and Windows

Download the binary for your platform from the matching
[`helper-crossplatform-v` release](https://github.com/sithartha/opencode-informer/releases?q=helper-crossplatform-v)
(`opencode-informer-helper-linux-x86_64`, `...-windows-x86_64.exe`,
`...-macos-aarch64`). These binaries are unsigned: expect a SmartScreen warning on
Windows, and on Linux make the file executable:

```bash
chmod +x opencode-informer-helper-linux-x86_64
./opencode-informer-helper-linux-x86_64 --open
```

`--open` opens the local approval page for pairing. Many desktop Bluetooth adapters do
not support LE advertising; the helper then keeps running in LAN-only mode and the phone
connects by address, without background wake.

## 3. Install the phone app

Requires iOS 16.4 or later.

### App Store / TestFlight

Install from the App Store listing, or join the TestFlight build. Nothing else to do.

### Direct IPA

1. Download `OpenCodeInformer-<version>-unsigned.ipa` from the
   [latest app release](https://github.com/sithartha/opencode-informer/releases/latest).
2. Optionally verify it against the release's `SHA256SUMS`:

   ```bash
   shasum -a 256 -c SHA256SUMS
   ```

3. Install with [Sideloadly](https://sideloadly.io) or [AltStore](https://altstore.io)
   using your own Apple ID.
4. On the phone, open **Settings → General → VPN & Device Management** and trust your
   developer certificate.
5. Launch the app.

Notes specific to this build:

- The IPA carries a development `aps-environment` entitlement it does not use (the app
  only raises local notifications). Sideloading tools strip or re-sign it; that is
  expected.
- A free Apple ID signature expires after **7 days**. Re-sign and re-install to keep the
  app working. A paid developer account extends that to a year.
- Re-installing keeps the app's stored pairing token unless you delete the app.

You can try the app without a Mac: the first-run screen offers a **Demo** with sample
sessions.

## 4. Pair

1. Phone and Mac on the same Wi-Fi, Bluetooth on.
2. Open the app; it discovers the helper and shows the Mac.
3. Send the pairing request. The device name is the phone's system name — edit it in the
   app if you want a clearer approval prompt.
4. Approve on the Mac: **OpenCode Informer** menu-bar item on macOS, or the local
   approval page / terminal prompt (`y`/`n`) on Linux and Windows.
5. The app stores the token and reconnects automatically next time.

## 5. Verify

- The dashboard lists active OpenCode sessions and the agent count.
- Trigger a permission or question in OpenCode; the phone shows it in the app and as a
  notification.
- Approve from the phone; OpenCode continues.
- Lock the phone: the Live Activity shows the aggregate state (disable it in Settings if
  you do not want it).

## Troubleshooting

| Symptom | Fix |
|---|---|
| App finds no Mac | Same Wi-Fi? Bluetooth on? Helper running and showing a rendezvous address? |
| Pairing prompt never appears | Open the helper menu (macOS) or the approval page at `http://127.0.0.1:38964/` (Linux/Windows) |
| App connects but shows nothing | Plugin not loaded — restart OpenCode and check `~/.config/opencode/plugins/open-island-mobile.js` points at an existing file |
| No notifications when locked | Allow notifications for the app; keep the helper running. iOS force-quit stops BLE wake until the app is reopened |
| Live Activity stays stale | Expected between wakes; it refreshes on the next BLE wake or app foreground |
| Helper cannot advertise | Many desktop adapters lack LE advertising. It falls back to LAN-only; background wake is unavailable |
| Install fails below iOS 16.4 | The app's deployment target is 16.4; update iOS or use a newer device |

More detail: [plugin](../plugin/README.md), [macOS helper](../mac-helper/README.md),
[cross-platform helper](../helper/README.md).
