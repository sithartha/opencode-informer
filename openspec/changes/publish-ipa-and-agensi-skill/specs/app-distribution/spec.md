# Spec Delta

## Purpose

Publishes installable app builds outside the App Store — an unsigned IPA on GitHub Releases with sideload instructions — and a published compatibility matrix that ties every published app version to the component versions it works with.

## ADDED Requirements

### Requirement: Direct IPA release

For every app version published outside TestFlight, the project SHALL publish a GitHub Release tagged `app-v<version>` containing an installable IPA built from that version, and that release SHALL be marked as the repository's latest release.

#### Scenario: Latest app release is downloadable
- **WHEN** a user opens the repository's Releases page
- **THEN** the newest app release is marked Latest and exposes a downloadable `.ipa` asset for that version

#### Scenario: Release identifies the exact build
- **WHEN** a user inspects an app release
- **THEN** its title and notes state the app version, the iOS build number, the minimum iOS version, and the asset's SHA-256 checksum

#### Scenario: Release notes carry install steps
- **WHEN** a user reads an app release
- **THEN** the notes link to the sideload instructions and to the compatibility matrix

#### Scenario: No binary in git
- **WHEN** an IPA is published
- **THEN** it exists only as a release asset, and no `.ipa` file is added to the repository

### Requirement: App installs without App Store review

The published IPA SHALL be unsigned and SHALL install on a stock, non-jailbroken iPhone by re-signing it with the user's own Apple ID using a sideloading tool, without App Store review, TestFlight, or a paid developer account.

#### Scenario: Sideload succeeds
- **WHEN** a user sideloads the published IPA with their Apple ID through Sideloadly or AltStore on a supported iOS version
- **THEN** the app installs, launches, and can pair with the Mac exactly as the App Store build does

#### Scenario: Signing lifetime is disclosed
- **WHEN** a user reads the install instructions
- **THEN** they are told that a free Apple ID signature expires after 7 days and that the app must be re-signed and re-installed to keep working

#### Scenario: Unsupported iOS is refused clearly
- **WHEN** a user tries to install on an iOS version below the documented minimum
- **THEN** the install instructions state the minimum version and that the install will fail below it

### Requirement: Published compatibility matrix

The published documentation SHALL contain a compatibility table with one row per released app version, mapping that version to the compatible OpenCode plugin version, macOS helper version, cross-platform helper version, minimum iOS version, and the verification status of that combination.

#### Scenario: Row exists for every released app version
- **WHEN** a new app version is released
- **THEN** the same release commit adds or updates its row in the compatibility table

#### Scenario: User can pick a working combination
- **WHEN** a user has an IPA version and asks which plugin and helper versions to install
- **THEN** the table names those versions and the minimum iOS version for that row

#### Scenario: Verification is stated honestly
- **WHEN** a combination has not been exercised end to end
- **THEN** its row marks it as unverified rather than implying it was tested

#### Scenario: Table is discoverable from the repository
- **WHEN** a user opens the README or the published docs landing page
- **THEN** they can reach the compatibility table and the latest app release in one link each

### Requirement: Install documentation entry point

The project SHALL provide a single install page that covers both distribution channels (App Store/TestFlight and sideloaded IPA) and the order in which the app, plugin, and helper are installed and paired.

#### Scenario: New user follows one page
- **WHEN** a new user wants to install OpenCode Informer
- **THEN** one documented page tells them which channel to choose and what to install before pairing

#### Scenario: Channel differences are explicit
- **WHEN** a user compares the channels
- **THEN** the page states that the App Store build updates automatically while the sideloaded build must be replaced manually and expires on a free Apple ID
