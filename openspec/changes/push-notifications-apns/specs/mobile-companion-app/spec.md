# Spec Delta

## ADDED Requirements

### Requirement: Remote push registration

The app SHALL register for remote notifications, obtain its APNs device token, and send it to the bridge while connected, re-sending it when it changes. A remote push for an attention event SHALL be presented as the same notification as the corresponding local one, with the same actions, and an event delivered both live and by push SHALL produce a single notification.

#### Scenario: Token reported to the bridge
- **WHEN** the app is connected and receives an APNs device token
- **THEN** it sends that token to the bridge

#### Scenario: Token changes
- **WHEN** the APNs device token changes
- **THEN** the app sends the new token to the bridge

#### Scenario: Remote push presented with actions
- **WHEN** the app receives an APNs push for a permission request
- **THEN** it presents a notification offering allow and deny actions

#### Scenario: No duplicate for a live event
- **WHEN** the same attention event arrives both on the live stream and as a remote push
- **THEN** the app presents only one notification for it
