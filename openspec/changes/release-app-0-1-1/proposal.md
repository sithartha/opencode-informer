# Proposal

## Why

The app last shipped as **0.1.0**. Since then the multi-theme work (Nerv, Cat, The Force, and the
new Tunes / Classic OS themes) and the Live Activity fixes landed only on the local branch — they
are uncommitted and undistributed. The phone has a locally-built Release, but there is no 0.1.1
in TestFlight and the work is not on GitHub. This change versions the app as **0.1.1**, puts it in
TestFlight, and commits the work.

## What Changes

- **Version bump**: `app/app.json` `expo.version` 0.1.0 → **0.1.1**, and the version string shown
  in the app's About section.
- **Theme gate for this build**: ship the TestFlight build with only the **Default** theme — hide
  the other themes and the theme picker (the Appearance theme list and the variant control) behind a
  build-time flag, and force the Default theme. Re-enabling is flipping the flag back.
- **TestFlight**: build the iOS app with EAS (`--profile production`) and submit it to App Store
  Connect (`eas submit -p ios`), so **0.1.1** installs from TestFlight. EAS keeps `appVersionSource:
  remote`, so the build number is managed server-side.
- **Commit + push**: commit the accumulated theme + Live Activity work (app, tests, assets, OpenSpec
  specs and archived changes) together with this release change, and push `main` to
  `github.com/sithartha/opencode-informer`.
- **Other components**: none need a release this time — only the app changed. The plugin is private
  (not published), and the macOS helper (`mac-helper/`) and the cross-platform helper (`helper/`)
  are untouched, so no helper release or bin is produced.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
<!-- none: this is a release/version/tooling change with no spec-level behavior change.
     The change sets `skip_specs: true` in .openspec.yaml. -->

## Impact

- `app/app.json` (version) and `app/App.tsx` (the About version label).
- `app/src/theme.ts` / `app/App.tsx` (the temporary theme gate flag that hides the picker).
- Release tooling: `eas-cli` with the profiles in `app/eas.json`; release credentials per
  `docs/release-checklist.md` (`appleId` `psitharta@gmail.com`, `ascAppId` `6819440186`, team
  `6R3Q9WJ93G`) and the app-specific password convention in `~/.config/opencode/asc-app-password`
  (used by `mac-helper/scripts/release-helper.sh`; reused for `eas submit` if EAS prompts).
- Git: commit all pending `app/**` and `openspec/**` changes and push `main`.
- Docs: `docs/release-checklist.md` version references move to 0.1.1 when building the new version.
