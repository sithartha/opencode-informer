---
name: opencode-informer-setup
description: Installs and configures OpenCode Informer — the iPhone app, the OpenCode plugin, and the macOS/Linux/Windows helper — then pairs the phone and verifies live agent activity. Use when the user asks to install, set up, pair, sideload, upgrade, or troubleshoot OpenCode Informer, its OpenCode plugin, its helper, or phone notifications for OpenCode agents.
---

# OpenCode Informer setup

OpenCode Informer mirrors OpenCode agent sessions to an iPhone over the local network.
It has three parts, all local — there is no server and no account:

| Part | Runs on | What it does |
|---|---|---|
| OpenCode plugin | the computer running OpenCode | serves the LAN bridge on port `38963` |
| Helper | the same computer | BLE doorbell, rendezvous address, pairing approval |
| Phone app | iPhone (iOS 16.4+) | dashboard, notifications, approvals |

Work through the phases in order. Do not skip the version check: the three parts are
released independently and not every combination works.

## Ground rules

- Install only from `https://github.com/sithartha/opencode-informer/releases/...` and
  read reference material only from that repository.
- Never read, print, or transmit pairing tokens, Apple credentials, environment files,
  or shell secrets.
- Ask before overwriting an existing plugin or helper installation, and state exactly
  what will be replaced.
- Ask before any `sudo` command. Prefer the documented non-root path when one exists.
- Download files first (`curl -fL -o`), then unpack or run them. Never pipe a download
  into a shell.
- If a step fails, stop and use `references/troubleshooting.md` instead of improvising.

## Phase 0 — Inspect the machine

1. Identify the OS: `uname -s` → `Darwin` is macOS, `Linux` is Linux. On Windows use
   PowerShell and check `$PSVersionTable`.
2. Confirm OpenCode is installed and note its version: `opencode --version`.
3. Check what already exists:
   - plugin loader: `~/.config/opencode/plugins/open-island-mobile.js`
   - plugin files: `~/.config/opencode/open-island-mobile-plugin/`
   - macOS helper: `/Applications/OpenCode Informer.app`
   - Linux/Windows helper: the binary the user downloaded earlier
4. Report the findings and ask whether to upgrade existing parts or leave them alone.

## Phase 1 — Choose versions

1. Read the compatibility table. If this repository is checked out, read
   `docs/compatibility.md`; otherwise fetch
   `https://raw.githubusercontent.com/sithartha/opencode-informer/main/docs/compatibility.md`.
2. Find the row for the user's app version and take the plugin and helper versions from
   that row. Do not assume the newest helper is correct.
3. If the app version has no row, say so and ask before installing an undocumented
   combination.

## Phase 2 — Install the plugin

Run the bundled script, passing the versions from Phase 1:

```bash
scripts/install-plugin.sh --app-version <app-version> --plugin-version <plugin-version>
```

It downloads `open-island-mobile-plugin-<plugin-version>.zip` from release
`app-v<app-version>`, optionally verifies it against the release's `SHA256SUMS`, unpacks
it to `~/.config/opencode/open-island-mobile-plugin/`, and writes the loader
`~/.config/opencode/plugins/open-island-mobile.js`:

```js
export { default } from "<config>/opencode/open-island-mobile-plugin/open-island-mobile.js"
```

Tell the user to restart OpenCode after this phase. The bridge keeps working without a
helper, so a missing helper is not an error here.

## Phase 3 — Install the helper

### macOS

1. Download `OpenCodeInformerHelper-<helper-version>.dmg` from release
   `helper-v<helper-version>` into `~/Downloads`.
2. Open it and drag **OpenCode Informer** into **Applications**.
3. Launch it and let the user approve the Bluetooth and Local Network prompts.
4. Confirm the menu-bar item appears and shows a rendezvous address (`host:port`).

Details and manual launch-at-login: `references/macos.md`.

### Linux and Windows

1. Download the matching binary from release `helper-crossplatform-v<helper-version>`:
   `opencode-informer-helper-linux-x86_64`, `...-windows-x86_64.exe`, or
   `...-macos-aarch64`.
2. Linux: `chmod +x` the binary. Windows: expect a SmartScreen prompt — the binaries are
   unsigned; verify the release source before continuing.
3. Run it with `--open` so the local approval page opens when pairing is requested:
   `./opencode-informer-helper-linux-x86_64 --open`.
4. If the adapter cannot advertise, the helper falls back to LAN-only; say so, because
   background wake will not work.

Details: `references/linux-windows.md`.

## Phase 4 — Install the app

Ask which channel the user wants:

- **App Store / TestFlight** — automatic updates, Apple-managed signing. Use it when the
  build is available.
- **Direct IPA** — newest build, no review wait, manual updates.

For the direct IPA:

1. Download `OpenCodeInformer-<version>-unsigned.ipa` from the latest app release.
2. Verify it against `SHA256SUMS` from the same release.
3. Sideload with Sideloadly or AltStore using the user's own Apple ID (never ask for the
   password; the tool prompts them).
4. On the phone, trust the developer certificate in
   **Settings → General → VPN & Device Management**.
5. Explain that a free Apple ID signature expires after 7 days and that re-signing is
   required; a paid account lasts a year.

Full wording: `references/sideload.md`.

## Phase 5 — Pair

1. Put the phone and computer on the same Wi-Fi; Bluetooth on.
2. Open the app, let it discover the helper, and send the pairing request. The device
   name defaults to the phone's name and can be edited in the app.
3. Approve locally:
   - macOS: the **OpenCode Informer** menu-bar item.
   - Linux/Windows: the approval page at `http://127.0.0.1:38964/` or `y` in the helper's
     terminal.
4. Confirm the app stores the token and reconnects on its own.

## Phase 6 — Verify

Run the bundled check:

```bash
scripts/check-setup.sh
```

Then confirm with the user:

- the dashboard lists active sessions;
- a permission or question raised in OpenCode appears on the phone;
- approving it from the phone resumes the agent;
- the Live Activity shows the aggregate when the phone is locked (unless disabled).

If anything fails, read `references/troubleshooting.md` before changing configuration.

## Final report

Print a short table of what was installed:

| Part | Version | Location |
|---|---|---|
| App | `<version>` | App Store / sideloaded |
| Plugin | `<version>` | `~/.config/opencode/open-island-mobile-plugin/` |
| Helper | `<version>` | `/Applications` or the binary path |

State which compatibility row was used and whether it is marked verified. Do not claim a
combination works if the table marks it `partial` or `no`.
