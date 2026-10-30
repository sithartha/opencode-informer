# Spec Delta

## Purpose

Defines a portable agent skill that installs and configures OpenCode Informer — the phone app, the OpenCode plugin, and the platform helper — and its publication as a free listing on the Agensi skill marketplace.

## ADDED Requirements

### Requirement: Portable skill package

The project SHALL contain an agent skill in the SKILL.md open-standard format, in a folder whose name matches the skill's `name`, with YAML frontmatter containing `name` and `description` and only agent-agnostic fields, and with a body of numbered installation and configuration steps.

#### Scenario: Skill loads in a supporting agent
- **WHEN** the skill folder is installed into an agent that supports SKILL.md
- **THEN** the agent loads it, matches it from the description, and follows its steps without agent-specific configuration

#### Scenario: Name and folder agree
- **WHEN** the package is inspected
- **THEN** the folder name equals the frontmatter `name` and uses only lowercase letters, digits, and hyphens

#### Scenario: Description states triggers
- **WHEN** a user asks to install, set up, pair, or troubleshoot OpenCode Informer
- **THEN** the description's trigger phrases make the agent select this skill

### Requirement: End-to-end setup coverage

The skill SHALL guide the agent through installing the OpenCode plugin, installing the helper appropriate to the host platform, installing the phone app through one of its distribution channels, and completing pairing and a first successful connection.

#### Scenario: macOS host
- **WHEN** the user's OpenCode runs on macOS
- **THEN** the skill installs the menu-bar helper from its signed release and uses the plugin bridge

#### Scenario: Linux or Windows host
- **WHEN** the user's OpenCode runs on Linux or Windows
- **THEN** the skill installs the matching cross-platform helper binary and explains pairing approval for a headless host

#### Scenario: Phone app installation
- **WHEN** the phone app is not installed
- **THEN** the skill offers the App Store channel when available and the sideloaded IPA channel otherwise, with the trade-offs of each

#### Scenario: Verification closes the loop
- **WHEN** all components are installed
- **THEN** the skill verifies the bridge responds, pairing is approved, and the phone shows live agent activity

### Requirement: Version-aware installation

The skill SHALL select component versions from the published compatibility matrix rather than assuming the newest of each component works together, and SHALL report the versions it installed.

#### Scenario: Matching versions are chosen
- **WHEN** the skill installs the plugin and helper for a given app version
- **THEN** it installs the versions that the compatibility matrix lists for that app version

#### Scenario: Unknown app version
- **WHEN** the user's app version has no row in the compatibility matrix
- **THEN** the skill says so and asks before installing a combination that is not documented

#### Scenario: Versions are reported
- **WHEN** setup finishes
- **THEN** the skill prints the installed plugin, helper, and app versions

### Requirement: Safe by construction

The skill SHALL install only from the project's official release URLs, SHALL NOT download and pipe remote scripts into a shell, SHALL NOT read or transmit credentials, tokens, or environment secrets, and SHALL ask for confirmation before replacing an existing installation or running a destructive command.

#### Scenario: Downloads are attributable
- **WHEN** the skill downloads a plugin, helper, or IPA
- **THEN** the source is a documented GitHub release asset or repository file of this project

#### Scenario: No secret handling
- **WHEN** the skill inspects the environment
- **THEN** it does not read pairing tokens, Apple credentials, or shell secrets, and does not send them anywhere

#### Scenario: Existing installation is protected
- **WHEN** a component is already installed
- **THEN** the skill asks before overwriting it and states what will change

#### Scenario: Passes marketplace security review
- **WHEN** the skill package is submitted to Agensi
- **THEN** its file structure, file types, commands, network access, and content pass the automated 8-point security scan without findings

### Requirement: Free Agensi listing

The skill SHALL be published on Agensi as a free listing with a marketplace-ready zip, a listing description, and tags, and the listing SHALL link to the project repository and the latest app release.

#### Scenario: Package is accepted by the marketplace
- **WHEN** the owner uploads the packaging output in the Creator Dashboard
- **THEN** the upload contains a valid SKILL.md and supporting files and is accepted for review

#### Scenario: Listing is discoverable
- **WHEN** a user searches Agensi for OpenCode, iPhone companion, or agent monitoring skills
- **THEN** the listing's title, description, and tags make the skill findable and state who it is for

#### Scenario: Listing is free
- **WHEN** a user views the listing
- **THEN** it shows no price and can be used without a purchase

#### Scenario: Listing points home
- **WHEN** a user reads the listing
- **THEN** it links to `https://github.com/sithartha/opencode-informer` and to the latest app release

### Requirement: Documented maintenance

The project SHALL document how the skill is packaged, submitted, and updated when component versions or install steps change.

#### Scenario: Re-release updates the listing
- **WHEN** the app or a helper version changes
- **THEN** documented steps cover updating the skill's version guidance and re-submitting the package

#### Scenario: Troubleshooting is covered
- **WHEN** setup fails in a known way, such as a BLE adapter without LE advertising, a denied local-network permission, or a plugin that did not load
- **THEN** the skill's reference material gives the recovery step
