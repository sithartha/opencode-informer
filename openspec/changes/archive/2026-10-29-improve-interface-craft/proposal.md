# Proposal

## Why

The app has a distinctive theme system and a working core flow, but a full interface pass against current UX, accessibility, and motion standards found systemic issues rather than isolated polish: most themes' muted text fails WCAG AA contrast, several primary buttons put white text on mid-tone accents that also fail, small controls sit below 44pt, selection state is invisible to VoiceOver, phase and connection values leak raw internal enum names, and the first-run/connection story assumes the user already knows about the Mac helper. Motion is also split between a JS-thread scroll handler, JS-driven shadow pulses on every attention card, and a bouncy press spring, with no shared motion tokens.

This change turns those findings into a phased, testable interface-quality pass so the app feels as considered as its themes look — especially for first-run users, VoiceOver users, and anyone on an older device.

## What Changes

### Accessibility baseline (P0)

- Retune every theme's `textMuted` and any selected/unselected opacity so body, hint, placeholder, and metadata text reach at least 4.5:1 against its surface; keep 3:1 for large text and UI boundaries.
- Introduce an explicit `onAccent`/inverse label token and fix button labels that currently place white text on mid-tone accents (for example `Allow` on light green, gradient CTAs in Cat/Tunes/Nerv).
- Raise all interactive targets to at least 44×44pt (segments, layout toggle, Stop/Close, links, theme checks) via `minHeight` and `hitSlop`.
- Add screen-reader role/state/label coverage: theme cards and variant segments announce selected state, switcher rows and question options announce selection, link-style text has a link role, error text is announced, and the connection pill describes the current status and its action.
- Make fixed-height layouts survive Dynamic Type (theme cards, compact cards, segments, settings frame) and replace hardcoded top padding with safe-area insets.
- Respect Reduce Motion for the hero collapse and every decorative loop, not only the existing fades.

### First-run and connection recovery (P1)

- Add a compact setup card on the unpaired dashboard explaining the three steps (install/run the Mac helper, keep both devices on the same network, connect), with the existing `Find nearby computer` and `Connect by address` actions.
- Explain Bluetooth, local-network, and notification permissions in context before the system prompt; do not request notification permission as an unannounced side effect of connecting.
- Humanize connection states (`Connected`, `Looking for your computer`, `Connecting`, `Offline`) instead of raw enum values, and give the disconnected state a visible `Reconnect` action.
- Move disconnect to an explicit Settings control; stop making the status pill a hidden disconnect trigger.
- Show freshness: a `Last updated …` line and a stale banner when data is old, plus pull-to-refresh; keep the current automatic reconnect.
- Make every connection error actionable with a retry and, when relevant, a route to iOS Settings.

### Loading, empty, and error states (P1)

- The empty dashboard becomes a composed first-run state: primary `Start a session`, secondary `Try the demo`, and a setup link — not a demo-only card.
- Add busy/disabled states with visible labels for `Find nearby computer`, `New session`, option loading in the switcher, theme changes, and tip purchases; explain disabled states instead of silently ignoring taps.
- Render switcher options with a skeleton/loading state instead of flashing `No modes reported`; keep the current step (mode → model) visible while starting a session.
- Validate manual address input inline on blur and keep the error next to the field; make the pairing code input auto-focus and reject incomplete codes with a clear message.
- Give every error a recovery action (retry, edit, or open Settings) rather than plain red text.

### Settings organization and theme picking (P2)

- Reorder Settings to follow user intent: Connection (with disconnect), Appearance, Notifications, This phone, Support, About, Diagnostics; move the tip jar below the functional settings and collapse Diagnostics behind a disclosure with a Copy action.
- Add Privacy Policy / Support links and read the version from app config instead of the hardcoded `0.1.1`.
- Auto-scroll the theme list to the selected theme when Settings opens, and add a full-screen `Preview` action that shows the selected theme on a real screen instead of a tiny swatch.
- Remove the duplicate `Try the demo` entry from the bottom of Settings.

### Language and card hierarchy (P2)

- Replace raw phase/status strings with plain language (`Needs approval`, `Waiting for an answer`, `Running`, `Done`, `Ended`) across dashboard, compact cards, detail, notifications, and Live Activity.
- Hide zero-value metadata (0 subagents, 0 shells), demote the phase when the avatar/color already conveys it, and give each card one clear primary action.
- Unify CTA wording (`Try the demo`), clarify empty-state copy (`Start an OpenCode agent on your Mac`), and make error copy specific and calm.

### Motion and performance system (P2)

- Add a shared `motion` module with easing and duration tokens plus spring configs; replace the bouncy tap spring with a 120–160ms `scale(0.97)` press response.
- Drive the hero collapse from a native/UI-thread scroll value (Reanimated 4 is already installed) instead of a JS `onScroll` handler, and keep the same collapse behavior.
- Replace per-card JS shadow pulses and continuous shimmer/border loops with one attention treatment on the top waiting card; animate only `transform`/`opacity`, never shadow opacity per frame.
- Add haptics for meaningful commits: theme/variant selection, Allow/Deny, connect success, and confirmed Stop/Close (the existing arrival haptic stays).
- Add continuity for compact → full card expansion (layout/shared-element transition) and a short crossfade for theme changes; keep platform modal transitions.
- Pause offscreen avatar animation, cap list stagger, memoize per-theme preview styles, and remove unused animated components.

### Visual system tokens (P2/P3)

- Consolidate the current ~20 font sizes, ad-hoc spacing values, and per-skin radii into a small role-based type scale, a 4pt spacing scale, and radius roles, while letting each theme keep its own character.
- Reduce session-card noise: title first, avatar second, one meta line, badges only when non-zero.
- Optional, separate from this change: refresh the Default theme's blue/violet gradient toward a neutral base with a single accent, since it is the one palette that currently reads as a generic AI default.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `mobile-companion-app`: adds requirements for an accessible interface baseline, first-run and connection recovery, loading/empty/error states, interface motion and performance, settings organization, and human-readable interface language. Existing theme, card, and connection requirements stay in force.

## Impact

- `app/App.tsx` — dashboard states, connection actions, settings IA, theme picker, preview entry.
- `app/src/components.tsx` — session card hierarchy, switcher/start loading, forms, links, selection semantics, expansion transition.
- `app/src/ui.tsx` — motion tokens, press feedback, attention animation, haptics, reduce-motion handling.
- `app/src/styles.ts` — type/spacing/radius tokens, 44pt targets, contrast-safe text roles.
- `app/src/theme.ts` — contrast-corrected muted/accent tokens and an inverse label token.
- `app/src/AgentAvatar.tsx` — offscreen pause.
- `app/src/pushNotifications.ts` / `app/src/useBridge.ts` — contextual permission prompts and stale/last-updated state.
- `app/src/liveActivityState.ts` — human-readable status copy parity.
- Tests — new contrast, target-size, semantics, and motion-token tests; updated component tests.
- Dependencies — `expo-haptics` (already the platform-standard choice) if haptics are approved.
- No API, contract, or data-model changes.
