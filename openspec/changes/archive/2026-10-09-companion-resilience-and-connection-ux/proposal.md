# Proposal

## Why

Using the companion against real OpenCode surfaced several gaps that hurt trust in it:

- After a long idle period the app can terminate without any visible error, leaving the
  user no explanation and no way to diagnose what happened.
- While a question is pending, the bridge overwrites the session's activity text with the
  question title, so a long assistant message the user is reading is replaced mid-scroll
  by the question header.
- Question answer options almost always carry a description, but the bridge drops it and
  the app has no place to show it; long descriptions are not handled at all.
- The session card shows the full working-directory path instead of a readable directory
  name.
- Every launch starts with Bluetooth discovery even though the phone has already paired
  with a Mac it could reconnect to directly.
- Connecting by address is a raw `host:port` field with no explanation.
- The bridge's pairing endpoint accepts requests from any LAN host with no code and no
  rate limit, so an unauthorized device can spam pairing prompts or probe the LAN path.

## What Changes

- **Idle stability and diagnostics**: the app records a durable breadcrumb (lifecycle,
  connection state, last JavaScript error) across launches, marks a previous run that
  never returned to the foreground as ended unexpectedly, shows the last diagnostic in
  Settings, and catches background notification/reconnect failures instead of letting
  them escape as unhandled.
- **Recent activity history**: the app shows the session's latest activity message and can
  reveal the previous two; before a pending question it shows the recent messages so the
  context is visible, and the question title never replaces them.
- **Option descriptions**: a question option carries its label, value, and description
  through the contract; the app renders the label with the description beneath it and
  keeps long descriptions readable (wrapping/expanding). Notifications keep using labels.
- **Directory name on the card**: each session card shows the working directory's name
  (its final path segment), and never the full path.
- **Session cost (spent)**: the bridge reports each session's accumulated cost and the
  app shows the amount spent on the session card.
- **Remember the last computer**: the app stores the last bridge address it reached and
  tries it first on launch and on foreground, falling back to Bluetooth discovery and
  then to manual entry only when it is unreachable.
- **Manual connection dialog**: connecting by address moves into a modal that explains
  when to use it and splits the input into separate address and port fields.
- **LAN access protection**: pairing requires a short code that the bridge generates and
  shows only on the Mac (never to the phone), which the phone prompts the user to enter,
  plus rate limiting and a temporary lockout of repeated failed attempts. The helper
  surfaces the code for approval.
- **BREAKING (wire contract)**: question options change from a plain list of strings to
  `{ label, value?, description? }` objects in the snapshot and the stream.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities

- `mobile-companion-app`: idle-session diagnostics; directory name on the session card;
  connect to the remembered computer first; manual connection dialog; option descriptions;
  activity text that stays stable while a question is unanswered; pairing-code entry; the
  session's spent cost on the card; a recent-activity history.
- `opencode-mobile-bridge`: option descriptions in the contract; activity text preserved
  while a question is pending; a pairing code with rate limiting and lockout; the session's
  accumulated cost in the snapshot.
- `agent-ble-doorbell`: pairing approval surfaces the bridge's pairing code without
  forwarding it to the client.
- `companion-helper-platforms`: headless pairing approval surfaces the bridge's pairing
  code.

## Impact

- `plugin/src/activity.js` (option shape, activity preservation), `plugin/src/pairing.js`
  (codes, throttling), `plugin/src/server.js` (`/pair` code check, lockout),
  `plugin/src/bridge.js` (pass the code to the approval signal),
  `plugin/open-island-mobile.js` (entry version bump).
- `contract/contract.json` and its validator/fixtures, plus `plugin/test/*` and
  `app/test/*`.
- `app/src/events.ts`, `components.tsx`, `styles.ts`, `bridgeClient.ts`,
  `manualConnect.ts`, `secureTokenStore.ts`, `useBridge.ts`, `App.tsx`, `DemoScreen.tsx`.
- `mac-helper/` pairing prompt and the cross-platform helper's headless approval surface.
- Verification: an iOS build to the `sithPhone` device (tasks list the build step).
