# Spec Delta

## MODIFIED Requirements

### Requirement: Resolution of permissions and questions from the phone

The bridge SHALL accept resolutions from an authorized client and apply them to the corresponding pending permission or question: permission `allow` or `deny` decides the prompt, and a question resolution supplies the answer. When a question form has several questions, a resolution SHALL carry an answer for every question, and the bridge SHALL apply them together as one reply; the bridge SHALL reject a resolution that answers only some of a form's questions.

#### Scenario: Permission allowed
- **WHEN** a client resolves a pending permission with `allow`
- **THEN** the agent continues without waiting for a decision on the Mac

#### Scenario: Permission denied
- **WHEN** a client resolves a pending permission with `deny`
- **THEN** the tool call is rejected and the agent is notified of the denial

#### Scenario: Question answered
- **WHEN** a client resolves a pending question with one of its offered options
- **THEN** the agent receives that option as the answer and continues

#### Scenario: Duplicate or unknown resolution
- **WHEN** a client resolves a request that is unknown or already resolved
- **THEN** the bridge does not re-apply the decision and reports the request as not applicable

#### Scenario: Every question of a form answered
- **WHEN** a client resolves a form that has several questions and supplies an answer for each
- **THEN** the bridge applies all answers as a single form reply and the agent continues

#### Scenario: Incomplete form answer
- **WHEN** a client resolves a form but omits an answer for one of its questions
- **THEN** the bridge does not apply a partial reply and reports the resolution as not applicable

### Requirement: Pending requests in the snapshot

The snapshot SHALL include the currently pending permissions and questions, so a client that reconnects or is woken can reconstruct the pending state without having been connected when the request arrived. For a question form, the snapshot SHALL include every question with its prompt, options, and free-form flag, so the client can answer the whole form.

#### Scenario: Snapshot with a pending permission
- **WHEN** a permission is pending and a paired client requests the snapshot
- **THEN** the snapshot includes that permission with its session, kind, title, and summary

#### Scenario: Snapshot with a pending question
- **WHEN** a question is pending and a paired client requests the snapshot
- **THEN** the snapshot includes that question with its session, title, and options

#### Scenario: No pending requests
- **WHEN** nothing is pending
- **THEN** the snapshot reports an empty pending list

#### Scenario: Snapshot with a multi-question form
- **WHEN** a form with several questions is pending and a paired client requests the snapshot
- **THEN** the snapshot includes every question of the form with its prompt, options, and free-form flag
