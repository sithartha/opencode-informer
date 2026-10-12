# Tasks

## 1. Preview reflects the theme's shape

- [x] 1.1 In `app/App.tsx`, render each theme card's preview thumbnail with the **previewed theme's**
  styles — `createStyles(preview)` (`themePreview`, `themePreviewCard`, `themePreviewLine`,
  `themePreviewAccent`) plus `preview` colors — instead of the active theme's `styles`. Verify:
  `cd app && npm run typecheck` passes and square themes (Nerv, Tunes) show a square thumbnail while
  the rounded themes show a rounded one.
- [x] 1.2 Add a style check that the preview radii follow the theme: e.g.
  `createStyles(resolveTheme("tunes", "classic")).themePreview.borderRadius === 0` and
  `createStyles(resolveTheme("tunes", "bento")).themePreviewCard.borderRadius === 0`, versus a
  rounded theme (`default`) being greater than 0. Verify: `cd app && npm run test:components` passes.

## 2. Integration

- [x] 2.1 Run `cd app && npm test`, `cd app && npm run test:components`, and
  `cd app && npm run typecheck`. Verify: every command exits 0.
- [x] 2.2 Build to a device and confirm the theme-card previews visibly differ between rounded
  (Default, Cat, The Force, Classic OS, Wizard) and square (Nerv, Tunes) themes. Verify: the build
  installs and the previews reflect each theme's shape.
