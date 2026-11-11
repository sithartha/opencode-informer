# Design

## Context

See `proposal.md` — Why.

Current state that shapes the approach:

- The app is Expo SDK 57 / RN 0.86.3, iOS deployment target 16.4, version `0.1.2`, build `23` (`app/app.json`). `app/ios/` is generated and gitignored; a working Release build already exists locally and `CODE_SIGNING_ALLOWED=NO` builds are an established practice in `app/README.md`.
- The phone app depends on three separately versioned pieces: `plugin/` (Node, version `0.1.0`, not published anywhere), `mac-helper/` (Swift menu-bar app, `0.4.4`, signed/notarized `.dmg`), and `helper/` (Rust, `0.2.2`, unsigned binaries).
- Releases are created through the GitHub REST API; `gh` is installed but not authenticated (`AGENTS.local.md` keeps a token at `~/.config/opencode/gh-token`). Existing tag families are `helper-vX.Y.Z` and `helper-crossplatform-vX.Y.Z`. There is no app release tag yet.
- `*.ipa` is already gitignored, and `docs/` is the published documentation source (privacy policy is served from GitHub Pages).
- The plugin entry imports `./src/bridge.js`, so installing only the entry file does not work; the whole module graph must be placed together.
- Agensi accepts a zip whose root contains `SKILL.md`; `name` must match the containing folder name, and every listing passes an automated 8-point scan before manual review.

## Goals / Non-Goals

**Goals:**

- One command builds an unsigned IPA; one command publishes it with checksums and a filled release template.
- A compatibility table that is cheap to maintain, with exactly one canonical copy.
- A skill that a user can give to any agent and get from "nothing installed" to "phone shows live activity", with version choices taken from the table.
- A package + listing copy that can be submitted to Agensi unchanged and passes the security scan on the first attempt.

**Non-Goals:**

- CI-built IPAs, automated Agensi submission, or notarizing the IPA (Apple does not notarize iOS apps).
- Publishing the plugin to npm, or changing plugin/helper behavior.
- Supporting jailbroken devices, enterprise distribution, or ad-hoc UDID provisioning as a first-class channel.
- Replacing TestFlight/App Store release steps.

## Decisions

### 1. Release taxonomy: `app-v*` is the only "latest"

New tag `app-v<version>`; the release is created with `--latest`. Helper releases keep their existing tags and are created with `--latest=false` so the repository's Latest badge always resolves to the newest installable app.

Assets on an app release:

| Asset | Purpose |
|---|---|
| `OpenCodeInformer-<version>-unsigned.ipa` | Sideload build |
| `open-island-mobile-plugin-<plugin-version>.zip` | Plugin module graph, so the skill is not tied to a git checkout |
| `SHA256SUMS` | Checksums for both |

Rationale: the phone and plugin form one user-facing unit; bundling the plugin zip with the IPA removes a second network fetch and makes "install the pair" atomic. Helpers stay independent because they release on their own cadence and platforms.

Alternative considered: a single mega-release with all helpers attached. Rejected — it forces re-uploading helper binaries on every app release and breaks the existing `helper-v*` links.

### 2. Unsigned IPA is archived with signing disabled and zipped from the archive

`scripts/release-ipa.sh`:

1. Read `version` and `ios.buildNumber` from `app/app.json`; refuse if they disagree with `package.json`.
2. Prebuild `app/ios` on every run (`npx expo prebuild -p ios`, idempotent) so the generated `Info.plist` version/build match `app.json`; `SKIP_PREBUILD=1` opts out for debugging.
3. `xcodebuild archive` for `generic/platform=iOS` in `Release` with `CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO`.
4. Copy `Products/Applications/OpenCodeInformer.app` into `Payload/` and zip with `ditto -c -k --sequesterRsrc --keepParent`, preserving the `LiveActivity.appex` nested bundle.
5. Emit the IPA plus `SHA256SUMS` into `dist/ipa/`.

No `-exportArchive` step: export requires a signing identity and would produce a signed IPA. If archive fails while embedding the extension, fall back to `xcodebuild build -sdk iphoneos` and assemble `Payload/` by hand — recorded as a task check rather than a second code path.

Sideloaders re-sign nested bundles themselves. The app's only entitlement is `aps-environment: development`, and the app does not use remote push, so stripping it during re-sign is harmless. This is stated in the install doc so a user does not chase a ghost.

### 3. One canonical compatibility table, updated in the release commit

`docs/compatibility.md` is the single source. Columns:

| App / IPA | Build | Min iOS | Plugin | macOS helper | Cross-platform helper | Verified | Notes |
|---|---|---|---|---|---|---|---|

- Every app release commit adds a row; the release template embeds that row's markdown.
- `Verified` has three honest values: `yes` (end-to-end on a device), `partial` (build launches, not fully exercised), `no`.
- Versions for historical rows are reconstructed from `app.json`, `plugin/package.json`, `mac-helper/Resources/Info.plist`, `helper/Cargo.toml`, and git history; when a value cannot be established it is written as `unknown`, never guessed.
- `README.md` and `docs/index.md` each get one link to the table and one to the latest app release. The skill reads this file (raw URL fallback) instead of duplicating version data.

Rationale: a generated table (JSON + generator) would add a build step and a second artifact for a table that changes once per release. Markdown is reviewable in the same diff as the version bump.

Alternative considered: putting compatibility in the release notes only. Rejected — it is not linkable or comparable across versions.

### 4. Install documentation is a single page with two channels

`docs/install.md` covers: choose channel (App Store/TestFlight vs sideloaded IPA) → install plugin → install helper for the host OS → install app → pair → verify. It links to the compatibility table for version selection, and to per-OS detail in `helper/` and `mac-helper/` READMEs instead of copying them.

Sideload specifics documented: Sideloadly and AltStore paths, "Trust Developer" step, 7-day free-account expiry and re-sign loop, 1-year paid-account option, and the Demo mode as a no-Mac smoke test.

### 5. Skill layout and install mechanics

```
skills/opencode-informer-setup/
├── SKILL.md                 # name: opencode-informer-setup
├── references/
│   ├── macos.md             # menu-bar helper, permissions, launch at login
│   ├── linux-windows.md     # binary helper, BLE advertising limits, headless approval
│   ├── sideload.md          # IPA channel details
│   └── troubleshooting.md   # known failure modes from the READMEs
└── scripts/
    ├── install-plugin.sh    # unzip plugin asset, write loader, verify imports
    └── check-setup.sh       # GET /status, versions, pairing state
```

- Frontmatter uses only `name` and `description` (portable across agents); triggers name OpenCode Informer, iPhone/sideload, pairing, helper, and "agent notifications".
- The body is numbered phases with explicit stop conditions: detect OS → check existing installs → read the compatibility row → install plugin → install helper → install app (channel choice) → pair → verify. Every overwrite or `sudo` step asks first.
- Plugin install avoids relying on whether OpenCode loads subdirectories: unzip the asset into `~/.config/opencode/open-island-mobile-plugin/` and write a one-line loader at `~/.config/opencode/plugins/open-island-mobile.js` that re-exports the entry. The loader path is verified during implementation.
- Network access is limited to `github.com/sithartha/opencode-informer/releases/...` and `raw.githubusercontent.com/.../docs/compatibility.md`, downloaded to a file first (`curl -fL -o`) — never piped to `sh` — which is also what keeps the Agensi scan clean.

### 6. Skill packaging and submission

`scripts/package-skill.sh` validates the frontmatter (`name` matches folder, kebab-case, description non-empty, no forbidden fields), then zips the *contents* of the skill folder so `SKILL.md` sits at the archive root, and writes `dist/agensi/opencode-informer-setup.zip` with a SHA-256.

`docs/agensi-listing.md` holds the listing fields (title, short and long description, category `Mobile Development`, tags, price `Free`), the self-audit against the 8 scan points (structure, file types, dangerous commands, secrets, env harvesting, network, obfuscation, prompt injection), and the submission runbook (Creator Mode, upload, review, post-approval checks). Submission itself is a manual dashboard action; the repo produces everything the upload needs.

Rationale: Agensi exposes no publishing API for creators, so the reproducible part is the package and the copy, not the click.

### 7. Version bump discipline

An app release now touches: `app/app.json` version, `app/App.tsx` About string, `plugin/package.json` when the plugin changed, `docs/compatibility.md` row, then tag and assets. The plugin zip asset name embeds its own version, so a plugin-only change still requires a new app release to be downloadable through the skill; this is documented rather than solved with a separate plugin tag.

## Risks / Trade-offs

- **[Re-signing fails on the Live Activity extension]** → Verify with an actual Sideloadly install before publishing; keep the archive command in the runbook so a build without the extension can be produced if a tool cannot re-sign nested bundles.
- **[Sideloaded build dies after 7 days on a free Apple ID]** → Disclosed on the install page, in release notes, and in the skill; paid-account option documented.
- **[Unsigned helper binaries trigger Gatekeeper/SmartScreen]** → Skill explains the prompt and links to checksums; no instructions to disable security features globally.
- **[Compatibility table drifts from reality]** → Row is part of the release commit; `Verified` must be honest; release template embeds the row so a missing update is visible.
- **[Helper releases steal the Latest badge]** → All helper releases pass `--latest=false`; release runbook includes a post-check of the Latest tag.
- **[Agensi rejects sideload-oriented content]** → Wording frames the IPA as a free, developer-facing install path alongside the App Store; no circumvention of paid content is involved.
- **[Security scan flags download-and-execute]** → Local scripts download to a file, verify checksums where available, and never pipe remote content into a shell.
- **[Docs duplication]** → Install page links to component READMEs instead of restating build steps; compatibility lives only in `docs/compatibility.md`.
- **[Plugin version is not independently discoverable]** → Accepted for now; the plugin version is surfaced in the release asset name, compatibility table, and skill output.

## Migration Plan

1. Land docs + skill + scripts with no behavior change to app, plugin, or helpers.
2. Build the IPA, create `app-v0.1.2` with `--latest`, upload IPA, plugin zip, `SHA256SUMS`.
3. Submit the skill zip as a free Agensi listing; after approval, add the listing link to `README.md`.
4. Rollback: delete the app release or mark the previous app release `--latest`; delete the Agensi listing. No installed app or helper is affected.

## Open Questions

- Whether the owner's Agensi account is already in Creator Mode with payouts irrelevant for a free listing — resolved at submission time; it does not change the package or the task breakdown.
- Exact historical plugin/helper versions for app 0.1.1 — reconstructed from git history during implementation; missing values are recorded as `unknown`.
