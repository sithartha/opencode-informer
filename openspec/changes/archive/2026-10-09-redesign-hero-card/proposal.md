# Proposal

## Why

The hero card is the first thing the user sees, but it leads with a raw "active agents"
total and buries the one thing that actually matters: agents waiting for the user. The
`mobile-app-ui-design` skill's first rule is that a screen should have one thing to notice
first; today's hero does not. A companion's job is to say when you are needed, so the hero
should lead with "needs you" and make acting on it a single, thumb-reachable tap.

## What Changes

- **Hero leads with attention**: the primary number becomes the agents needing the user
  (permissions plus questions); the working/inactive counts move to a secondary row.
- **All-clear state**: when nothing needs attention the hero shows a calm, confident
  status while still surfacing working activity, instead of a bare zero.
- **Hero controls**: keep the start-session control and add a **review waiting** control
  that jumps to the agents waiting for approval or an answer (shown only when something
  is waiting).
- **Visual redesign** following the `mobile-app-ui-design` skill: one dominant number, a
  compact status line, pill chips, soft tinted shadows, ≥44 pt tap targets, and
  calm/attention color states driven by the theme (light and dark).

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities

- `mobile-companion-app`: the hero prioritizes the agents that need the user, adds an
  all-clear state, and gains a control to jump to the agents waiting for attention.

## Impact

- `app/src/components.tsx` (`HeroCard` and its breakdown), `app/src/styles.ts`,
  `app/src/theme.ts` (attention / all-clear tokens), `app/App.tsx` (hero wiring and the
  jump-to-waiting action), `app/src/DemoScreen.tsx` and `PreviewScreen` samples.
- Tests: `app/test/dashboard.test.tsx` (hero states and controls).
- Spec delta under `mobile-companion-app`.
