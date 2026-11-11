# Proposal

## Why

The app currently reaches users only through TestFlight/App Store review, so there is no way to install it while review is pending, and no public, agent-friendly path for setting up the three-part system (app + OpenCode plugin + helper). Users must read four separate READMEs and guess which component versions work together.

## What Changes

- Publish an **unsigned IPA** for the latest app version as a GitHub Release asset with tag `app-vX.Y.Z`, so anyone can sideload it with Sideloadly/AltStore without App Store review.
- Mark that release as the repository's **latest** release and document the sideload steps (Apple ID re-sign, 7-day free-account limit, re-install on expiry).
- Add a **compatibility table** to the published docs mapping each IPA/app version to the compatible plugin, macOS helper, cross-platform helper, minimum iOS version, and verification status.
- Create an **Agent Skill** (`opencode-informer-setup`) that installs and configures the app, plugin, and helpers end to end, packaged for the Agensi marketplace.
- Publish that skill as a **free** Agensi listing: skill zip, listing copy, tags, and a submission runbook covering the 8-point security scan and manual review.
- Keep `*.ipa` out of git (already ignored) and document release-asset upload via the GitHub API, since `gh` is not logged in on this machine.

**BREAKING**: none. This adds a distribution channel; TestFlight/App Store remain unchanged.

## Capabilities

### New Capabilities

- `app-distribution`: direct IPA releases on GitHub (unsigned build, latest release, release notes, sideload instructions) and the published compatibility matrix that ties app versions to component versions.
- `setup-skill`: a portable SKILL.md that installs and configures OpenCode Informer on macOS/Linux/Windows, its Agensi packaging, and the free-listing submission process.

### Modified Capabilities

<!-- No existing requirement changes: the bridge, app behavior, BLE contract, Live Activity, and helper platforms keep their current requirements. -->

## Impact

- **New files**: `skills/opencode-informer-setup/` (SKILL.md + references), `docs/compatibility.md`, `docs/install.md` (sideload + setup entry point), `docs/agensi-listing.md`, `scripts/package-skill.sh`, `scripts/release-ipa.sh`.
- **Modified docs**: `README.md` (install/download links), `docs/index.md` (compatibility + sideload links), `docs/release-checklist.md` (IPA + skill + compatibility row per release).
- **Release process**: new tag family `app-vX.Y.Z` with asset `OpenCodeInformer-X.Y.Z-unsigned.ipa`; helper releases keep `helper-vX.Y.Z` and `helper-crossplatform-vX.Y.Z`.
- **External**: GitHub Releases (public), Agensi Creator Dashboard (account + manual review). No app code, contract, or plugin behavior changes.
- **Constraints**: no App Store review dependency for sideloading; unsigned IPA requires the user to re-sign with their own Apple ID; Agensi listing requires the owner's account and clears the automated security scan.
