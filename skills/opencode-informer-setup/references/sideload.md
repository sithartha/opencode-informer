# Sideloading the IPA

The direct IPA is for installing without App Store review. It is unsigned and must be
re-signed with the user's Apple ID.

## Requirements

- iPhone on iOS 16.4 or later.
- Sideloadly (<https://sideloadly.io>) or AltStore (<https://altstore.io>).
- An Apple ID. A free account works; a paid developer account is optional.

## Steps

1. Download `OpenCodeInformer-<version>-unsigned.ipa` from the
   [latest app release](https://github.com/sithartha/opencode-informer/releases/latest).
2. Download `SHA256SUMS` from the same release and verify:

   ```bash
   shasum -a 256 -c SHA256SUMS
   ```

   If the IPA line does not read `OK`, delete it and download again.
3. Connect the phone and open Sideloadly (or AltStore). Drop the IPA in, enter the Apple
   ID when the tool asks (the user types it into the tool — never collect it yourself).
4. Start the install and wait for it to finish.
5. On the phone: **Settings → General → VPN & Device Management** → trust the developer
   certificate.
6. Launch OpenCode Informer.

## What to tell the user

- A free Apple ID signature expires after **7 days**. After that the app stops
  launching until it is re-signed and re-installed. A paid developer account extends the
  signature to a year.
- Re-installing over the existing app keeps the stored pairing token; deleting the app
  first removes it and requires pairing again.
- The IPA carries a development `aps-environment` entitlement the app does not use (only
  local notifications are raised). Sideloading tools strip or re-sign it; this is
  expected, not an error.
- Updates are manual: download the new IPA and repeat the steps.
- The built-in **Demo** works without a Mac and is the quickest way to confirm the app
  installed correctly.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Install fails immediately | iOS below 16.4, or the Apple ID already has too many active sideloaded apps — remove one |
| App icon appears but does not launch | The signature expired or the certificate is untrusted; re-sign and trust it again |
| "Unable to Install" during re-install | Delete the previous app on the phone, then install again (pairing will be needed) |
| Live Activity missing | Enable Live Activities for OpenCode Informer in iOS Settings |
| Notifications missing | Allow notifications for the app; Focus modes can suppress them |

Prefer the App Store build when it is available: it updates automatically and does not
expire.
