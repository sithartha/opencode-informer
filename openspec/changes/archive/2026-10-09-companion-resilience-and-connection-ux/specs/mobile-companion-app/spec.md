# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
