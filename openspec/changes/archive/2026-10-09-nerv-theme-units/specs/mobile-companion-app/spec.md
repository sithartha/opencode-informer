# Spec Delta

## ADDED Requirements

### Requirement: Interface theme selection

The app SHALL let the user pick the interface theme from a list of available themes in Settings — currently **Default**, **Evangelion**, **Hello Kitty**, and **Star Wars** — and SHALL let the user choose that theme's variant: the Default theme offers Light, Dark, and System (following the iPhone's setting), the Evangelion theme offers Unit 00, Unit 01, and Unit 02, the Hello Kitty theme offers Hello Kitty, Chococat, and System, and the Star Wars theme offers Sith, Jedi, and System (System follows the iPhone's setting: light → Jedi, dark → Sith). The app SHALL persist the chosen theme and variant and apply them on the next launch.

#### Scenario: Theme list
- **WHEN** the user opens the appearance settings
- **THEN** the app offers the available themes (Default, Evangelion, Hello Kitty, and Star Wars)

#### Scenario: Default theme variants
- **WHEN** the Default theme is selected
- **THEN** the app offers Light, Dark, and System, and System follows the iPhone's setting

#### Scenario: Evangelion theme variants
- **WHEN** the Evangelion theme is selected
- **THEN** the app offers Unit 00, Unit 01, and Unit 02

#### Scenario: Hello Kitty theme variants
- **WHEN** the Hello Kitty theme is selected
- **THEN** the app offers Hello Kitty, Chococat, and System, where System follows the iPhone's setting (light → Hello Kitty, dark → Chococat)

#### Scenario: Star Wars theme variants
- **WHEN** the Star Wars theme is selected
- **THEN** the app offers Sith, Jedi, and System, where System follows the iPhone's setting (light → Jedi, dark → Sith)

#### Scenario: Applying a theme
- **WHEN** the user selects a theme or a variant
- **THEN** the whole UI immediately uses that theme

#### Scenario: Persisted across launches
- **WHEN** the app is relaunched
- **THEN** the previously selected theme and variant are applied

#### Scenario: Previous setting migrates
- **WHEN** the app starts with a legacy stored preference
- **THEN** the app maps it to a theme and a variant instead of failing

### Requirement: Evangelion NERV styling

While the **Evangelion** theme is selected, the app SHALL style every screen as a NERV system interface — angular panels with square corners (no rounding), technical typography (monospace labels and numbers), warning stripes, corner ticks, and HUD labels — using the colors of the selected unit, while preserving the existing behavior, text, and controls. The **Default** theme SHALL keep the app's standard styling.

#### Scenario: Unit palettes
- **WHEN** Unit 00, Unit 01, or Unit 02 is selected
- **THEN** the UI uses that unit's characteristic colors — 00 blue/white, 01 purple with neon green, 02 red/orange — including the unit's secondary accent on headers and accents

#### Scenario: All screens restyled
- **WHEN** the Evangelion theme is selected and any screen is shown
- **THEN** it uses the NERV styling

#### Scenario: MAGI hero
- **WHEN** the Evangelion theme is selected
- **THEN** the dashboard hero is styled as a MAGI console with three core indicators (MELCHIOR, BALTHASAR, CASPER) for the working, permission, and question states

#### Scenario: Default theme unchanged
- **WHEN** the Default theme is selected
- **THEN** the screens use the app's standard styling

#### Scenario: Behavior preserved
- **WHEN** the UI is restyled
- **THEN** the controls, labels, and flows behave as before

### Requirement: Hello Kitty hero

While the Hello Kitty theme is selected, the dashboard hero SHALL carry a themed header — a bow mark for the Hello Kitty variant or a paw mark for the Chococat variant, with the theme name and a status word — using the theme's palette, while keeping the needs-you figure and the controls. The Default theme SHALL keep the standard hero.

#### Scenario: Hello Kitty hero
- **WHEN** the Hello Kitty theme is selected
- **THEN** the hero shows the themed mark, the theme name, and a status word above the needs-you figure

### Requirement: Star Wars styling

While the Star Wars theme is selected, the app SHALL style the screens with its rounded HUD design — a left lightsaber rail on panels and underlined section headers — and the dashboard hero SHALL show the faction name (JEDI ORDER for the Jedi variant, SITH ORDER for the Sith variant) with a lightsaber bar in the theme's accent above the needs-you figure. The Default theme SHALL keep the standard styling.

#### Scenario: Star Wars hero
- **WHEN** the Star Wars theme is selected
- **THEN** the hero shows the faction name and a lightsaber bar above the needs-you figure

#### Scenario: Star Wars components
- **WHEN** the Star Wars theme is selected and any screen is shown
- **THEN** it uses the rounded HUD styling with the theme's palette

### Requirement: Theme mark and hero watermark

The app SHALL show the selected theme's mark in the header instead of the generic app icon — the **unit head** for Evangelion (the selected unit's head), the character head for Hello Kitty, the Rebel or Imperial emblem for Star Wars, and the app mark for the Default theme — and SHALL render a large, semi-transparent copy of that mark as a cropped backdrop on the hero.

#### Scenario: Header mark
- **WHEN** a theme is selected
- **THEN** the header shows that theme's mark instead of the app icon

#### Scenario: Hero watermark
- **WHEN** the hero is shown
- **THEN** the theme's mark appears as a large, semi-transparent backdrop cropped by the hero

### Requirement: Extensible theme catalog

The app SHALL resolve the interface palette from a theme catalog keyed by a theme id, so additional themes can be added without changing the screens; the Evangelion units are the first entries.

#### Scenario: Palette resolved from the catalog
- **WHEN** a theme id is selected
- **THEN** the app resolves that theme's palette from the catalog

#### Scenario: Added without changing screens
- **WHEN** a new theme is added to the catalog
- **THEN** the screens render it without per-screen changes
