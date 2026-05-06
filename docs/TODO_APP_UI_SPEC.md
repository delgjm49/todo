# Todo App UI Wireframe and Interaction Spec

## Purpose

This document defines the visual structure, screen layout, major controls, interaction patterns, and UI states for the v1 desktop application.

It is a front-end blueprint that sits between:

- the product plan in [TODO_APP_PLAN.md](C:/Users/jdelgro2/OneDrive%20-%20University%20of%20Rochester/Desktop/Todo_app/docs/TODO_APP_PLAN.md)
- the technical build spec in [TODO_APP_TECH_SPEC.md](C:/Users/jdelgro2/OneDrive%20-%20University%20of%20Rochester/Desktop/Todo_app/docs/TODO_APP_TECH_SPEC.md)

This is not a pixel-perfect design file. It is the implementation-facing UI spec for layout, behavior, and component intent.

## UI Direction

The app should feel:

- desktop-native
- quiet and focused
- visually polished but not decorative
- structured, not spreadsheet-like
- dense enough for real use without feeling cramped

### Design principles

- information first
- low visual noise
- direct manipulation where possible
- strong hover/focus states
- right-click context menus for secondary actions
- mouse-first primary flows
- compact controls, not oversized cards

## Visual Design Intent

### General tone

- restrained, professional UI
- subtle elevation only where needed
- limited use of saturated accent color
- emphasis on contrast, spacing, and hierarchy rather than decoration

### Shape language

- rectangular or lightly rounded surfaces
- border radius target: 6px to 8px
- no oversized floating cards for whole sections
- blocks should feel like editable panels, not decorative tiles

### Typography

- default font: `Segoe UI` on Windows
- clear hierarchy:
  - app-level labels: compact
  - workspace titles: medium emphasis
  - block titles: medium/high emphasis
  - cell text: normal reading size

### Color behavior

- themeable light/dark
- workspace cards can carry stronger color identity
- main editing area should remain calmer than the dock
- alerts use a clearly distinct accent color

## Primary Screens

V1 should have two main screens:

1. Main workspace screen
2. Settings screen

## Screen 1: Main Workspace Screen

This is the primary application surface.

### Layout regions

```text
+-----------------------------------------------------------------------------------+
| Left Dock                 | Top Bar                                               |
|                           +-------------------------------------------------------+
| Workspace List            | Workspace Header / Block Canvas / Optional Inspector  |
|                           |                                                       |
|                           |  [Block 1]                                            |
|                           |  [Block 2]                                            |
|                           |  [Block 3]                                            |
|                           |                                                       |
+-----------------------------------------------------------------------------------+
```

### Desktop layout recommendation

- left dock: fixed width
- top bar: fixed height
- main canvas: fills remaining width
- right inspector: collapsible and docked, not modal

Recommended widths:

- left dock: `280px`
- right inspector expanded: `280px` to `320px`
- main canvas minimum usable width: `760px`

## Region 1: Left Dock

The dock is the app's navigation spine.

### Structure

From top to bottom:

1. app identity area
2. workspace actions
3. scrollable workspace list
4. bottom utility actions

### Wireframe

```text
+----------------------------+
| App Icon   Todo           |
| + Workspace               |
|---------------------------|
| [Workspace A          ]   |
| [Workspace B          ]   |
| [Workspace C          ]   |
| [Workspace D          ]   |
|                           |
|                           |
|---------------------------|
| Settings        Theme     |
+----------------------------+
```

### App identity area

Contains:

- app icon
- app name

This should be compact, not a hero area.

### Workspace actions

Primary action:

- `+ Workspace`

This should be a clear command button near the top of the dock.

### Workspace card design

Each workspace row/card should include:

- title
- optional color accent stripe on far left
- optional alert badge/count
- drag affordance on hover

Possible row anatomy:

```text
+--------------------------------+
| | Accent | Workspace Title  ! |
+--------------------------------+
```

Where:

- accent stripe is narrow and flush left
- title is the main label
- alert badge or note appears at right or below title when active

### Workspace card states

- default
- hover
- selected
- drag preview
- drag target
- alert active
- selected + alert active

### Workspace card behavior

Left click:

- selects workspace

Right click:

- opens workspace context menu

Drag:

- reorders within dock

Double click:

- optional rename shortcut, but not required in v1

### Workspace alert presentation

Avoid heavy flashing for the entire dock item.

Recommended alert treatment:

- small colored badge or dot
- optional single-line subtext:
  - `1 alert in Today`
  - `2 alerts`

If attention pulse is used, it should be subtle and time-limited.

### Workspace context menu

Menu items:

- Rename
- Change background color
- Change text color
- Toggle accent stripe
- Change accent color
- Delete workspace

Place destructive actions at the bottom.

## Region 2: Top Bar

The top bar should stay compact and operational.

### Wireframe

```text
+-----------------------------------------------------------------------+
| Current Workspace | + Block | Undo | Redo | Inspector | Settings      |
+-----------------------------------------------------------------------+
```

### Required controls

- current workspace name
- add block
- undo
- redo
- inspector toggle
- settings entry

### Optional controls for v1 if space permits

- theme toggle
- lightweight save status

### Top bar behavior

- sticky at top of main pane
- always visible while scrolling blocks
- buttons should be icon-first where clear

Recommended icons:

- plus for add block
- arrow-left / arrow-right for undo/redo
- sliders/panel icon for inspector
- gear for settings

## Region 3: Workspace Canvas

This is the primary editing surface.

### Canvas behavior

- vertically scrollable
- contains a stack of blocks
- content aligned to a readable center-left column, not stretched edge-to-edge without padding

### Spacing guidance

- canvas horizontal padding: `20px` to `28px`
- vertical gap between blocks: `16px` to `20px`

### Empty state

When a workspace has no blocks:

- show the workspace title
- show one compact empty-state panel
- provide:
  - `Add your first block`
  - preset options for checklist, bullet list, numbered list

This should feel like a useful starting surface, not a marketing message.

## Block Design

Blocks are the core editing objects.

### Block anatomy

```text
+-----------------------------------------------------------------------+
| v  Block Title                             Sort  + Row  ...           |
|-----------------------------------------------------------------------|
| Col A        | Col B               | Col C                            |
|-----------------------------------------------------------------------|
| [ ]          | Prepare report      | 05/09/2026                       |
| [ ]          | Call vendor         | 05/10/2026                       |
| [ ]          | ...                 | ...                              |
+-----------------------------------------------------------------------+
```

### Block header contents

- collapse/expand control
- editable block title
- optional block type label in a subtle way
- sort button/menu
- add row button
- block actions menu

### Block header behavior

Click title:

- enters inline rename/edit mode

Click collapse:

- hides row content, preserves header

Click sort:

- opens sort menu for available columns

Click actions menu:

- opens block context menu

### Block header states

- default
- hover
- selected block
- collapsed
- drag preview

### Block body

The body is table-like, but should not visually mimic a spreadsheet too closely.

Use:

- clear row separation
- visible column structure
- restrained grid/border treatment
- editable cells with obvious focus state

### Block context menu

Menu items:

- Rename block
- Duplicate block later if added
- Move to workspace >
- Collapse / Expand
- Sort by >
- Delete block

V1 can omit duplicate if needed.

## Column Header Row

Each block should show a header row for columns.

### Column header contents

- column label
- type icon if useful
- resize affordance
- context menu trigger

### Column header behavior

Click:

- selects column for inspector editing

Right click:

- opens column context menu

V1 reorder:

- use explicit move-left / move-right actions from the column menu

Direct header drag and resize can be added after v1.

### Column context menu

Menu items:

- Rename column
- Change type
- Move left
- Move right
- Add column left
- Add column right
- Delete column
- Format column
- Column settings
- Enable alerts when the column type is `date` or `time`

### Column header visual rule

Column headers should be calmer than spreadsheet software.

Use:

- subtle background contrast
- light border or separator
- compact labels

## Row Design

Rows are the editable task lines inside a block.

### Row anatomy

```text
| drag | cell A | cell B | cell C |
```

### Row controls

Prefer low-noise controls:

- drag handle visible on hover or selection
- context menu on right click
- optional small plus affordance between rows on hover

### Row states

- default
- hover
- selected
- drag preview
- alert-target highlight
- checkbox-completed state

### Completed row behavior

If enabled by checkbox settings:

- row text may render struck through
- row opacity may be slightly reduced
- completed rows may move to bottom

Do not make completed rows too faint to read.

### Row context menu

Menu items:

- Insert row above
- Insert row below
- Cut row
- Copy row
- Paste row
- Delete row
- Format row

## Cell Design

Cells are the direct editing targets.

### Universal cell behavior

- single click selects cell
- second click or immediate typing enters edit mode
- right click opens row/cell actions depending on context
- visible focus ring or border when selected

### Cell states

- default
- hover
- selected
- editing
- invalid value
- alert highlighted

### Text cell

Behavior:

- inline text editing
- wraps to multiple lines if content grows
- preserves row height cleanly

### Checkbox cell

Behavior:

- checkbox aligned consistently
- click toggles immediately
- triggers row strikeout/move rules if enabled

### Bullet cell

Behavior:

- bullet marker shown
- the editable text lives in the neighboring `text` column
- the bullet cell itself is marker-only in v1

### Numbered cell

Behavior:

- numeric marker shown
- the editable text lives in the neighboring `text` column
- the numbered cell itself is marker-only in v1
- numbering updates with row order automatically

### Date cell

Behavior:

- direct text entry allowed in v1
- calendar picker optional, not required
- invalid date shows clear but non-intrusive error styling

### Time cell

Behavior:

- direct text entry allowed in v1
- optional simple picker later
- invalid time shows clear but non-intrusive error styling

### Dropdown cell

Behavior:

- click opens compact option list
- empty state allowed

## Region 4: Right Inspector

The inspector is the main configuration surface for formatting and properties.

### Recommendation

Make the inspector collapsible and context-sensitive.

It should change based on current selection:

- block selected
- column selected
- row selected
- cell selected
- no selection

### Inspector structure

```text
+------------------------------+
| Inspector                    |
|------------------------------|
| Target: Cell / Row / Column  |
|                              |
| Text                          |
| Font family                  |
| Font size                    |
| Bold / Italic / Underline    |
| Text color                   |
| Fill / Highlight             |
|                              |
| Border                       |
| Width                        |
| Color                        |
| Edges                        |
|                              |
| Type-specific settings       |
+------------------------------+
```

### Inspector sections

#### 1. Target summary

Shows what is selected:

- `Cell: Task`
- `Row: 3`
- `Column: Due Date`
- `Block: Today`

#### 2. Text formatting

Controls:

- font family
- font size
- bold
- italic
- underline
- text color
- fill/background
- alignment if included

#### 3. Border formatting

Controls:

- border width
- border color
- top/right/bottom/left edge toggles

#### 4. Type-specific settings

Examples:

- checkbox column:
  - strike out row on check
  - move checked rows to bottom
- dropdown column:
  - edit options
- date/time column:
  - enable alerts

In v1, the minimum required date/time alert toggle should also be reachable from the column context menu so alerts are not blocked on deeper inspector work.

### No-selection state

When nothing specific is selected:

- show block-level or app-level guidance
- avoid empty blank panel

## Screen 2: Settings

The settings view should be a dedicated screen, not a cramped modal.

### Layout

```text
+---------------------------------------------------------------+
| Settings                                                      |
|---------------------------------------------------------------|
| Appearance                                                    |
| Editor Defaults                                               |
| Workspace Defaults                                            |
|                                                               |
| [setting groups and controls]                                 |
+---------------------------------------------------------------+
```

### Recommended sections

#### 1. Appearance

- light mode
- dark mode
- default theme at startup

#### 2. Editor defaults

- default font family
- default font size
- default text color
- default fill/highlight color
- default border width
- default border color

#### 3. Workspace defaults

- default workspace card background
- default workspace card text color
- default accent stripe enabled
- default accent stripe color

### Settings interactions

- change applies immediately where reasonable
- persisted automatically
- provide reset-to-defaults for major groups later if needed

## Modal and Menu Inventory

V1 should keep modal usage low.

### Allowed modals

- delete workspace confirmation
- delete block confirmation if needed

### Avoid if possible

- large edit dialogs for routine actions
- wizard-heavy flows

### Menus needed

- workspace context menu
- block context menu
- column context menu
- row context menu
- sort menu
- add block template menu

## Add Block Flow

This should be fast.

### Recommended interaction

Click `+ Block` opens a compact menu or popover:

- Basic Checklist
- Bulleted List
- Numbered List

Selecting one immediately creates the block in the current workspace.

Do not use a full-screen flow for this.

## Selection Model

The UI must make selection state clear because the inspector depends on it.

### Selectable entities

- workspace
- block
- column
- row
- cell

### Selection priority

Only one active inspector target at a time.

Example:

- selecting a cell sets inspector target to cell
- selecting a column header replaces cell selection target
- selecting block chrome sets inspector to block

### Visual treatment

- block selection: subtle outline or header emphasis
- column selection: header emphasis
- row selection: row background emphasis
- cell selection: stronger focus ring

## Alert UX

Alert behavior should be informative, not noisy.

### Workspace-level indicator

- badge or dot in dock
- optional short alert text

### Navigation behavior

When user clicks alerted workspace:

- open workspace
- scroll to relevant block if needed
- highlight target row/cell briefly

V1 reminder semantics:

- date-only alerts become due at `9:00 AM` local time
- time-only alerts are for the current day at the saved time
- invalid date/time values never alert
- completed rows suppress alerts

### Highlight treatment

- 1 to 2 second fade or pulse
- no aggressive blinking

## Empty States

### No workspaces

If first launch has no workspace:

- show one default starter workspace automatically

Reason:

- avoids dead-end startup
- gets user immediately into the app

### Empty workspace

Show:

- workspace title
- short prompt to add a block
- 3 preset buttons or menu choices

### Empty block

Show:

- column headers
- single ghost row or `Add first row` affordance

## Error and Validation UI

### Save failure

Use a toast or slim banner:

- `Could not save changes`
- `Retry`

Do not use blocking modal for normal save failure.

### Invalid date/time

Show:

- subtle error border or color
- tooltip or small helper text on focus if needed

Do not interrupt the user with modal errors.

## Scroll Behavior

### Dock

- independent vertical scroll for workspaces

### Main canvas

- independent vertical scroll for blocks

### Block interior

Avoid nested scrolling inside blocks unless block size becomes extreme.

Prefer letting the full workspace canvas own vertical scroll.

## Desktop Window Guidance

V1 target window assumptions:

- desktop-first
- minimum supported window: around `1280x800`
- optimized range: `1366x768` up to large desktop sizes

### Resize behavior

- dock remains fixed within min/max width
- inspector can collapse when space is tight
- main canvas absorbs size changes

## Recommended Component Density

This app should not look like a phone UI on desktop.

Use:

- compact toolbar heights
- moderate row heights
- visible but restrained padding
- dense enough for long task lists

Suggested targets:

- top bar height: `48px` to `56px`
- workspace row height: `40px` to `56px`
- table row base height: `36px` to `44px`

## Accessibility and Usability Baseline

Even though mouse-first is the goal, the UI should still support:

- visible focus states
- readable contrast in light and dark mode
- clear clickable targets
- standard shortcuts
- tooltips for icon-only buttons

## First-Pass ASCII Wireframe

```text
+------------------------------------------------------------------------------------------------------+
| Left Dock                          | Today                                      + Block  Undo Redo  |
|------------------------------------|---------------------------------------------------------------|
| App Icon  Todo                     | [Block: Today Tasks                           Sort  + Row  ...]|
| + Workspace                        | ------------------------------------------------------------- |
|                                    | | Done | Task                          | Due Date            | |
| [Home                    ]         | | [ ]  | Prepare report                | 05/09/2026          | |
| [Work                2 !]          | | [x]  | Call vendor                   | 05/07/2026          | |
| [Personal                ]         | | [ ]  | Follow up                     | 05/11/2026          | |
| [Documents               ]         | ------------------------------------------------------------- |
|                                    |                                                               |
|                                    | [Block: Later                                 Sort  + Row ...] |
|                                    | ------------------------------------------------------------- |
|                                    | | Bullet | Item                                                   |
|                                    | |   .    | Revisit policy notes                                  |
|                                    | ------------------------------------------------------------- |
|------------------------------------|---------------------------------------------------------------|
| Settings                Inspector  | Inspector                                                     |
+------------------------------------------------------------------------------------------------------+
```

## Implementation Priorities for UI Build

Build the UI in this order:

1. shell layout
2. left dock
3. top bar
4. empty workspace state
5. block card structure
6. row and cell rendering
7. context menus
8. inspector
9. alert states
10. settings screen

## Final UI Recommendation

The UI should behave like a compact desktop organizer with structured editing, not like:

- a mobile-first app
- a spreadsheet clone
- a word processor
- a decorative productivity dashboard

If that line is held, the app will feel more serious, more usable, and easier to extend later.
