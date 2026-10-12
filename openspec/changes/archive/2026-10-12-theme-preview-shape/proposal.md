# Proposal

## Why

The theme cards' thumbnail previews are always drawn with the **active** theme's corner radius, so a
theme's shape is invisible in the list: users cannot tell that some themes are square-cornered (for
example **Nerv** and **Tunes**) and the rest are rounded without selecting each one. The preview
should show what the theme actually looks like.

## What Changes

- The theme card preview thumbnail SHALL render with the **previewed theme's own design tokens** —
  its corner radii, colors, and borders — so a rounded theme shows a rounded preview and a square
  theme shows a square preview.
- No change to the theme list layout, selection behavior, or the themes themselves.

## Capabilities

### New Capabilities
<!-- none: this refines the existing theming capability -->

### Modified Capabilities

- `mobile-companion-app`: the "Interface theme selection" requirement's preview is refined so the
  card thumbnail reflects the theme's shape (rounded vs square) as well as its palette.

## Impact

- `app/App.tsx` — the theme card thumbnail uses the previewed theme's styles (`createStyles(preview)`)
  instead of the active theme's styles.
- Tests: a component/style check that a square theme renders a square preview and a rounded theme a
  rounded one.
