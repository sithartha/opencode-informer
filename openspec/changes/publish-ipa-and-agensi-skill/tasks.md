# Tasks

## 1. Compatibility matrix and install docs

- [x] 1.1 Collect the current and historical component versions (app/`app.json`, plugin/`package.json`, `mac-helper/Resources/Info.plist`, `helper/Cargo.toml`, git history) and create `docs/compatibility.md` with the columns from design.md; verify `0.1.2`/build `23` has a row and every unreconstructable value reads `unknown`
- [x] 1.2 Add one link to the compatibility table and one to the latest app release in `README.md` and `docs/index.md`; verify both links resolve in the rendered markdown
- [x] 1.3 Write `docs/install.md` covering channel choice, install order (plugin → helper → app → pair → verify), and sideload specifics (Sideloadly/AltStore, Trust Developer, 7-day expiry, paid-account year, Demo mode); verify every command it shows exists in the component READMEs
- [x] 1.4 Update `docs/release-checklist.md` so an app release includes the IPA, plugin asset, checksums, compatibility row, and skill refresh; verify the checklist names each artifact and its verification step

## 2. Unsigned IPA build and release runbook

- [x] 2.1 Add `scripts/release-ipa.sh` that checks `app/app.json` against `package.json`, prebuilds only when `app/ios` is missing, archives `Release` for `generic/platform=iOS` with signing disabled, zips `Payload/` with `ditto`, and writes the IPA plus `SHA256SUMS` to `dist/ipa/`; verify a run produces both files
- [x] 2.2 Inspect the produced IPA and verify it contains `Payload/OpenCodeInformer.app`, the embedded `LiveActivity.appex`, an `Info.plist` whose version/build match `app.json`, and no `_CodeSignature` (unsigned)
- [x] 2.3 Write `docs/release-ipa.md` with the release body template (version, build, minimum iOS, compatibility row, install link, checksum) and the API commands that read `~/.config/opencode/gh-token`, create `app-v<version>` with `--latest`, upload assets, and create helper releases with `--latest=false`; verify the commands are copy-pasteable with placeholders and no real token is embedded
- [x] 2.4 Confirm the archive path succeeds on this machine; if `xcodebuild archive` cannot embed the Live Activity extension, record the `xcodebuild build -sdk iphoneos` fallback and verify the fallback IPA has the same layout

## 3. Plugin release asset

- [x] 3.1 Add `scripts/package-plugin.sh` that reads `plugin/package.json`, zips the plugin entry, `src/`, `package.json`, and README while excluding `test/` and `node_modules/`, and emits `dist/plugin/open-island-mobile-plugin-<version>.zip`; verify `unzip -l` lists `open-island-mobile.js`, `src/bridge.js`, and `package.json`
- [x] 3.2 Verify the packaged module graph loads: unzip to a temporary directory and `node --input-type=module -e "await import('<tmp>/open-island-mobile.js')"` exits 0
- [x] 3.3 Verify the loader install shape: place the unzipped plugin under a temporary config directory, add a one-line loader that re-exports it, and confirm the import resolves; record the exact loader line in the skill
- [x] 3.4 Extend the release script so `SHA256SUMS` covers both the IPA and the plugin zip; verify the file lists both assets with correct digests (`shasum -a 256 -c`)

## 4. Setup skill

- [x] 4.1 Create `skills/opencode-informer-setup/SKILL.md` with `name`/`description` only, numbered phases from design.md, explicit overwrite/`sudo` confirmations, and a version report at the end; verify the frontmatter parses, `name` equals the folder name, and the description contains install, sideload, pair, helper, and troubleshooting triggers
- [x] 4.2 Add `references/macos.md`, `references/linux-windows.md`, `references/sideload.md`, and `references/troubleshooting.md`; verify each command and permission note matches the corresponding component README or `docs/install.md`
- [x] 4.3 Add `scripts/install-plugin.sh` and `scripts/check-setup.sh` that download release assets to a file, verify checksums when present, install the loader, and probe `GET /status`; verify `bash -n` passes and `check-setup.sh` reports the bridge state on this machine
- [x] 4.4 Audit the skill against the Agensi scan points: no `curl | sh`, no credential or environment-secret reads, no obfuscation, no `sudo` without an explicit prompt; verify a grep for these patterns returns no findings and the only download sources are project releases and raw docs (Sideloadly/AltStore appear as documentation links)

## 5. Agensi package and listing copy

- [x] 5.1 Add `scripts/package-skill.sh` that validates name/folder/kebab-case/description, zips the skill contents with `SKILL.md` at the archive root, and writes `dist/agensi/opencode-informer-setup.zip` with a SHA-256; verify `unzip -l` shows `SKILL.md` at the root and the validation fails on a mismatched name
- [x] 5.2 Write `docs/agensi-listing.md` with title, short and long description, category, tags, price `Free`, the 8-point self-audit, and the submission runbook including post-approval checks; verify it contains the repository and latest-release links and no stale version numbers
- [x] 5.3 Add `dist/` build outputs used here to `.gitignore` if not already covered; verify `git status` shows no IPA, zip, or checksum files after a full local build

## 6. Publish and verify end to end

- [x] 6.1 Build and publish `app-v<version>` with the IPA, plugin zip, and `SHA256SUMS`, marked latest; verify the release API reports it as latest and downloaded assets match the published checksums
- [ ] 6.2 Sideload the published IPA on a device with Sideloadly or AltStore, pair it with a Mac running the skill-installed plugin and helper, and confirm live activity plus an approval round trip; set the compatibility row's `Verified` to `yes`
- [ ] 6.3 Submit the skill zip to Agensi as a free listing, resolve any security-scan findings, and after approval verify the listing is live, free, and links to the repository and latest release; add the listing link to `README.md`
- [x] 6.4 Verify the repository's Latest release is still the app release after any helper release, and that the README and docs landing page links resolve to it
- [x] 6.5 Run `openspec validate --strict`, `cd plugin && npm test`, `cd contract && node --test`, and `cd app && npm test`; verify all pass with no change to existing behavior
