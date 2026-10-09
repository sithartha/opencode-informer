# Spec Delta

## ADDED Requirements

### Requirement: Question option details

The bridge SHALL carry, for every offered question option, the option's label and, when OpenCode provides them, its value and description, in both the snapshot and the `question.asked` stream event, so clients can show what each option means.

#### Scenario: Option with a description
- **WHEN** OpenCode offers an option that has a description
- **THEN** the bridge reports that option with its label, value, and description in the snapshot and the stream event

#### Scenario: Option without a description
- **WHEN** OpenCode offers an option without a description
- **THEN** the bridge reports the option with its label and value and omits the description

#### Scenario: No offered option is dropped
- **WHEN** a question offers several options
- **THEN** every offered option appears in the snapshot and the stream event

### Requirement: Activity text preserved while a question is pending

While a session has a pending question, the bridge SHALL NOT overwrite the session's activity text with the question title, and SHALL append new activity text to the existing text instead of replacing it. When the question is resolved, the bridge SHALL resume replacing the activity text with the latest value.

#### Scenario: Question does not overwrite the message
- **WHEN** a form (question) is created after the assistant produced text
- **THEN** the session's activity text remains that text and is not set to the question title

#### Scenario: New activity is appended
- **WHEN** new activity text arrives while a question is pending
- **THEN** the bridge reports the existing text plus the new text, not only the new text

#### Scenario: Normal after resolution
- **WHEN** the question is resolved
- **THEN** later activity text replaces the previous text again

### Requirement: Pairing code and attempt limiting

The bridge SHALL generate a short pairing code, provide it to the local helper for display, and SHALL require a client pairing request to carry that current code before creating an approval. The bridge SHALL NOT include the code in any payload sent to a mobile client. The bridge SHALL limit repeated pairing requests and SHALL temporarily reject a source after repeated failed or missing codes.

#### Scenario: Valid code
- **WHEN** a client requests pairing with the current code
- **THEN** the bridge creates a pending approval for the user to confirm

#### Scenario: Missing or wrong code
- **WHEN** a client requests pairing without the current code or with a wrong one
- **THEN** the bridge rejects the request without creating an approval

#### Scenario: Code is not sent to clients
- **WHEN** the bridge provides the pairing code
- **THEN** it is delivered only to the helper and never to a mobile client

#### Scenario: Repeated failures are limited
- **WHEN** a source repeatedly fails the code check
- **THEN** the bridge temporarily rejects further pairing requests from that source

### Requirement: Session cost in the snapshot

The bridge SHALL report each session's accumulated cost (spent) in the snapshot and SHALL update it as turns complete, and SHALL omit it when OpenCode does not report a cost.

#### Scenario: Cost reported
- **WHEN** a session has an accumulated cost
- **THEN** the snapshot reports it and reflects a later increase

#### Scenario: Cost changes streamed
- **WHEN** a session's cost increases
- **THEN** the bridge streams a session cost event for that session

#### Scenario: No cost reported
- **WHEN** OpenCode does not report a cost for a session
- **THEN** the snapshot omits the cost rather than reporting zero
