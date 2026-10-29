# Spec Delta

## ADDED Requirements

### Requirement: Accessible interface baseline

Every screen SHALL meet a baseline of visual and assistive-technology accessibility across all themes. Body, hint, placeholder, metadata, and error text SHALL have a contrast ratio of at least 4.5:1 against the surface behind it; large text and UI boundaries SHALL have at least 3:1. Text on filled buttons and selected controls SHALL be readable against that fill in every theme. Every interactive control SHALL have a visible pressed state and a touch target of at least 44×44pt. Selection state SHALL be conveyed to assistive technology through role, state, and accessible name, not by color alone. Screens SHALL remain usable at the largest Dynamic Type sizes and on devices with safe-area insets, and Reduce Motion SHALL remove or soften positional and looping motion while preserving state changes.

#### Scenario: Text contrast
- **WHEN** any theme and variant is active
- **THEN** body, hint, placeholder, metadata, and error text meet 4.5:1 against its surface, and button labels meet 4.5:1 against the button fill

#### Scenario: Touch targets
- **WHEN** the user interacts with segments, layout toggles, Stop or Close controls, links, or theme checks
- **THEN** each target is at least 44×44pt or has an equivalent hit area

#### Scenario: Screen-reader selection
- **WHEN** a theme, variant, question option, switcher row, or layout is selected
- **THEN** assistive technology announces it as selected and names the control

#### Scenario: Dynamic Type
- **WHEN** the device uses the largest text size
- **THEN** text does not clip or overlap, cards grow with their content, and primary actions remain reachable

#### Scenario: Safe areas
- **WHEN** the app runs on a device with a notch, Dynamic Island, or home indicator
- **THEN** headers, content, and pinned controls respect the safe-area insets

#### Scenario: Reduce Motion
- **WHEN** Reduce Motion is enabled
- **THEN** the hero collapse, attention loops, and decorative motion do not animate; state changes remain visible without movement

### Requirement: First-run and connection recovery

The app SHALL guide a first-run user from install to a connected dashboard, explain permissions before the system asks, and make connection state and recovery explicit. The unpaired dashboard SHALL explain that the OpenCode informer helper runs on the computer, that both devices share a network, and that pairing completes the connection, while keeping the existing connection actions. The app SHALL request Bluetooth, local-network, and notification permissions only with visible context explaining why they are needed and what happens if they are denied. Connection states SHALL be shown in plain language, a disconnected dashboard SHALL offer a reconnect action, and the app SHALL show when displayed data is stale and provide a manual refresh.

#### Scenario: First run
- **WHEN** a user opens the app without a pairing
- **THEN** the dashboard explains the helper, the shared network, and the pairing step before or beside the connection actions

#### Scenario: Permission context
- **WHEN** the app is about to request a system permission
- **THEN** it first explains what the permission enables and how to continue if it is denied

#### Scenario: Disconnected with a remembered computer
- **WHEN** the app is paired but offline
- **THEN** the dashboard shows a plain-language offline state with a reconnect action and does not present stale counts as current

#### Scenario: Stale data
- **WHEN** the bridge has not refreshed within the stale window
- **THEN** the dashboard marks the data as stale and shows the last update time

#### Scenario: Manual refresh
- **WHEN** the user pulls to refresh or opens the reconnect action
- **THEN** the app resyncs the snapshot and reports success or an actionable error

#### Scenario: Disconnect is explicit
- **WHEN** the user wants to stop receiving activity
- **THEN** disconnecting is available as a labelled control in Settings, not only as an undisclosed tap on the status pill

### Requirement: Loading, empty, and error states

Every asynchronous action SHALL show that it is working and SHALL NOT leave the user with an unchanged screen, a disabled control with no explanation, or a flash of incorrect empty content. Empty screens SHALL present the next useful action. Errors SHALL state what happened and offer a recovery path. Disabled controls SHALL explain why they are disabled.

#### Scenario: Starting a session
- **WHEN** the user starts a new session and options are being loaded
- **THEN** the app shows a busy state and the current step, and does not silently ignore the tap

#### Scenario: Switcher options
- **WHEN** the mode and model list is loading
- **THEN** the switcher shows a loading state instead of `No modes reported`

#### Scenario: Empty dashboard
- **WHEN** no sessions exist
- **THEN** the empty state offers a primary start-session action, a secondary demo action, and a route to setup guidance

#### Scenario: Purchase in progress
- **WHEN** the user buys a tip
- **THEN** the control shows a pending state and a failure offers a retry

#### Scenario: Invalid manual address
- **WHEN** the user enters an invalid address or port
- **THEN** the error appears next to the field with a specific fix

#### Scenario: Disabled submit
- **WHEN** a question submit is unavailable because no answer is selected
- **THEN** the control explains that at least one answer is required

### Requirement: Interface motion and performance

Interface motion SHALL come from a shared set of easing, duration, and spring tokens and SHALL use only transform and opacity for visual animation. Scroll-driven motion SHALL run on the UI thread rather than re-rendering or updating values from the JS thread every frame. Continuous attention motion SHALL be limited to the most relevant waiting card rather than every card, and offscreen decorative animation SHALL pause. Press feedback SHALL be fast and subtle, without a bouncy release on ordinary taps. Significant state changes SHALL provide continuity rather than a hard swap, and haptics SHALL be reserved for meaningful commits.

#### Scenario: Hero collapse
- **WHEN** the user scrolls the dashboard
- **THEN** the hero collapse runs from a UI-thread scroll value and does not update a JS animation value on every scroll event

#### Scenario: Attention motion
- **WHEN** several sessions are waiting
- **THEN** only the top waiting card carries the continuous attention treatment; the others use a static attention style

#### Scenario: Offscreen avatars
- **WHEN** session cards are offscreen
- **THEN** their decorative avatar animation does not run

#### Scenario: Press feedback
- **WHEN** a pressable is pressed
- **THEN** it responds within 160ms with a subtle scale or equivalent feedback

#### Scenario: Compact to full
- **WHEN** a compact session card expands
- **THEN** the change reads as a continuous transition from the compact card rather than an instant replacement

#### Scenario: Theme change
- **WHEN** the user changes the theme or variant
- **THEN** the interface crossfades or otherwise transitions without a jarring color jump

#### Scenario: Haptic commit
- **WHEN** the user selects a theme, allows or denies a request, connects, or confirms Stop or Close
- **THEN** a single haptic fires with the visual result

### Requirement: Settings organization

Settings SHALL be ordered by user intent rather than by implementation history. Connection controls, appearance, and notifications SHALL come before support and diagnostics; diagnostics SHALL be available but collapsed by default and copyable; legal and support links SHALL be present; and the displayed version SHALL come from the app's build metadata. The theme picker SHALL show the selected theme without the user scrolling to find it and SHALL offer a full-screen preview of the selected theme on a real screen.

#### Scenario: Settings order
- **WHEN** the user opens Settings
- **THEN** connection, appearance, and notification controls appear before support, about, and diagnostics

#### Scenario: Diagnostics
- **WHEN** the user opens Diagnostics
- **THEN** the record is available behind a disclosure and can be copied

#### Scenario: Version
- **WHEN** the user reads About
- **THEN** the version matches the installed build

#### Scenario: Theme visibility
- **WHEN** Settings opens with a theme selected
- **THEN** that theme's card is visible in the picker without manual scrolling

#### Scenario: Theme preview
- **WHEN** the user requests a preview of the selected theme
- **THEN** a full-screen sample shows the theme's real components, not only a palette swatch

#### Scenario: Legal links
- **WHEN** the user looks for privacy or support information
- **THEN** Settings offers a working link

### Requirement: Human-readable interface language

User-facing text SHALL use plain language instead of internal identifiers. Session phases, connection states, and empty or error conditions SHALL be written as short human phrases with consistent terminology and pluralization. Zero-value metadata SHALL not be shown. Calls to action SHALL name the action consistently and not vary between screens. The same vocabulary SHALL appear in the dashboard, cards, notifications, Live Activity, and Settings.

#### Scenario: Session phase
- **WHEN** a card or notification shows a phase
- **THEN** it reads as plain language such as `Needs approval`, `Waiting for an answer`, `Running`, `Done`, or `Ended`

#### Scenario: Connection state
- **WHEN** the connection status is shown
- **THEN** it reads as plain language such as `Connected`, `Looking for your computer`, `Connecting`, or `Offline`

#### Scenario: Zero metadata
- **WHEN** a session has zero subagents or shells
- **THEN** those counts are not shown

#### Scenario: Consistent CTA
- **WHEN** the demo is offered from an empty state or Settings
- **THEN** both entry points use the same label

#### Scenario: Same vocabulary everywhere
- **WHEN** a request needs attention
- **THEN** the dashboard, notification, and Live Activity describe it with the same terms
