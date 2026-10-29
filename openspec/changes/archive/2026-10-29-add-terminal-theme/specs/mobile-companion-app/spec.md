# Spec Delta

## MODIFIED Requirements

### Requirement: Interface theme selection

The app SHALL let the user pick the interface theme from a scrollable list of theme cards in Settings, shown in a bordered area that scrolls vertically and shows three cards fully and half of the next — currently **Default**, **Nerv**, **Cat**, **The Force**, **Tunes**, **Classic OS**, **Wizard**, and **Terminal**, all free — and SHALL let the user choose that theme's variant: the Default theme offers Light, Dark, and System (following the iPhone's setting), the **Nerv** theme offers Unit 00, Unit 01, and Unit 02, the **Cat** theme offers Hello Kitty, Chococat, and System, **The Force** theme offers Sith, Jedi, and System (System follows the iPhone's setting: light → Jedi, dark → Sith), the **Tunes** theme offers Classic, Bento, and System (System follows the iPhone's setting: light → Bento, dark → Classic), the **Classic OS** theme offers Blue, Dark, and System (System follows the iPhone's setting: light → Blue, dark → Dark), the **Wizard** theme offers Gryffindor, Slytherin, Ravenclaw, and Hufflepuff, and the **Terminal** theme offers Light, Dark, and System (System follows the iPhone's setting: light → Light, dark → Dark). Each card's preview thumbnail SHALL reflect that theme's own look — its palette and its corner style (rounded or square). Selecting a theme SHALL set its variant to the theme's **System** option, except for the **Nerv** theme (no System option) which SHALL set **Unit 01**, and the **Wizard** theme (no System option) which SHALL set **Gryffindor** on a light iPhone and **Slytherin** on a dark one. The theme names and descriptions SHALL use neutral synonyms or abbreviations and SHALL NOT contain trademarked terms. The app SHALL persist the chosen theme and variant and apply them on the next launch.

#### Scenario: Theme list
- **WHEN** the user opens the appearance settings
- **THEN** the app offers the available themes (Default, Nerv, Cat, The Force, Tunes, Classic OS, Wizard, and Terminal), all available without any purchase

#### Scenario: Theme list layout
- **WHEN** the appearance settings are shown
- **THEN** three theme cards are visible in full and half of the next card is visible, the list scrolls vertically inside a bordered area, and each card shows the theme's palette preview, name, and description

#### Scenario: Preview reflects the theme's shape
- **WHEN** the theme cards are shown
- **THEN** each card's preview thumbnail uses that theme's corner style — rounded for the rounded themes and square for the square-cornered themes (for example Nerv, Tunes, and Terminal)

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

#### Scenario: Terminal theme variants
- **WHEN** the Terminal theme is selected
- **THEN** the app offers Light, Dark, and System, where Light is paper-white with ink text and borders, Dark is ink-black with paper text and borders, and System follows the iPhone's setting (light → Light, dark → Dark)

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

### Requirement: Theme mark and hero watermark

The app SHALL show the selected theme's mark in the header instead of the generic app icon — the **unit head** for Evangelion (the selected unit's head), the character head for Hello Kitty, the Rebel or Imperial emblem for Star Wars, the **lightning bolt** for Tunes, the **four-color flag** for Classic OS, the **house crest** for Wizard, the **`>_` prompt glyph** for Terminal, and the app mark for the Default theme — and SHALL render a large, semi-transparent copy of that mark as a cropped backdrop on the hero. For the Terminal theme the mark and the hero backdrop SHALL be ASCII art rendered in the theme's monospace font and ink color rather than a bitmap image.

#### Scenario: Header mark
- **WHEN** a theme is selected
- **THEN** the header shows that theme's mark instead of the app icon

#### Scenario: Hero watermark
- **WHEN** the hero is shown
- **THEN** the theme's mark appears as a large, semi-transparent backdrop cropped by the hero

#### Scenario: Tunes and Classic OS marks
- **WHEN** the Tunes or Classic OS theme is selected
- **THEN** the header and hero watermark show that theme's mark (a lightning bolt for Tunes, a four-color flag for Classic OS)

#### Scenario: Terminal ASCII mark
- **WHEN** the Terminal theme is selected
- **THEN** the header shows a `>_` prompt glyph and the hero shows a large, faint figlet-style `OI` ASCII watermark, both drawn as monospace text in the theme's ink color

### Requirement: Agent avatars

Every session card SHALL show a procedurally generated face avatar in the compact and full layouts. The avatar's silhouette SHALL follow the theme's corner language: a square silhouette in square-cornered themes (Nerv, Tunes, Terminal) and a circular silhouette in rounded themes (Default, Cat, The Force, Classic OS, Wizard). The avatar's light seed SHALL be derived deterministically from the session, so each card's face is distinct, the same session keeps its look across renders, theme changes and launches, and it does not change with the session's phase. The avatar's surface colour SHALL follow the session's mode: a running session uses the theme's allow colour, a permission wait the permission colour, an answer wait the question colour, a completed or ended session the muted text colour, and any other phase the theme accent. The avatar's mood SHALL follow the session phase: a running session with a current tool shows the thinking mood, a running session without one shows the working mood, a session waiting for approval or for an answer shows the observing mood, a completed session shows the done mood, an ended session shows the inactive mood, and any other phase shows the idle mood. The compact card SHALL show the working-directory name across the card's full width on top, then place a larger, animated avatar on the left with the phase and activity to its right, and SHALL NOT draw a separate status dot; the expanded card SHALL animate the avatar. When the device's Reduce Motion setting is on, avatars SHALL be still. Avatars are decorative: the card's text already names the agent, so the avatar SHALL NOT add a separate screen-reader element.

#### Scenario: Mood follows the phase
- **WHEN** a running session starts or finishes a tool
- **THEN** its avatar shows the thinking mood while a tool is current, the working mood while none is, and the done mood when the session completes

#### Scenario: Waiting for the user
- **WHEN** a session is waiting for a permission or for an answer
- **THEN** its avatar shows the observing mood

#### Scenario: Inactive session
- **WHEN** a session has ended
- **THEN** its avatar shows the inactive mood

#### Scenario: Stable session identity
- **WHEN** a session is re-rendered, the theme changes, or the app is relaunched
- **THEN** its avatar keeps the same silhouette for that theme and the same light seed

#### Scenario: Distinct sessions
- **WHEN** two sessions are shown, even under the same agent
- **THEN** their avatars differ in their light seed while both use the theme's silhouette

#### Scenario: Theme colour
- **WHEN** the user changes the interface theme
- **THEN** every avatar uses that theme's silhouette — square in Nerv, Tunes, and Terminal, circular in the rounded themes — and its chrome follows the new theme's tokens

#### Scenario: Mode colour
- **WHEN** a session moves between running, permission, question, and settled states
- **THEN** its avatar switches to the matching mode colour while its seed and silhouette stay the same

#### Scenario: Compact card arrangement
- **WHEN** a session is shown in the compact grid
- **THEN** its working-directory name spans the card's full width on top, and below it an enlarged avatar sits on the left with the phase and activity to its right, with no separate status dot

#### Scenario: Still in the grid, alive when expanded
- **WHEN** a card is compact or expanded
- **THEN** its avatar animates in both layouts (larger in the compact grid), while Reduce Motion still stops it

#### Scenario: Reduce Motion
- **WHEN** Reduce Motion is enabled on the device
- **THEN** avatars do not animate in either layout

#### Scenario: Avatar in the preview
- **WHEN** the user opens the demo or card preview
- **THEN** the sample session cards show avatars too

## ADDED Requirements

### Requirement: Terminal shell styling

While the **Terminal** theme is selected, the app SHALL style every screen as a bash shell / TUI interface — monospace typography throughout, square corners with no rounding on any panel, button, input, chip, badge, segment, or preview, 1px ink borders, prompt and bracket chrome (such as `$`, `>`, `[ ]`), inverted-block selection, and no gradients, glows, or drop shadows — using the selected variant's palette, while preserving the existing behavior, text, and controls. The palette SHALL be monochrome except for indicators: text, borders, titles, links, buttons, chips, badges, and selection use only ink/paper tones (near-white `#f7f7f7` and near-black `#0b0b0b` with neutral greys between), while the connection status indicator, attention indicators, attention badges, and question/permission attention frames MAY use terminal-style colors (green, red, amber, cyan). The Terminal theme's Live Activity SHALL use the Terminal mark and a bracketed prompt-style status caption. The **Default** theme SHALL keep the app's standard styling.

#### Scenario: Terminal palettes
- **WHEN** the Light or Dark variant is selected
- **THEN** Light uses a near-white paper background with near-black ink text and borders, and Dark uses a near-black ink background with near-white text and borders

#### Scenario: All screens restyled
- **WHEN** the Terminal theme is selected and any screen is shown
- **THEN** it uses the bash/TUI styling with the variant's palette

#### Scenario: Monochrome with colored indicators
- **WHEN** the Terminal theme is selected and a screen is shown
- **THEN** only the connection status indicator, attention indicators and badges, and question/permission attention frames carry color; every other element is a neutral ink/paper tone

#### Scenario: Square corners
- **WHEN** the Terminal theme is selected and any screen is shown
- **THEN** panels, buttons, inputs, badges, chips, segments, theme previews, and the hero have square corners with no rounding

#### Scenario: Monospace typography
- **WHEN** the Terminal theme is selected and any text is shown
- **THEN** it uses the platform's console monospace font for headings, body, labels, buttons, chips, and numbers

#### Scenario: ASCII backdrop and terminal hero
- **WHEN** the Terminal theme is selected
- **THEN** screens carry a faint character-grid backdrop, and the dashboard hero is styled as a terminal window with a title bar, a `$` prompt readout, the needs-you figure, and the `OI` watermark

#### Scenario: Inverted selection and controls
- **WHEN** a theme, variant, session, or option is selected in the Terminal theme
- **THEN** it is marked with an inverted ink/paper block and a prompt or bracket marker rather than an accent color

#### Scenario: Behavior preserved
- **WHEN** the Terminal theme is applied
- **THEN** the controls, labels, and flows behave as before

#### Scenario: Existing themes unchanged
- **WHEN** any other theme is selected
- **THEN** its screens keep their current styling

#### Scenario: Terminal Live Activity
- **WHEN** the Terminal theme is active and a Live Activity is shown
- **THEN** it uses the Terminal `>_` mark, the `TERMINAL` caption, and a bracketed status such as `[ needs you ]` or `[ idle ]`
