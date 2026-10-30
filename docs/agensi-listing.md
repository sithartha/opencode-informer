# Agensi listing — OpenCode Informer Setup

Marketplace copy and submission runbook for `skills/opencode-informer-setup/`.
Agensi pricing: free listing, no payout setup required.

- Package: `dist/agensi/opencode-informer-setup.zip` (`./scripts/package-skill.sh`)
- Repository: <https://github.com/sithartha/opencode-informer>
- Latest app release: <https://github.com/sithartha/opencode-informer/releases/latest>

## Listing fields

**Title**

```
OpenCode Informer Setup
```

**Short description (≤160 characters)**

```
Installs and pairs OpenCode Informer: the iPhone app, the OpenCode plugin, and the macOS/Linux/Windows helper, with version checks and no server.
```

**Long description**

```
OpenCode Informer mirrors your OpenCode coding agents to an iPhone over your own Wi-Fi and Bluetooth — no account, no cloud, no server. This skill takes an agent from "nothing installed" to "the phone shows live agent activity".

What it does:
• Detects the host OS and any existing installation
• Picks plugin and helper versions from the published compatibility table instead of guessing
• Installs the OpenCode plugin and writes the loader OpenCode expects
• Installs the macOS menu-bar helper, or the Linux/Windows headless helper
• Installs the iPhone app through the App Store or a sideloaded IPA, with the trade-offs of each
• Walks through pairing approval and verifies the bridge, the helper, and a first live session
• Reports the installed versions and refuses to claim an unverified combination works

Good for:
• Developers running OpenCode on a Mac, Linux, or Windows machine who want approvals and questions on their phone
• Anyone who tried to assemble the app, plugin, and helper from separate READMEs and got stuck on versions or pairing
• Agents that need a repeatable, checkable setup procedure instead of ad-hoc commands

Requirements:
• iPhone on iOS 16.4 or later
• OpenCode installed on the computer
• macOS 14+, or Linux/Windows with a Bluetooth adapter (LAN-only mode works without BLE advertising)
• Phone and computer on the same local network

Safety:
• Downloads only from this project's official GitHub releases, to a file, with SHA-256 verification when the release publishes checksums
• Never reads or transmits pairing tokens, Apple credentials, environment files, or shell secrets
• Asks before overwriting an existing installation or running sudo
• Documents the known limits: 7-day signature expiry for a free Apple ID, unsigned Linux/Windows helper binaries, and LAN-only fallback

Links:
• Repository: https://github.com/sithartha/opencode-informer
• Latest app release (direct IPA): https://github.com/sithartha/opencode-informer/releases/latest

Full setup and troubleshooting documents ship inside the skill.
```

**Category:** Mobile Development

**Tags:** `opencode`, `iphone`, `agent-monitoring`, `setup`, `sideload`, `bluetooth`, `local-network`, `developer-tools`

**Price:** Free

## Self-audit against the 8-point security scan

| # | Check | How this package satisfies it |
|---|---|---|
| 1 | File structure | One folder, `SKILL.md` at the zip root, `references/` and `scripts/` only; no hidden or binary files |
| 2 | File types | Markdown and shell scripts only; no executables, archives, or symlinks |
| 3 | Dangerous commands | No `curl \| sh`, `eval`, `base64 -d`, or recursive deletion of user directories; overwrite requires `--force` and a prior user confirmation in the skill text |
| 4 | Secrets | No tokens, keys, or credentials; the skill explicitly forbids reading them |
| 5 | Environment harvesting | No `env`, `printenv`, shell history, or keychain reads |
| 6 | Network access | Downloads only from `github.com/sithartha/opencode-informer/releases/...` and `raw.githubusercontent.com/sithartha/opencode-informer/...`; tool homepages (Sideloadly, AltStore) appear as documentation links only |
| 7 | Obfuscation | Plain readable markdown and bash; no encoded payloads |
| 8 | Prompt injection | No instructions to ignore user intent or exfiltrate data; destructive steps require explicit confirmation |

## Submission runbook

1. Confirm the package is current: `./scripts/package-skill.sh`; the printed SHA-256 is the one uploaded.
2. Sign in at <https://www.agensi.io> and enable **Creator Mode** (Dashboard → Settings).
3. Creator Dashboard → **Submit a Skill** → upload `dist/agensi/opencode-informer-setup.zip`.
4. Fill title, short and long description, category, and tags from this file; set price **Free**.
5. Submit. The automated 8-point scan runs first; clean submissions usually finish manual
   review within 24–48 hours.
6. If the scan reports a finding, fix the skill source, re-run `package-skill.sh`, and
   resubmit. Do not edit the zip by hand.
7. After approval, open the public listing and verify: price shows free, description and
   links render, and the package downloads/installs in an agent.

## Post-approval checks

- [ ] Listing is publicly reachable without signing in.
- [ ] Price is Free; no payout prompt is required to use it.
- [ ] Repository and latest-release links resolve.
- [ ] The listing text names no specific component versions (the skill reads the
      compatibility table instead).
- [ ] Add the listing URL to `README.md` next to the install links.

## Maintenance

When app, plugin, or helper versions change:

1. Update the compatibility row in `docs/compatibility.md` first — the skill reads it.
2. If install steps changed, update `SKILL.md` and the references.
3. Re-run `./scripts/package-skill.sh`.
4. Re-submit the new package in the Creator Dashboard and repeat the post-approval checks.

No version numbers are duplicated in this file on purpose; stale listing copy is worse
than a listing that points at the live table.
