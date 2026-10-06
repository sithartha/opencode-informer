# Tasks

## 1. Contract

- [x] 1.1 Add a `questions` field to the `question.asked` schema in `contract/contract.json`: an array of `{ key, title, summary?, options, allowFreeform }`, plus a `question` and a `resolution.answers` schema; keep the flat `title`/`options`/`allowFreeform` as the first question (the unused `app/src/contract.json` copy is left as-is; the app's live mirror is `app/src/contract.ts`)
- [x] 1.2 Add `question.asked.multi` and `resolution.answers` fixtures; the contract validator accepts them

## 2. Bridge: model and answer every question

- [x] 2.1 In `plugin/src/activity.js`, build `questions` from `form.fields` (key with an index fallback, title/description, per-field options, `allowFreeform` from `custom` or no options), store them on `pending`, expose them in `snapshot()`, and include them in the `question.asked` event
- [x] 2.2 In `plugin/src/resolution.js`, accept an `answers` object for question requests and require an answer for every question (reject an incomplete form as `invalid_action`), passing `answers` and `fields` to the applier
- [x] 2.3 In `plugin/src/bridge.js`, make `makeQuestionApplier` build the `Form.Answer` for every field via `buildFormAnswer(field, answers[field.key])` (fall back to `action` for the first question)
- [x] 2.4 In `plugin/src/server.js`, pass `body.answers` through the `/resolution` handler
- [x] 2.5 Unit tests: `form.created` with two fields yields two questions in the event and snapshot; resolving with both answers applies a keyed `Form.Answer`; resolving with one answer is rejected

## 3. App: render and answer multi-question forms

- [x] 3.1 `app/src/events.ts`: add `questions?: Question[]` to `PendingRequest`, export `parseQuestions`, and parse `data.questions` (synthesize a single question from the flat fields when absent)
- [x] 3.2 `app/src/components.tsx`: render every question of a request with its own controls; for a multi-question form add a `MultiQuestionForm` with a Submit control disabled until every question is answered; keep the one-tap behavior for a single question
- [x] 3.3 `app/src/bridgeClient.ts` + `app/src/useBridge.ts`: `postAnswers` and an extended `resolve(requestID, action, answers?)` that sends `{ requestID, answers }` for multi-question forms (and keeps `action` for permissions/single)
- [x] 3.4 `app/src/notifications.ts`: for a multi-question form, raise a notification with a single open-the-app action instead of per-option actions
- [x] 3.5 Tests: a two-question request renders both and submits both answers; `parseQuestions`/`applyEvent`/`stateFromSnapshot` expose the questions

## 4. Verification

- [x] 4.1 `node --test contract/`, `cd plugin && npm test`, `cd app && npm test` / `npx jest` / `npx tsc --noEmit` pass
- [ ] 4.2 On device: an agent that asks two questions shows both on the phone and a single Submit; the agent receives all answers
