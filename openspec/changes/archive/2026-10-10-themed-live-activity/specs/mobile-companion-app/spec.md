# Spec Delta

## MODIFIED Requirements

### Requirement: Interface theme selection

The app SHALL let the user pick the interface theme from a list of available themes in Settings — currently **Default**, **Nerv**, **Cat**, and **The Force** — and SHALL let the user choose that theme's variant: the Default theme offers Light, Dark, and System (following the iPhone's setting), the **Nerv** theme offers Unit 00, Unit 01, and Unit 02, the **Cat** theme offers Hello Kitty, Chococat, and System, and **The Force** theme offers Sith, Jedi, and System (System follows the iPhone's setting: light → Jedi, dark → Sith). The theme names and descriptions SHALL use neutral synonyms or abbreviations and SHALL NOT contain trademarked terms. The app SHALL persist the chosen theme and variant and apply them on the next launch.

#### Scenario: Theme list
- **WHEN** the user opens the appearance settings
- **THEN** the app offers the available themes (Default, Nerv, Cat, and The Force)

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

### Requirement: Collapsible sticky hero

As the user scrolls the dashboard, the app SHALL collapse the hero into a compact form pinned to the top of the screen and expand it back as the user scrolls up, with the transition driven by the scroll position. The transition SHALL track the hero's own height: the expanded hero SHALL stay visible while its space leaves the viewport (fading or morphing in step with the scroll) so it does not fade out early and leave a gap of empty space before the content below. In the compact form the app SHALL show the app mark with a pill naming the connected server on the leading side and, aligned to the trailing side, one colored dot per attention state — working, permission, question, and inactive — with that state's session count.

#### Scenario: Collapses on scroll
- **WHEN** the user scrolls the dashboard so the hero leaves view
- **THEN** the hero collapses into the compact form pinned to the top

#### Scenario: Expands on scroll back
- **WHEN** the user scrolls back toward the top
- **THEN** the hero expands to its full form

#### Scenario: Transition follows the scroll
- **WHEN** the user scrolls partially through the hero
- **THEN** the collapse follows the scroll position continuously rather than snapping

#### Scenario: Compact content
- **WHEN** the hero is in the compact form
- **THEN** it shows the app mark, the connected server, and, on the right, the colored state dots with their session counts

#### Scenario: No empty gap while collapsing
- **WHEN** the user scrolls so the hero leaves the viewport
- **THEN** the expanded hero's fade tracks the hero's height and no empty gap appears between the hero and the content below before the compact form takes over
