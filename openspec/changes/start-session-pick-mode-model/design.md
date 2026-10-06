# Design

## Context

`SwitcherModal` (`app/src/components.tsx`) already renders "Mode" (agents) then "Model" and
emits `onSelectAgent` / `onSelectModel`; it does not require a live session. `loadOptions`
already fetches the agents/models from the bridge, and the bridge already has a switch path
(`makeSwitchApplier` → `ctx.session.switchAgent` / `switchModel`). The hero start currently
goes `+` → confirm → `POST /sessions` with only a title.

## Decisions

### Reuse `SwitcherModal` for the start flow
- **Choice**: use the existing `SwitcherModal` with a draft selection instead of a new
  picker. Collect the mode, then the model, then create the session with the selection.
- **Why**: it already lists mode then model and takes plain callbacks; a new component would
  duplicate it. (Ladder rung 2: already in the codebase.)
- **Alternatives**: a dedicated start wizard (more code, drifts from the switcher).

### Start carries agent/model; the bridge creates then applies them
- **Choice**: `POST /sessions` accepts optional `agent` and `model`; the start applier
  creates the session and then applies the same `ctx.session.switchAgent` / `switchModel`
  calls the switch applier uses.
- **Why**: reuses the proven switch path and does not depend on whether
  `ctx.session.create` accepts an agent/model argument.
- **Alternatives**: rely on `create({ agent, model })` (unverified); a second client request
  to `/switch` after start (extra round trip and a visible placeholder state).

### Skip a step when its list is empty
- **Choice**: if `loadOptions` returns no modes (or no models), skip that choice and start
  with whatever is available.
- **Why**: never block the start on an empty list, and stay tolerant of a bridge that reports
  nothing.

## Risks / Trade-offs

- [Switch-after-create race] → the create handler awaits the switch before responding, so the
  snapshot reflects the choice; if the switch fails the session still exists (fail-open).
- [No remembered preference] → out of scope; the user picks each time.
