# Spec Delta

## MODIFIED Requirements

### Requirement: Interface theme selection

The app SHALL let the user pick the interface theme from a list of available themes in Settings — currently **Default**, **Nerv**, **Cat**, **The Force**, **Tunes**, and **Classic OS** — and SHALL let the user choose that theme's variant: the Default theme offers Light, Dark, and System (following the iPhone's setting), the **Nerv** theme offers Unit 00, Unit 01, and Unit 02, the **Cat** theme offers Hello Kitty, Chococat, and System, **The Force** theme offers Sith, Jedi, and System (System follows the iPhone's setting: light → Jedi, dark → Sith), the **Tunes** theme offers Classic, Bento, and System (System follows the iPhone's setting: light → Bento, dark → Classic), and the **Classic OS** theme offers Blue, Dark, and System (System follows the iPhone's setting: light → Blue, dark → Dark). The theme names and descriptions SHALL use neutral synonyms or abbreviations and SHALL NOT contain trademarked terms. The app SHALL persist the chosen theme and variant and apply them on the next launch.

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
- **THEN** the app offers Classic, Bento, and System, where Classic is the dark stock-player look, Bento is the light recolor of the same layout, and System follows the iPhone's setting (light → Bento, dark → Classic)

#### Scenario: Classic OS theme variants
- **WHEN** the Classic OS theme is selected
- **THEN** the app offers Blue, Dark, and System, where Blue is the light classic-desktop look, Dark is its dark counterpart, and System follows the iPhone's setting (light → Blue, dark → Dark)

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

### Requirement: Tunes media-player styling

While the **Tunes** theme is selected, the app SHALL style every screen as a classic media player — beveled chrome windows with a dark chrome frame, segmented LED/numeric readouts, classic transport controls, and a level/spectrum strip — using the selected variant's palette, while preserving the existing behavior, text, and controls. It SHALL use square corners throughout (no rounding on panels, buttons, inputs, badges, chips, or segments). The dashboard hero SHALL show the player readout and the lightning-bolt mark, and that mark SHALL be **yellow-gold** on the dark **Classic** variant while keeping the theme accent on the light **Bento** variant. The **Default** theme SHALL keep the app's standard styling.

#### Scenario: Tunes palettes
- **WHEN** the Classic or Bento variant is selected
- **THEN** the UI uses that variant's characteristic colors — Classic: dark charcoal chrome with silver bevels and green/amber readouts; Bento: light silver surfaces with amber/orange accents

#### Scenario: All screens restyled
- **WHEN** the Tunes theme is selected and any screen is shown
- **THEN** it uses the media-player styling with the variant's palette

#### Scenario: Square corners
- **WHEN** the Tunes theme is selected and any screen is shown
- **THEN** panels, buttons, inputs, badges, chips, segments, and the hero carry square corners with no rounding

#### Scenario: Gold mark on the dark variant
- **WHEN** the Classic (dark) variant is selected
- **THEN** the lightning-bolt mark is yellow-gold; when Bento is selected the mark uses the theme accent instead

#### Scenario: Player hero
- **WHEN** the Tunes theme is selected
- **THEN** the hero shows a player-style readout and the lightning-bolt mark

#### Scenario: Behavior preserved
- **WHEN** the Tunes theme is applied
- **THEN** the controls, labels, and flows behave as before

### Requirement: Classic OS desktop styling

While the **Classic OS** theme is selected, the app SHALL style every screen as a classic desktop operating system — gradient title bars, rounded beveled window and button chrome, section headers that read like window/taskbar elements, and an accent start-style control — using the selected variant's palette, while preserving the existing behavior, text, and controls. Section and card headers SHALL be rendered as classic desktop window title bars (a blue gradient bar with a white title and window-control buttons), the session close control SHALL be styled as the window close button (a red control with a white cross), the Stop control SHALL be styled as a window-control button, and a session's current directory SHALL be shown as a classic desktop path (an address-bar field with a folder icon). The dashboard hero SHALL show the desktop-style window header and the four-color flag mark. The **Default** theme SHALL keep the app's standard styling.

#### Scenario: Classic OS palettes
- **WHEN** the Blue or Dark variant is selected
- **THEN** the UI uses that variant's characteristic colors — Blue: the classic blue desktop with green accent; Dark: a dark counterpart of the same chrome

#### Scenario: All screens restyled
- **WHEN** the Classic OS theme is selected and any screen is shown
- **THEN** it uses the desktop styling with the variant's palette

#### Scenario: Window title bars and controls
- **WHEN** the Classic OS theme is selected
- **THEN** section and card headers render as blue gradient window title bars with a white title, the session close control is a red window close button with a white cross, and the Stop control is a window-control button

#### Scenario: Directory shown as a path
- **WHEN** the Classic OS theme is selected and a session has a working directory
- **THEN** its current directory is shown styled as a path (an address-bar field with a folder icon) instead of a plain chip

#### Scenario: Desktop hero
- **WHEN** the Classic OS theme is selected
- **THEN** the hero shows a desktop-style window header and the four-color flag mark

#### Scenario: Behavior preserved
- **WHEN** the Classic OS theme is applied
- **THEN** the controls, labels, and flows behave as before

## ADDED Requirements

### Requirement: Session list ordering

The dashboard SHALL order session cards by what the user needs first: sessions requiring the user's attention (a pending permission or question) first, then sessions that are working (running), then inactive sessions. Within the attention tier, the session with the most recently arrived request SHALL come first; the relative order of the remaining sessions SHALL be preserved.

#### Scenario: Attention first
- **WHEN** the session list contains an inactive session, a working session, and a session with a pending request
- **THEN** the pending-request session is shown first, the working session next, and the inactive session last

#### Scenario: Multiple attention sessions
- **WHEN** several sessions have pending requests
- **THEN** they appear above the working and inactive sessions, with the most recently arrived request first

#### Scenario: Working before inactive
- **WHEN** there are no pending requests
- **THEN** working sessions are shown above inactive sessions
