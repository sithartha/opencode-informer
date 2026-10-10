# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
