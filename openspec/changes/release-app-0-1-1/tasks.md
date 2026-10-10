# Tasks

## 1. Version bump

- [x] 1.1 In `app/app.json`, set `expo.version` to `0.1.1` (leave `ios.buildNumber` to EAS's remote
  version source), and update the About version string in `app/App.tsx`. Verify: `grep -n 0.1.1
  app/app.json app/App.tsx` shows both, and `cd app && npm run typecheck` passes.
- [x] 1.2 Update the version references in `docs/release-checklist.md` (0.1.0 → 0.1.1). Verify: the
  doc references 0.1.1 and no longer 0.1.0.

## 2. Theme gate for the TestFlight build

- [x] 2.1 Add a `THEMES_ENABLED` flag (in `app/src/theme.ts`, set to `false` for this release) and
  in `app/App.tsx` force the resolved theme to the Default skin/option and hide the theme list and
  the variant control in Settings when it is off; leave the other skin definitions and assets in
  place so re-enabling is flipping the flag. Verify: with the flag off, the Settings screen shows no
  theme picker and the UI is the Default look; `cd app && npm run typecheck` and
  `npm run test:components` pass.

## 3. Commit and push

- [x] 3.1 Stage and commit all pending work (the theme + Live Activity changes, their tests and
  assets, the OpenSpec spec updates and archived changes, and this release change) with a descriptive
  message. Verify: `git status --short` is clean.
- [x] 3.2 Push `main` to `origin` (github.com/sithartha/opencode-informer). Verify: `git log
  --oneline origin/main -1` matches the new commit.

## 4. Build and TestFlight

- [ ] 4.1 Build the iOS app: `cd app && npx eas-cli build -p ios --profile production
  --non-interactive`. Verify: the build finishes and produces an `.ipa`.
- [ ] 4.2 Submit to App Store Connect: `cd app && npx eas-cli submit -p ios --latest`. If EAS asks
  for the App Store Connect credential, use the app-specific password from
  `~/.config/opencode/asc-app-password` (the project's convention). Verify: the submission is
  accepted by App Store Connect.
- [ ] 4.3 Confirm testability: the 0.1.1 build appears in TestFlight (after Apple processing) and
  installs on the phone. Verify: TestFlight lists 0.1.1, or report the processing state.

## 5. Other components

- [ ] 5.1 Cross-platform helper: run the `helper` workflow (dispatch on `main`), download the
  Linux/Windows/macOS artifacts, and create the `helper-v0.5.0` GitHub Release with the binaries
  (unsigned). Verify: the release exists with the three artifacts.
- [ ] 5.2 macOS helper: bump `mac-helper/Resources/Info.plist` to 0.4.3, run
  `mac-helper/scripts/release-helper.sh` (Developer ID sign + notarize), and attach the `.dmg` to a
  GitHub Release. Verify: the release exists with the notarized dmg.
- [ ] 5.3 Commit the version bumps (mac-helper 0.4.3, any helper docs) and push `main`. Verify:
  `git status` clean and `origin/main` matches.
