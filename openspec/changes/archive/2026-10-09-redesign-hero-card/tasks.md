# Tasks

## 1. Hero structure and states

- [x] 1.1 Rework `HeroCard` in `app/src/components.tsx` to lead with the number of agents
  that need the user (permissions plus questions) as the single display-size figure, with
  the working count on a secondary line. Verify: `app/test/dashboard.test.tsx` cases for
  the needs-you and all-clear states pass.
- [x] 1.2 Add the calm states: an **"All clear"** hero (working agents, no waiting) and a
  **"No active agents"** idle hero, each pairing the tone with a text label. Verify: a
  component test asserts the all-clear and idle copy.
- [x] 1.3 Put both controls in the hero's lower band with ≥44 pt targets — keep the
  start-session control and add a **"Review N waiting"** control shown only when
  `needsYou > 0`, wired to a new `onReviewWaiting` prop. Verify: a component test asserts
  the review control is present while waiting and absent when clear.
- [x] 1.4 Keep only the needs-you figure at display size; style the working line, chips,
  and spacing from the existing design system (no new type scale). Verify: `cd app && npm
  run typecheck` passes and the card renders both states in the Demo.

## 2. Jump to agents needing attention

- [x] 2.1 In `app/App.tsx`, wire `onReviewWaiting` to scroll the dashboard `ScrollView` to
  the needs-attention section (or the first waiting session card) and briefly highlight it.
  Verify: a test (or a manual check on device) shows the control brings the waiting agents
  into view.

## 3. Samples

- [x] 3.1 Update `PreviewScreen` and `DemoScreen` hero samples (in `app/src/components.tsx`
  and `app/src/DemoScreen.tsx`) to the new states so the gallery and demo match. Verify:
  `cd app && npm run test:components` passes.

## 4. Collapsible sticky hero

- [x] 4.1 Add a compact hero overlay pinned to the top showing the app mark, a
  connected-server pill, and one colored dot per attention state (working, permission,
  question, inactive) with that state's session count, and drive its appearance from the
  dashboard scroll position. Verify: `cd app && npm run typecheck` passes and a component
  test asserts the compact dots/counts and the server pill.
- [x] 4.2 Keep the compact overlay non-interactive (`pointerEvents="none"`) and responsive to
  the theme. Verify: `cd app && npm test` and `npm run test:components` pass.

## 5. Disconnect from the server

- [x] 5.1 Make the dashboard's connection indicator tappable while paired and open a
  confirmation dialog; on confirm, disconnect (stop the stream and BLE, clear the remembered
  address, reset to unpaired) and stay disconnected until the user connects again. Verify:
  `cd app && npm run typecheck` passes and the dialog/disconnect wiring is exercised (manual
  check on device).

## 6. Integration

- [x] 6.1 Run `cd app && npm test`, `cd app && npm run test:components`, `cd app && npm run
  typecheck`, and rebuild to `sithPhone`. Verify: every command exits 0 and the build
  installs.
