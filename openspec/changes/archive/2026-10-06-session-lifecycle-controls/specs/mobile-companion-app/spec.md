# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
