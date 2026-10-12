# Spec Delta

## MODIFIED Requirements

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
