# Design

## Context

OpenCode's `form.created` event carries `form.fields[]`, each with `key`, `title`/
`description`, `options[]` (`{label,value}`), `custom`, and `type`. Today
`plugin/src/activity.js` (form.created) flattens all fields' options and derives one
title from `fields[0]`; `plugin/src/bridge.js` (`makeQuestionApplier`) answers with only
`fields[0]` under key `q0`; `app/src/events.ts` builds a single-option `PendingRequest`.
So a multi-question form is shown and answered as if it were one question.

## Goals / Non-Goals

**Goals:** expose every question; answer the whole form in one reply; keep older clients
working (they still see the first question).

**Non-Goals:** partial/async answers; changing OpenCode's own rendering; rich field types
beyond options + free-form/multiselect.

## Decisions

### `questions[]` on the request, first question mirrored

- **Choice**: add `questions: [{ key, title, summary?, options: string[], allowFreeform:
  boolean }]` to `question.asked` and the snapshot; keep `title`, `summary`, `options`,
  `allowFreeform` equal to `questions[0]`.
- **Why**: additive and backward compatible; an older app still shows and answers the first
  question, while the new app shows all.
- **Alternatives**: replace the flat fields (breaks older clients); a nested form object
  (more churn).

### Resolution carries `answers` keyed by question

- **Choice**: `POST /resolution` body `{ requestID, action?, answers? }`; `answers` is an
  object `{ <key>: <text> }`. The bridge builds `Form.Answer` by running each field through
  `buildFormAnswer(field, answers[field.key])` (which already maps labels to option values
  and handles `multiselect`). `action` remains for permissions and single answers.
- **Why**: minimal change to the existing endpoint and coordinator; the per-field mapping
  logic already exists in `serviceReply.js`.
- **Completeness**: a question resolution is applied only if every question has a
  non-empty answer; otherwise it is rejected as `invalid_action`, so the agent never gets a
  partial form.

### App: per-question controls, submit for multi

- **Choice**: `PendingRequest.questions?`. A single question keeps today's one-tap
  behavior (selecting an option resolves immediately). A form with several questions
  renders each question with its own option buttons or free-form input and a **Submit**
  control that is disabled until every question is answered; Submit sends
  `{ requestID, answers }`.
- **Why**: preserve the fast path for the common single question; make multi unambiguous.
- **Alternatives**: always require Submit (slower for one question).

### Notifications route multi-question forms into the app

- **Choice**: a single-question notification keeps its option actions; a multi-question
  form raises a notification with one action that opens the app.
- **Why**: iOS action buttons cannot express "answer five questions"; routing to the app is
  unambiguous.

## Risks / Trade-offs

- [Older app sees only the first question] → acceptable and non-breaking; the bridge still
  requires all answers, so an old client can fail to complete a multi-question form — it
  will get `invalid_action` and the user answers on the Mac instead.
- [Field keys missing] → fall back to a stable index-based key so answers still map.
- [Free-form vs options] → `allowFreeform` per question, derived from `custom` or the
  absence of options.

## Migration Plan

Additive contract change; deploy the plugin and app together. No data migration.
