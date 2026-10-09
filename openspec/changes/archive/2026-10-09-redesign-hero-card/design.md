# Design

## Context

See proposal.md - Why. Today `HeroCard` (in `app/src/components.tsx`) renders a large
total "active agents", a two-row breakdown (working / inactive / permission / question),
and a sparkle "+" start button. The app already has a design system (`app/src/styles.ts`,
`app/src/theme.ts`) and an attention model (`aggregate()` returns total, running,
waitingApproval, waitingAnswer, stopped). This change reworks the hero using the
`mobile-app-ui-design` skill; it does not touch the session cards or the bridge.

## Goals / Non-Goals

**Goals:**

- Make the hero answer one question first: "does anything need me?".
- Give a calm, confident all-clear state when nothing does.
- Put the two useful actions within thumb reach, with ≥44 pt targets.
- Keep a single dominant figure so the eye has one place to land.

**Non-Goals:**

- No change to the session list, cards, bridge, or notifications.
- Not a new design language: reuse the existing tokens and `GradientSurface`.
- No per-user-stage variants (new/returning/power) in this change.

## Decisions

### One dominant figure: agents that need you

- **Choice**: the hero's display-size number is `waitingApproval + waitingAnswer`
  ("Need you"); the working count becomes a secondary line.
- **Why**: the skill's hierarchy rule and the peak-end rule — the screen's peak is the
  moment the user sees they are needed. A raw "active agents" total buries that.
- **Alternatives**: keep the total as the primary figure (rejected — hides attention); a
  separate card per attention kind (too busy, splits the eye).

### All-clear and idle states

- **Choice**: when `needsYou === 0`, the hero shows a calm **"All clear"** status with the
  working count; with nothing active it shows **"No active agents"**. The border/glow use a
  calm neutral/success tone instead of the attention gradient.
- **Why**: a bare big "0" reads as empty/failed; a calm confirmation is the "end" moment
  the skill asks for. Color is paired with text so it is not the only signal.
- **Alternatives**: show only the count (rejected); celebrate loudly at zero (overkill).

### Two hero controls in the lower band

- **Choice**: keep the start-session control and add a **"Review N waiting"** control that
  is shown only when `needsYou > 0`; both sit in the hero's lower band with ≥44 pt targets.
- **Why**: the skill puts primary actions in the thumb zone and turns the hero into the
  place to act, not just to read.
- **Alternatives**: put the jump control in the header (far from the thumb); make the
  whole hero tappable (ambiguous).

### Scroll-driven sticky compact hero

- **Choice**: keep the full hero in the scroll content and bind the dashboard `ScrollView`'s
  offset to an `Animated.Value` with `Animated.event(..., { useNativeDriver: true })`; drive a
  pinned overlay's opacity/translateY from it over a clamped range and fade/scale the full
  hero in step. The compact overlay shows the app mark plus a connected-server pill and,
  right-aligned, the four state dots with their counts; it is `pointerEvents="none"`.
- **Why**: transform/opacity animations run on the UI thread, so the collapse follows the
  scroll smoothly; a pinned overlay gives the sticky behavior without `stickyHeaderIndices`
  layout jumps, and the compact bar is read-only so it never steals touches.
- **Alternatives**: `stickyHeaderIndices` on the hero (hard to animate, layout jumps);
  animating height (non-native, janky).

### Disconnect from the connection indicator

- **Choice**: make the dashboard's connection indicator tappable while paired and open a
  confirmation; on confirm, stop the stream and BLE, reset to the unpaired state, and set a
  latch that blocks automatic reconnect until the user connects again. The stored token and
  the remembered address are kept, so reconnecting reuses the LAN path (no Bluetooth, no
  re-pairing); **Connect** tries the remembered address first and only falls back to BLE
  discovery.
- **Why**: the user needs an explicit way to drop the Mac without forgetting it, and a
  reconnect should not depend on Bluetooth (which can report an unknown adapter state). The
  latch keeps the app from silently reconnecting on the next foreground.
- **Alternatives**: clear the remembered address (forces a BLE reconnect, the bug seen);
  forget the token (forces re-pairing).

### Jump target: scroll to the first waiting agent

- **Choice**: `App.tsx` holds the dashboard `ScrollView` ref; activating the control
  scrolls to the needs-attention section (or the first waiting session card) and briefly
  highlights it. Waiting sessions already sort above the rest.
- **Why**: the shortest path from "I'm needed" to the controls that resolve it.
- **Alternatives**: navigate to a separate screen (extra step); rely on manual scroll (the
  problem we are fixing).

### Motion and tokens

- **Choice**: reuse `GradientSurface` — animated border + shimmer only while `needsYou > 0`;
  a static, calm surface otherwise; all motion respects reduced motion. Reuse the design
  system's type scale (12/14/17/22/40), 8-pt spacing, pill chips, and soft tinted shadows.
- **Why**: attention should draw the eye; clarity should feel calm. Consistency keeps the
  redesign within the existing visual language.
- **Alternatives**: new fonts/sizes (breaks the system); constant animation (noisy).

## Risks / Trade-offs

- [Two counts competing] → only the needs-you figure uses the display size; the working
  count is body-sized and lower contrast.
- [Jump lands ambiguously] → scroll to the first waiting card and highlight it briefly.
- [Color-only status] → always pair the tone with a text label ("Need you · 2", "All clear").
- [Reduced motion] → the pulse/shimmer are gated by `useReducedMotion`, already in place.
