# Proposal

## Why

When OpenCode asks a question whose field allows **several** answers (a `multiselect` form
field), the bridge drops that marker, so the phone renders it as a single-choice question and
resolves it on the **first** option tap. The user cannot select more than one option, and the
agent receives only the first choice. The same question works correctly in the OpenCode TUI
(Space toggles, Enter confirms), so the phone silently diverges from the desktop behavior.

## What Changes

- The bridge SHALL mark a question that allows several answers, in both the snapshot and the
  `question.asked` stream event.
- A resolution for such a question SHALL carry the list of chosen options, and the bridge SHALL
  apply them together as a single reply.
- The app SHALL let the user toggle several options for such a question and submit them together,
  and SHALL NOT resolve the question on the first option tap.
- No change to single-choice questions, permissions, or the free-form answer flow.

## Capabilities

### New Capabilities
<!-- none: this refines existing bridge and app behavior -->

### Modified Capabilities

- `opencode-mobile-bridge`: carry a multi-answer flag on question fields and accept a resolution
  that lists several options for one question.
- `mobile-companion-app`: select several options for a question that allows it and send them
  together instead of resolving on the first tap.

## Impact

- `plugin/src/activity.js` — `questionList` and the flat first question must carry the
  multi-answer flag.
- `plugin/src/serviceReply.js` / `plugin/src/resolution.js` — normalize a multi-value answer
  (labels → values, array preserved).
- `contract/contract.json` (+ `contract/validate.mjs`) — add the flag to the question shape and a
  fixture.
- `app/src/events.ts` — question model and parsing; `app/src/components.tsx` — toggling controls
  and a submit action; `app/src/useBridge.ts` / `app/src/bridgeClient.ts` — answer payload.
- Tests: `plugin/test/activity.test.js`, `plugin/test/serviceReply.test.js`,
  `contract/contract.test.mjs`, `app/test/dashboard.test.tsx`.
