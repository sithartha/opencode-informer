# Design

## Context

See proposal.md - Why.

Current state that shapes the approach:

- `plugin/src/activity.js` builds the snapshot and hardcodes each session's `agent` as
  `"opencode"`; the model is not tracked or exposed.
- The OpenCode event stream carries the real agent and model on `session.step.started`
  (`agent: "build"`, `model: { id, providerID, variant }`); `session.created` does not.
- `plugin/src/server.js` is a dependency-free `node:http` server with bearer-token auth and
  existing `POST /resolution` and `POST /prompt` handlers; `bridge.js` wires the appliers.
- The OpenCode V2 plugin context exposes `ctx.session.create`, `ctx.session.interrupt`, and
  `ctx.session.remove`.
- The app talks to the bridge via `src/bridgeClient.ts` and `src/useBridge.ts`, renders
  `SessionCard`s from `src/components.tsx`, and already has an inline prompt field for
  inactive sessions and an interactive demo screen.

## Goals / Non-Goals

**Goals:**
- Track and expose each session's agent and model end to end.
- Add start / stop / close session controls with confirmation in the app.
- Make URLs in messages tappable.

**Non-Goals:**
- Choosing the agent or model when starting a session (the "+" starts an empty session).
- Managing multiple Macs, session history, or transcripts.
- Android parity for the new controls (iOS first).

## Decisions

### Source agent and model from session step events
- **Choice**: On `session.step.started`, store `agent` and a normalized
  `model` string (`providerID/id`, with the variant only when it is not `default`) on the
  session; include both in `snapshot()`.
- **Why**: These events carry the real values and fire on each step, so a switch to another
  agent or model is reflected without an extra API call.
- **Alternatives**: Query the session via the API on each change (extra round trip and a
  service dependency); parse other events (no agent/model present).

### Session title via ctx.session.get
- **Choice**: Resolve each session's title asynchronously through `ctx.session.get({ sessionID })`
  when a session is created or receives a prompt, cache the last value, and set it on the
  session (emitting `session.updated`). The app names the card with this title, falling back
  to the working directory or id.
- **Why**: The event stream does not carry the title, and OpenCode's own session panel name
  is what the user expects to see; `ctx.session.get` is the authoritative source.
- **Alternatives**: Derive a name from the first prompt text (may differ from OpenCode's
  generated title); query on every snapshot (adds latency to a hot path).

### Lifecycle endpoints mirroring the existing REST style
- **Choice**: Add `POST /sessions` (start; optional `{ title }`), `POST /stop`
  (`{ sessionID }`), and `POST /close` (`{ sessionID }`), all bearer-authenticated.
- **Why**: Consistent with `/resolution` and `/prompt`, easy to test, and each maps to one
  OpenCode call: `create`, `interrupt({ continue: false })`, `remove`.
- **Alternatives**: One `POST /session/{id}/action` endpoint (fewer routes but a less clear
  contract); reusing `/prompt` with a control field (overloads the prompt path).
- **Failure handling**: Injected appliers with the existing timeout; failures return
  `{ status: "not_applied", reason }` and never block agent execution (fail-open).

### Options are discovered, never hardcoded
- **Choice**: Add `GET /options?sessionID=…` returning `{ agents: string[], models: { providerID, id, variant? }[] }`,
  populated from `ctx.agent.list()` and `ctx.model.list()`; the app renders whatever the bridge returns.
- **Why**: OpenCode modes (agents) and models are user-configurable and their set is arbitrary
  and may be localized or custom; hardcoding Build/Plan would break custom configurations.
- **Alternatives**: Ship a static list (wrong for custom setups); derive from events (no such event).

### Switching agent and model
- **Choice**: Add `POST /switch` with `{ sessionID, agent? }` and/or `{ sessionID, model? }`, mapped to
  `ctx.session.switchAgent({ sessionID, agent })` and `ctx.session.switchModel({ sessionID, model })`;
  validate best-effort against the discovered options and fail open with the existing timeout.
- **Why**: One endpoint, one call per field; the card's label updates from the following step event.
- **Alternatives**: Separate endpoints per field (more routes); renaming the session (no such API).

### App controls
- **Choice**: A "+" beside the hero count starts a session and reuses the existing prompt
  field; a Stop control appears only on running cards; a "×" in each card's top-right
  closes the session; both destructive actions go through a small reusable confirmation
  modal.
- **Why**: Reuses the established prompt path and card layout; confirmation prevents
  accidental stops/closes; the state-appropriate controls keep the card uncluttered.
- **Alternatives**: Native `Alert` (less themeable, harder to test); swipe-to-close (less
  discoverable).

### Links in messages
- **Choice**: A `LinkText` component splits activity and question text on an `http(s)` URL
  regex and renders the parts as nested `Text`, opening matches with `Linking.openURL`.
- **Why**: Works inside the existing `Text` layout, keeps truncation/expand behaviour.
- **Alternatives**: A Markdown renderer dependency (heavier); per-message WebView (no).

## Risks / Trade-offs

- [Interrupt may not settle cleanly] → fail-open timeouts; the state is reconciled from the
  `session.idle`/`turn.completed` events and a resync after the action.
- [Agent/model unknown before the first step] → show the last known value, defaulting to a
  neutral label until the first step event arrives.
- [Racy create/remove] → the model already adopts unknown sessions lazily and removes on
  `session.deleted`; verify start and close do not leave phantom cards.
- [Accidental destructive taps] → confirmation modal for both stop and close.
- [Custom or localized mode names] → never hardcode; render the arbitrary names the bridge
  reports, and fall back to a neutral label if the list is empty.
- [Options or switch drift] → treat the discovered list as best-effort and the OpenCode
  events as authoritative; resync after a switch.

## Migration Plan

Additive: new endpoints and fields, no breaking changes to the contract. Rollback is
reverting the plugin and app changes; older clients ignore the new fields and endpoints.
