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

The app SHALL present, for each session, its title (the session name OpenCode shows, falling back to its working directory or id) as the card name, its agent name and model identifier, its phase, current tool, the number of its subagents and the number of its active shells, and a compact summary of its latest activity, and SHALL render URLs in activity and question text as tappable links that open in the browser. The app SHALL show any pending question or permission for that session inline with the controls to resolve it, SHALL show at most one pending request per session, and SHALL present state-appropriate controls: a Stop control while the session is running, and a prompt field while it is inactive.

#### Scenario: Session with a pending permission
- **WHEN** a session has a pending permission
- **THEN** the session's card shows the permission with allow and deny controls

#### Scenario: Session with a pending question
- **WHEN** a session has a pending question
- **THEN** the session's card shows the question with its option controls

#### Scenario: Session with no pending request
- **WHEN** a session has no pending request
- **THEN** its card shows the agent, model, phase, current tool, the subagent and shell counts, and the compact latest-activity summary

#### Scenario: Subagents and shells shown
- **WHEN** a session has spawned subagents and has tool executions in flight
- **THEN** its card shows the subagent count and the shell count

#### Scenario: Reconstructed after reconnect
- **WHEN** the app reconnects or is woken and fetches the snapshot
- **THEN** each session's card reflects the pending requests, the counts, the agent and model, and the latest activity from the snapshot

#### Scenario: Links in a message
- **WHEN** a session's activity or a question contains a URL
- **THEN** the URL is shown as a tappable link that opens in the browser

### Requirement: Start a session from the hero

The app SHALL show a "+" control beside the hero's active-agent count that starts a new session through the bridge and opens a prompt field for it.

#### Scenario: Start while connected
- **WHEN** the user taps "+" while connected to the bridge
- **THEN** the app requests a new session, its card appears, and the user can type and send its first prompt

#### Scenario: Start while disconnected
- **WHEN** the user taps "+" while not connected
- **THEN** the app does not create a session and reports that a connection is required

### Requirement: Stop a running session

The app SHALL offer a Stop control on a session that is running, ask the user to confirm, and on confirmation stop the session's current turn and present the session as inactive with a prompt field.

#### Scenario: Confirmed stop
- **WHEN** the user activates Stop and confirms
- **THEN** the app requests the stop, and the session's card becomes inactive and offers a prompt field

#### Scenario: Dismissed confirmation
- **WHEN** the user activates Stop and dismisses the confirmation
- **THEN** the app sends no stop request and the session keeps running

### Requirement: Close a session

The app SHALL offer a close control on each session card, ask the user to confirm, and on confirmation close the session so its card disappears.

#### Scenario: Confirmed close
- **WHEN** the user activates close and confirms
- **THEN** the app requests the session be closed and the card is removed

#### Scenario: Dismissed confirmation
- **WHEN** the user activates close and dismisses the confirmation
- **THEN** the app sends no close request and the card remains

### Requirement: Switch agent and model

The app SHALL let the user switch a session's mode (agent) and model from the session's card, choosing from the agents and models the bridge reports, and SHALL reflect the change. The app SHALL NOT assume a fixed set of modes; the options are whatever the bridge returns.

#### Scenario: Options come from the bridge
- **WHEN** the bridge reports a set of agents and models
- **THEN** the app offers exactly those options without hardcoding any names

#### Scenario: Switching the mode
- **WHEN** the user selects a different agent for a session
- **THEN** the app requests the switch and the card's agent label updates

#### Scenario: Switching the model
- **WHEN** the user selects a different model for a session
- **THEN** the app requests the switch and the card's model label updates

### Requirement: Connection loss and recovery

The app SHALL detect a lost connection with a periodic timer rather than relying only on the stream's close event: when there has been no activity for a while it SHALL probe the bridge, and if the bridge does not answer within a timeout it SHALL mark the connection lost and reconnect with backoff. On recovery it SHALL resync the snapshot so the cards are current.

#### Scenario: The Mac becomes unreachable
- **WHEN** the Mac becomes unreachable while the app is in the foreground (for example it sleeps)
- **THEN** within the timeout the app marks the connection lost and keeps retrying

#### Scenario: Recovery resyncs the cards
- **WHEN** the Mac becomes reachable again
- **THEN** the app reopens the stream and resyncs the snapshot

#### Scenario: A request that appeared while disconnected
- **WHEN** a session became pending while the app was disconnected
- **THEN** after recovery its card shows the pending request from the refreshed snapshot

### Requirement: Foreground attention haptic

While the app is in the foreground, the app SHALL vibrate the device when a new permission request or question arrives.

#### Scenario: New request in the foreground
- **WHEN** a permission request or question arrives while the app is in the foreground
- **THEN** the device vibrates

#### Scenario: No foreground haptic for other activity
- **WHEN** only tool or activity updates arrive
- **THEN** the device does not vibrate
