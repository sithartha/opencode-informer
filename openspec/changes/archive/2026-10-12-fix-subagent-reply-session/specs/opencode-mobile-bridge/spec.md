# Spec Delta

## MODIFIED Requirements

### Requirement: Resolution of permissions and questions from the phone

The bridge SHALL accept resolutions from an authorized client and apply them to the corresponding pending permission or question: permission `allow` or `deny` decides the prompt, and a question resolution supplies the answer. When a question form has several questions, a resolution SHALL carry an answer for every question, and the bridge SHALL apply them together as one reply; the bridge SHALL reject a resolution that answers only some of a form's questions. When a question allows several answers, a resolution SHALL carry every chosen option for that question, and the bridge SHALL apply them together as one reply. The bridge SHALL apply a resolution to the session that raised the request, even when that request is presented under a parent (root) session, so a subagent's permission or question is answered in its own session.

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

#### Scenario: Permission raised by a subagent session
- **WHEN** a child (subagent) session raises a permission that is presented under its parent, and a client allows it
- **THEN** the bridge applies the decision to that child session and the agent continues

#### Scenario: Question raised by a subagent session
- **WHEN** a child (subagent) session asks a question that is presented under its parent, and a client answers it
- **THEN** the bridge applies the answer to that child session and the agent continues
