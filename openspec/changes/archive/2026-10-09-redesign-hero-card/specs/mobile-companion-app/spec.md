# Spec Delta

## ADDED Requirements

### Requirement: Hero attention summary

The app SHALL present, at the top of the dashboard, a hero that leads with the number of agents that need the user — the sessions waiting for approval or for an answer — shows the number of working agents secondarily, and, when no agent needs the user, presents a calm all-clear status instead of a bare zero.

#### Scenario: An agent needs the user
- **WHEN** one or more agents are waiting for approval or for an answer
- **THEN** the hero shows that count as its primary figure, visually distinct from working activity

#### Scenario: Nothing needs the user but agents work
- **WHEN** no agent is waiting but one or more are working
- **THEN** the hero shows an all-clear status and the working count

#### Scenario: Nothing is active
- **WHEN** no agents are active
- **THEN** the hero shows a calm idle status and a working count of zero

#### Scenario: Live update
- **WHEN** the aggregate changes while the app is in the foreground
- **THEN** the hero reflects the new counts without a manual refresh

### Requirement: Jump to agents needing attention

When at least one agent needs the user, the hero SHALL offer a control that moves the user to those agents (the sessions waiting for approval or for an answer); when no agent needs the user, the hero SHALL NOT show that control.

#### Scenario: Control shown while waiting
- **WHEN** an agent is waiting for approval or for an answer
- **THEN** the hero shows a control to reach the waiting agents

#### Scenario: Control brings the waiting agents into view
- **WHEN** the user activates the control
- **THEN** the dashboard brings the agents waiting for attention into view

#### Scenario: Control hidden when clear
- **WHEN** no agent needs the user
- **THEN** the hero does not show the control

### Requirement: Collapsible sticky hero

As the user scrolls the dashboard, the app SHALL collapse the hero into a compact form pinned to the top of the screen and expand it back as the user scrolls up, with the transition driven by the scroll position. In the compact form the app SHALL show the app mark with a pill naming the connected server on the leading side and, aligned to the trailing side, one colored dot per attention state — working, permission, question, and inactive — with that state's session count.

#### Scenario: Collapses on scroll
- **WHEN** the user scrolls the dashboard so the hero leaves view
- **THEN** the hero collapses into the compact form pinned to the top

#### Scenario: Expands on scroll back
- **WHEN** the user scrolls back toward the top
- **THEN** the hero expands to its full form

#### Scenario: Transition follows the scroll
- **WHEN** the user scrolls partially through the hero
- **THEN** the collapse follows the scroll position continuously rather than snapping

#### Scenario: Compact content
- **WHEN** the hero is in the compact form
- **THEN** it shows the app mark, the connected server, and, on the right, the colored state dots with their session counts

### Requirement: Disconnect from the server

While paired, the app SHALL let the user disconnect from the currently connected server from the dashboard's connection indicator, asking the user to confirm. On confirmation the app SHALL stop receiving agent activity and remain disconnected until the user connects again.

#### Scenario: Dialog from the connection indicator
- **WHEN** the user taps the connection indicator while connected
- **THEN** the app asks whether to disconnect from that server

#### Scenario: Confirmed disconnect
- **WHEN** the user confirms the disconnect
- **THEN** the app stops receiving agent activity and shows the disconnected, unpaired state

#### Scenario: Stays disconnected
- **WHEN** the app returns to the foreground after a manual disconnect
- **THEN** it does not reconnect on its own

#### Scenario: Cancelled disconnect
- **WHEN** the user dismisses the confirmation
- **THEN** the connection stays as it was
