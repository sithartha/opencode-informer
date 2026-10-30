# Tasks

## 1. Silhouette mapping

- [x] 1.1 In `app/src/avatar.ts`, replace the ternary in `avatarCut` with the exhaustive `SKIN_CUT: Record<SkinId, Cut>` table from design.md (default `circle`, evangelion `hexagon`, sanrio `circle`, starwars `squircle`, tunes `square`, classic-os `squircle`, wizard `circle`, terminal `square`) and return `SKIN_CUT[theme.skin] ?? "circle"`; verify with `npm run typecheck` that the record covers every `SkinId`
- [x] 1.2 Update the `avatarCut` doc comment so it states the per-skin silhouettes (hexagon, square, squircle, circle) instead of the old square-versus-circle grouping; verify by opening `app/src/avatar.ts` and checking the comment names all four silhouettes

## 2. Tests

- [x] 2.1 Rewrite the silhouette test in `app/test/avatar.test.ts` to pin all eight skins from the spec scenario (hexagon Nerv; square Tunes, Terminal; squircle The Force, Classic OS; circle Cat, Default, Wizard) and verify with `npm test` that it passes
- [x] 2.2 Keep the seed-independence assertion in that file: confirm the existing test still proves two sessions share a silhouette but differ in seed, and add an assertion that changing only the skin changes `avatarCut(theme)` while `avatarIdentity` keeps the same seed for a fixed session; verify with `npm test`

## 3. Visual verification

- [x] 3.1 Run the app and check the dashboard in each skin — Nerv (hexagon), Tunes and Terminal (square), The Force and Classic OS (squircle), Cat, Default and Wizard (circle) — confirming at both the compact and full card sizes that the face is not clipped by the silhouette and that switching skins keeps every session's face; verify by eye on the simulator/device and note the result in the change

## 4. Documentation

- [x] 4.1 After `/opsx-archive` updates the main `mobile-companion-app` spec: confirm the `Agent avatars` requirement there carries the per-skin silhouette wording and that no other living document describes the old square-versus-circle avatar rule; verify with `grep -n "square-cornered themes\|theme's corner language" openspec/specs/mobile-companion-app/spec.md` reporting only the unrelated theme-preview-thumbnail requirement — the snapshots under `openspec/changes/archive/` keep the old wording as history and are not edited
