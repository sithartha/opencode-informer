# Notes for Reviewers — OpenCode Informer

Paste this into App Store Connect → your app → App Review Information → **Notes**
(and keep the contact info accurate).

## What the app does

OpenCode Informer is a companion app for **OpenCode**, an open-source coding-agent CLI
that developers run on their own Mac. The phone mirrors the agent sessions running in
OpenCode on the Mac, shows each session's status and activity, lets the user
approve/deny permission requests and answer questions, and start/stop/close agent
sessions. Everything is local: the phone talks to the Mac over the **same Wi-Fi** and a
**Bluetooth Low Energy** wake channel. There is **no account and no server**.

## Important: it works together with a Mac companion (not on the App Store)

The app is a remote control for OpenCode running on the reviewer's own Mac. It needs the
free OpenCode CLI plus a small companion (an OpenCode plugin and a macOS menu-bar helper)
running on that Mac, on the same network. Without the Mac there is nothing for the app to
connect to.

So that you can evaluate the app **without a Mac**, it includes a fully local Demo:

1. Open the app; in the empty state tap **"Try demo"**, or go to **Settings → Try the demo**.
2. The demo shows sample agent sessions and lets you exercise every control: approve/deny a
   permission, answer a question (options and free text), start a new session, stop a
   running session, close a session, switch the agent/mode and model, and tap links in a
   message. All demo data is local and requires no network.

## Why these permissions are requested

- **Local Network** (`NSLocalNetworkUsageDescription`) — to reach OpenCode on your Mac over
  Wi-Fi and exchange activity and approvals.
- **Bluetooth** (`NSBluetoothAlwaysUsageDescription`) with **Background Modes → Uses
  Bluetooth LE accessories** — to receive a short wake signal from the Mac when an agent
  needs attention, including while the phone is locked. Bluetooth is used only for this
  wake signal; it is not used for tracking or advertising.
- **Notifications** — to alert you when an agent needs approval/answer or finishes a task.
  Notification actions are handled locally.

The app does **not** use the camera, microphone, location, contacts, photos, or tracking.

## Privacy

The app collects no personal data and sends nothing to the developer or to any third party.
The pairing token is stored in the device Keychain; a user-editable device name and app
settings are stored locally. See the privacy policy:
**https://sithartha.github.io/opencode-informer/privacy-policy.html**.

## Contact

Name: Anton Budnik
Email: gsithartha@gmail.com
