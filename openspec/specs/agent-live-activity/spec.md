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

The app SHALL start the lock-screen activity when the aggregate becomes non-zero, keep it running while the app is connected even when the aggregate returns to zero, and update it as the aggregate changes. It SHALL end the activity when the user disables it, or after the connection has been down for a prolonged period (30 minutes).

#### Scenario: First active session
- **WHEN** the aggregate changes from zero to one or more active sessions
- **THEN** the lock-screen activity is started

#### Scenario: Activity changes
- **WHEN** the aggregate changes while the activity is running
- **THEN** the displayed counts are updated

#### Scenario: All sessions end
- **WHEN** the aggregate returns to zero while the connection is up
- **THEN** the activity stays, showing that nothing is active

#### Scenario: Long disconnection
- **WHEN** the connection has been down for 30 minutes
- **THEN** the activity is ended

### Requirement: Lock-screen content

The lock-screen activity SHALL display the total number of sessions (active and inactive) and an indicator for each attention state, and SHALL make a waiting-for-approval or waiting-for-answer state visually distinct from working.

#### Scenario: Waiting is distinguishable
- **WHEN** at least one session is waiting for approval
- **THEN** the activity shows a waiting indicator distinct from the working indicator

#### Scenario: Counts are readable at a glance
- **WHEN** the activity is displayed on the Lock Screen
- **THEN** the total and the per-state counts are visible without expanding further

#### Scenario: Count includes inactive sessions
- **WHEN** the session list includes inactive sessions
- **THEN** the total counts them too

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

### Requirement: Theme-aware lock-screen activity

The lock-screen activity SHALL reflect the selected interface theme — its colors (background, title, and subtitle) and its mark — mirroring the dashboard hero as closely as the widget allows, instead of a fixed black card. The app's default branding SHALL be used for the Default theme.

#### Scenario: Activity uses the theme's colors and mark
- **WHEN** the activity is shown while a themed interface is selected
- **THEN** it uses that theme's colors and mark

#### Scenario: Default theme keeps the app branding
- **WHEN** the Default theme is selected
- **THEN** the activity uses the app's default black-and-white "OI" branding

### Requirement: Theme changes reach the activity

When the selected theme changes while the activity is running, the app SHALL re-theme the running activity, restarting it with the new theme's colors and mark when the activity's appearance cannot be changed in place. The activity SHALL NOT keep showing a previous theme once the change settles.

#### Scenario: Theme change while running
- **WHEN** the user changes the selected theme while the activity is running
- **THEN** the activity ends up showing the new theme's colors and mark

#### Scenario: Theme change while idle
- **WHEN** the user changes the selected theme with no activity running
- **THEN** the next activity starts already themed

### Requirement: Single live activity

The app SHALL keep at most one lock-screen activity at a time. Before it starts an activity to replace one that is ending — after a theme change, a reconnect, or an app relaunch — it SHALL end the previous activity first, so the Lock Screen never shows two activity cards for the app.

#### Scenario: Reconnect
- **WHEN** the connection drops and later returns while an activity is running
- **THEN** exactly one activity is shown — it is updated in place, not duplicated

#### Scenario: Theme change
- **WHEN** the user changes the theme while an activity is running
- **THEN** the previous activity is ended before the re-themed one starts, leaving exactly one

#### Scenario: Leftover from a previous run
- **WHEN** the app starts and an activity from a previous run is still present
- **THEN** the leftover is ended before the app starts a new one

#### Scenario: Toggle off and on
- **WHEN** the user disables then re-enables the activity
- **THEN** exactly one activity is present
