# Tasks

## 1. Theme catalog and palettes

- [x] 1.1 In `app/src/theme.ts`, add `"tunes"` and `"classic-os"` to `SkinId`; add the four palettes
  (Tunes `classic` dark + `bento` light; Classic OS `blue` light + `dark`) as full `Theme` objects;
  add the two `SKINS` entries with `name`, `description`, `options`, `defaultOption`, and `resolve`;
  and extend `isSkinId`. Verify: `cd app && npm run typecheck` passes.
- [x] 1.2 Update `app/test/theme.test.ts` for the new catalog — exact `SKINS` id list, option lists
  (`tunes`: `classic`/`bento`; `classic-os`: `blue`/`dark`), `defaultOptionFor`, the distinct-accent
  check, `isSkinId`, and the de-trademarked name/description regex (extend it with the new
  brand-adjacent terms). Verify: `cd app && npm test` passes.

## 2. Marks and Live Activity

- [x] 2.1 Create a stylized single-color lightning-bolt mark at `app/assets/logos/bolt.png` and its
  Live Activity copy at `app/assets/liveActivity/mark-bolt.png`; create a stylized four-color flag
  mark at `app/assets/logos/os.png` and `app/assets/liveActivity/mark-os.png`. Use our own stylized
  drawings, not extracted brand files. Verify: both PNG pairs exist and load in the header/hero.
- [x] 2.2 Extend `app/src/themeMark.tsx`: tint the bolt with `theme.accent` for `tunes` and show the
  flag full-color for `classic-os`, mirroring the Star Wars / character mark handling. Verify:
  `cd app && npm run typecheck` passes and each mark renders in the header and hero.
- [x] 2.3 Extend `app/src/liveActivityState.ts`: `activityMark` returns `mark-bolt` / `mark-os`,
  and `activityLabel` / `activityStatus` return the Tunes and Classic OS hero captions/status words.
  Verify: update `app/test/liveActivityState.test.ts` for these and run `cd app && npm test`.

## 3. Design languages

- [x] 3.1 Add `createTunesStyles` in `app/src/styles.ts` (dark chrome frame, inset bevels, monospace
  segmented readouts, square-ish corners, accent level strip) and dispatch it when
  `t.skin === "tunes"`. Verify: `cd app && npm run typecheck` passes and the Demo renders in both
  Tunes variants without layout breakage.
- [x] 3.2 Add `createClassicOSStyles` (gradient title bars, rounded beveled buttons with a glossy
  highlight, window-like section frames, green start-style accent) and dispatch it when
  `t.skin === "classic-os"`. Verify: `cd app && npm run typecheck` passes and the Demo renders in
  both Classic OS variants without layout breakage.

## 4. Screens and Settings picker

- [x] 4.1 In `app/src/components.tsx`, add hero branches for `tunes` (player readout + bolt mark)
  and `classic-os` (desktop-style window header + flag mark), keeping the existing panel/controls.
  Verify: `cd app && npm run test:components` passes and each hero renders on device.
- [x] 4.2 In `app/App.tsx`, add the per-theme variant field label and description for `tunes` and
  `classic-os` (the theme list already renders from `SKINS`). Verify: selecting each theme and
  variant applies immediately and survives relaunch.
- [x] 4.3 Update `app/test/dashboard.test.tsx` to render the dashboard under the Tunes and Classic OS
  themes (light and dark variants). Verify: `cd app && npm run test:components` passes.

## 5. Integration

- [x] 5.1 Run `cd app && npm test`, `cd app && npm run test:components`, and
  `cd app && npm run typecheck`. Verify: every command exits 0.
- [x] 5.2 Prebuild and build to a device so the new `assets/liveActivity` marks are copied into the
  Live Activity target, then check both themes' lock-screen activity. Verify: the build installs and
  the activity shows the correct mark and colors for each variant.
