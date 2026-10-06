# Proposal

## Why

OpenCode can ask several questions at once (one form with multiple fields, e.g. the
agent's `question` tool with two questions). The bridge currently collapses a form to a
single request: it takes only `fields[0]` for the prompt and, when answering, replies with
only `fields[0]`'s value (`makeQuestionApplier` uses `fields[0]` and key `q0`). The phone
therefore shows one question and cannot answer the others — the form is answered
incompletely or the reply is rejected.

## What Changes

- The bridge **models every field of a question form** as its own question (prompt,
  options, free-form flag) and presents them together as one pending request.
- `question.asked` and the snapshot gain a **`questions` list** (`[{ key, title, summary?,
  options, allowFreeform }]`); the existing `title`/`summary`/`options`/`allowFreeform`
  mirror the first question so older clients still show one question.
- The phone **renders all questions of a request** and collects an answer for each, then
  submits them in a single resolution (`{ requestID, answers: { <key>: <text> } }`).
- The bridge **requires every question to be answered** before applying the form reply,
  so the agent never receives a partial form.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities

- `opencode-mobile-bridge`: a form's questions are exposed in the snapshot and the event,
  and a resolution carries an answer per question.
- `mobile-companion-app`: the app answers multi-question forms, and the notification for
  such a form routes to the app instead of offering one question's options.

## Impact

- `plugin/src/activity.js` (build `questions` from `form.fields`; keep them in `pending`),
  `plugin/src/bridge.js` (build the whole `Form.Answer`), `plugin/src/resolution.js`
  (accept `answers`), `plugin/src/server.js` (`POST /resolution` body).
- `app/src/events.ts` (`PendingRequest.questions`), `app/src/components.tsx` (multi-question
  card), `app/src/bridgeClient.ts` (resolution body), `app/src/useBridge.ts`,
  `app/src/notifications.ts` / `app/src/pushNotifications.ts`.
- `contract/contract.json` (+ `app/src/contract.json`): `question.asked` schema and a fixture.

## Non-Goals

- Changing how OpenCode renders questions on the Mac.
- Async/partial answers or editing a form after submission.
- Multi-select beyond what a field already declares (`type: "multiselect"` is preserved).
