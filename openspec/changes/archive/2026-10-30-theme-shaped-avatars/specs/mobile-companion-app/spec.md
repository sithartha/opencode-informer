# Spec Delta

## MODIFIED Requirements

### Requirement: Agent avatars

Every session card SHALL show a procedurally generated face avatar in the compact and full layouts. The avatar's silhouette SHALL follow the selected skin's shape language: a hexagonal silhouette in Nerv, a square silhouette in Tunes and Terminal, a squircle silhouette in The Force and Classic OS, and a circular silhouette in Cat, Default and Wizard. The avatar's light seed SHALL be derived deterministically from the session, so each card's face is distinct, the same session keeps its look across renders, theme changes and launches, and it does not change with the session's phase. The avatar's surface colour SHALL follow the session's mode: a running session uses the theme's allow colour, a permission wait the permission colour, an answer wait the question colour, a completed or ended session the muted text colour, and any other phase the theme accent. The avatar's mood SHALL follow the session phase: a running session with a current tool shows the thinking mood, a running session without one shows the working mood, a session waiting for approval or for an answer shows the observing mood, a completed session shows the done mood, an ended session shows the inactive mood, and any other phase shows the idle mood. The compact card SHALL show the working-directory name across the card's full width on top, then place a larger, animated avatar on the left with the phase and activity to its right, and SHALL NOT draw a separate status dot; the expanded card SHALL animate the avatar. When the device's Reduce Motion setting is on, avatars SHALL be still. Avatars are decorative: the card's text already names the agent, so the avatar SHALL NOT add a separate screen-reader element.

#### Scenario: Silhouette follows the skin shape

- **WHEN** a session card is shown under any skin
- **THEN** its avatar is a hexagon under Nerv, a square under Tunes or Terminal, a squircle under The Force or Classic OS, and a circle under Cat, Default or Wizard

#### Scenario: Mood follows the phase

- **WHEN** a running session starts or finishes a tool
- **THEN** its avatar shows the thinking mood while a tool is current, the working mood while none is, and the done mood when the session completes

#### Scenario: Waiting for the user

- **WHEN** a session is waiting for a permission or for an answer
- **THEN** its avatar shows the observing mood

#### Scenario: Inactive session

- **WHEN** a session has ended
- **THEN** its avatar shows the inactive mood

#### Scenario: Stable session identity

- **WHEN** a session is re-rendered, the theme changes, or the app is relaunched
- **THEN** its avatar keeps the same light seed for that session and the silhouette the selected skin defines

#### Scenario: Distinct sessions

- **WHEN** two sessions are shown, even under the same agent
- **THEN** their avatars differ in their light seed while both use the skin's silhouette

#### Scenario: Theme colour

- **WHEN** the user changes the interface skin
- **THEN** every avatar adopts that skin's silhouette — a hexagon in Nerv, a square in Tunes and Terminal, a squircle in The Force and Classic OS, a circle in Cat, Default and Wizard — and its chrome follows the new theme's tokens

#### Scenario: Mode colour

- **WHEN** a session moves between running, permission, question, and settled states
- **THEN** its avatar switches to the matching mode colour while its seed and silhouette stay the same

#### Scenario: Compact card arrangement

- **WHEN** a session is shown in the compact grid
- **THEN** its working-directory name spans the card's full width on top, and below it an enlarged avatar sits on the left with the phase and activity to its right, with no separate status dot

#### Scenario: Still in the grid, alive when expanded

- **WHEN** a card is compact or expanded
- **THEN** its avatar animates in both layouts (larger in the compact grid), while Reduce Motion still stops it

#### Scenario: Reduce Motion

- **WHEN** Reduce Motion is enabled on the device
- **THEN** avatars do not animate in either layout

#### Scenario: Avatar in the preview

- **WHEN** the user opens the demo or card preview
- **THEN** the sample session cards show avatars too
