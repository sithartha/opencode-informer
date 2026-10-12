# Design

## Context

The phone answers OpenCode questions through the plugin in `plugin/`: it tails OpenCode's event
stream, emits `question.asked`, serves a snapshot, and exposes a resolution API. The app in `app/`
renders the pending question from those events. The wire shape is pinned by
`contract/contract.json` and validated by `contract/validate.mjs` / `contract/contract.test.mjs`.

OpenCode marks a form field that allows several answers with `type: "multiselect"` — the plugin's
own `buildFormAnswer` (`plugin/src/serviceReply.js`) already checks that type. But
`questionList` (`plugin/src/activity.js`) rebuilds each question as
`{ key, title, summary, options, allowFreeform }` and drops `type`; `schemas.question` has no
multi flag; `app/src/events.ts` parses none; `PendingActions` (`app/src/components.tsx`) resolves
on the first option tap; and `resolve` / `postAnswers` carry `Record<string, string>`. The TUI
behaves correctly (Space toggles, Enter confirms), so the phone diverges.

## Goals / Non-Goals

**Goals:**
- Carry the multi-answer flag for a question end to end (bridge → contract → app).
- Let the phone toggle several options and submit them together, without resolving on the first tap.
- Route a multi-answer question's notification into the app.

**Non-Goals:**
- Changing single-choice questions, permissions, or the free-form flow.
- Combining free-form text with several selected options.
- Any change to the OpenCode TUI or to OpenCode itself.

## Decisions

1. **Wire flag.** Add a `multiple: boolean` to each question, in both the snapshot and the
   `question.asked` event (and the flat mirror of the first question). Derive it in `questionList`
   and in the flat `first` as `field.type === "multiselect"`. Keep it required in
   `schemas.question`, next to `allowFreeform`. *Alternative:* a `type` string — a wider surface
   needing a mapping table; rejected.
2. **Answer encoding.** For a multi-answer question the app sends the chosen options as an
   **array**; the resolution `answers` values become `string | string[]`. The plugin maps each
   element label→value (reusing the existing mapping in `buildFormAnswer`) and keeps the array
   for the service reply. Keep the current comma-joined parsing as a fallback for compatibility.
   *Alternative:* comma-joined string only — rejected: labels may contain commas and the intent is
   implicit.
3. **App controls.** Reuse `OptionButton`'s `selected` prop for toggles. A single multi-answer
   question renders toggles plus a Submit control (mirroring `MultiQuestionForm`) and does not call
   `resolve` from the option press. `MultiQuestionForm` gains per-field multi support.
4. **Notifications.** For a multi-answer question, raise an informational notification that opens
   the app (like a multi-question form), so no single option is offered as an action.
5. **Snapshot.** The pending question already carries `questions[]` with options and free-form;
   add `multiple` per question so a reconnect still offers multi-selection.

## Risks / Trade-offs

- Making `multiple` required is a wire-shape change; the bridge and app ship together and the
  fixtures are updated, so it is safe. An older client would ignore the extra field.
- Free-form combined with multi-select is out of scope; a multi-answer question that also allows
  free-form keeps the input as a single value.
- Keeping the comma fallback can mask a missed array path, so a test must assert the array path.
