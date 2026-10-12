# Tasks

## 1. Bridge and contract

- [x] 1.1 In `contract/contract.json`, add `multiple` (boolean) to `schemas.question` (required,
      next to `allowFreeform`), add a `question.asked.multiselect` fixture, and update the existing
      `question.asked` / `question.asked.multi` fixtures to include `multiple`. Verify:
      `node contract/validate.mjs` and `node --test contract/contract.test.mjs` pass.
- [x] 1.2 In `plugin/src/activity.js`, set `multiple: field.type === "multiselect"` in `questionList`
      and in the flat first-question mirror, so the snapshot and `question.asked` carry it. Verify:
      `plugin/test/activity.test.js` asserts the flag for both a multiselect and a single-answer
      field.
- [x] 1.3 In `plugin/src/serviceReply.js` (and `plugin/src/resolution.js` if it normalizes the
      answer), accept a multi-answer value that is an array: map each element label→value and keep
      the array for the service reply, preserving the existing comma-joined fallback. Verify:
      `plugin/test/serviceReply.test.js` covers the array path.

## 2. App

- [x] 2.1 In `app/src/events.ts`, add `multiple: boolean` to `interface Question` and parse it in
      `parseQuestions` (single-question and multi-question shapes, plus `normalize`). Verify:
      `cd app && npm run typecheck` passes.
- [x] 2.2 In `app/src/components.tsx`, for a single question with `multiple`, render toggles (via
      `OptionButton`'s `selected`) plus a Submit control that sends the chosen options together;
      do not resolve from an option press. Extend `MultiQuestionForm` so each field with `multiple`
      toggles several options before Submit. Verify: a component test toggles two options and
      confirms the submitted resolution.
- [x] 2.3 In `app/src/useBridge.ts` / `app/src/bridgeClient.ts`, let an answer value be
      `string | string[]` and post it unchanged. Verify: `app/test/bridgeClient.test.ts` and
      `app/test/events.test.ts` pass.
- [x] 2.4 In `app/src/notifications.ts`, when a question allows several answers, raise an
      informational notification that opens the app and offers no option actions (as for a
      multi-question form). Verify: `app/test/notifications.test.ts` asserts no option actions.

## 3. Integration

- [x] 3.1 Run `node contract/validate.mjs`, `node --test plugin/test/*.test.js`,
      `cd app && npm test`, `cd app && npm run test:components`, and `cd app && npm run typecheck`.
      Verify: every command exits 0.
- [x] 3.2 Build to a device, ask a `multiselect` question from OpenCode, select two options, submit,
      and confirm the agent receives both. Verify: the app does not resolve on the first tap and the
      answer carries every selected option.
