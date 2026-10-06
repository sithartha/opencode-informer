# Spec Delta

## MODIFIED Requirements

### Requirement: Staleness indication

If the aggregate cannot be refreshed, the activity SHALL indicate that the information may be out of date. If the connection remains lost beyond a short timeout, the activity SHALL replace the counts with a clear connection-lost message instead of stale numbers, and SHALL restore the current counts once the connection returns. A connection-lost message SHALL be rendered as plain status text, without the count/indicator layout.

#### Scenario: Last-known shown
- **WHEN** the connection is briefly lost while the activity is running
- **THEN** the activity briefly keeps the last-known counts with a stale indication before switching to the connection-lost message

#### Scenario: Sustained loss
- **WHEN** the connection stays lost beyond the timeout
- **THEN** the activity shows a clear connection-lost message (naming the missing OpenCode connection) instead of the counts

#### Scenario: Recovery
- **WHEN** the connection returns
- **THEN** the activity restores the current counts and breakdown
