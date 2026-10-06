# Spec Delta

## ADDED Requirements

### Requirement: Connection loss and recovery

The app SHALL detect a lost connection with a periodic timer rather than relying only on the stream's close event: when there has been no activity for a while it SHALL probe the bridge, and if the bridge does not answer within a timeout it SHALL mark the connection lost and reconnect with backoff. On recovery it SHALL resync the snapshot so the cards are current.

#### Scenario: The Mac becomes unreachable
- **WHEN** the Mac becomes unreachable while the app is in the foreground (for example it sleeps)
- **THEN** within the timeout the app marks the connection lost and keeps retrying

#### Scenario: Recovery resyncs the cards
- **WHEN** the Mac becomes reachable again
- **THEN** the app reopens the stream and resyncs the snapshot

#### Scenario: A request that appeared while disconnected
- **WHEN** a session became pending while the app was disconnected
- **THEN** after recovery its card shows the pending request from the refreshed snapshot

### Requirement: Foreground attention haptic

While the app is in the foreground, the app SHALL vibrate the device when a new permission request or question arrives.

#### Scenario: New request in the foreground
- **WHEN** a permission request or question arrives while the app is in the foreground
- **THEN** the device vibrates

#### Scenario: No foreground haptic for other activity
- **WHEN** only tool or activity updates arrive
- **THEN** the device does not vibrate
