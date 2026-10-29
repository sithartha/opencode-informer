# Tasks

## 1. Accessibility foundations

- [x] 1.1 Add `app/src/designTokens.ts` with role-based type sizes, a 4pt spacing scale, and radius roles; migrate the Default and Terminal style definitions to it and verify `npm run typecheck` plus `npm run test:components` still pass.
- [x] 1.2 Retune every theme's `textMuted` to clear 4.5:1 on its `surface` and `background`, add an explicit `onAccent` inverse-label token to `Theme`, and replace white-on-accent labels in `styles.ts`/`components.tsx` with it; verify every filled button and selected control reads with its declared label token.
- [x] 1.3 Add `app/test/contrast.test.ts` that computes WCAG ratios for every skin/variant token pair (text, secondary, muted, badge text, and every button fill/label) and fails below 4.5:1 (3:1 for large text and boundaries); verify it fails on a deliberately broken token and passes on the real catalog.
- [x] 1.4 Raise segments, layout toggle, Stop/Close, link text, Classic OS window controls, and other small targets to 44×44pt or an equivalent hit area; verify with style assertions in the component tests and a touch-target pass on device.
- [x] 1.5 Add `accessibilityRole`, `accessibilityState`, and accessible names to theme cards, variant segments, switcher rows, question options, multi-select options, and link-style text; announce errors with a live region; verify VoiceOver reads selected states and labels in a manual pass, with component tests asserting the props.
- [x] 1.6 Install `react-native-safe-area-context` with `npx expo install` (or confirm an existing Expo-provided dependency) and replace hardcoded top paddings with insets; remove fixed heights that clip at large text and cap decorative label scaling; verify at 200% Dynamic Type and on a notched device.

## 2. First-run and connection truth

- [x] 2.1 Add an unpaired setup card explaining the Mac helper, shared network, and pairing, with a docs link, and make the empty dashboard offer `Start a session` as the primary action with `Try the demo` as secondary; verify the card disappears once paired and the empty test asserts both actions.
- [x] 2.2 Add a pre-permission explanation sheet for Bluetooth, local network, and notifications; move the notification permission request out of `configureNotifications()` into an explicit notification toggle or post-connection moment; verify no system prompt appears without the explanation on a clean install.
- [x] 2.3 Humanize connection states and add a visible `Reconnect` action when paired but offline; keep the status pill non-destructive; verify component tests cover offline, connecting, and connected labels.
- [x] 2.4 Expose `lastRefresh`/`stale` from the bridge hook, show `Updated … ago` plus a stale banner, and add `RefreshControl` for manual resync; verify the stale state appears after the stale window and a pull-to-refresh triggers a snapshot sync.
- [x] 2.5 Add explicit busy states for connection, start-session, option loading, theme changes, and tip purchases, including disabled controls with reasons and a skeleton state for the switcher; verify a component test shows the loading state instead of `No modes reported`.
- [x] 2.6 Validate the manual address inline on blur, auto-focus the pairing code field, reject incomplete codes with a specific message, and explain why a question submit is disabled; verify form tests cover each error branch.

## 3. Settings organization, copy, and theme picking

- [x] 3.1 Reorder Settings to Connection → Appearance → Notifications → This phone → Support → About → Diagnostics; move tips below functional settings, collapse diagnostics behind a copyable disclosure, add privacy/support links, and read the version from app config; verify the order in a component test and the version against the installed build.
- [x] 3.2 Auto-scroll the theme list to the selected theme on open and add a full-screen `Preview` action using the existing preview screen; memoize per-theme preview styles; verify the selected card is visible and preview opens with the active theme.
- [x] 3.3 Add `app/src/copy.ts` phrase maps for phases, connection states, counts, and CTAs; apply them across dashboard, cards, notifications, Live Activity, and settings, hide zero-value badges, and unify `Try demo`/`Try the demo` wording; verify no raw enum value appears in user-facing tests.
- [x] 3.4 Update component and live-activity tests for the new copy and card hierarchy (title first, one meta line, non-zero badges only); verify `npm test && npm run test:components` passes.

## 4. Motion system and performance

- [x] 4.1 Add `app/src/motion.ts` with the duration, easing, and spring tokens from `design.md`; replace the bouncy press spring with a 120ms `scale(0.97)` response and migrate existing durations/easings to the tokens; verify no hardcoded animation duration remains in `ui.tsx`/`App.tsx`.
- [x] 4.2 Move the hero collapse to a native-driven (UI-thread) scroll value with the same interpolation ranges, and add a reduce-motion fallback; verify the collapse matches the current behavior and does not update a JS animation value per scroll frame.
- [x] 4.3 Limit the continuous attention treatment to the top waiting card, replace JS shadow-opacity pulses with transform/opacity, and remove continuous shimmer/border loops from secondary cards; verify multiple waiting cards do not multiply animations and reduce motion leaves a static attention style.
- [x] 4.4 Add a continuity transition for compact → full expansion and short transitions for theme and segment changes; verify the transitions run on transform/opacity and Reduce Motion falls back to an instant or faded change.
- [x] 4.5 Install `expo-haptics` with `npx expo install`, add a single haptic helper, and fire one haptic on theme/variant selection, Allow/Deny, connect success, purchase result, and confirmed Stop/Close; verify haptics are paired with a visible change and can be disabled in one place.
- [x] 4.6 Pause offscreen avatar animation with throttled visibility bookkeeping, cap the card stagger, memoize theme preview styles, and remove unused animated components; verify a release build on the slowest supported device and that offscreen cards stop animating.
- [x] 4.7 Re-check motion on a release build: press feedback, hero collapse, compact → full, attention hierarchy, reduced motion, and haptics; record any feel adjustments as follow-up values in `motion.ts`.

## 5. Integration checks

- [x] 5.1 Run `cd app && npm test && npm run test:components && npm run typecheck` and fix all regressions, including updated copy and selection semantics.
- [x] 5.2 Run a manual accessibility pass on device with VoiceOver and 200% Dynamic Type: every control reachable, selected states announced, no clipped text, no sub-44pt targets.
- [x] 5.3 Run a visual pass on the default, Terminal, Cat, Tunes, and Classic OS themes in light and dark, checking contrast, button labels, card hierarchy, and safe areas.
- [x] 5.4 Build and install on sithPhone, then verify first-run setup, permission explanations, offline/reconnect, stale banner, pull-to-refresh, empty state, switcher loading, and tip purchase states.
