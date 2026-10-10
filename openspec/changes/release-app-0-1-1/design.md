# Design

## Context

See `proposal.md` for motivation. Relevant current state:

- The app version lives in `app/app.json` (`expo.version` = `0.1.0`, `ios.buildNumber` = `1`) and is
  also shown as a literal in `app/App.tsx` (the About section). `app/eas.json` sets
  `cli.appVersionSource: remote`, so EAS manages the build number server-side; only the marketing
  version is bumped locally.
- `app/eas.json` has a `production` build profile (with `autoIncrement: true`) and a `submit`
  profile (`ios.appleId` `psitharta@gmail.com`, `ascAppId` `6819440186`, `appleTeamId`
  `6R3Q9WJ93G`). Earlier this session `eas build -p ios --profile production` succeeded and produced
  an `.ipa`, so the EAS build credentials are in place.
- `mac-helper/scripts/release-helper.sh` shows the project's credential convention: notarization
  uses an app-specific password at `~/.config/opencode/asc-app-password`, with `appleId`
  `psitharta@gmail.com` and team `6R3Q9WJ93G`. The same App Store Connect account is what
  `eas submit` targets.
- `docs/release-checklist.md` documents the App Store Connect steps and currently references
  0.1.0.
- Git: `origin` is `github.com/sithartha/opencode-informer`, branch `main`; the theme + Live Activity
  work is uncommitted (about two dozen files plus new assets and two archived OpenSpec changes).
  The repo tags only helper releases (`helper-v0.x.0`), not app builds.

## Goals / Non-Goals

**Goals:**
- Ship **0.1.1** to TestFlight and commit the work to GitHub.

**Non-Goals:**
- No App Store (public) submission or review; TestFlight is the distribution target.
- No release of the plugin or the helpers — nothing there changed.
- No spec changes (this is versioning/tooling).

## Decisions

**1. Bump the marketing version only.** Set `expo.version` to `0.1.1` and update the About label in
`App.tsx`. Leave `ios.buildNumber` to EAS (`appVersionSource: remote`); manually editing the build
number would desync the app and the Live Activity extension (a past commit reverted exactly that).

**2. Build and submit with EAS.** Reuse the working path: `eas build -p ios --profile production`
then `eas submit -p ios` to App Store Connect, which distributes through TestFlight. A fresh build
is required because the version and code changed; the previously built `.ipa` predates the bump.

**3. Submit authentication.** `eas submit` uses the `appleId`/`ascAppId` in `eas.json`. If EAS asks
for the App Store Connect app-specific password, use the project's convention file
(`~/.config/opencode/asc-app-password`), the same credential `release-helper.sh` uses. Alternative:
an App Store Connect API key stored in EAS credentials. The exact mechanism is confirmed at apply
time; the credential source is not a secret stored in the repo.

**4. Commit everything pending, then push `main`.** Commit before building so the released code is
exactly what is on GitHub. One descriptive commit (the theme work and the Live Activity fix), plus
the OpenSpec artifacts and archived changes. Do not tag the app release (no app-tag convention);
helper releases are tagged separately if/when produced.

**5. Skip other components.** Only `app/**` changed; `plugin/`, `mac-helper/`, and `helper/` are
untouched, so no helper release or CI bin is needed. Note this in the final summary rather than
producing empty releases.

**6. Temporary theme gate for the TestFlight build.** Add a build-time flag (e.g. `THEMES_ENABLED`
in `app/src/theme.ts`, set to `false` for this release) that (a) forces the resolved theme to the
Default skin/option in `App.tsx` and (b) hides the theme list and the variant control in Settings.
The other skin definitions and their assets stay in the code — only the UI entry point is gated —
so re-enabling is flipping the flag, with no other change. This is a rollout gate, not a product
change, so it is documented here and in the tasks rather than as a spec delta (the change keeps
`skip_specs: true`).

## Risks / Trade-offs

- **`eas submit` needs an interactive credential on first use** → if the stored app-specific
  password is missing, the apply step pauses and asks for it (source: the convention file).
- **TestFlight processing is asynchronous** → the build appears after Apple finishes processing;
  the apply step confirms it on the device rather than blocking.
- **A large mixed commit** → use a clear message describing the theme + Live Activity work; the
  release change is small and related.
- **Committing before a failed build** → acceptable: the version bump and work are still valid; the
  build can be retried without touching git.

## Open Questions

- Whether to also create a git tag for the app release (e.g., `app-v0.1.1`) — not done unless asked;
  it does not change the specs or tasks.
