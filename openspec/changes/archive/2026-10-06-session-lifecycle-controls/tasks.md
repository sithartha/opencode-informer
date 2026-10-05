# Tasks

## 1. Bridge: report agent and model

- [x] 1.1 Capture the agent and model from `session.step.started` in `plugin/src/activity.js` and store them on the session as `agent` and a normalized `model` (`providerID/id`, variant only when not `default`); unit tests assert both are set and update on a later step
- [x] 1.2 Include `agent` and `model` for every session in `snapshot()`; plugin snapshot test asserts the fields, including the empty case
- [x] 1.3 Reflect agent/model changes as a stream event so connected clients update; add a plugin test asserting the emitted event carries the new agent and model
- [x] 1.4 Resolve each session's title via `ctx.session.get` on create and on prompt, cache it, and expose it as `title` in the snapshot, emitting `session.updated`; plugin test asserts the title is set and a change is emitted

## 2. Bridge: session lifecycle endpoints

- [x] 2.1 Add `POST /sessions` (start; optional `{ title }`), `POST /stop` (`{ sessionID }`), and `POST /close` (`{ sessionID }`) to `plugin/src/server.js`, bearer-authenticated like `/resolution`; server test asserts `401` without a token and `accepted` with one
- [x] 2.2 Wire the appliers in `plugin/src/bridge.js`: `ctx.session.create`, `ctx.session.interrupt({ continue: false })`, `ctx.session.remove`, each wrapped with the existing apply timeout and fail-open; unit test asserts a failing OpenCode call returns `not_applied` and does not throw
- [x] 2.3 Verify stop/close reconcile state: plugin test asserts `session.idle` after a stop marks the session inactive and `session.deleted` after a close removes it

## 3. Contract and plugin docs

- [x] 3.1 Add the `sessions`, `stop`, `close`, `options`, and `switch` endpoints to `contract/contract.json` and the app's `src/contract.ts`; contract parity test passes
- [x] 3.2 Document the new endpoints and the snapshot's `agent`/`model` fields in `plugin/README.md`; verify every documented `curl` command matches the server behaviour

## 4. App: networking and state

- [x] 4.1 Add `postStart`, `postStop`, and `postClose` to `app/src/bridgeClient.ts` with URL helpers; unit tests assert the posted bodies and the `401` handling
- [x] 4.2 Add `startSession`, `stopSession`, and `closeSession` to `app/src/useBridge.ts`, each returning a boolean and resyncing state on success; unit test asserts a successful call triggers a snapshot refresh

## 5. App: hero "+" to start a session

- [x] 5.1 Render a "+" control beside the hero's active-agent count that calls `startSession`; component test asserts pressing it calls the handler and that it is disabled or reports an error when disconnected
- [x] 5.2 Ensure the new empty session appears as a card with a prompt field once the snapshot returns; component test renders a session with no activity and asserts the prompt field is present

## 6. App: agent/model label, Stop and Close

- [x] 6.1 Label each session card with its agent and model; component test asserts the label renders from the session fields
- [x] 6.5 Name each session card with the session title (falling back to the working directory or id); component test asserts the title is shown and the fallback applies when it is empty
- [x] 6.2 Add a Stop control shown only for a running session; on press open a confirmation modal, and on confirm call `stopSession`; component test covers confirm (calls handler) and dismiss (no call)
- [x] 6.3 Add a close "×" in each card's top-right; on press open a confirmation modal, and on confirm call `closeSession`; component test covers confirm and dismiss
- [x] 6.4 Add the same Start/Stop/Close controls to `src/DemoScreen.tsx` so the demo stays representative; component test exercises stop and close in the demo

## 7. App: links in messages

- [x] 7.1 Add a `LinkText` component that renders `http(s)` URLs in activity and question text as tappable links opening via `Linking.openURL`; component test asserts a URL is detected and that `Linking.openURL` is called with it, and that plain text stays plain

## 8. Bridge: agent/model options and switching

- [x] 8.1 Add `GET /options` returning the agents (modes) and models from `ctx.agent.list()` and `ctx.model.list()` for a session; server test asserts the discovered lists and `401` without a token
- [x] 8.2 Add `POST /switch` (`{ sessionID, agent? , model? }`) mapped to `ctx.session.switchAgent` and `ctx.session.switchModel`, with the existing apply timeout and fail-open; unit test asserts a successful switch and that a failing or unknown target returns `not_applied` without throwing

## 9. App: mode (agent) and model switcher

- [x] 9.1 Add `fetchOptions` and `postSwitch` to `app/src/bridgeClient.ts` and a `switchSession` wrapper to `useBridge.ts`; unit tests assert the request bodies and that a successful switch resyncs
- [x] 9.2 Add a mode/model picker to the session card populated from the bridge options, showing the current agent and model; component test asserts the options render and that selecting one calls the handler with the chosen value
- [x] 9.3 Ensure no mode name is hardcoded anywhere in the UI; component test with a custom mode name (e.g. "Reviewer") asserts it renders as-is

## 10. Integration verification

- [x] 10.1 On device against real OpenCode: start a session from "+", send a prompt, confirm the agent/model label, switch to another mode and model (including a custom one) and confirm the label updates, stop a running session and confirm it becomes inactive with a prompt field, then close it and confirm the card disappears
- [x] 10.2 Confirm live links open in Safari from a real activity message
- [x] 10.3 Update `app/README.md` with the new controls; verify the documented flow matches the device
