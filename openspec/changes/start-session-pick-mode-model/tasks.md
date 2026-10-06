# Tasks

## 1. Bridge: start with a mode and a model

- [ ] 1.1 `plugin/src/server.js`: read optional `agent` and `model` from the `POST /sessions` body and pass them to `startSession`
- [ ] 1.2 `plugin/src/bridge.js`: `makeStartApplier`/`startSession` accept `{ title, agent, model }`, create the session, and apply the agent/model with the same `ctx.session.switchAgent` / `switchModel` calls the switch applier uses
- [ ] 1.3 Unit test: starting with an agent and a model applies both to the created session; starting without them is unchanged

## 2. App: choose mode then model on start

- [ ] 2.1 `app/src/sessionActions.ts` + `app/src/bridgeClient.ts`: `postStart`/`startSession` carry an optional `{ agent, model }` in the start body
- [ ] 2.2 `app/App.tsx`: on "+", load the options and open the existing `SwitcherModal` for a draft selection (mode first, then model); on confirmation call `startSession` with the selection
- [ ] 2.3 Skip the mode or model step when `loadOptions` reports none, and start directly (never block); still start directly when the bridge reports no options at all
- [ ] 2.4 Test: the start flow collects a mode and a model and sends both; an empty options list starts without prompting

## 3. Verification

- [ ] 3.1 `node --test contract/`, `cd plugin && npm test`, `cd app && npm test` / `npx jest` / `npx tsc --noEmit` pass
- [ ] 3.2 On device: starting a session asks for a mode then a model, and the new card shows the chosen mode and model
