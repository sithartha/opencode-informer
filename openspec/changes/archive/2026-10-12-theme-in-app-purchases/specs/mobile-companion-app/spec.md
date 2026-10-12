# Spec Delta

## MODIFIED Requirements

### Requirement: Interface theme selection

The app SHALL let the user pick the interface theme from a scrollable list of theme cards in Settings, shown in a bordered area that scrolls vertically and shows three cards fully and half of the next — currently **Default**, **Nerv**, **Cat**, **The Force**, **Tunes**, **Classic OS**, and **Wizard**, all free — and SHALL let the user choose that theme's variant: the Default theme offers Light, Dark, and System (following the iPhone's setting), the **Nerv** theme offers Unit 00, Unit 01, and Unit 02, the **Cat** theme offers Hello Kitty, Chococat, and System, **The Force** theme offers Sith, Jedi, and System (System follows the iPhone's setting: light → Jedi, dark → Sith), the **Tunes** theme offers Classic, Bento, and System (System follows the iPhone's setting: light → Bento, dark → Classic), the **Classic OS** theme offers Blue, Dark, and System (System follows the iPhone's setting: light → Blue, dark → Dark), and the **Wizard** theme offers Gryffindor, Slytherin, Ravenclaw, and Hufflepuff. Selecting a theme SHALL set its variant to the theme's **System** option, except for the **Nerv** theme (no System option) which SHALL set **Unit 01**, and the **Wizard** theme (no System option) which SHALL set **Gryffindor** on a light iPhone and **Slytherin** on a dark one. The theme names and descriptions SHALL use neutral synonyms or abbreviations and SHALL NOT contain trademarked terms. The app SHALL persist the chosen theme and variant and apply them on the next launch.

#### Scenario: Theme list
- **WHEN** the user opens the appearance settings
- **THEN** the app offers the available themes (Default, Nerv, Cat, The Force, Tunes, Classic OS, and Wizard), all available without any purchase

#### Scenario: Theme list layout
- **WHEN** the appearance settings are shown
- **THEN** three theme cards are visible in full and half of the next card is visible, the list scrolls vertically inside a bordered area, and each card shows the theme's palette preview, name, and description

#### Scenario: Default theme variants
- **WHEN** the Default theme is selected
- **THEN** the app offers Light, Dark, and System, and System follows the iPhone's setting

#### Scenario: Evangelion theme variants
- **WHEN** the Nerv theme is selected
- **THEN** the app offers Unit 00, Unit 01, and Unit 02

#### Scenario: Hello Kitty theme variants
- **WHEN** the Cat theme is selected
- **THEN** the app offers Hello Kitty, Chococat, and System, where System follows the iPhone's setting (light → Hello Kitty, dark → Chococat)

#### Scenario: Star Wars theme variants
- **WHEN** The Force theme is selected
- **THEN** the app offers Sith, Jedi, and System, where System follows the iPhone's setting (light → Jedi, dark → Sith)

#### Scenario: Tunes theme variants
- **WHEN** the Tunes theme is selected
- **THEN** the app offers Classic, Bento, and System, where Classic is the dark stock-player look, Bento is the light recolor of the same layout, and System follows the iPhone's setting (light → Bento, dark → Classic)

#### Scenario: Classic OS theme variants
- **WHEN** the Classic OS theme is selected
- **THEN** the app offers Blue, Dark, and System, where Blue is the light classic-desktop look, Dark is its dark counterpart, and System follows the iPhone's setting (light → Blue, dark → Dark)

#### Scenario: Wizard theme variants
- **WHEN** the Wizard theme is selected
- **THEN** the app offers Gryffindor, Slytherin, Ravenclaw, and Hufflepuff, and selecting it defaults to Gryffindor on a light iPhone and Slytherin on a dark one

#### Scenario: Switching a theme picks the System variant
- **WHEN** the user selects a theme
- **THEN** its variant becomes the theme's System option, and for the Nerv theme it becomes Unit 01 and for the Wizard theme it follows the iPhone's setting (light → Gryffindor, dark → Slytherin)

#### Scenario: Applying a theme
- **WHEN** the user selects a theme or a variant
- **THEN** the whole UI immediately uses that theme

#### Scenario: Persisted across launches
- **WHEN** the app is relaunched
- **THEN** the previously selected theme and variant are applied

#### Scenario: Previous setting migrates
- **WHEN** the app starts with a legacy stored preference
- **THEN** the app maps it to a theme and a variant instead of failing

#### Scenario: De-trademarked names and descriptions
- **WHEN** the appearance settings show the themes
- **THEN** the theme names and descriptions contain no trademarked terms

### Requirement: Evangelion NERV styling

While the **Evangelion** theme is selected, the app SHALL style every screen as a NERV system interface — angular panels with square corners (no rounding), technical typography (monospace labels and numbers), warning stripes, corner ticks, and HUD labels — using the colors of the selected unit, while preserving the existing behavior, text, and controls. The **Default** theme SHALL keep the app's standard styling.

#### Scenario: Unit palettes
- **WHEN** Unit 00, Unit 01, or Unit 02 is selected
- **THEN** the UI uses that unit's characteristic colors — 00 yellow with green, 01 purple with neon green, 02 red/orange — including the unit's secondary accent on headers and accents

#### Scenario: All screens restyled
- **WHEN** the Evangelion theme is selected and any screen is shown
- **THEN** it uses the NERV styling

#### Scenario: MAGI hero
- **WHEN** the Evangelion theme is selected
- **THEN** the dashboard hero is styled as a MAGI console with three hexagonal core indicators (MELCHIOR, BALTHASAR, CASPER) for the working, permission, and question states, and the status readouts are shown as hexagons

#### Scenario: Default theme unchanged
- **WHEN** the Default theme is selected
- **THEN** the screens use the app's standard styling

#### Scenario: Behavior preserved
- **WHEN** the UI is restyled
- **THEN** the controls, labels, and flows behave as before

## ADDED Requirements

### Requirement: Support development tips

The app SHALL offer optional tips that support development as consumable purchases that grant no
content, shown as a section in Settings with three cards, each of which says that the tip unlocks
nothing, with the middle card highlighted as the most attractive.

#### Scenario: Tip cards
- **WHEN** the user opens Settings
- **THEN** three tip cards are offered ($0.99, $2.99, $5.99), each with a distinct icon, an explicit buy control on the right showing its price, and text saying they get nothing; the middle card is highlighted with its buy control filled (the others outlined), with no "recommended" label

#### Scenario: Tips grant no content
- **WHEN** the user buys a tip
- **THEN** no theme or other content is unlocked
