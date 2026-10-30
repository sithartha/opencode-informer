# Design

## Context

See `proposal.md` — Why. The relevant current state:

- `app/src/avatar.ts` exposes three pure helpers the avatar renderer consumes: `avatarCut(theme)` (the silhouette), `avatarIdentity(agent, sessionId, cut)` (the light seed plus the cut) and `avatarMood`/`avatarColor` (expression and surface colour). `app/src/AgentAvatar.tsx` calls `avatarCut(theme)` on every render and memoises the identity on the cut.
- `avatarCut` is a hand-written ternary over three skins for `square` and falls back to `circle` for the other five, so the two groups carry no meaning for Cat, Classic OS, The Force or Wizard.
- The bundled `moodstone` v1.0.1 renderer defines all seven silhouettes in `CUTS` (`circle` n=2, `squircle` n=4.5, `square` n=9, `hexagon` six sides with rot −90, plus `diamond`, `badge`, `burst`) and derives each cut's face `contentScale` itself, so a new cut needs no geometry work in this app.
- The skin is already the only input the silhouette needs; it is persisted in the theme selection and has no separate setting, so no migration is involved.
- Silhouette tests live in `app/test/avatar.test.ts` and run with `npm test` (`node --test` over `test/*.test.ts`), separate from the jest component suite.

## Goals / Non-Goals

**Goals:**

- One readable, exhaustive mapping from every skin to a silhouette.
- No change to avatar identity, colour, mood, animation, or accessibility.
- A test that fails when a skin is added without a silhouette.

**Non-Goals:**

- Changing card corners, buttons, or the app mark to match the same shape language; this change is scoped to avatars.
- Introducing custom `moodstone` `shape` parameters (e.g. a softer hexagon) — the built-in cuts are the contract.
- Persisting the silhouette; it is derived from the selected skin on every render.

## Decisions

**1. Replace the condition with an exhaustive `Record<SkinId, Cut>` table in `app/src/avatar.ts`.**

```ts
const SKIN_CUT: Record<SkinId, Cut> = {
  default: "circle",
  evangelion: "hexagon",
  sanrio: "circle",
  starwars: "squircle",
  tunes: "square",
  "classic-os": "squircle",
  wizard: "circle",
  terminal: "square",
}
```

`avatarCut(theme)` becomes a single lookup (`SKIN_CUT[theme.skin] ?? "circle"`). `Record<SkinId, Cut>` makes a new `SkinId` a compile error until it is assigned, which is exactly the failure the old ternary could not produce.

Alternatives considered:

- *An `if` chain over categories* — keeps the same readability problem and still needs a fallback for the ninth skin.
- *A `shape` field on `Theme`* — spreads a non-colour concern through every theme literal (eight skins, twenty-two variants) for a value that depends only on the skin. Rejected.
- *A `Cut` on `SkinDef` in `SKINS`* — plausible, but `SkinDef` is about the picker (name, description, options); selecting a skin would then have to be read through the definition rather than the resolved theme. The table keeps the avatar concern in the avatar module.

**2. Keep `avatarCut(theme)` as the accessor.**

`AgentAvatar` and the tests already depend on the function, and it keeps `Theme` the only input the avatar needs. Only the body changes.

**3. Keep the light seed independent of the cut.**

`avatarIdentity` already takes the cut as a parameter and derives the seed solely from the session key, so switching skins changes the silhouette without reshuffling faces, as the spec's stable-identity scenario requires.

**4. Use the renderer's built-in cuts unchanged.**

`hexagon` (six sides, rounded) already reads as Nerv's HUD geometry, and `squircle` (superellipse n=4.5) is the mild mid-point between `circle` (2) and `square` (9). Passing a partial custom `shape` would bypass `contentScale` and require eye-position tuning per size, which is not worth it.

**5. Test the whole table.**

`app/test/avatar.test.ts` currently asserts the two-group rule. Replace that test with one that pins all eight skins, so a new skin (or a re-ordered table) fails loudly instead of falling back to a circle.

## Risks / Trade-offs

- **A hexagon has less face area than a circle at the same box size** → the renderer's per-cut `contentScale` already shrinks the face for tighter silhouettes; verify visually on the dashboard in Nerv at both the compact (larger) and full (40 pt) sizes, and in the card preview, before calling the change done.
- **The mapping is a taste judgement, not a measurable property** → it is recorded explicitly in the spec's own scenario (`hexagon` Nerv, `square` Tunes/Terminal, `squircle` The Force/Classic OS, `circle` Cat/Default/Wizard) so a future edit has a single place to change and a test to update.
- **`moodstone` could rename or drop a cut on upgrade** → the type `Cut` is imported from the package, so a rename fails `tsc --noEmit` (`npm run typecheck`), which the tasks run.
- **Avatars are decorative, so a wrong silhouette is invisible to screen readers** → no accessibility contract is affected; the spec's decorative rule stays unchanged.
