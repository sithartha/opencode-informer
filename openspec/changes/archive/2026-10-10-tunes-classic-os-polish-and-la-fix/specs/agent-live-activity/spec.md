# Spec Delta

## ADDED Requirements

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
