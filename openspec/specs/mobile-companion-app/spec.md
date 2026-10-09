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

The app SHALL raise a local notification when an agent requests a permission, asks a question, or completes a turn, and permission and question notifications SHALL offer the actions needed to respond. When a question form has several questions, the notification SHALL route the user into the app to answer the whole form rather than offering one question's options as actions.

#### Scenario: Permission notification with actions
- **WHEN** the app receives a permission request
- **THEN** it raises a notification that offers allow and deny actions

#### Scenario: Question notification with options
- **WHEN** the app receives a question with a single question
- **THEN** it raises a notification that offers that question's options as actions

#### Scenario: Completion notification
- **WHEN** an agent finishes a turn successfully
- **THEN** the app raises an informational notification that does not require a response

#### Scenario: Failure or interrupt does not notify
- **WHEN** a turn ends by failure or a user interrupt
- **THEN** the app does not raise a completion notification

#### Scenario: Activity and tool updates do not notify
- **WHEN** a session's activity text or tool usage changes without needing the user
- **THEN** the app does not raise a notification

#### Scenario: Multi-question form notification
- **WHEN** the app receives a question form with several questions
- **THEN** the notification opens the app to answer the form and does not offer a single question's options as actions

### Requirement: Responding from the phone

The app SHALL send the user's allow, deny, or answer decision to the bridge and SHALL reflect the result in its UI. For a question form with several questions, the app SHALL collect an answer for every question and send them together, and SHALL not submit the form until every question is answered.

#### Scenario: Allow from a notification
- **WHEN** the user taps allow on a permission notification
- **THEN** the app sends the allow resolution and marks that request resolved in the UI

#### Scenario: Answer from the app
- **WHEN** the user selects an option for a pending question in the dashboard
- **THEN** the app sends that option as the resolution and removes the pending question

#### Scenario: Request resolved elsewhere
- **WHEN** the bridge reports that a pending request was resolved on the Mac
- **THEN** the app clears the pending request and dismisses its notification

#### Scenario: Answer every question of a form
- **WHEN** the user answers each question of a multi-question form in the app
- **THEN** the app sends the answers together as one resolution and removes the pending form

#### Scenario: Incomplete form cannot be submitted
- **WHEN** a multi-question form has an unanswered question
- **THEN** the app keeps the submit control disabled until every question is answered

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

The app SHALL present, for each session, its title (the session name OpenCode shows, falling back to its working-directory name or id) as the card name, the session's working-directory name (the final segment of its directory path; the full path SHALL NOT be shown), its agent name and model identifier, its phase, current tool, the number of its subagents and the number of its active shells, and a compact summary of its latest activity, and SHALL render URLs in activity and question text as tappable links that open in the browser. The app SHALL show any pending question or permission for that session inline with the controls to resolve it, SHALL show at most one pending request per session, SHALL present every question of a question form with its own controls, and SHALL present state-appropriate controls: a Stop control while the session is running, and a prompt field while it is inactive.

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

#### Scenario: Session with a multi-question form
- **WHEN** a session has a pending question form with several questions
- **THEN** the session's card shows each question with its own controls and a single submit control for the form

#### Scenario: Card shows the directory name
- **WHEN** a session's working directory is `/Users/dev/project`
- **THEN** its card shows `project` as the working-directory name and does not show the full path

#### Scenario: Name falls back to the directory name
- **WHEN** a session has no title
- **THEN** the card name falls back to the working-directory name (not the full path)

### Requirement: Start a session from the hero

The app SHALL show a "+" control beside the hero's active-agent count that starts a new session through the bridge and opens a prompt field for it. Before creating the session the app SHALL let the user choose its mode (agent) and then its model from the modes and models the bridge reports, and SHALL then create the session with that selection. When the bridge reports no modes or no models, the app SHALL skip that step rather than block the start.

#### Scenario: Start while connected
- **WHEN** the user taps "+" while connected to the bridge
- **THEN** the app lets the user choose a mode and a model and then requests a new session, its card appears, and the user can type and send its first prompt

#### Scenario: Choose mode and model before starting
- **WHEN** the user starts a session and the bridge reports modes and models
- **THEN** the app presents the modes first and then the models, and creates the session with the chosen mode and model

#### Scenario: No modes or models reported
- **WHEN** the user starts a session and the bridge reports no modes or no models
- **THEN** the app skips that choice and still starts the session

#### Scenario: Start while disconnected
- **WHEN** the user taps "+" while not connected
- **THEN** the app does not create a session and reports that a connection is required

### Requirement: Stop a running session

The app SHALL offer a Stop control on a session that is active — running, waiting for approval, or waiting for an answer (so a pending question can be declined) — ask the user to confirm, and on confirmation stop the session's current turn and present the session as inactive with a prompt field.

#### Scenario: Confirmed stop
- **WHEN** the user activates Stop and confirms
- **THEN** the app requests the stop, and the session's card becomes inactive and offers a prompt field

#### Scenario: Stop while a question is pending
- **WHEN** a session is waiting for an answer and the user activates Stop and confirms
- **THEN** the app stops the turn, the pending question is cleared, and the card offers a prompt field

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

### Requirement: Connect to the last computer first

The app SHALL remember the address of the last computer it connected to and, on launch or when returning to the foreground while not connected, SHALL try that address first before any Bluetooth discovery. The app SHALL fall back to Bluetooth discovery when the remembered address is unreachable, and SHALL clear the remembered address when the stored token is no longer valid.

#### Scenario: Remembered address is reachable
- **WHEN** the app launches with a stored token and a remembered address that answers
- **THEN** it connects to that address without waiting for Bluetooth discovery

#### Scenario: Remembered address is unreachable
- **WHEN** the remembered address does not answer
- **THEN** the app falls back to Bluetooth discovery and then to manual connection

#### Scenario: Remembered token is revoked
- **WHEN** the remembered address answers but rejects the stored token
- **THEN** the app clears the remembered address and requires pairing

### Requirement: Manual connection dialog

The app SHALL offer connection by address in a dialog that explains when manual entry is needed and that provides separate address and port fields. The app SHALL validate the entered address and port and SHALL connect only with a complete, valid address.

#### Scenario: Manual connection
- **WHEN** the user opens the manual dialog, enters an address and a port, and confirms
- **THEN** the app connects to that address and port

#### Scenario: Explanation shown
- **WHEN** the manual dialog opens
- **THEN** it explains that manual entry is for when Bluetooth discovery is unavailable

#### Scenario: Invalid input
- **WHEN** the address or port is empty or invalid
- **THEN** the app reports the problem and does not connect

### Requirement: Question option descriptions

When a session has a pending question that offers options, the app SHALL present each option as a button showing its label, and SHALL show the option's description, when present, below the button rather than inside it. Buttons and descriptions SHALL wrap when their text is long.

#### Scenario: Option with a description
- **WHEN** a question option has a description
- **THEN** the card shows the option's button with its label and the description below the button

#### Scenario: Option without a description
- **WHEN** a question option has no description
- **THEN** the card shows only the option's button

#### Scenario: Long button label or description
- **WHEN** an option's label or description is long
- **THEN** it wraps onto further lines without hiding the other

### Requirement: Recent activity history

The app SHALL show each activity message as its own nested card, SHALL show the latest message by default, and SHALL keep the two messages before it (up to three in total). Tapping a message SHALL open it in full in a modal. The app SHALL let the user reveal the earlier cards with a control. While a session has a pending question, the app SHALL show those recent cards by default so the context is visible, and it SHALL NOT replace them with the question title.

#### Scenario: Latest message by default
- **WHEN** a session has several activity messages
- **THEN** its card shows only the latest as a nested card, with a control to reveal the earlier ones

#### Scenario: Read a message in full
- **WHEN** the user taps an activity message
- **THEN** the full message opens in a modal

#### Scenario: Reveal earlier messages
- **WHEN** the user activates the control
- **THEN** the earlier messages appear as their own nested cards

#### Scenario: Recent context before a question
- **WHEN** a session has a pending question
- **THEN** the card shows the recent message cards (up to the last three) and does not replace them with the question title

#### Scenario: History from a reconnect
- **WHEN** the app reconnects and fetches the snapshot
- **THEN** the card's history is rebuilt from the session's latest activity text

### Requirement: Idle-session stability and diagnostics

The app SHALL record a diagnostic breadcrumb that survives termination, including the last app lifecycle transition, the last connection state, and any uncaught JavaScript error, and SHALL show the most recent diagnostic in Settings. If a previous run entered the background and never returned to the foreground, the app SHALL record and report that the run ended unexpectedly. Failures while scheduling notifications or reconnecting in the background SHALL be caught and SHALL NOT terminate the app.

#### Scenario: Previous run ended unexpectedly
- **WHEN** the app starts after a run that entered the background and never returned to the foreground
- **THEN** Settings reports that the previous run ended unexpectedly

#### Scenario: JavaScript error recorded
- **WHEN** an uncaught JavaScript error occurs
- **THEN** the app records it and shows it as the latest diagnostic on the next launch

#### Scenario: Background failure is contained
- **WHEN** scheduling a background notification or a reconnect attempt fails
- **THEN** the app keeps running and records the failure

### Requirement: Pairing code entry

The app SHALL ask the user for the pairing code shown on the Mac before completing a new pairing and SHALL send that code with the pairing request. When the bridge rejects the code, the app SHALL report it and let the user retry. When the bridge reports too many attempts, the app SHALL tell the user to wait rather than prompting for another code.

#### Scenario: Code requested before pairing
- **WHEN** the app must pair with a Mac and does not yet have a valid token
- **THEN** it asks the user to enter the code shown on the Mac before completing the pairing

#### Scenario: Code sent with the pairing request
- **WHEN** the user enters the code and the Mac user approves
- **THEN** the app completes pairing and connects

#### Scenario: Rejected code
- **WHEN** the bridge rejects the entered code
- **THEN** the app reports the problem and asks again

#### Scenario: Too many attempts
- **WHEN** the bridge reports too many attempts
- **THEN** the app tells the user to wait rather than prompting for another code

### Requirement: Session cost on the card

The app SHALL show a session's accumulated cost on its card as its own distinct element, formatted as an amount with its currency and without a label word, when the bridge reports one, and SHALL update it as it changes. When the bridge reports no cost for a session, the card SHALL show no cost.

#### Scenario: Cost shown
- **WHEN** a session reports a cost
- **THEN** its card shows a distinct amount (for example `$0.0123`)

#### Scenario: Cost updated
- **WHEN** the session's cost changes
- **THEN** the card reflects the new amount

#### Scenario: No cost reported
- **WHEN** a session reports no cost
- **THEN** the card shows no amount

### Requirement: Hero attention summary

The app SHALL present, at the top of the dashboard, a hero that leads with the number of agents that need the user — the sessions waiting for approval or for an answer — shows the number of working agents secondarily, and, when no agent needs the user, presents a calm all-clear status instead of a bare zero.

#### Scenario: An agent needs the user
- **WHEN** one or more agents are waiting for approval or for an answer
- **THEN** the hero shows that count as its primary figure, visually distinct from working activity

#### Scenario: Nothing needs the user but agents work
- **WHEN** no agent is waiting but one or more are working
- **THEN** the hero shows an all-clear status and the working count

#### Scenario: Nothing is active
- **WHEN** no agents are active
- **THEN** the hero shows a calm idle status and a working count of zero

#### Scenario: Live update
- **WHEN** the aggregate changes while the app is in the foreground
- **THEN** the hero reflects the new counts without a manual refresh

### Requirement: Jump to agents needing attention

When at least one agent needs the user, the hero SHALL offer a control that moves the user to those agents (the sessions waiting for approval or for an answer); when no agent needs the user, the hero SHALL NOT show that control.

#### Scenario: Control shown while waiting
- **WHEN** an agent is waiting for approval or for an answer
- **THEN** the hero shows a control to reach the waiting agents

#### Scenario: Control brings the waiting agents into view
- **WHEN** the user activates the control
- **THEN** the dashboard brings the agents waiting for attention into view

#### Scenario: Control hidden when clear
- **WHEN** no agent needs the user
- **THEN** the hero does not show the control

### Requirement: Collapsible sticky hero

As the user scrolls the dashboard, the app SHALL collapse the hero into a compact form pinned to the top of the screen and expand it back as the user scrolls up, with the transition driven by the scroll position. In the compact form the app SHALL show the app mark with a pill naming the connected server on the leading side and, aligned to the trailing side, one colored dot per attention state — working, permission, question, and inactive — with that state's session count.

#### Scenario: Collapses on scroll
- **WHEN** the user scrolls the dashboard so the hero leaves view
- **THEN** the hero collapses into the compact form pinned to the top

#### Scenario: Expands on scroll back
- **WHEN** the user scrolls back toward the top
- **THEN** the hero expands to its full form

#### Scenario: Transition follows the scroll
- **WHEN** the user scrolls partially through the hero
- **THEN** the collapse follows the scroll position continuously rather than snapping

#### Scenario: Compact content
- **WHEN** the hero is in the compact form
- **THEN** it shows the app mark, the connected server, and, on the right, the colored state dots with their session counts

### Requirement: Disconnect from the server

While paired, the app SHALL let the user disconnect from the currently connected server from the dashboard's connection indicator, asking the user to confirm. On confirmation the app SHALL stop receiving agent activity and remain disconnected until the user connects again.

#### Scenario: Dialog from the connection indicator
- **WHEN** the user taps the connection indicator while connected
- **THEN** the app asks whether to disconnect from that server

#### Scenario: Confirmed disconnect
- **WHEN** the user confirms the disconnect
- **THEN** the app stops receiving agent activity and shows the disconnected, unpaired state

#### Scenario: Stays disconnected
- **WHEN** the app returns to the foreground after a manual disconnect
- **THEN** it does not reconnect on its own

#### Scenario: Cancelled disconnect
- **WHEN** the user dismisses the confirmation
- **THEN** the connection stays as it was

### Requirement: Interface theme selection

The app SHALL let the user pick the interface theme from a list of available themes in Settings — currently **Default**, **Evangelion**, **Hello Kitty**, and **Star Wars** — and SHALL let the user choose that theme's variant: the Default theme offers Light, Dark, and System (following the iPhone's setting), the Evangelion theme offers Unit 00, Unit 01, and Unit 02, the Hello Kitty theme offers Hello Kitty, Chococat, and System, and the Star Wars theme offers Sith, Jedi, and System (System follows the iPhone's setting: light → Jedi, dark → Sith). The app SHALL persist the chosen theme and variant and apply them on the next launch.

#### Scenario: Theme list
- **WHEN** the user opens the appearance settings
- **THEN** the app offers the available themes (Default, Evangelion, Hello Kitty, and Star Wars)

#### Scenario: Default theme variants
- **WHEN** the Default theme is selected
- **THEN** the app offers Light, Dark, and System, and System follows the iPhone's setting

#### Scenario: Evangelion theme variants
- **WHEN** the Evangelion theme is selected
- **THEN** the app offers Unit 00, Unit 01, and Unit 02

#### Scenario: Hello Kitty theme variants
- **WHEN** the Hello Kitty theme is selected
- **THEN** the app offers Hello Kitty, Chococat, and System, where System follows the iPhone's setting (light → Hello Kitty, dark → Chococat)

#### Scenario: Star Wars theme variants
- **WHEN** the Star Wars theme is selected
- **THEN** the app offers Sith, Jedi, and System, where System follows the iPhone's setting (light → Jedi, dark → Sith)

#### Scenario: Applying a theme
- **WHEN** the user selects a theme or a variant
- **THEN** the whole UI immediately uses that theme

#### Scenario: Persisted across launches
- **WHEN** the app is relaunched
- **THEN** the previously selected theme and variant are applied

#### Scenario: Previous setting migrates
- **WHEN** the app starts with a legacy stored preference
- **THEN** the app maps it to a theme and a variant instead of failing

### Requirement: Evangelion NERV styling

While the **Evangelion** theme is selected, the app SHALL style every screen as a NERV system interface — angular panels with square corners (no rounding), technical typography (monospace labels and numbers), warning stripes, corner ticks, and HUD labels — using the colors of the selected unit, while preserving the existing behavior, text, and controls. The **Default** theme SHALL keep the app's standard styling.

#### Scenario: Unit palettes
- **WHEN** Unit 00, Unit 01, or Unit 02 is selected
- **THEN** the UI uses that unit's characteristic colors — 00 blue/white, 01 purple with neon green, 02 red/orange — including the unit's secondary accent on headers and accents

#### Scenario: All screens restyled
- **WHEN** the Evangelion theme is selected and any screen is shown
- **THEN** it uses the NERV styling

#### Scenario: MAGI hero
- **WHEN** the Evangelion theme is selected
- **THEN** the dashboard hero is styled as a MAGI console with three core indicators (MELCHIOR, BALTHASAR, CASPER) for the working, permission, and question states

#### Scenario: Default theme unchanged
- **WHEN** the Default theme is selected
- **THEN** the screens use the app's standard styling

#### Scenario: Behavior preserved
- **WHEN** the UI is restyled
- **THEN** the controls, labels, and flows behave as before

### Requirement: Hello Kitty hero

While the Hello Kitty theme is selected, the dashboard hero SHALL carry a themed header — a bow mark for the Hello Kitty variant or a paw mark for the Chococat variant, with the theme name and a status word — using the theme's palette, while keeping the needs-you figure and the controls. The Default theme SHALL keep the standard hero.

#### Scenario: Hello Kitty hero
- **WHEN** the Hello Kitty theme is selected
- **THEN** the hero shows the themed mark, the theme name, and a status word above the needs-you figure

### Requirement: Star Wars styling

While the Star Wars theme is selected, the app SHALL style the screens with its rounded HUD design — a left lightsaber rail on panels and underlined section headers — and the dashboard hero SHALL show the faction name (JEDI ORDER for the Jedi variant, SITH ORDER for the Sith variant) with a lightsaber bar in the theme's accent above the needs-you figure. The Default theme SHALL keep the standard styling.

#### Scenario: Star Wars hero
- **WHEN** the Star Wars theme is selected
- **THEN** the hero shows the faction name and a lightsaber bar above the needs-you figure

#### Scenario: Star Wars components
- **WHEN** the Star Wars theme is selected and any screen is shown
- **THEN** it uses the rounded HUD styling with the theme's palette

### Requirement: Theme mark and hero watermark

The app SHALL show the selected theme's mark in the header instead of the generic app icon — the **unit head** for Evangelion (the selected unit's head), the character head for Hello Kitty, the Rebel or Imperial emblem for Star Wars, and the app mark for the Default theme — and SHALL render a large, semi-transparent copy of that mark as a cropped backdrop on the hero.

#### Scenario: Header mark
- **WHEN** a theme is selected
- **THEN** the header shows that theme's mark instead of the app icon

#### Scenario: Hero watermark
- **WHEN** the hero is shown
- **THEN** the theme's mark appears as a large, semi-transparent backdrop cropped by the hero

### Requirement: Extensible theme catalog

The app SHALL resolve the interface palette from a theme catalog keyed by a theme id, so additional themes can be added without changing the screens; the Evangelion units are the first entries.

#### Scenario: Palette resolved from the catalog
- **WHEN** a theme id is selected
- **THEN** the app resolves that theme's palette from the catalog

#### Scenario: Added without changing screens
- **WHEN** a new theme is added to the catalog
- **THEN** the screens render it without per-screen changes
