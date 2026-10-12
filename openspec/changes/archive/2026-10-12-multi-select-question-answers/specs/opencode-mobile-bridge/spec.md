# Spec Delta

## MODIFIED Requirements

### Requirement: Resolution of permissions and questions from the phone

The bridge SHALL accept resolutions from an authorized client and apply them to the corresponding pending permission or question: permission `allow` or `deny` decides the prompt, and a question resolution supplies the answer. When a question form has several questions, a resolution SHALL carry an answer for every question, and the bridge SHALL apply them together as one reply; the bridge SHALL reject a resolution that answers only some of a form's questions. When a question allows several answers, a resolution SHALL carry every chosen option for that question, and the bridge SHALL apply them together as one reply.

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

#### Scenario: Question that allows several answers answered
- **WHEN** a client resolves a question that allows several answers and supplies more than one option
- **THEN** the agent receives every supplied option as the answer and continues

## ADDED Requirements

### Requirement: Multi-select question fields

The bridge SHALL mark, for every question, whether it allows several answers, in both the snapshot and the `question.asked` stream event, deriving it from OpenCode's `multiselect` form field, so a client can offer multi-selection instead of resolving on the first choice.

#### Scenario: Field that allows several answers
- **WHEN** OpenCode creates a form whose field allows several answers
- **THEN** the bridge reports that question as multi-answer in the snapshot and the stream event

#### Scenario: Field that allows a single answer
- **WHEN** OpenCode creates a form whose field allows a single answer
- **THEN** the bridge reports that question as not multi-answer

#### Scenario: Multi-answer flag survives a reconnect
- **WHEN** a paired client reconnects while a multi-answer question is pending
- **THEN** the snapshot reports that question as multi-answer so the client can still offer multi-selection
