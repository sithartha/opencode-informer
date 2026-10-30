# Release the IPA (no App Store)

Direct-download releases live on GitHub Releases, tagged `app-v<version>`, and are the
only releases marked **Latest**. Helper releases stay independent and are created with
`--latest=false`, so the repository's Latest badge always points at the newest
installable app.

Full checklist: [release-checklist.md](./release-checklist.md). Component versions:
[compatibility.md](./compatibility.md).

## 1. Bump and document

1. Bump `app/app.json` (`expo.version`) and the About string in `app/App.tsx`.
2. Keep `app/package.json` `version` equal to `expo.version` — the build script refuses a
   mismatch.
3. Add the compatibility row for the new version to `docs/compatibility.md`. Set
   `Verified` honestly (`yes` / `partial` / `no`) and write `unknown` for values you
   cannot establish.
4. If the plugin changed, bump `plugin/package.json` before packaging.

## 2. Build

```bash
./scripts/release-ipa.sh
```

This prebuilds `app/ios`, archives `Release` for `generic/platform=iOS` with signing
disabled, verifies the archived version/build against `app.json`, checks the Live
Activity extension is embedded, and refuses a signed archive. It then packages the
plugin and writes:

```
dist/ipa/OpenCodeInformer-<version>-unsigned.ipa
dist/ipa/open-island-mobile-plugin-<plugin-version>.zip
dist/ipa/SHA256SUMS
dist/ipa/RELEASE_NOTES.md
```

`SKIP_PREBUILD=1 ./scripts/release-ipa.sh` reuses the existing `app/ios` for debugging;
the version check still runs and will fail if the generated project is stale.

If `xcodebuild archive` cannot embed the Live Activity extension, the script stops and
points to `dist/ipa/xcodebuild-archive.log`. Fallback: `xcodebuild build -sdk iphoneos`
with the same signing flags and assemble `Payload/OpenCodeInformer.app` by hand — the
result must keep `PlugIns/LiveActivity.appex` and stay unsigned.

## 3. Release body template

`dist/ipa/RELEASE_NOTES.md` is generated and already contains the version, build, the
compatibility row, install steps, and checksums. Do not hand-write a second template;
edit the generated file only to add release-specific notes (known issues, changes).

## 4. Publish

`gh` is not logged in on this machine; use the token file without printing it:

```bash
cd /Users/sith/Documents/open-island-iphone-app
export GH_TOKEN="$(cat ~/.config/opencode/gh-token)"

APP_VERSION=0.1.2
PLUGIN_VERSION=0.1.0

gh release create "app-v$APP_VERSION" \
  "dist/ipa/OpenCodeInformer-$APP_VERSION-unsigned.ipa" \
  "dist/ipa/open-island-mobile-plugin-$PLUGIN_VERSION.zip" \
  "dist/ipa/SHA256SUMS" \
  --title "OpenCode Informer $APP_VERSION" \
  --notes-file dist/ipa/RELEASE_NOTES.md \
  --latest
```

Helper releases must not take the Latest badge:

```bash
gh release create helper-vX.Y.Z mac-helper/dist/OpenCodeInformerHelper-X.Y.Z.dmg \
  --title "OpenCode Informer Helper X.Y.Z (macOS)" --notes-file NOTES.md --latest=false

gh release create helper-crossplatform-vX.Y.Z \
  opencode-informer-helper-linux-x86_64 \
  opencode-informer-helper-windows-x86_64.exe \
  opencode-informer-helper-macos-aarch64 \
  --title "OpenCode Informer Helper X.Y.Z (Linux / Windows)" --notes-file NOTES.md --latest=false
```

## 5. Verify

```bash
export GH_TOKEN="$(cat ~/.config/opencode/gh-token)"
gh release view "app-v$APP_VERSION" --json isLatest,name,assets \
  --template '{{.name}} latest={{.isLatest}}{{"\n"}}{{range .assets}}{{.name}}{{"\n"}}{{end}}'

mkdir -p /tmp/oi-release && cd /tmp/oi-release
gh release download "app-v$APP_VERSION" --pattern '*' --dir .
shasum -a 256 -c SHA256SUMS
```

Expected: `latest=true`, three assets, and every checksum `OK`. Then open the
[latest release](https://github.com/sithartha/opencode-informer/releases/latest) and
confirm the install links in `docs/install.md` resolve.

## 6. Sideload check

Before writing `Verified: yes` in the compatibility table, install the downloaded IPA
with Sideloadly or AltStore on a physical phone, pair it, and exercise one approval and
the Live Activity. Record what you actually did.

## Rollback

- Delete the release and recreate it from a previous tag, or
  `gh release edit <older-tag> --latest`.
- The IPA is a release asset only; nothing in the repository needs reverting.
- Installed apps are unaffected by removing a release.
