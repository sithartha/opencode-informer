# mobile-companion-app Specification

## Purpose
An Expo + React Native phone client that pairs with the Mac over the local network, shows live agent activity and running-agent count, alerts the user when an agent needs attention, and lets the user approve, deny, or answer directly from the phone.

## Requirements

### Requirement: Discovery and pairing

The app SHALL discover the Mac's bridge through the local helper, require a user-approved pairing, and store the resulting token securely for automatic reconnection on later launches.

#### Scenario: First-time pairing
- **WHEN** the user opens the app for the first time and a Mac bridge is in range and reachable
- **THEN** the app discovers the Mac, completes a user-approved pairing, and connects

#### Scenario: Automatic reconnection
- **WHEN** the app launches after a successful pairing and the Mac is reachable
- **THEN** the app reconnects using the stored token without asking the user to pair again

#### Scenario: Token revoked
- **WHEN** the bridge rejects a request because the stored token is no longer valid
- **THEN** the app reports that re-pairing is required and stops retrying with the invalid token

### Requirement: Live activity dashboard

While connected, the app SHALL display the current sessions, each session's phase, the current tool when present, recent activity, and the count of running agents, updating as activity arrives.

#### Scenario: Activity updates in the foreground
- **WHEN** an agent emits activity while the app is in the foreground
- **THEN** the dashboard reflects the new activity and running-agent count without manual refresh

#### Scenario: No active agents
- **WHEN** no agents are active
- **THEN** the dashboard shows an empty state and a running-agent count of zero

### Requirement: Actionable notifications

The app SHALL raise a local notification when an agent requests a permission, asks a question, or completes a turn, and permission and question notifications SHALL offer the actions needed to respond.

#### Scenario: Permission notification with actions
- **WHEN** the app receives a permission request
- **THEN** it raises a notification that offers allow and deny actions

#### Scenario: Question notification with options
- **WHEN** the app receives a question
- **THEN** it raises a notification that offers the question's options as actions

#### Scenario: Completion notification
- **WHEN** an agent finishes a turn successfully
- **THEN** the app raises an informational notification that does not require a response

#### Scenario: Failure or interrupt does not notify
- **WHEN** a turn ends by failure or a user interrupt
- **THEN** the app does not raise a completion notification

#### Scenario: Activity and tool updates do not notify
- **WHEN** a session's activity text or tool usage changes without needing the user
- **THEN** the app does not raise a notification

### Requirement: Responding from the phone

The app SHALL send the user's allow, deny, or answer decision to the bridge and SHALL reflect the result in its UI.

#### Scenario: Allow from a notification
- **WHEN** the user taps allow on a permission notification
- **THEN** the app sends the allow resolution and marks that request resolved in the UI

#### Scenario: Answer from the app
- **WHEN** the user selects an option for a pending question in the dashboard
- **THEN** the app sends that option as the resolution and removes the pending question

#### Scenario: Request resolved elsewhere
- **WHEN** the bridge reports that a pending request was resolved on the Mac
- **THEN** the app clears the pending request and dismisses its notification

### Requirement: Background wake

While the app is not in the foreground but remains paired, a BLE doorbell SHALL wake the app so it can fetch the latest state and raise the corresponding notification, provided the Mac is reachable on the local network.

#### Scenario: Woken from the background
- **WHEN** the phone is backgrounded and receives a permission doorbell while the Mac is reachable
- **THEN** the app raises the permission notification without the user opening the app

#### Scenario: Mac not reachable after wake
- **WHEN** the app is woken by a doorbell but cannot reach the Mac
- **THEN** the app raises a generic attention notification indicating the details could not be loaded

### Requirement: Connection state handling

The app SHALL show whether it is connected, connecting, or disconnected, and SHALL recover automatically when the Mac becomes reachable again.

#### Scenario: Connection lost
- **WHEN** the local network or the Mac becomes unavailable
- **THEN** the app shows a disconnected state and continues attempting to reconnect

#### Scenario: Connection restored
- **WHEN** the Mac becomes reachable again
- **THEN** the app reconnects and resumes live updates without a manual action

### Requirement: Platform coverage

The app SHALL provide the core experience on iOS and SHALL provide the comparable core experience on Android where the platform permits, using a persistence mechanism appropriate to each platform so that warnings can be delivered while the app is backgrounded.

#### Scenario: iOS background delivery
- **WHEN** the app is paired on iOS and backgrounded
- **THEN** attention events can reach the user through the BLE wake path

#### Scenario: Android background delivery
- **WHEN** the app is paired on Android and backgrounded
- **THEN** attention events can reach the user while the connection is maintained in the background

### Requirement: App icon and mark

The app SHALL present an icon made of the letters "OI" in white on a black background, matching the Mac helper's menu-bar mark, and SHALL reuse the same mark wherever the app shows one (notifications and the Live Activity).

#### Scenario: Home-screen icon
- **WHEN** the app is installed
- **THEN** its icon shows "OI" in white on a black background

#### Scenario: Consistent mark
- **WHEN** a notification or the Live Activity displays an app mark
- **THEN** it uses the same "OI" white-on-black mark

### Requirement: Per-session detail

The app SHALL present, for each active session, its phase, current tool, the number of its subagents and the number of its active shells, and a compact summary of its latest activity, and SHALL show any pending question or permission for that session inline with the controls to resolve it. The app SHALL show at most one pending request per session.

#### Scenario: Session with a pending permission
- **WHEN** a session has a pending permission
- **THEN** the session's card shows the permission with allow and deny controls

#### Scenario: Session with a pending question
- **WHEN** a session has a pending question
- **THEN** the session's card shows the question with its option controls

#### Scenario: Session with no pending request
- **WHEN** a session has no pending request
- **THEN** its card shows the phase, current tool, the subagent and shell counts, and the compact latest-activity summary

#### Scenario: Subagents and shells shown
- **WHEN** a session has spawned subagents and has tool executions in flight
- **THEN** its card shows the subagent count and the shell count

#### Scenario: Reconstructed after reconnect
- **WHEN** the app reconnects or is woken and fetches the snapshot
- **THEN** each session's card reflects the pending requests, the counts, and the latest activity from the snapshot
