# Proposal

## Why

The phone can watch agents and answer permissions/questions, but it cannot manage a
session's lifecycle (start, stop, close) and does not show which agent (Build/Plan) or
model a session uses. Long activity text that contains links is not actionable. Today,
managing agents still requires the Mac.

## What Changes

- The bridge reports each session's agent name (e.g. Build/Plan/other) and model
  identifier, in the snapshot and as they change.
- The bridge adds authenticated lifecycle endpoints: start a new session, stop a
  session's current turn, and close (remove) a session.
- The app adds a "+" control beside the hero's active-agent count that starts a new,
  empty session and opens a prompt field for its first message.
- Each session card is labelled with its agent and model, and named with the OpenCode
  session title (the same name shown in OpenCode's session panel), falling back to the
  working directory or id.
- The bridge exposes the agents (modes) and models available to a session and accepts
  authenticated requests to switch a session's agent or model. Because OpenCode modes are
  configurable, the app never hardcodes "Build"/"Plan"; it offers whatever the bridge reports.
- The app lets the user switch a session's mode (agent) and model from its card.
- A running card gains a Stop control: it asks for confirmation, and on confirmation
  stops the current turn and presents the session as inactive with a prompt field.
- Each card gains a close "×": it asks for confirmation, and on confirmation closes
  the session.
- Activity and question text recognizes URLs and opens them in the browser.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities

- `opencode-mobile-bridge`: the session snapshot reports each session's title, agent, and
  model; the available agents (modes) and models are exposed; new authenticated session
  lifecycle endpoints (start, stop, close, switch agent/model).
- `mobile-companion-app`: a hero "+" that starts a session; per-card session title,
  agent/model labels; a mode (agent) and model switcher populated from the bridge; Stop and
  Close controls with confirmation; tappable links in messages.

## Impact

- `plugin/`: `activity.js` (capture agent/model from session step events), `server.js` and
  `bridge.js` (start/stop/close endpoints and appliers), `contract.js`, and tests.
- `contract/contract.json`: new endpoints and the snapshot's agent/model fields.
- `app/`: `src/bridgeClient.ts`, `src/useBridge.ts`, `src/components.tsx`, `src/styles.ts`,
  `src/DemoScreen.tsx`, and tests.
- OpenCode plugin API used: `ctx.session.create`, `ctx.session.get`, `ctx.session.interrupt`,
  `ctx.session.remove`, `ctx.session.switchAgent`, `ctx.session.switchModel`, `ctx.agent.list`,
  `ctx.model.list`.
- No change to the BLE doorbell, pairing, or the Live Activity.
