# Compatibility

Which app, plugin, and helper versions work together. One row per released app
version; the newest row is the current recommendation.

| App / IPA | Build | Min iOS | Plugin | macOS helper | Cross-platform helper | Verified | Notes |
|---|---|---|---|---|---|---|---|
| 0.1.2 | 23 | 16.4 | 0.1.0 | 0.4.4 | 0.2.2 | partial | Current release. Built and launched locally; the published IPA has not yet been sideloaded end to end. |
| 0.1.1 | unknown (EAS-managed) | 16.4 | 0.1.0 | 0.4.3 | 0.2.0 | no | App Store release. Not re-tested against this install path. |

`Verified` means:

- `yes` — installed through the documented channel and exercised end to end
  (pairing, live activity, one approval round trip) on a physical phone.
- `partial` — build launches and connects, but the full flow was not exercised.
- `no` — never exercised with this combination.

`unknown` means the value could not be established from the repository; it is not a
guess.

## Platform requirements

| Component | Requirement |
|---|---|
| iPhone app | iOS 16.4 or later (Live Activity needs 16.1+; the app's deployment target is 16.4) |
| macOS helper | macOS 14 or later, Bluetooth on |
| Cross-platform helper | Linux with BlueZ 5.43+ and an adapter that supports LE advertising, or Windows 10 1803+ |
| Phone ↔ Mac network | Same local network; the plugin listens on port `38963`, the helper on loopback `38964` |
| OpenCode CLI | A version with the plugin API the plugin is built against; OpenCode v2.x is the tested line |

## Choosing versions

1. Find your app version in the table.
2. Install the plugin, macOS helper, or cross-platform helper version from that row —
   not necessarily the newest release of each.
3. If your app version is missing, use the newest row and treat it as unverified, or
   update the app.

The compatibility table is updated in the same commit as every app release. The
install steps are in [Install](./install.md); the direct-download channel is described
there and on the [latest app release](https://github.com/sithartha/opencode-informer/releases/latest).
