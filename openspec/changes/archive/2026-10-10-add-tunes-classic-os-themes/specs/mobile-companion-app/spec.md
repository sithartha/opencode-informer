# Spec Delta

## MODIFIED Requirements

### Requirement: Interface theme selection

The app SHALL let the user pick the interface theme from a list of available themes in Settings — currently **Default**, **Nerv**, **Cat**, **The Force**, **Tunes**, and **Classic OS** — and SHALL let the user choose that theme's variant: the Default theme offers Light, Dark, and System (following the iPhone's setting), the **Nerv** theme offers Unit 00, Unit 01, and Unit 02, the **Cat** theme offers Hello Kitty, Chococat, and System, **The Force** theme offers Sith, Jedi, and System (System follows the iPhone's setting: light → Jedi, dark → Sith), the **Tunes** theme offers Classic and Bento (the classic stock player look and a light recolor of the same layout), and the **Classic OS** theme offers Blue and Dark (the classic blue desktop and a dark counterpart). The theme names and descriptions SHALL use neutral synonyms or abbreviations and SHALL NOT contain trademarked terms. The app SHALL persist the chosen theme and variant and apply them on the next launch.

#### Scenario: Theme list
- **WHEN** the user opens the appearance settings
- **THEN** the app offers the available themes (Default, Nerv, Cat, The Force, Tunes, and Classic OS)

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
- **THEN** the app offers Classic and Bento, where Classic is the dark stock-player look and Bento is the light recolor of the same layout

#### Scenario: Classic OS theme variants
- **WHEN** the Classic OS theme is selected
- **THEN** the app offers Blue and Dark, where Blue is the light classic-desktop look and Dark is its dark counterpart

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

### Requirement: Theme mark and hero watermark

The app SHALL show the selected theme's mark in the header instead of the generic app icon — the **unit head** for Evangelion (the selected unit's head), the character head for Hello Kitty, the Rebel or Imperial emblem for Star Wars, the **lightning bolt** for Tunes, the **four-color flag** for Classic OS, and the app mark for the Default theme — and SHALL render a large, semi-transparent copy of that mark as a cropped backdrop on the hero.

#### Scenario: Header mark
- **WHEN** a theme is selected
- **THEN** the header shows that theme's mark instead of the app icon

#### Scenario: Hero watermark
- **WHEN** the hero is shown
- **THEN** the theme's mark appears as a large, semi-transparent backdrop cropped by the hero

#### Scenario: Tunes and Classic OS marks
- **WHEN** the Tunes or Classic OS theme is selected
- **THEN** the header and hero watermark show that theme's mark (a lightning bolt for Tunes, a four-color flag for Classic OS)

## ADDED Requirements

### Requirement: Tunes media-player styling

While the **Tunes** theme is selected, the app SHALL style every screen as a classic media player — beveled chrome windows with a dark chrome frame, segmented LED/numeric readouts, classic transport controls, and a level/spectrum strip — using the selected variant's palette, while preserving the existing behavior, text, and controls. The dashboard hero SHALL show the player readout and the lightning-bolt mark. The **Default** theme SHALL keep the app's standard styling.

#### Scenario: Tunes palettes
- **WHEN** the Classic or Bento variant is selected
- **THEN** the UI uses that variant's characteristic colors — Classic: dark charcoal chrome with silver bevels and green/amber readouts; Bento: light silver surfaces with amber/orange accents

#### Scenario: All screens restyled
- **WHEN** the Tunes theme is selected and any screen is shown
- **THEN** it uses the media-player styling with the variant's palette

#### Scenario: Player hero
- **WHEN** the Tunes theme is selected
- **THEN** the hero shows a player-style readout and the lightning-bolt mark

#### Scenario: Behavior preserved
- **WHEN** the Tunes theme is applied
- **THEN** the controls, labels, and flows behave as before

### Requirement: Classic OS desktop styling

While the **Classic OS** theme is selected, the app SHALL style every screen as a classic desktop operating system — gradient title bars, rounded beveled window and button chrome, section headers that read like window/taskbar elements, and an accent start-style control — using the selected variant's palette, while preserving the existing behavior, text, and controls. The dashboard hero SHALL show the desktop-style window header and the four-color flag mark. The **Default** theme SHALL keep the app's standard styling.

#### Scenario: Classic OS palettes
- **WHEN** the Blue or Dark variant is selected
- **THEN** the UI uses that variant's characteristic colors — Blue: the classic blue desktop with green accent; Dark: a dark counterpart of the same chrome

#### Scenario: All screens restyled
- **WHEN** the Classic OS theme is selected and any screen is shown
- **THEN** it uses the desktop styling with the variant's palette

#### Scenario: Desktop hero
- **WHEN** the Classic OS theme is selected
- **THEN** the hero shows a desktop-style window header and the four-color flag mark

#### Scenario: Behavior preserved
- **WHEN** the Classic OS theme is applied
- **THEN** the controls, labels, and flows behave as before
