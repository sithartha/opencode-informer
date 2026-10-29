# Design

## Context

See `proposal.md` for motivation. This is an audit-driven, cross-cutting interface pass; the concrete findings below come from reading the current screens, components, theme tokens, and motion code (not from a rendered build), and are ranked by user impact. Screenshots/feel-checks remain part of apply.

The app is a single React Native/Expo screen with a modal Settings screen, a modal Demo, and a full-screen card preview. The theme system is token-based (`Theme` in `app/src/theme.ts`), styles are dispatched per skin (`app/src/styles.ts`), and the motion layer uses the legacy core `Animated` API (`app/src/ui.tsx`) even though Reanimated 4 is installed.

## Goals / Non-Goals

**Goals:**

- Make every theme pass AA contrast and every control reachable at 44pt.
- Make state and selection legible to VoiceOver and at large text sizes.
- Explain the product and its permissions before asking.
- Replace raw internal vocabulary with plain language and remove zero-value noise.
- Give the app one motion vocabulary, keep it on the UI thread, and remove decorative motion that does not earn its cost.
- Leave the product's playful theme identities intact; fix the foundations, not the personalities.

**Non-Goals:**

- No navigation/IA rewrite beyond Settings ordering and the first-run card.
- No backend, contract, pairing, BLE, or notification-delivery changes.
- No new visual identity for the themes; the Default palette refresh is an optional follow-up, not part of this change.
- No i18n/RTL implementation; copy is centralized so it can be localized later.
- No full design-system component library; tokens are added incrementally.

## Audit Findings

Severity: **P0** = blocks or excludes users; **P1** = core-flow friction; **P2** = craft/polish.

| # | Sev | Finding | Where | Fix |
| --- | --- | --- | --- | --- |
| 1 | P0 | `textMuted` fails 4.5:1 on nearly every theme (Default 3.05, Cat 2.58, Jedi 3.03, Bento 2.99, Hufflepuff 3.02; dark themes 3.86–4.46). It carries hints, placeholders, metadata, empty text. | `theme.ts` palettes; `styles.ts` hint/empty/fieldDescription/placeholder | Retune muted tokens per theme to ≥4.5:1 and add a contrast test for all tokens. |
| 2 | P0 | Button labels are white on mid-tone fills: Default gradient 3.83, Cat allow 2.10, Tunes allow 1.99, Nerv Unit 00 accent 1.82. | `styles.ts` `gradientButtonText`/`actionText`; `components.tsx` action fills | Add an explicit inverse label token (`onAccent`) per theme and choose ink or paper per fill; test every fill/label pair. |
| 3 | P0 | Tap targets below 44pt: layout toggle ~26pt, segments 40–42pt, Stop ~28pt, Close ×, `moreLink`, Classic OS 24pt window controls. | `styles.ts`, `components.tsx` | `minHeight: 44` and/or `hitSlop`; keep visual size where the theme needs it. |
| 4 | P0 | Selection is not announced: theme cards, variant segments, switcher rows, question options, multi-select options. | `App.tsx:403–451`, `components.tsx:209–231`, `:909–932` | Add `accessibilityRole`/`accessibilityState={{selected}}`/labels; selected text for VoiceOver. |
| 5 | P0 | Fixed heights and 64pt top padding ignore Dynamic Type and safe areas. | `App.tsx:230`, `:513`; `styles.ts` compactCard/themesFrame/segments; `content` | `useSafeAreaInsets`, flexible `minHeight`, test at 200% text, cap decorative `maxFontSizeMultiplier`. |
| 6 | P1 | First-run assumes the Mac helper exists; the empty state recommends a demo, not setup. | `App.tsx:317–323`, `APP_DESCRIPTION` hidden in Settings | Add a setup card with three steps and a docs link; primary start-session action in empty state. |
| 7 | P1 | Notification permission is requested inside `configureNotifications()` during connect, without rationale. | `pushNotifications.ts:31`; `useBridge.ts:337` | Move permission to an explicit, explained moment (notification toggle or after first successful connection). |
| 8 | P1 | Connection status shows raw enum values; disconnect is an undisclosed tap on the status pill. | `App.tsx:259–266` | Humanize states; add a labelled Reconnect action and a Settings disconnect row. |
| 9 | P1 | No stale/last-updated indication on the dashboard; only Live Activity knows staleness. | `useBridge.ts:988`; dashboard | Expose `lastRefresh`/`stale`; show “Updated … ago” + stale banner; add pull-to-refresh. |
| 10 | P1 | Async actions show no busy state: switcher opens before options load and flashes “No modes reported”; New session / Find nearby / tip purchase are silent. | `App.tsx:142–160`, `:479`; `useBridge.ts` | Explicit loading states, disabled + explanation, skeletons, per-action pending. |
| 11 | P1 | Disabled question submit has no reason; empty manual/pairing submits are accepted then rejected. | `components.tsx:296–310`, `:1000–1040` | “Choose at least one answer” helper; inline validation; auto-focus pairing code. |
| 12 | P1 | Settings IA puts tips above connection, keeps diagnostics always open, exposes a duplicate demo entry, and lacks privacy/support links. | `App.tsx:387–527` | Reorder by intent; disclosures; legal links; version from build metadata. |
| 13 | P1 | Raw phases and jargon: `waiting-permission`, `waiting-answer`, “0 subagents”, “0 shells”, “tool · Bash”. | `components.tsx` session card; `App.tsx` compact grid | Human phrases, hide zeroes, one meta line, consistent CTA labels. |
| 14 | P2 | Hero collapse updates an `Animated.Value` from a JS `onScroll` every frame; reduce motion is not applied. | `App.tsx:248`, `:110–114` | Reanimated scroll handler on the UI thread; reduce-motion path. |
| 15 | P2 | Every waiting card starts a JS-driven shadow pulse plus shimmer and spinning border; multiple pending cards compound. | `ui.tsx:134–192`; `components.tsx` attention surfaces | Only the top waiting card animates; use static emphasis elsewhere; opacity/transform only. |
| 16 | P2 | Every card mounts a `FadeIn` with 50ms stagger; every avatar animates even offscreen. | `App.tsx:305–357`; `AgentAvatar.tsx:67` | Cap stagger, pause offscreen avatars, keep entry motion short. |
| 17 | P2 | Bouncy press spring on every tap (`bounciness: 8`), no shared motion tokens. | `ui.tsx:80–90`; durations 260/900/1500/2200/2400/2800/6000 across files | `src/motion.ts` tokens; 120–160ms press response; one spring vocabulary. |
| 18 | P2 | Compact → full expansion is an instant component/width swap; theme changes and segment selection snap. | `App.tsx:340–357`; `styles.ts` selection | Layout/shared-element transition, 150ms selection, 200ms theme crossfade. |
| 19 | P2 | Type/spacing drift: ~20 font sizes, spacing values 10/13/14/15/18/22/26, per-skin radii. | `styles.ts` | Role-based type scale, 4pt spacing scale, radius roles; migrate high-traffic styles first. |
| 20 | P3 | Theme picker only shows a tiny swatch; selected theme can be offscreen; settings preview is only reachable through Demo → Gallery. | `App.tsx:389–435`; `PreviewScreen` | Auto-scroll to selected; full-screen theme preview; memoize preview styles. |
| 21 | P3 | Unused animated components (`GradientGlowButton`, `GlowIconButton`, `BrandMark`) keep dead loops and API surface. | `ui.tsx:274–410`; `components.tsx:59` | Remove or adopt deliberately; do not keep dead motion. |

## Decisions

### 1. Contrast is a token-level invariant, enforced by tests

Add `onAccent` (inverse label) to `Theme` alongside the existing `accent`, `allow`, `deny`, and `option`; each theme explicitly declares the label color for filled controls. Retune `textMuted` per theme to the nearest neutral that clears 4.5:1 on that theme's `surface` and `background` (e.g. Default light `#8b94a7` → about `#5f6a7d`; Cat light `#b59aa8` → about `#7f5a6b`). Add `app/test/contrast.test.ts` that computes WCAG ratios for every skin/variant pair and fails on regressions. This is cheaper and more reliable than eyeballing each theme, and it protects future themes.

*Alternative considered:* one universal muted gray. Rejected because tinted themes need a tinted neutral to stay cohesive.

### 2. Semantic state, not color-only state

Selection and attention get explicit accessible states (`selected`, `busy`, `disabled`) and, where relevant, a text or glyph marker (`✓`, `>`, `[!]`). Theme cards, segments, switcher rows, and options gain `accessibilityRole` + `accessibilityState`; icon-only actions get labels and hit areas; link-styled text gets a link role. Error text gets `accessibilityLiveRegion="polite"`. Keep the visual language of each theme; add the semantics underneath.

### 3. First-run is part of the dashboard, not a tour

A setup card appears only while unpaired, above or beside the existing connection actions. It explains the helper, the shared network, and pairing, and links to the project docs. This avoids a modal tutorial and keeps the primary task visible. Permission explanations are inline sheets shown immediately before the system prompt; notifications are requested when the user enables Lock Screen activity or after the first successful connection, never as a hidden side effect of `establish()`.

### 4. Connection truth over optimistic UI

Expose `lastRefresh`/`stale` from the bridge hook. Show `Updated 12s ago` under the status and a stale banner after the stale window; when disconnected with a remembered computer, replace counts with an offline state and a `Reconnect` action. Add `RefreshControl` for manual resync. Disconnect moves to Settings as a labelled row with the existing confirmation.

### 5. Loading is a first-class state

Model async work explicitly (`idle | loading | error`) for connection, options, start-session, purchase, and theme changes. Buttons show a busy label (`Looking…`, `Starting…`) or an inline spinner and are disabled while busy; disabled states carry a reason. The switcher renders skeleton rows while options load instead of empty-state copy. The empty dashboard offers `Start a session` as the primary action and `Try the demo` as secondary.

### 6. Settings ordered by intent

Order: Connection (status, reconnect, disconnect, Lock Screen activity) → Appearance (theme, preview, variant) → Notifications → This phone → Support (tips) → About (version, privacy/support links) → Diagnostics (collapsed, copyable). The theme list auto-scrolls to the selected card; `Preview` opens the existing full-screen `PreviewScreen` with the active theme. Version comes from `expo-constants`/app config rather than a literal.

### 7. One motion vocabulary, UI thread first

Create `app/src/motion.ts`:

- `duration: { press: 120, fast: 160, base: 220, sheet: 300 }`
- `ease: { out: [0.23, 1, 0.32, 1], inOut: [0.77, 0, 0.175, 1], sheet: [0.32, 0.72, 0, 1] }`
- `spring: { settle: { duration: 400, dampingRatio: 1 }, momentum: { duration: 400, dampingRatio: 0.8 } }`

Use a native-driven `Animated.event` for the hero scroll collapse so the animated values stay on the UI thread (Reanimated remains the target for any worklet-driven gesture added later), `LayoutAnimation` for the compact→full transition, and native-driver opacity/transform for the rest. Keep core `Animated` only where the native driver is used. Replace the press spring with a 120ms `scale(0.97)` timing and remove bounce from ordinary taps. Add `expo-haptics`: `selectionAsync` on theme/variant/option selection, `impactAsync(Light)` on Allow/Deny and connect success, `notificationAsync(Success/Error)` on purchase/connection results, `impactAsync(Medium)` on confirmed Stop/Close. Haptics are one per commit and always paired with a visible change.

Attention treatment: only the first waiting card (the one `Review waiting` targets) gets the continuous glow/shimmer; other waiting cards keep the static attention border. This preserves hierarchy and removes compounding loops.

### 8. Avatar visibility without a list rewrite

Keep the existing ScrollView/grid. Track measured card frames and the scroll offset, and update a `Set` of visible session ids only when membership changes (throttled to ~10Hz), then pass `animated={visible}` to `AgentAvatar`. No per-frame React state, no new list dependency. If the list later moves to `FlatList`, the same visibility contract can come from `onViewableItemsChanged`.

### 9. Type, spacing, radius tokens

Add `app/src/designTokens.ts` with a role-based type scale (`display`, `title`, `body`, `label`, `meta`, `micro`), a 4pt spacing scale, and radius roles (`none`, `control`, `panel`, `pill`). Migrate the Default and Terminal skins first (the baseline and the newest theme), then the remaining skins in follow-up commits. Tokens are the default; a skin may override display sizes for character, but not body/control sizes.

### 10. Copy is a single vocabulary

Add a small `copy.ts` with phrase maps for phases, connection states, counts, and CTAs. Cards, notifications, Live Activity, and Settings consume the same strings. Hide zero-value badges. Keep the playful support copy but shorten it and move it down.

## Risks / Trade-offs

- **Contrast fixes flatten theme character** → retune only the failing tokens; preserve hue, adjust lightness; lock gains with tests.
- **44pt targets change layouts** → use `hitSlop` for icon-only controls and `minHeight` for rows; re-check compact grid density visually.
- **Reanimated migration touches scroll behavior** → keep the existing interpolation ranges and add a reduce-motion fallback; feel-check on a release build.
- **Offscreen avatar visibility adds JS bookkeeping** → throttle and only set state on membership changes; keep the fallback of animating only the expanded card if cost regresses.
- **Haptics require a new dependency** → `expo-haptics` is small, platform-standard, and already part of the Expo ecosystem; gate all calls behind a single helper so they can be disabled globally.
- **Settings reorder may surprise existing users** → the controls stay the same, only the order and disclosure change; no data migration.
- **Copy changes touch tests and store metadata** → update component tests and keep wording aligned with App Store metadata.

## Migration Plan

Ship in four reviewable slices: (1) tokens/contrast/targets/semantics + tests; (2) first-run, connection truth, loading/empty states; (3) Settings IA, copy, theme preview; (4) motion system + haptics + performance. Each slice is independently shippable and reversible; no persisted-data migration is required.

## Open Questions

None blocking. The optional Default palette refresh and full i18n/RTL support are deliberately left outside this change.
