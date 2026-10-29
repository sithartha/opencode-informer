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

The app SHALL raise a local notification when an agent requests a permission, asks a question, or completes a turn, and permission and question notifications SHALL offer the actions needed to respond. When a question form has several questions, the notification SHALL route the user into the app to answer the whole form rather than offering one question's options as actions. When a question allows several answers, the notification SHALL likewise route the user into the app rather than offering a single option as an action.

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

#### Scenario: Question that allows several answers notification
- **WHEN** the app receives a question that allows several answers
- **THEN** the notification opens the app to answer it and does not offer a single option as an action

### Requirement: Responding from the phone

The app SHALL send the user's allow, deny, or answer decision to the bridge and SHALL reflect the result in its UI. For a question form with several questions, the app SHALL collect an answer for every question and send them together, and SHALL not submit the form until every question is answered. For a question that allows several answers, the app SHALL let the user select more than one option and SHALL send the selected options together when the user submits, and SHALL not resolve the question on the first option the user taps.

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

#### Scenario: Select several options
- **WHEN** a pending question allows several answers and the user taps an option
- **THEN** the app toggles that option's selected state and keeps the question pending

#### Scenario: Submit several options
- **WHEN** the user has selected one or more options for a question that allows several answers and submits
- **THEN** the app sends the selected options together as one resolution and removes the pending question

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

The app SHALL also re-resolve the computer's address when the phone's network changes: on a network change it SHALL re-read the rendezvous address over Bluetooth and connect to that address with the stored token, without asking the user to pair again. It SHALL re-read the address the same way after three consecutive unsuccessful reconnect attempts to the remembered address. An address resolved this way SHALL become the remembered address. The app SHALL NOT discard the stored token merely because a newly discovered address rejects it, and SHALL NOT start Bluetooth discovery while the remembered address keeps answering.

#### Scenario: The Mac becomes unreachable
- **WHEN** the Mac becomes unreachable while the app is in the foreground (for example it sleeps)
- **THEN** within the timeout the app marks the connection lost and keeps retrying

#### Scenario: Recovery resyncs the cards
- **WHEN** the Mac becomes reachable again
- **THEN** the app reopens the stream and resyncs the snapshot

#### Scenario: A request that appeared while disconnected
- **WHEN** a session became pending while the app was disconnected
- **THEN** after recovery its card shows the pending request from the refreshed snapshot

#### Scenario: Network change moves the computer
- **WHEN** the computer changes networks, its bridge address changes, and the app observes a network change on the phone
- **THEN** the app re-reads the address over Bluetooth, connects to the new address, and resumes live updates without a manual action or a new pairing

#### Scenario: Address re-read from an existing Bluetooth link
- **WHEN** the phone is still connected to the helper over Bluetooth after the network change
- **THEN** the app re-reads the rendezvous over that link instead of requiring a fresh scan

#### Scenario: Repeated failures trigger discovery
- **WHEN** reconnecting to the remembered address fails three times in a row
- **THEN** the app re-reads the address over Bluetooth before its next attempt

#### Scenario: New address is remembered
- **WHEN** the app resolves a new address after a network change and connects successfully
- **THEN** that address is stored as the remembered address for later launches and foreground returns

#### Scenario: A token the computer rejects
- **WHEN** the computer the helper points at rejects the stored token during recovery
- **THEN** the app stops automatic retrying, keeps the stored token, and offers the pairing code instead of discarding the pairing

#### Scenario: Bluetooth unavailable during recovery
- **WHEN** the address cannot be re-read because Bluetooth is unavailable or scanning fails
- **THEN** the app stays disconnected, keeps retrying the remembered address with backoff, and reports the failure without terminating

#### Scenario: No needless discovery
- **WHEN** the network changes but the remembered address still answers
- **THEN** the app keeps the current address and does not require a Bluetooth scan

### Requirement: Foreground attention haptic

While the app is in the foreground, the app SHALL vibrate the device when a new permission request or question arrives.

#### Scenario: New request in the foreground
- **WHEN** a permission request or question arrives while the app is in the foreground
- **THEN** the device vibrates

#### Scenario: No foreground haptic for other activity
- **WHEN** only tool or activity updates arrive
- **THEN** the device does not vibrate

### Requirement: Connect to the last computer first

The app SHALL remember the address of the last computer it connected to and, on launch or when returning to the foreground while not connected, SHALL try that address first before any Bluetooth discovery. The app SHALL fall back to Bluetooth discovery when the remembered address is unreachable. When the remembered address answers but rejects the stored token, the app SHALL NOT discard the pairing on that basis alone: it SHALL re-read the computer's address over Bluetooth and try the stored token there. When the address the helper points at also rejects the stored token, the app SHALL stop automatic reconnection, SHALL keep the stored token, and SHALL offer the pairing code so the user can pair again. A code entered while a stored token exists SHALL replace that token.

#### Scenario: Remembered address is reachable
- **WHEN** the app launches with a stored token and a remembered address that answers
- **THEN** it connects to that address without waiting for Bluetooth discovery

#### Scenario: Remembered address is unreachable
- **WHEN** the remembered address does not answer
- **THEN** the app falls back to Bluetooth discovery and then to manual connection

#### Scenario: Remembered token is revoked
- **WHEN** the remembered address answers but rejects the stored token
- **THEN** the app keeps the token, tries the address the helper points at, and offers pairing only if that address also rejects it

#### Scenario: Remembered address now belongs to another computer
- **WHEN** the remembered address answers with a rejection of the stored token, but the computer the helper points at accepts it
- **THEN** the app keeps the pairing and connects to the helper's address instead of asking for a new code

#### Scenario: The paired computer rejects the token
- **WHEN** the address the helper points at also rejects the stored token
- **THEN** the app stops retrying automatically and offers the code shown on the computer without discarding the stored token

#### Scenario: Token survives a bridge restart
- **WHEN** the bridge restarted and kept its pairing record
- **THEN** the app reconnects with the stored token and does not ask for a code

#### Scenario: Entering a code replaces an old token
- **WHEN** a stored token exists and the user enters a new pairing code
- **THEN** the app pairs again and replaces the stored token instead of retrying the old one

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

As the user scrolls the dashboard, the app SHALL collapse the hero into a compact form pinned to the top of the screen and expand it back as the user scrolls up, with the transition driven by the scroll position. The transition SHALL track the hero's own height: the expanded hero SHALL stay visible while its space leaves the viewport (fading or morphing in step with the scroll) so it does not fade out early and leave a gap of empty space before the content below. In the compact form the app SHALL show the app mark with a pill naming the connected server on the leading side and, aligned to the trailing side, one colored dot per attention state — working, permission, question, and inactive — with that state's session count.

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

#### Scenario: No empty gap while collapsing
- **WHEN** the user scrolls so the hero leaves the viewport
- **THEN** the expanded hero's fade tracks the hero's height and no empty gap appears between the hero and the content below before the compact form takes over

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

The app SHALL let the user pick the interface theme from a scrollable list of theme cards in Settings, shown in a bordered area that scrolls vertically and shows three cards fully and half of the next — currently **Default**, **Nerv**, **Cat**, **The Force**, **Tunes**, **Classic OS**, and **Wizard**, all free — and SHALL let the user choose that theme's variant: the Default theme offers Light, Dark, and System (following the iPhone's setting), the **Nerv** theme offers Unit 00, Unit 01, and Unit 02, the **Cat** theme offers Hello Kitty, Chococat, and System, **The Force** theme offers Sith, Jedi, and System (System follows the iPhone's setting: light → Jedi, dark → Sith), the **Tunes** theme offers Classic, Bento, and System (System follows the iPhone's setting: light → Bento, dark → Classic), the **Classic OS** theme offers Blue, Dark, and System (System follows the iPhone's setting: light → Blue, dark → Dark), and the **Wizard** theme offers Gryffindor, Slytherin, Ravenclaw, and Hufflepuff. Each card's preview thumbnail SHALL reflect that theme's own look — its palette and its corner style (rounded or square). Selecting a theme SHALL set its variant to the theme's **System** option, except for the **Nerv** theme (no System option) which SHALL set **Unit 01**, and the **Wizard** theme (no System option) which SHALL set **Gryffindor** on a light iPhone and **Slytherin** on a dark one. The theme names and descriptions SHALL use neutral synonyms or abbreviations and SHALL NOT contain trademarked terms. The app SHALL persist the chosen theme and variant and apply them on the next launch.

#### Scenario: Theme list
- **WHEN** the user opens the appearance settings
- **THEN** the app offers the available themes (Default, Nerv, Cat, The Force, Tunes, Classic OS, and Wizard), all available without any purchase

#### Scenario: Theme list layout
- **WHEN** the appearance settings are shown
- **THEN** three theme cards are visible in full and half of the next card is visible, the list scrolls vertically inside a bordered area, and each card shows the theme's palette preview, name, and description

#### Scenario: Preview reflects the theme's shape
- **WHEN** the theme cards are shown
- **THEN** each card's preview thumbnail uses that theme's corner style — rounded for the rounded themes and square for the square-cornered themes (for example Nerv and Tunes)

#### Scenario: Default theme variants
- **WHEN** the Default theme is selected
- **THEN** the app offers Light, Dark, and System, and System follows the iPhone's setting

#### Scenario: Evangelion theme variants
- **WHEN** the Nerv theme is selected
- **THEN** the app offers Unit 00, Unit 01, and Unit 02

#### Scenario: Hello Kitty theme variants
- **WHEN** the Cat theme is selected
- **THEN** the app offers Hello Kitty, Chococat, and System, where System follows the iPhone's setting (light → Hello Kitty, dark → Chococat)

#### Scenario: Star Wars theme variants
- **WHEN** The Force theme is selected
- **THEN** the app offers Sith, Jedi, and System, where System follows the iPhone's setting (light → Jedi, dark → Sith)

#### Scenario: Tunes theme variants
- **WHEN** the Tunes theme is selected
- **THEN** the app offers Classic, Bento, and System, where Classic is the dark stock-player look, Bento is the light recolor of the same layout, and System follows the iPhone's setting (light → Bento, dark → Classic)

#### Scenario: Classic OS theme variants
- **WHEN** the Classic OS theme is selected
- **THEN** the app offers Blue, Dark, and System, where Blue is the light classic-desktop look, Dark is its dark counterpart, and System follows the iPhone's setting (light → Blue, dark → Dark)

#### Scenario: Wizard theme variants
- **WHEN** the Wizard theme is selected
- **THEN** the app offers Gryffindor, Slytherin, Ravenclaw, and Hufflepuff, and selecting it defaults to Gryffindor on a light iPhone and Slytherin on a dark one

#### Scenario: Switching a theme picks the System variant
- **WHEN** the user selects a theme
- **THEN** its variant becomes the theme's System option, and for the Nerv theme it becomes Unit 01 and for the Wizard theme it follows the iPhone's setting (light → Gryffindor, dark → Slytherin)

#### Scenario: Applying a theme
- **WHEN** the user selects a theme or a variant
- **THEN** the whole UI immediately uses that theme

#### Scenario: Persisted across launches
- **WHEN** the app is relaunched
- **THEN** the previously selected theme and variant are applied

#### Scenario: Previous setting migrates
- **WHEN** the app starts with a legacy stored preference
- **THEN** the app maps it to a theme and a variant instead of failing

#### Scenario: De-trademarked names and descriptions
- **WHEN** the appearance settings show the themes
- **THEN** the theme names and descriptions contain no trademarked terms

### Requirement: Evangelion NERV styling

While the **Evangelion** theme is selected, the app SHALL style every screen as a NERV system interface — angular panels with square corners (no rounding), technical typography (monospace labels and numbers), warning stripes, corner ticks, and HUD labels — using the colors of the selected unit, while preserving the existing behavior, text, and controls. The **Default** theme SHALL keep the app's standard styling.

#### Scenario: Unit palettes
- **WHEN** Unit 00, Unit 01, or Unit 02 is selected
- **THEN** the UI uses that unit's characteristic colors — 00 yellow with green, 01 purple with neon green, 02 red/orange — including the unit's secondary accent on headers and accents

#### Scenario: All screens restyled
- **WHEN** the Evangelion theme is selected and any screen is shown
- **THEN** it uses the NERV styling

#### Scenario: MAGI hero
- **WHEN** the Evangelion theme is selected
- **THEN** the dashboard hero is styled as a MAGI console with three hexagonal core indicators (MELCHIOR, BALTHASAR, CASPER) for the working, permission, and question states, and the status readouts are shown as hexagons

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

The app SHALL show the selected theme's mark in the header instead of the generic app icon — the **unit head** for Evangelion (the selected unit's head), the character head for Hello Kitty, the Rebel or Imperial emblem for Star Wars, the **lightning bolt** for Tunes, the **four-color flag** for Classic OS, the **house crest** for Wizard, and the app mark for the Default theme — and SHALL render a large, semi-transparent copy of that mark as a cropped backdrop on the hero.

#### Scenario: Header mark
- **WHEN** a theme is selected
- **THEN** the header shows that theme's mark instead of the app icon

#### Scenario: Hero watermark
- **WHEN** the hero is shown
- **THEN** the theme's mark appears as a large, semi-transparent backdrop cropped by the hero

#### Scenario: Tunes and Classic OS marks
- **WHEN** the Tunes or Classic OS theme is selected
- **THEN** the header and hero watermark show that theme's mark (a lightning bolt for Tunes, a four-color flag for Classic OS)

### Requirement: Extensible theme catalog

The app SHALL resolve the interface palette from a theme catalog keyed by a theme id, so additional themes can be added without changing the screens; the Evangelion units are the first entries.

#### Scenario: Palette resolved from the catalog
- **WHEN** a theme id is selected
- **THEN** the app resolves that theme's palette from the catalog

#### Scenario: Added without changing screens
- **WHEN** a new theme is added to the catalog
- **THEN** the screens render it without per-screen changes

### Requirement: Tunes media-player styling

While the **Tunes** theme is selected, the app SHALL style every screen as a classic media player — beveled chrome windows with a dark chrome frame, segmented LED/numeric readouts, classic transport controls, and a level/spectrum strip — using the selected variant's palette, while preserving the existing behavior, text, and controls. It SHALL use square corners throughout (no rounding on panels, buttons, inputs, badges, chips, or segments). The dashboard hero SHALL show the player readout and the lightning-bolt mark, and that mark SHALL be **yellow-gold** on the dark **Classic** variant while keeping the theme accent on the light **Bento** variant. The **Default** theme SHALL keep the app's standard styling.

#### Scenario: Tunes palettes
- **WHEN** the Classic or Bento variant is selected
- **THEN** the UI uses that variant's characteristic colors — Classic: dark charcoal chrome with silver bevels and green/amber readouts; Bento: light silver surfaces with amber/orange accents

#### Scenario: All screens restyled
- **WHEN** the Tunes theme is selected and any screen is shown
- **THEN** it uses the media-player styling with the variant's palette

#### Scenario: Square corners
- **WHEN** the Tunes theme is selected and any screen is shown
- **THEN** panels, buttons, inputs, badges, chips, segments, and the hero carry square corners with no rounding

#### Scenario: Gold mark on the dark variant
- **WHEN** the Classic (dark) variant is selected
- **THEN** the lightning-bolt mark is yellow-gold; when Bento is selected the mark uses the theme accent instead

#### Scenario: Player hero
- **WHEN** the Tunes theme is selected
- **THEN** the hero shows a player-style readout and the lightning-bolt mark

#### Scenario: Behavior preserved
- **WHEN** the Tunes theme is applied
- **THEN** the controls, labels, and flows behave as before

### Requirement: Classic OS desktop styling

While the **Classic OS** theme is selected, the app SHALL style every screen as a classic desktop operating system — gradient title bars, rounded beveled window and button chrome, section headers that read like window/taskbar elements, and an accent start-style control — using the selected variant's palette, while preserving the existing behavior, text, and controls. Section and card headers SHALL be rendered as classic desktop window title bars (a blue gradient bar with a white title and window-control buttons), the session close control SHALL be styled as the window close button (a red control with a white cross), the Stop control SHALL be styled as a window-control button, and a session's current directory SHALL be shown as a classic desktop path (an address-bar field with a folder icon). The dashboard hero SHALL show the desktop-style window header and the four-color flag mark. The **Default** theme SHALL keep the app's standard styling.

#### Scenario: Classic OS palettes
- **WHEN** the Blue or Dark variant is selected
- **THEN** the UI uses that variant's characteristic colors — Blue: the classic blue desktop with green accent; Dark: a dark counterpart of the same chrome

#### Scenario: All screens restyled
- **WHEN** the Classic OS theme is selected and any screen is shown
- **THEN** it uses the desktop styling with the variant's palette

#### Scenario: Window title bars and controls
- **WHEN** the Classic OS theme is selected
- **THEN** section and card headers render as blue gradient window title bars with a white title, the session close control is a red window close button with a white cross, and the Stop control is a window-control button

#### Scenario: Directory shown as a path
- **WHEN** the Classic OS theme is selected and a session has a working directory
- **THEN** its current directory is shown styled as a path (an address-bar field with a folder icon) instead of a plain chip

#### Scenario: Desktop hero
- **WHEN** the Classic OS theme is selected
- **THEN** the hero shows a desktop-style window header and the four-color flag mark

#### Scenario: Behavior preserved
- **WHEN** the Classic OS theme is applied
- **THEN** the controls, labels, and flows behave as before

### Requirement: Session list ordering

The dashboard SHALL order session cards by what the user needs first: sessions requiring the user's attention (a pending permission or question) first, then sessions that are working (running), then inactive sessions. Within the attention tier, the session with the most recently arrived request SHALL come first; the relative order of the remaining sessions SHALL be preserved.

#### Scenario: Attention first
- **WHEN** the session list contains an inactive session, a working session, and a session with a pending request
- **THEN** the pending-request session is shown first, the working session next, and the inactive session last

#### Scenario: Multiple attention sessions
- **WHEN** several sessions have pending requests
- **THEN** they appear above the working and inactive sessions, with the most recently arrived request first

#### Scenario: Working before inactive
- **WHEN** there are no pending requests
- **THEN** working sessions are shown above inactive sessions

### Requirement: Support development tips

The app SHALL offer optional tips that support development as consumable purchases that grant no
content, shown as a section in Settings with three cards, each of which says that the tip unlocks
nothing, with the middle card highlighted as the most attractive.

#### Scenario: Tip cards
- **WHEN** the user opens Settings
- **THEN** three tip cards are offered ($0.99, $2.99, $5.99), each with a distinct icon, an explicit buy control on the right showing its price, and text saying they get nothing; the middle card is highlighted with its buy control filled (the others outlined), with no "recommended" label

#### Scenario: Tips grant no content
- **WHEN** the user buys a tip
- **THEN** no theme or other content is unlocked

### Requirement: Neutral connection action labels

The app SHALL label its Bluetooth connection action with wording that names neither a computer vendor nor a single operating system, using "Find nearby computer" as the label, and SHALL keep a separate action for entering an address manually. Activating the action SHALL search for a nearby computer over Bluetooth immediately instead of first retrying the remembered address, and activating it while a search is already running SHALL cancel that search and start a fresh one.

#### Scenario: Primary connection action
- **WHEN** the app is not paired and the user opens the dashboard
- **THEN** the Bluetooth connection action is labelled "Find nearby computer"

#### Scenario: Manual alternative
- **WHEN** the app is not paired and the user opens the dashboard
- **THEN** a separate action to connect by address is still offered

#### Scenario: Direct Bluetooth search
- **WHEN** the user activates "Find nearby computer" while the remembered address is unreachable
- **THEN** Bluetooth discovery starts immediately and does not wait for the remembered address to time out

#### Scenario: Live Bluetooth link after a network change
- **WHEN** the phone still has its Bluetooth link to the helper but both devices changed networks
- **THEN** the app re-reads the rendezvous over that link and does not require a fresh scan or connection

#### Scenario: Activated during a search
- **WHEN** the user activates "Find nearby computer" while another search is running
- **THEN** the running search is cancelled and a fresh one starts

### Requirement: Local-network fallback discovery

When a stored token exists and Bluetooth discovery cannot produce a usable connection, the app SHALL look for the computer on the phone's local network by probing hosts on its own subnet and SHALL treat a host as the computer only when it accepts the stored token. On success the app SHALL connect to that host, update the remembered address, and show the new address in its connection status. It SHALL NOT treat a host that rejects the token as the computer, and SHALL NOT discard the stored token because of that rejection.

#### Scenario: Stale Bluetooth bond
- **WHEN** the phone and computer share a network, the stored token is valid, and connecting over Bluetooth fails (for example because the system bond is stale)
- **THEN** the app finds the computer on the local network, connects with the stored token, and does not ask the user to repair Bluetooth or pair again

#### Scenario: Bluetooth unavailable
- **WHEN** Bluetooth is off or unusable and the computer is reachable on the phone's network
- **THEN** the app still finds and connects to the computer using the stored token

#### Scenario: Another bridge on the network
- **WHEN** a host on the subnet answers but rejects the stored token
- **THEN** the app skips it, keeps the token, and keeps looking or reports that the computer was not found

#### Scenario: Address updated
- **WHEN** the app connects through the local-network fallback
- **THEN** the new address is remembered for later launches and shown in the connection status

#### Scenario: No local match
- **WHEN** no host on the phone's subnet accepts the stored token
- **THEN** the app reports that it could not find the computer and keeps the stored pairing

### Requirement: Session layout modes

The dashboard SHALL offer two session layouts: a compact layout that arranges session cards in a two-column grid and shows only the avatar, the working-directory name, its phase, and at most one line of current activity, and a full layout that shows one full-width card per session with the detail required by "Per-session detail". The app SHALL start in the compact layout on every launch, SHALL provide a control in the Sessions header that switches between the layouts, and SHALL NOT persist the choice. Tapping a compact card SHALL expand it to its full card in place, and tapping it again SHALL collapse it. A session with a pending permission or question SHALL stay compact in the grid and SHALL be highlighted with the attention colour and its avatar rather than expanded automatically; snip tapping it SHALL expand its full card with the controls. Both layouts SHALL use the same session order and the same empty state.

#### Scenario: Compact layout by default
- **WHEN** the app launches with several sessions
- **THEN** the sessions are shown in two columns with the compact card content in the order the dashboard requires

#### Scenario: Working directory in the compact card
- **WHEN** a session has both a title and a working directory in the compact layout
- **THEN** its compact card shows the working directory's final segment instead of the title

#### Scenario: Expand a compact card
- **WHEN** the user taps a compact session card
- **THEN** that session's full card, with its detail and controls, replaces it at full width in place

#### Scenario: Collapse an expanded card
- **WHEN** the user taps the header of an expanded card
- **THEN** it returns to its compact form

#### Scenario: Pending request stays compact
- **WHEN** a session has a pending permission or question in the compact layout
- **THEN** its compact card is highlighted with the attention colour and shows the avatar, and tapping it expands the controls

#### Scenario: Switch to the full layout
- **WHEN** the user activates the layout control
- **THEN** the dashboard shows one full-width card per session, and activating it again returns to the compact grid

#### Scenario: Layout choice is not persisted
- **WHEN** the user switches to the full layout and later relaunches the app
- **THEN** the app starts in the compact layout again

#### Scenario: Ordering preserved
- **WHEN** sessions require attention, are working, and are inactive
- **THEN** the compact grid lists them in the same order as the full layout

#### Scenario: Empty state in both layouts
- **WHEN** there are no sessions
- **THEN** the dashboard shows its empty state in either layout

#### Scenario: Themed compact card
- **WHEN** the compact layout is shown under any theme
- **THEN** compact cards use that theme's card chrome (border gradient, corners, HUD or rail treatment) and its surface, text and accent tokens, not a generic card

#### Scenario: Compact card is a control
- **WHEN** assistive technology focuses a compact session card
- **THEN** it exposes a button role whose label includes the session name and its phase

### Requirement: Agent avatars

Every session card SHALL show a procedurally generated face avatar in the compact and full layouts, and every avatar SHALL use a circular silhouette. The avatar's light seed SHALL be derived deterministically from the session, so each card's face is distinct, the same session keeps its look across renders, theme changes and launches, and it does not change with the session's phase. The avatar's surface colour SHALL be the active theme's accent colour, so all faces follow the selected theme without a separate palette. The avatar's mood SHALL follow the session phase: a running session with a current tool shows the thinking mood, a running session without one shows the working mood, a session waiting for approval or for an answer shows the observing mood, a completed session shows the done mood, an ended session shows the inactive mood, and any other phase shows the idle mood. The compact card SHALL draw a still avatar; the expanded card SHALL animate it. When the device's Reduce Motion setting is on, avatars SHALL be still. Avatars are decorative: the card's text already names the agent, so the avatar SHALL NOT add a separate screen-reader element.

#### Scenario: Mood follows the phase
- **WHEN** a running session starts or finishes a tool
- **THEN** its avatar shows the thinking mood while a tool is current, the working mood while none is, and the done mood when the session completes

#### Scenario: Waiting for the user
- **WHEN** a session is waiting for a permission or for an answer
- **THEN** its avatar shows the observing mood

#### Scenario: Inactive session
- **WHEN** a session has ended
- **THEN** its avatar shows the inactive mood

#### Scenario: Stable session identity
- **WHEN** a session is re-rendered, the theme changes, or the app is relaunched
- **THEN** its avatar stays circular and keeps the same light seed

#### Scenario: Distinct sessions
- **WHEN** two sessions are shown, even under the same agent
- **THEN** their avatars differ in their light seed while both remain circular

#### Scenario: Theme colour
- **WHEN** the user changes the interface theme
- **THEN** every avatar uses the new theme's accent colour

#### Scenario: Still in the grid, alive when expanded
- **WHEN** a card is compact
- **THEN** its avatar is drawn still; when the card is expanded, its avatar animates

#### Scenario: Reduce Motion
- **WHEN** Reduce Motion is enabled on the device
- **THEN** avatars do not animate in either layout

#### Scenario: Avatar in the preview
- **WHEN** the user opens the demo or card preview
- **THEN** the sample session cards show avatars too
