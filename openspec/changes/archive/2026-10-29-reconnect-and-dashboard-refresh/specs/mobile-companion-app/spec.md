# Spec Delta

## MODIFIED Requirements

### Requirement: Connection loss and recovery

The app SHALL detect a lost connection with a periodic timer rather than relying only on the stream's close event: when there has been no activity for a while it SHALL probe the bridge, and if the bridge does not answer within a timeout it SHALL mark the connection lost and reconnect with backoff. On recovery it SHALL resync the snapshot so the cards are current.

The app SHALL also re-resolve the computer's address when the phone's network changes: on a network change it SHALL re-read the rendezvous address over Bluetooth and connect to that address with the stored token, without asking the user to pair again. It SHALL re-read the address the same way after three consecutive unsuccessful reconnect attempts to the remembered address. An address resolved this way SHALL become the remembered address. The app SHALL NOT discard the stored token merely because a newly discovered address rejects it, and SHALL NOT start Bluetooth discovery while the remembered address keeps answering.

#### Scenario: The Mac becomes unreachable
- **WHEN** the Mac becomes unreachable while the app is in the foreground (for example it sleeps)
- **THEN** within the timeout the app marks the connection lost and keeps retrying

#### Scenario: Recovery resyncs the cards
- **WHEN** the Mac becomes reachable again
- **THEN** the app reopens the stream and resyncs the snapshot

#### Scenario: A request that appeared while disconnected
- **WHEN** a session became pending while the app was disconnected
- **THEN** after recovery its card shows the pending request from the refreshed snapshot

#### Scenario: Network change moves the computer
- **WHEN** the computer changes networks, its bridge address changes, and the app observes a network change on the phone
- **THEN** the app re-reads the address over Bluetooth, connects to the new address, and resumes live updates without a manual action or a new pairing

#### Scenario: Address re-read from an existing Bluetooth link
- **WHEN** the phone is still connected to the helper over Bluetooth after the network change
- **THEN** the app re-reads the rendezvous over that link instead of requiring a fresh scan

#### Scenario: Repeated failures trigger discovery
- **WHEN** reconnecting to the remembered address fails three times in a row
- **THEN** the app re-reads the address over Bluetooth before its next attempt

#### Scenario: New address is remembered
- **WHEN** the app resolves a new address after a network change and connects successfully
- **THEN** that address is stored as the remembered address for later launches and foreground returns

#### Scenario: A token the computer rejects
- **WHEN** the computer the helper points at rejects the stored token during recovery
- **THEN** the app stops automatic retrying, keeps the stored token, and offers the pairing code instead of discarding the pairing

#### Scenario: Bluetooth unavailable during recovery
- **WHEN** the address cannot be re-read because Bluetooth is unavailable or scanning fails
- **THEN** the app stays disconnected, keeps retrying the remembered address with backoff, and reports the failure without terminating

#### Scenario: No needless discovery
- **WHEN** the network changes but the remembered address still answers
- **THEN** the app keeps the current address and does not require a Bluetooth scan

### Requirement: Connect to the last computer first

The app SHALL remember the address of the last computer it connected to and, on launch or when returning to the foreground while not connected, SHALL try that address first before any Bluetooth discovery. The app SHALL fall back to Bluetooth discovery when the remembered address is unreachable. When the remembered address answers but rejects the stored token, the app SHALL NOT discard the pairing on that basis alone: it SHALL re-read the computer's address over Bluetooth and try the stored token there. When the address the helper points at also rejects the stored token, the app SHALL stop automatic reconnection, SHALL keep the stored token, and SHALL offer the pairing code so the user can pair again. A code entered while a stored token exists SHALL replace that token.

#### Scenario: Remembered address is reachable
- **WHEN** the app launches with a stored token and a remembered address that answers
- **THEN** it connects to that address without waiting for Bluetooth discovery

#### Scenario: Remembered address is unreachable
- **WHEN** the remembered address does not answer
- **THEN** the app falls back to Bluetooth discovery and then to manual connection

#### Scenario: Remembered token is revoked
- **WHEN** the remembered address answers but rejects the stored token
- **THEN** the app keeps the token, tries the address the helper points at, and offers pairing only if that address also rejects it

#### Scenario: Remembered address now belongs to another computer
- **WHEN** the remembered address answers with a rejection of the stored token, but the computer the helper points at accepts it
- **THEN** the app keeps the pairing and connects to the helper's address instead of asking for a new code

#### Scenario: The paired computer rejects the token
- **WHEN** the address the helper points at also rejects the stored token
- **THEN** the app stops retrying automatically and offers the code shown on the computer without discarding the stored token

#### Scenario: Token survives a bridge restart
- **WHEN** the bridge restarted and kept its pairing record
- **THEN** the app reconnects with the stored token and does not ask for a code

#### Scenario: Entering a code replaces an old token
- **WHEN** a stored token exists and the user enters a new pairing code
- **THEN** the app pairs again and replaces the stored token instead of retrying the old one

## ADDED Requirements

### Requirement: Neutral connection action labels

The app SHALL label its Bluetooth connection action with wording that names neither a computer vendor nor a single operating system, using "Find nearby computer" as the label, and SHALL keep a separate action for entering an address manually. Activating the action SHALL search for a nearby computer over Bluetooth immediately instead of first retrying the remembered address, and activating it while a search is already running SHALL cancel that search and start a fresh one.

#### Scenario: Primary connection action
- **WHEN** the app is not paired and the user opens the dashboard
- **THEN** the Bluetooth connection action is labelled "Find nearby computer"

#### Scenario: Manual alternative
- **WHEN** the app is not paired and the user opens the dashboard
- **THEN** a separate action to connect by address is still offered

#### Scenario: Direct Bluetooth search
- **WHEN** the user activates "Find nearby computer" while the remembered address is unreachable
- **THEN** Bluetooth discovery starts immediately and does not wait for the remembered address to time out

#### Scenario: Live Bluetooth link after a network change
- **WHEN** the phone still has its Bluetooth link to the helper but both devices changed networks
- **THEN** the app re-reads the rendezvous over that link and does not require a fresh scan or connection

#### Scenario: Activated during a search
- **WHEN** the user activates "Find nearby computer" while another search is running
- **THEN** the running search is cancelled and a fresh one starts

### Requirement: Local-network fallback discovery

When a stored token exists and Bluetooth discovery cannot produce a usable connection, the app SHALL look for the computer on the phone's local network by probing hosts on its own subnet and SHALL treat a host as the computer only when it accepts the stored token. On success the app SHALL connect to that host, update the remembered address, and show the new address in its connection status. It SHALL NOT treat a host that rejects the token as the computer, and SHALL NOT discard the stored token because of that rejection.

#### Scenario: Stale Bluetooth bond
- **WHEN** the phone and computer share a network, the stored token is valid, and connecting over Bluetooth fails (for example because the system bond is stale)
- **THEN** the app finds the computer on the local network, connects with the stored token, and does not ask the user to repair Bluetooth or pair again

#### Scenario: Bluetooth unavailable
- **WHEN** Bluetooth is off or unusable and the computer is reachable on the phone's network
- **THEN** the app still finds and connects to the computer using the stored token

#### Scenario: Another bridge on the network
- **WHEN** a host on the subnet answers but rejects the stored token
- **THEN** the app skips it, keeps the token, and keeps looking or reports that the computer was not found

#### Scenario: Address updated
- **WHEN** the app connects through the local-network fallback
- **THEN** the new address is remembered for later launches and shown in the connection status

#### Scenario: No local match
- **WHEN** no host on the phone's subnet accepts the stored token
- **THEN** the app reports that it could not find the computer and keeps the stored pairing

### Requirement: Session layout modes

The dashboard SHALL offer two session layouts: a compact layout that arranges session cards in a two-column grid and shows only the avatar, the working-directory name, its phase, and at most one line of current activity, and a full layout that shows one full-width card per session with the detail required by "Per-session detail". The app SHALL start in the compact layout on every launch, SHALL provide a control in the Sessions header that switches between the layouts, and SHALL NOT persist the choice. Tapping a compact card SHALL expand it to its full card in place, and tapping it again SHALL collapse it. A session with a pending permission or question SHALL stay compact in the grid and SHALL be highlighted with the attention colour and its avatar rather than expanded automatically; snip tapping it SHALL expand its full card with the controls. Both layouts SHALL use the same session order and the same empty state.

#### Scenario: Compact layout by default
- **WHEN** the app launches with several sessions
- **THEN** the sessions are shown in two columns with the compact card content in the order the dashboard requires

#### Scenario: Working directory in the compact card
- **WHEN** a session has both a title and a working directory in the compact layout
- **THEN** its compact card shows the working directory's final segment instead of the title

#### Scenario: Expand a compact card
- **WHEN** the user taps a compact session card
- **THEN** that session's full card, with its detail and controls, replaces it at full width in place

#### Scenario: Collapse an expanded card
- **WHEN** the user taps the header of an expanded card
- **THEN** it returns to its compact form

#### Scenario: Pending request stays compact
- **WHEN** a session has a pending permission or question in the compact layout
- **THEN** its compact card is highlighted with the attention colour and shows the avatar, and tapping it expands the controls

#### Scenario: Switch to the full layout
- **WHEN** the user activates the layout control
- **THEN** the dashboard shows one full-width card per session, and activating it again returns to the compact grid

#### Scenario: Layout choice is not persisted
- **WHEN** the user switches to the full layout and later relaunches the app
- **THEN** the app starts in the compact layout again

#### Scenario: Ordering preserved
- **WHEN** sessions require attention, are working, and are inactive
- **THEN** the compact grid lists them in the same order as the full layout

#### Scenario: Empty state in both layouts
- **WHEN** there are no sessions
- **THEN** the dashboard shows its empty state in either layout

#### Scenario: Themed compact card
- **WHEN** the compact layout is shown under any theme
- **THEN** compact cards use that theme's card chrome (border gradient, corners, HUD or rail treatment) and its surface, text and accent tokens, not a generic card

#### Scenario: Compact card is a control
- **WHEN** assistive technology focuses a compact session card
- **THEN** it exposes a button role whose label includes the session name and its phase

### Requirement: Agent avatars

Every session card SHALL show a procedurally generated face avatar in the compact and full layouts, and every avatar SHALL use a circular silhouette. The avatar's light seed SHALL be derived deterministically from the session, so each card's face is distinct, the same session keeps its look across renders, theme changes and launches, and it does not change with the session's phase. The avatar's surface colour SHALL be the active theme's accent colour, so all faces follow the selected theme without a separate palette. The avatar's mood SHALL follow the session phase: a running session with a current tool shows the thinking mood, a running session without one shows the working mood, a session waiting for approval or for an answer shows the observing mood, a completed session shows the done mood, an ended session shows the inactive mood, and any other phase shows the idle mood. The compact card SHALL draw a still avatar; the expanded card SHALL animate it. When the device's Reduce Motion setting is on, avatars SHALL be still. Avatars are decorative: the card's text already names the agent, so the avatar SHALL NOT add a separate screen-reader element.

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
- **THEN** its avatar stays circular and keeps the same light seed

#### Scenario: Distinct sessions
- **WHEN** two sessions are shown, even under the same agent
- **THEN** their avatars differ in their light seed while both remain circular

#### Scenario: Theme colour
- **WHEN** the user changes the interface theme
- **THEN** every avatar uses the new theme's accent colour

#### Scenario: Still in the grid, alive when expanded
- **WHEN** a card is compact
- **THEN** its avatar is drawn still; when the card is expanded, its avatar animates

#### Scenario: Reduce Motion
- **WHEN** Reduce Motion is enabled on the device
- **THEN** avatars do not animate in either layout

#### Scenario: Avatar in the preview
- **WHEN** the user opens the demo or card preview
- **THEN** the sample session cards show avatars too
