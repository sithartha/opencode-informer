# Spec Delta

## MODIFIED Requirements

### Requirement: Start a session from the hero

The app SHALL show a "+" control beside the hero's active-agent count that starts a new session through the bridge and opens a prompt field for it. Before creating the session the app SHALL let the user choose its mode (agent) and then its model from the modes and models the bridge reports, and SHALL then create the session with that selection. When the bridge reports no modes or no models, the app SHALL skip that step rather than block the start.

#### Scenario: Start while connected
- **WHEN** the user taps "+" while connected to the bridge
- **THEN** the app lets the user choose a mode and a model and then requests a new session, its card appears, and the user can type and send its first prompt

#### Scenario: Choose mode and model before starting
- **WHEN** the user starts a session and the bridge reports modes and models
- **THEN** the app presents the modes first and then the models, and creates the session with the chosen mode and model

#### Scenario: No modes or models reported
- **WHEN** the user starts a session and the bridge reports no modes or no models
- **THEN** the app skips that choice and still starts the session

#### Scenario: Start while disconnected
- **WHEN** the user taps "+" while not connected
- **THEN** the app does not create a session and reports that a connection is required
