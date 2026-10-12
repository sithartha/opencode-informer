# Spec Delta

## MODIFIED Requirements

### Requirement: Interface theme selection

The app SHALL let the user pick the interface theme from a scrollable list of theme cards in Settings, shown in a bordered area that scrolls vertically and shows three cards fully and half of the next — currently **Default**, **Nerv**, **Cat**, **The Force**, **Tunes**, **Classic OS**, and **Wizard**, all free — and SHALL let the user choose that theme's variant: the Default theme offers Light, Dark, and System (following the iPhone's setting), the **Nerv** theme offers Unit 00, Unit 01, and Unit 02, the **Cat** theme offers Hello Kitty, Chococat, and System, **The Force** theme offers Sith, Jedi, and System (System follows the iPhone's setting: light → Jedi, dark → Sith), the **Tunes** theme offers Classic, Bento, and System (System follows the iPhone's setting: light → Bento, dark → Classic), the **Classic OS** theme offers Blue, Dark, and System (System follows the iPhone's setting: light → Blue, dark → Dark), and the **Wizard** theme offers Gryffindor, Slytherin, Ravenclaw, and Hufflepuff. Each card's preview thumbnail SHALL reflect that theme's own look — its palette and its corner style (rounded or square). Selecting a theme SHALL set its variant to the theme's **System** option, except for the **Nerv** theme (no System option) which SHALL set **Unit 01**, and the **Wizard** theme (no System option) which SHALL set **Gryffindor** on a light iPhone and **Slytherin** on a dark one. The theme names and descriptions SHALL use neutral synonyms or abbreviations and SHALL NOT contain trademarked terms. The app SHALL persist the chosen theme and variant and apply them on the next launch.

#### Scenario: Theme list
- **WHEN** the user opens the appearance settings
- **THEN** the app offers the available themes (Default, Nerv, Cat, The Force, Tunes, Classic OS, and Wizard), all available without any purchase

#### Scenario: Theme list layout
- **WHEN** the appearance settings are shown
- **THEN** three theme cards are visible in full and half of the next card is visible, the list scrolls vertically inside a bordered area, and each card shows the theme's palette preview, name, and description

#### Scenario: Preview reflects the theme's shape
- **WHEN** the theme cards are shown
- **THEN** each card's preview thumbnail uses that theme's corner style — rounded for the rounded themes and square for the square-cornered themes (for example Nerv and Tunes)

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
