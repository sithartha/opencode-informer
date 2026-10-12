# Proposal

## Why

Switching to a theme stores a **mismatched** skin/variant pair, so the choice is not
remembered across launches. `selectTheme` in `app/App.tsx` performs two independent
writes:

```js
void setSkin(next)
void setThemeOption(selectThemeOption(next, systemScheme))
```

`setThemeOption` (`app/src/useBridge.ts`) persists the `skin` captured in its
render-time closure — the **previous** skin — so the two writes race in
`SecureStore` and can leave `(wizard, "system")` stored. On the next launch
`resolveTheme("wizard", "system")` finds `"system"` is not a Wizard option and
falls back to Wizard's default option, **Gryffindor**. Hence "the theme is not
remembered; Gryffindor comes back".

## What Changes

- Persist the chosen theme and its variant **together, in a single write**, using
  the theme actually being selected (never a stale skin).
- Keep the existing theme catalogue, variant rules, and stored keys unchanged.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
<!-- none: this restores behavior already required by "Interface theme selection"
     ("The app SHALL persist the chosen theme and variant and apply them on the next
     launch"). The change is declared with `skip_specs: true`. -->

## Impact

- `app/App.tsx` — `selectTheme` persists the pair atomically.
- `app/src/useBridge.ts` — add a combined setter (skin + option) and keep the
  single-purpose setters for the variant switcher.
- Tests: an app test that switching a theme persists the correct pair.
