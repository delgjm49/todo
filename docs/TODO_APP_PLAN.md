# Todo App Implementation Plan

## Purpose

This document is the build artifact for the first implementation of a local desktop todo application.

The product is best treated as a **desktop workspace organizer with block-based task editing**, not as a simple checklist app. That framing drives the UI model, data model, and scope boundary.

## Product Summary

The app is a locally run desktop application for Windows 11 with a polished, minimal interface.

Users manage:

- workspaces in a left dock
- blocks inside each workspace
- rows inside each block
- structured columns inside each block
- formatting at block, column, row, and cell levels
- local reminders based on date/time fields while the app is open

The first version should feel like a real application:

- packaged desktop executable
- custom icon
- local file-based storage
- fast mouse-first editing
- standard shortcuts for copy, paste, select all, undo, redo

## Locked Decisions

These decisions are now confirmed for v1:

- Primary target OS: Windows 11
- macOS support: future-friendly only, not a delivery requirement in v1
- Storage: local structured JSON files on disk
- Security: not a major concern; clear text storage is acceptable
- Reminder behavior: only while the app is open
- Editing style: mouse-first, with basic desktop shortcuts
- First-version exclusions: sync, sharing, export, formulas, image support
- Block structure: all rows in a block share the same column layout

## Rich Text Scope Decision

Full selection-level rich text formatting is **not part of v1**.

V1 formatting should support these levels:

- block-level defaults
- column-level defaults
- row-level formatting
- cell-level formatting

This means the first build can support:

- font family
- font size
- text color
- text highlight color
- bold
- italic
- underline if desired
- row shading
- cell shading
- column default styling

What v1 will **not** do:

- style only part of a sentence inside one cell
- mix multiple text styles inside one cell

Reason:

- selection-level rich text inside a grid editor substantially increases complexity in editing, serialization, copy/paste behavior, undo/redo, and sorting
- cell/row/column formatting still delivers most of the visual control you asked for
- the data model can still be designed so inline rich text can be added later

## Product Goals

### Primary goals

- Provide a calm, efficient desktop UI for managing many different categories of tasks
- Support more structure than a basic todo list without becoming a spreadsheet
- Make organization feel visual and tactile through workspaces, blocks, and styling
- Keep editing direct and fast with drag/drop and context menus
- Preserve data locally in a readable form

### Non-goals for v1

- collaboration
- cloud sync
- mobile support
- images or attachments
- formulas or computed cells
- advanced reporting/export
- inline partial rich text
- closed-app reminders/notifications

## Information Architecture

The app has four main object types:

### 1. Workspace

A top-level container shown in the left dock.

Fields:

- id
- title
- order
- collapsed state if needed later
- style settings
- alert summary state

Behavior:

- add
- rename
- delete
- reorder
- recolor
- text formatting style
- accent stripe customization
- context menu actions

### 2. Block

A structured editable list inside a workspace.

Fields:

- id
- workspace_id
- title
- block_type
- order
- collapsed
- border settings
- sort settings
- style defaults
- column definitions
- rows

Behavior:

- add from template
- rename
- collapse/expand
- move within workspace
- move to another workspace
- delete
- sort by a chosen column

### 3. Column

A field definition shared by every row in the block.

Supported v1 types:

- text
- checkbox
- bullet
- numbered
- date
- time
- dropdown

Fields:

- id
- type
- label
- order
- width
- visible
- settings specific to type
- default formatting

Examples of type-specific settings:

- checkbox: strikeout row on checked, move checked rows to bottom
- dropdown: allowed options
- date/time: alert enabled

### 4. Row

A single item inside a block.

Fields:

- id
- order
- cell values keyed by column id
- row formatting

Behavior:

- add
- delete
- duplicate if later desired
- reorder via drag/drop
- cut/copy/paste
- insert above/below

## Main Window Layout

### Left dock

Contains workspace cards stacked vertically.

Each workspace card shows:

- workspace title
- chosen colors
- optional accent stripe
- alert badge or short alert note when active reminders exist

Expected interactions:

- left click selects workspace
- right click opens workspace menu
- drag reorders workspace

### Main content pane

Displays the selected workspace and its blocks.

Recommended layout:

- top app bar
- workspace content area below
- vertical stack of blocks

### Top app bar

Should contain:

- app title or icon
- add workspace
- add block
- undo
- redo
- theme toggle or settings entry
- optional search later, but not required in v1

### Block chrome

Each block should show:

- collapse toggle
- block title
- block actions menu
- add row action
- optional sort action

### Contextual editing controls

For v1, use a simple formatting approach:

- a compact inspector or toolbar for selected block/column/row/cell
- direct color pickers
- font controls
- border controls

Avoid building a full word-processor toolbar in v1.

## Interaction Model

### Workspace actions

- Create from a plus button in the dock or app bar
- Right click for rename, recolor, delete
- Drag to reorder

### Block actions

- Add block inside current workspace
- Choose a starting preset
- Drag block to reorder
- Move block to another workspace from a context menu in v1
- Direct cross-workspace block drag can be added after v1
- Collapse and expand
- Sort rows by a supported column

### Row actions

- Hover controls for add/delete where useful
- Right click menu for cut/copy/paste/delete/insert
- Drag handle for reorder

### Column actions

- Add/remove/reorder columns in a block
- Change type where valid
- Reorder can be done through move-left/move-right actions in v1
- Direct header drag and resize can be added after v1
- Edit type settings

## Block Templates

Templates are starter configurations, not separate engines.

All templates use the same underlying block model.

### 1. Basic Checklist

Default columns:

- checkbox
- text

### 2. Bulleted List

Default columns:

- bullet
- text

### 3. Numbered List

Default columns:

- numbered
- text

In v1, `bullet` and `numbered` are marker columns.

- the marker itself is rendered by the column
- the editable task text lives in the adjacent `text` column
- marker columns do not store user-authored text payloads

Later templates can be added without changing the core architecture.

## Formatting Model

V1 formatting should follow a layered override model:

1. app defaults
2. workspace defaults if later needed
3. block defaults
4. column defaults
5. row overrides
6. cell overrides

This makes formatting predictable and avoids needing inline span editing.

### Formatting properties in v1

- font family
- font size
- bold
- italic
- underline optional
- text color
- highlight/background color
- horizontal alignment if useful
- row/cell fill color

### Formatting rules in v1

- formatting is stored as sparse overrides only; unset properties inherit
- every editable formatting control needs a `reset to inherited` path
- empty override objects should be omitted from saved data where practical
- text-bearing cells (`text`, `date`, `time`, `dropdown`) support text style controls
- marker and checkbox columns primarily support text color, fill, and border treatment
- block, column, and row formatting act as defaults for descendants unless a lower-level override exists

### Border properties in v1

- border thickness
- border color
- enabled edges: top, right, bottom, left
- block-wide defaults
- cell override when needed

## Reminder and Alert Model

Reminders are local and active only while the app is running.

### Supported v1 behavior

- date/time columns can be marked as alert-capable
- an internal timer checks due items while the app is open
- the owning workspace shows an alert indicator in the left dock
- alert text can read like `1 Alert in <Block Title>`
- selecting the workspace scrolls to the relevant block
- the triggering cell or row receives a temporary visual flash/highlight

### Reminder semantics in v1

- alerts are evaluated per row and per alert-enabled column
- date-only alerts become due at `9:00 AM` local time on the saved date
- time-only alerts are treated as alerts for the current day at the saved time
- date and time columns are not auto-paired in v1; each alert-enabled column is evaluated independently
- invalid date/time text never triggers an alert
- overdue alerts persist until the value is changed or the row is completed
- if a row contains a checked checkbox value, alerts for that row are suppressed in v1
- repeated scans should not create repeated flash animations for the same unresolved target during one session

### Deferred behavior

- Windows system notifications
- reminders while app is closed
- snooze/dismiss workflows
- recurring reminders

## Data Model

Use structured JSON files.

Recommended storage layout:

- `data/settings.json`
- `data/workspaces.json`
- `data/workspaces/<workspace-id>.json`

This keeps workspace payloads isolated and reduces corruption risk from one giant file.

### Persistence contract

The JSON storage model is only acceptable in v1 if writes are made durable and recoverable.

Required persistence rules:

- every persisted file includes a `schemaVersion`
- writes use temp-file write followed by atomic replace/rename
- the previous known-good file is retained as a simple backup during write
- workspace files are written before the workspace index when both must change together
- if the index and a workspace file disagree at startup, the app follows documented recovery rules instead of silently accepting corruption
- invalid files should fail soft where possible: recover from backup, isolate the damaged file, and avoid crashing the whole app

### Canonical persisted cell representation

In persisted JSON, the column definition is the source of truth for cell type.

- saved cells do **not** store a redundant `type` field
- each saved cell stores only the value payload and any direct formatting override
- validation ensures the saved value shape is compatible with the owning column type
- changing a column type must run a conversion rule for existing cell values

### Suggested settings shape

```json
{
  "theme": "dark",
  "defaults": {
    "fontFamily": "Segoe UI",
    "fontSize": 14,
    "textColor": "#F3F4F6",
    "cellBackground": "#111827",
    "blockBorderColor": "#374151",
    "blockBorderWidth": 1,
    "workspaceAccentEnabled": true
  }
}
```

### Suggested workspace index shape

```json
{
  "workspaces": [
    {
      "id": "ws_home",
      "title": "Home",
      "order": 0,
      "style": {
        "background": "#1F2937",
        "textColor": "#F9FAFB",
        "accentStripe": {
          "enabled": true,
          "color": "#60A5FA"
        }
      }
    }
  ]
}
```

### Suggested workspace file shape

```json
{
  "id": "ws_home",
  "blocks": [
    {
      "id": "block_1",
      "title": "Today",
      "blockType": "basic_checklist",
      "order": 0,
      "collapsed": false,
      "border": {
        "width": 1,
        "color": "#374151",
        "edges": ["top", "right", "bottom", "left"]
      },
      "sort": null,
      "columns": [
        {
          "id": "col_check",
          "type": "checkbox",
          "label": "",
          "order": 0,
          "width": 44,
          "settings": {
            "strikeoutRowWhenChecked": true,
            "moveCheckedRowsToBottom": false
          },
          "format": {}
        },
        {
          "id": "col_text",
          "type": "text",
          "label": "Task",
          "order": 1,
          "width": 420,
          "settings": {},
          "format": {}
        }
      ],
      "rows": [
        {
          "id": "row_1",
          "order": 0,
          "format": {},
          "cells": {
            "col_check": { "value": false, "format": {} },
            "col_text": { "value": "Prepare report", "format": {} }
          }
        }
      ]
    }
  ]
}
```

## Technical Architecture Recommendation

### Recommended stack

- Desktop shell: Tauri
- Frontend: React + TypeScript
- Build tool: Vite
- State management: Zustand
- Drag and drop: dnd-kit
- Styling: Tailwind CSS plus a small internal component layer
- Persistence: Tauri filesystem APIs writing JSON

### Why this stack

- Tauri gives a real desktop application with installer/exe potential and lighter runtime cost than Electron
- React is a strong fit for nested interactive editor state
- TypeScript helps keep the document model coherent
- Zustand is enough for app/editor state without the weight of a larger framework
- dnd-kit is well suited for workspace, block, and row drag/drop

### What not to use in v1

- a full ProseMirror/TipTap integration
- a database
- Electron unless Tauri packaging becomes a blocker

Reason:

- full rich text is intentionally out of scope for v1
- JSON file persistence is enough
- a lighter stack better matches the app goal

## State Management Plan

Use two major state layers:

### 1. Persistent document state

- workspaces
- blocks
- columns
- rows
- formatting
- settings

### 2. Ephemeral UI state

- selected workspace
- selected block/row/cell
- open menus
- drag state
- active alert highlights
- unsaved change state if needed

## Undo/Redo Strategy

Implement undo/redo at the application document level.

Recommended approach:

- keep immutable snapshots or patch-based history for document mutations
- include workspace, block, row, column, and formatting edits
- exclude purely ephemeral UI state like hover or open menu state

V1 should simplify this by loading all workspace documents into memory at startup.

That allows:

- one coherent in-memory app document
- consistent undo/redo across workspace and block moves
- simpler autosave behavior after undo/redo

Required v1 rules:

- snapshot history is acceptable if bounded
- target history depth should be capped, for example `100` committed transactions
- typing should commit on blur, Enter, or a short debounce instead of every keystroke
- drag, sort, and formatting actions each create a single committed history entry
- undo and redo operations should themselves trigger normal save behavior after the state change is committed

Undoable actions should include:

- add/delete/rename workspace
- reorder workspace
- add/delete/move block
- add/delete/reorder row
- add/remove/reorder column
- value edits
- formatting changes

## Copy/Paste Strategy

V1 should support:

- copy/paste plain text into text cells
- copy/cut/paste rows within a block
- copy/cut/paste rows across blocks where column compatibility exists

When column layouts differ:

- paste should map matching column positions or compatible types where possible
- if mapping is ambiguous, paste as best-effort text into the nearest valid structure

Keep this simple in v1. Do not over-engineer spreadsheet-style paste behavior.

## Sorting Rules

Blocks can be sorted by a chosen column.

V1 sort support should include:

- text
- checkbox
- date
- time
- dropdown

`numbered` columns are derived marker columns in v1 and are not meaningful sort keys.

Sorting should operate on underlying typed values, not display formatting.

Sorting must preserve row identity.

## Settings Scope

The settings page should include:

- light mode / dark mode
- default font family
- default font size
- default text color
- default highlight or cell fill color
- default block border width/color
- default workspace card styling options

Possible later additions:

- autosave controls
- backup/export
- advanced alert behavior

## Packaging and Desktop Behavior

V1 should ship as:

- a Windows desktop application
- packaged with icon assets
- launched from an executable or installer-created shortcut

Recommended packaging goals:

- standard installable build
- data stored in a predictable local app data directory
- reasonable startup speed

## Performance Expectations

V1 does not need extreme scale, but should remain responsive with:

- 20 to 50 workspaces
- 10 to 30 blocks per workspace
- 20 to 200 rows per block

This is enough to set design pressure without prematurely optimizing for huge datasets.

## Testing Strategy

### Unit tests

- data transforms
- sort behavior
- checkbox automation
- formatting merge/override logic
- alert evaluation logic

High-risk domain logic should be tested as it is introduced, not only at the end of the backlog.

### Integration tests

- workspace CRUD
- block CRUD
- row reorder
- cross-workspace block move
- undo/redo
- persistence load/save

### Manual QA passes

- drag/drop behavior
- right-click menus
- reminder highlighting
- theme switching
- copy/paste behavior
- packaging smoke test on Windows

## Phased Build Plan

### Phase 0: Foundation Setup

- create Tauri + React + TypeScript app
- establish folder structure
- define document schemas/types
- create icon placeholders
- implement local JSON save/load plumbing

### Phase 1: Shell and Navigation

- app window layout
- left workspace dock
- workspace create/rename/delete/reorder
- settings page shell
- theme support

### Phase 2: Block Engine

- block creation from templates
- block rendering
- block title editing
- collapse/expand
- block reorder within workspace
- move block across workspaces through menu action first

### Phase 3: Rows and Columns

- column definitions by type
- row creation/deletion/reorder
- cell editing
- context menus
- basic copy/cut/paste
- block sorting
- column reorder through explicit move actions

### Phase 4: Formatting

- app defaults
- block/column/row/cell formatting
- cell and row shading
- border controls
- checkbox row strikeout and auto-move behavior

### Phase 5: Alerts and Polish

- open-app alert scanning
- dock alert indicators
- focus/scroll/highlight behavior
- direct cross-workspace block drag if still needed
- column drag/resize polish if still needed
- keyboard shortcut pass
- packaging and icon polish

## MVP Acceptance Criteria

The first version is successful if it can do all of the following reliably:

- create, edit, delete, and reorder workspaces
- style workspace cards and accent stripes
- create blocks from checklist, bullet, and numbered presets
- add/remove/reorder columns within a block
- add/delete/reorder rows
- edit text, checkbox, date, time, and dropdown cells
- apply formatting at block, column, row, and cell levels
- apply border styling
- sort rows by supported columns
- move blocks within and across workspaces
- direct drag across workspaces is not required for v1 if menu-based move is reliable
- copy, cut, and paste text/rows
- undo and redo structural/content edits
- persist and reload local data
- show reminder alerts while the app is open
- package as a Windows desktop app with icon

## Deferred Backlog

These are reasonable later additions after v1:

- inline partial rich text inside cells
- desktop notifications outside the app window
- recurring reminders
- search across workspaces
- archive/completed views
- templates library expansion
- import/export
- keyboard-heavy power-user flows
- macOS packaging and QA

## Final Recommendation

Build v1 around a **structured block editor with formatting by cell/row/column**, not around full inline rich text.

That gives you:

- the visual control you want
- lower implementation risk
- cleaner JSON persistence
- saner undo/redo
- a realistic path to a polished Windows desktop release

If you later want inline rich text, the data model can be extended from plain cell values to richer text payloads without changing the app's core workspace/block structure.
