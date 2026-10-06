# Proposal

## Why

Starting a session from the phone (`+` by the hero) creates an OpenCode session with no
mode (agent) and no model. The card then shows the bridge's placeholder agent
(`"opencode"`) until OpenCode reports the real agent/model on the next step — and if the
user never picks one, the session may run with defaults the user did not choose. Today the
mode/model switcher only works on an existing session, so the choice is an afterthought.

## What Changes

- Starting a session becomes a **two-step choice**: pick the **mode (agent) first, then the
  model**, then create the session with that selection.
- The bridge's **start** request accepts `agent` and `model` and applies them to the new
  session (creating with them, or switching immediately after create).
- When the bridge reports no selectable modes or models, the app **skips that step** and
  starts the session directly (never blocks the start on an empty list).

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities

- `mobile-companion-app`: the hero start flow asks for a mode and then a model before
  creating the session, and skips a step when there is nothing to choose.
- `opencode-mobile-bridge`: a start request may carry the agent and model to apply to the
  new session.

## Impact

- `app/App.tsx` (start confirmation becomes a mode→model picker), `app/src/components.tsx`
  (`SwitcherModal` reused / a start variant), `app/src/sessionActions.ts` + `app/src/bridgeClient.ts`
  (`startSession` carries a selection), `app/src/useBridge.ts`.
- `plugin/src/server.js` (`POST /sessions` body), `plugin/src/bridge.js`
  (`makeStartApplier` / `startSession` with agent and model), `plugin/src/activity.js`
  (reflect the chosen agent/model as soon as the session is created).
- Tests: app start-flow (two steps, skip-when-empty), plugin start applier.

## Non-Goals

- Changing how OpenCode picks its own defaults outside the app.
- Remembering a preferred mode/model across sessions (a possible follow-up).
- Blocking a start when the options list is empty.
