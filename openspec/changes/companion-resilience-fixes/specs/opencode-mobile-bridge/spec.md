# Spec Delta

## ADDED Requirements

### Requirement: Child sessions fold into their parent

The bridge SHALL fold a child (subagent) session into its parent and SHALL NOT present a child as a separate session, even when a row was created for it before its parent link was known. The parent's subagent count SHALL include that child.

#### Scenario: Child created with a parent
- **WHEN** a session is created with a parent session
- **THEN** it does not appear as a separate session and the parent's subagent count includes it

#### Scenario: Adopted before the parent link is known
- **WHEN** events for a child session arrive before the bridge knows its parent link
- **THEN** once the link is known the child is folded into the parent and any previously created row for it is removed

#### Scenario: Removing a leaked child row is propagated
- **WHEN** a temporary row for a child is removed on folding
- **THEN** connected clients are told the session ended so its card disappears
