# agent-live-activity Specification

## Purpose
Surface a glanceable, always-on summary of agent activity on the iPhone Lock Screen and Dynamic Island — and as an Android ongoing notification — so the user can see how many sessions are active and which are working or waiting without opening the app.

## Requirements

### Requirement: Aggregate activity state

The app SHALL compute, from the bridge snapshot, the total number of active sessions and the counts of sessions in each attention state: working (running), waiting for approval, and waiting for an answer.

#### Scenario: Mixed states
- **WHEN** the snapshot contains two running sessions, one waiting for approval, and one waiting for an answer
- **THEN** the aggregate reports a total of four with a breakdown of two working, one waiting for approval, and one waiting for an answer

#### Scenario: No active sessions
- **WHEN** no sessions are active
- **THEN** the aggregate reports a total of zero

### Requirement: Live activity lifecycle

The app SHALL start the lock-screen activity when the aggregate becomes non-zero, update it as the aggregate changes, and end it when the aggregate returns to zero.

#### Scenario: First active session
- **WHEN** the aggregate changes from zero to one or more active sessions
- **THEN** the lock-screen activity is started

#### Scenario: Activity changes
- **WHEN** the aggregate changes while the activity is running
- **THEN** the displayed counts are updated

#### Scenario: All sessions end
- **WHEN** the aggregate returns to zero
- **THEN** the lock-screen activity is ended

### Requirement: Lock-screen content

The lock-screen activity SHALL display the total active sessions and an indicator for each attention state, and SHALL make a waiting-for-approval or waiting-for-answer state visually distinct from working.

#### Scenario: Waiting is distinguishable
- **WHEN** at least one session is waiting for approval
- **THEN** the activity shows a waiting indicator distinct from the working indicator

#### Scenario: Counts are readable at a glance
- **WHEN** the activity is displayed on the Lock Screen
- **THEN** the total and the per-state counts are visible without expanding further

### Requirement: Foreground updates

While the app is in the foreground, the activity SHALL be updated as streamed events change the aggregate.

#### Scenario: Event changes the aggregate
- **WHEN** a streamed event moves a session between states while the app is in the foreground
- **THEN** the activity reflects the new counts

### Requirement: Background updates on wake

While the app is backgrounded or suspended, the activity SHALL be refreshed when a BLE doorbell wakes the app: the app SHALL refetch the snapshot and update the activity.

#### Scenario: Woken by a permission doorbell
- **WHEN** the phone is locked and receives a permission doorbell
- **THEN** the app refreshes the snapshot and the activity shows the waiting-for-approval state

#### Scenario: Refresh unreachable
- **WHEN** the app is woken but cannot reach the Mac
- **THEN** the activity keeps the last-known aggregate rather than clearing it

### Requirement: Staleness indication

If the aggregate cannot be refreshed, the activity SHALL preserve the last-known counts and SHALL indicate that the information may be out of date.

#### Scenario: Last-known shown
- **WHEN** the connection is lost while the activity is running
- **THEN** the activity continues to show the last-known counts with a stale indication

### Requirement: Android parity

On Android, the app SHALL provide a comparable always-visible summary as an ongoing notification that reports the same aggregate and updates under the same triggers where the platform permits.

#### Scenario: Ongoing summary on Android
- **WHEN** the aggregate is non-zero on Android
- **THEN** an ongoing notification shows the total and per-state counts and updates as the aggregate changes

### Requirement: Opt-out

The user SHALL be able to disable the lock-screen activity, and disabling it SHALL end any running activity.

#### Scenario: Disabled
- **WHEN** the user disables the lock-screen activity while one is running
- **THEN** the activity is ended and no new activity is started until re-enabled
