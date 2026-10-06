# Spec Delta

## MODIFIED Requirements

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

### Requirement: Per-session detail

The app SHALL present, for each session, its title (the session name OpenCode shows, falling back to its working directory or id) as the card name, its agent name and model identifier, its phase, current tool, the number of its subagents and the number of its active shells, and a compact summary of its latest activity, and SHALL render URLs in activity and question text as tappable links that open in the browser. The app SHALL show any pending question or permission for that session inline with the controls to resolve it, SHALL show at most one pending request per session, SHALL present every question of a question form with its own controls, and SHALL present state-appropriate controls: a Stop control while the session is running, and a prompt field while it is inactive.

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
