# Todo App Implementation Backlog

## Purpose

This document converts the planning artifacts into a build backlog that can be executed directly.

Source documents:

- [TODO_APP_PLAN.md](C:/Users/jdelgro2/OneDrive%20-%20University%20of%20Rochester/Desktop/Todo_app/docs/TODO_APP_PLAN.md)
- [TODO_APP_TECH_SPEC.md](C:/Users/jdelgro2/OneDrive%20-%20University%20of%20Rochester/Desktop/Todo_app/docs/TODO_APP_TECH_SPEC.md)
- [TODO_APP_UI_SPEC.md](C:/Users/jdelgro2/OneDrive%20-%20University%20of%20Rochester/Desktop/Todo_app/docs/TODO_APP_UI_SPEC.md)

The goal is to define a realistic implementation sequence for v1 with ticket-sized work items, dependencies, and acceptance criteria.

## Delivery Rules

These apply to the whole backlog:

- v1 is Windows-first
- v1 uses Tauri + React + TypeScript
- v1 uses JSON file storage
- v1 does not include inline partial rich text
- v1 does not include sync, export, images, formulas, or closed-app notifications
- mouse-first UX takes priority over advanced keyboard workflows

Additional execution rules:

- all workspace documents are loaded into memory in v1
- persistence must be atomic and recoverable before autosave is considered complete
- pure domain tickets should add or update unit tests as part of the ticket, not only at the end

## Priority Levels

- `P0`: required before meaningful app progress can continue
- `P1`: required for MVP
- `P2`: important polish or support work for MVP
- `P3`: defer unless time remains after MVP stability

## Size Guide

Use rough implementation sizes:

- `S`: up to half day
- `M`: 1 to 2 days
- `L`: 2 to 4 days
- `XL`: 4+ days or should likely be split

## Milestones

### Milestone A: App Foundation

Outcome:

- app boots
- storage works
- types and stores exist
- shell UI renders

### Milestone B: Workspace and Block Editing

Outcome:

- workspaces are usable
- blocks are creatable and reorderable
- empty-state flows are in place

### Milestone C: Row and Cell Editing

Outcome:

- core list editing works
- typed cells exist
- rows and columns are manageable

### Milestone D: Formatting and Behavior

Outcome:

- inspector works
- styling works
- checkbox automation and sorting work

### Milestone E: Alerts, Reliability, and Packaging

Outcome:

- alerts work while app is open
- undo/redo, clipboard, and save flows are stable
- packaged Windows build is shippable

## Epic Breakdown

### EPIC-01: Bootstrap and Tooling

Goal:

- create the app shell, dependency baseline, and project structure

#### TICKET-001: Scaffold Tauri + React + TypeScript app

- Priority: `P0`
- Size: `M`
- Depends on: none

Tasks:

- initialize Tauri app
- initialize React + TypeScript + Vite frontend
- verify local run/build works
- commit base project structure

Acceptance criteria:

- app launches in local dev mode
- Tauri shell opens successfully on Windows
- frontend renders a placeholder screen

#### TICKET-002: Install core dependencies

- Priority: `P0`
- Size: `S`
- Depends on: `TICKET-001`

Tasks:

- add Zustand
- add dnd-kit
- add Tailwind CSS
- add testing dependencies

Acceptance criteria:

- dependency install completes cleanly
- project starts without missing-package failures

#### TICKET-003: Create repository structure from tech spec

- Priority: `P0`
- Size: `S`
- Depends on: `TICKET-001`

Tasks:

- create top-level `src` folders
- create `src-tauri` support layout as needed
- add placeholder modules for key layers

Acceptance criteria:

- repo structure matches intended module boundaries closely enough to build into

#### TICKET-004: Add linting, formatting, and test scripts

- Priority: `P1`
- Size: `S`
- Depends on: `TICKET-001`

Tasks:

- configure lint script
- configure format script if used
- configure unit test script
- configure e2e script placeholder

Acceptance criteria:

- scripts run from `package.json`

### EPIC-02: Types, Schemas, and Persistence

Goal:

- define the data contracts and make local storage real early

#### TICKET-005: Define core TypeScript domain types

- Priority: `P0`
- Size: `M`
- Depends on: `TICKET-003`

Tasks:

- define workspace types
- define block types
- define row/column/cell types
- define formatting types
- define settings types

Acceptance criteria:

- types cover all v1 entities
- no major entity is stored as loose `any` data

#### TICKET-006: Define JSON storage schemas and validation helpers

- Priority: `P0`
- Size: `M`
- Depends on: `TICKET-005`

Tasks:

- define persisted file shapes
- add `schemaVersion` to persisted files
- define validation helpers for settings/workspaces
- define persisted cell contract based on column-owned type
- define fallback behavior for invalid persisted data

Acceptance criteria:

- persisted objects can be validated before load/save
- marker columns and typed cell payloads have one canonical saved representation

#### TICKET-007: Implement app data bootstrap

- Priority: `P0`
- Size: `M`
- Depends on: `TICKET-006`

Tasks:

- create app data directory
- create default `settings.json`
- create default `workspaces.json`
- create starter workspace on first launch

Acceptance criteria:

- first launch with no data creates a usable initial state

#### TICKET-008: Implement storage service read/write APIs

- Priority: `P0`
- Size: `L`
- Depends on: `TICKET-007`

Tasks:

- implement load settings
- implement load workspace index
- implement load workspace
- implement write settings
- implement write workspace index
- implement write workspace
- implement temp-file plus atomic replace flow
- implement last-known-good backup handling
- implement workspace-before-index save ordering
- implement startup recovery behavior for invalid primary files

Acceptance criteria:

- frontend can load/save app data through one storage service boundary
- interrupted or invalid writes follow a documented recovery path

#### TICKET-009: Add save error handling path

- Priority: `P2`
- Size: `S`
- Depends on: `TICKET-008`

Tasks:

- surface storage write failure
- preserve in-memory state
- support retry trigger

Acceptance criteria:

- save failure does not crash app or discard unsaved data immediately

### EPIC-03: State and Application Core

Goal:

- establish the app state model early enough to avoid UI rework

#### TICKET-010: Implement `documentStore`

- Priority: `P0`
- Size: `L`
- Depends on: `TICKET-008`

Tasks:

- store settings
- store workspace index
- store loaded workspaces
- store active workspace id
- store dirty/save state
- eagerly load all workspace documents at startup

Acceptance criteria:

- app state loads from storage service into a coherent persistent state store
- full in-memory document state exists for undo/redo and cross-workspace moves

#### TICKET-011: Implement `uiStore`

- Priority: `P1`
- Size: `M`
- Depends on: `TICKET-010`

Tasks:

- selection state
- context menu state
- inspector state
- drag overlay state
- alert highlight state

Acceptance criteria:

- UI-specific state is isolated from persisted document state

#### TICKET-012: Implement `historyStore` with snapshot history

- Priority: `P1`
- Size: `L`
- Depends on: `TICKET-010`

Tasks:

- undo stack
- redo stack
- push snapshot mechanism
- restore snapshot behavior
- define transaction boundaries for typing, drag, sort, and formatting
- cap history depth

Acceptance criteria:

- document-level changes can be undone and redone
- undo scope is defined for the full in-memory app document
- undo/redo remains compatible with autosave semantics

#### TICKET-013: Add store selectors and action helpers

- Priority: `P2`
- Size: `S`
- Depends on: `TICKET-010`, `TICKET-011`

Tasks:

- add selection helpers
- add common lookup helpers
- avoid repeated tree-walking in components

Acceptance criteria:

- components can consume stable, targeted selectors instead of broad store reads

### EPIC-04: Application Shell and Navigation

Goal:

- build the desktop shell and main layout skeleton

#### TICKET-014: Build `AppShell` layout

- Priority: `P0`
- Size: `M`
- Depends on: `TICKET-010`, `TICKET-011`

Tasks:

- left dock region
- top bar region
- main canvas region
- right inspector region shell

Acceptance criteria:

- main screen layout renders with correct region structure

#### TICKET-015: Build top bar controls

- Priority: `P1`
- Size: `S`
- Depends on: `TICKET-014`

Tasks:

- current workspace title
- add block trigger
- undo/redo buttons
- inspector toggle
- settings entry

Acceptance criteria:

- top bar actions render and are wire-ready

#### TICKET-016: Build settings route/screen shell

- Priority: `P1`
- Size: `S`
- Depends on: `TICKET-014`

Tasks:

- settings screen route/view
- section layout for appearance/defaults

Acceptance criteria:

- user can open settings screen and return to main screen

### EPIC-05: Workspace Management

Goal:

- make the left dock fully functional for v1

#### TICKET-017: Implement workspace list rendering

- Priority: `P0`
- Size: `M`
- Depends on: `TICKET-014`, `TICKET-010`

Tasks:

- render workspace cards from store
- show selected state
- show empty/initial behavior

Acceptance criteria:

- dock displays current workspace list correctly

#### TICKET-018: Implement create/select workspace flow

- Priority: `P0`
- Size: `M`
- Depends on: `TICKET-017`

Tasks:

- create workspace action
- select workspace action
- update active workspace in main pane

Acceptance criteria:

- new workspace can be created and selected from dock

#### TICKET-019: Implement rename/delete workspace flow

- Priority: `P1`
- Size: `M`
- Depends on: `TICKET-018`

Tasks:

- context menu
- rename action
- delete confirmation
- delete behavior for active workspace

Acceptance criteria:

- workspace can be renamed and deleted without corrupting selection state

#### TICKET-020: Implement workspace styling controls

- Priority: `P1`
- Size: `M`
- Depends on: `TICKET-019`

Tasks:

- background color
- text color
- accent stripe toggle
- accent stripe color

Acceptance criteria:

- workspace visual settings persist and reflect in dock UI

#### TICKET-021: Implement workspace drag reorder

- Priority: `P1`
- Size: `M`
- Depends on: `TICKET-017`

Tasks:

- sortable dock list
- drag preview
- order persistence

Acceptance criteria:

- workspaces reorder correctly and persist after reload

### EPIC-06: Block Creation and Management

Goal:

- make blocks usable as the main workspace editing unit

#### TICKET-022: Implement block templates

- Priority: `P0`
- Size: `M`
- Depends on: `TICKET-005`

Tasks:

- checklist template
- bullet template
- numbered template

Acceptance criteria:

- each template creates a valid block payload with appropriate default columns

#### TICKET-023: Build empty workspace state with add-block affordances

- Priority: `P1`
- Size: `S`
- Depends on: `TICKET-014`, `TICKET-022`

Tasks:

- empty state panel
- preset actions
- call into create block flow

Acceptance criteria:

- empty workspace provides a direct path to create first block

#### TICKET-024: Implement add block flow from top bar

- Priority: `P0`
- Size: `M`
- Depends on: `TICKET-022`, `TICKET-015`

Tasks:

- add block menu/popover
- template selection
- append block to current workspace

Acceptance criteria:

- user can create blocks from all supported templates in active workspace

#### TICKET-025: Render block cards and headers

- Priority: `P0`
- Size: `L`
- Depends on: `TICKET-024`

Tasks:

- block shell
- block header
- title display
- action placeholders

Acceptance criteria:

- workspace canvas renders block cards in order

#### TICKET-026: Implement block title edit and collapse/expand

- Priority: `P1`
- Size: `M`
- Depends on: `TICKET-025`

Tasks:

- inline title edit
- collapse state
- persisted collapsed state

Acceptance criteria:

- block title is editable and block body can be collapsed/expanded

#### TICKET-027: Implement block reorder within workspace

- Priority: `P1`
- Size: `M`
- Depends on: `TICKET-025`

Tasks:

- sortable blocks list
- visual drag feedback
- order persistence

Acceptance criteria:

- blocks reorder correctly within one workspace

#### TICKET-028: Implement move block to another workspace

- Priority: `P1`
- Size: `L`
- Depends on: `TICKET-027`, `TICKET-018`

Tasks:

- context menu move action
- update owning workspace
- preserve block content and order

Acceptance criteria:

- block can move from one workspace to another without data loss
- direct cross-workspace drag is not required for MVP

#### TICKET-029: Implement block context menu

- Priority: `P2`
- Size: `S`
- Depends on: `TICKET-025`

Tasks:

- rename
- move
- collapse/expand
- delete

Acceptance criteria:

- block menu exposes expected v1 actions

### EPIC-07: Columns, Rows, and Typed Cells

Goal:

- make the content grid editable and structured

#### TICKET-030: Implement column domain helpers

- Priority: `P0`
- Size: `M`
- Depends on: `TICKET-005`

Tasks:

- create column
- reorder columns
- change column type safely

Acceptance criteria:

- column operations can be performed as pure domain actions

#### TICKET-031: Render column header row

- Priority: `P0`
- Size: `M`
- Depends on: `TICKET-025`, `TICKET-030`

Tasks:

- render labels
- render type treatment
- render selection state

Acceptance criteria:

- blocks display a clear column header row

#### TICKET-032: Implement row domain helpers

- Priority: `P0`
- Size: `M`
- Depends on: `TICKET-005`

Tasks:

- create row
- insert above/below
- delete row
- reorder row

Acceptance criteria:

- row operations exist as reusable store/domain actions

#### TICKET-033: Render rows and base cell grid

- Priority: `P0`
- Size: `L`
- Depends on: `TICKET-031`, `TICKET-032`

Tasks:

- row rendering
- row separators
- cell slots by column

Acceptance criteria:

- block body renders rows and cell positions consistently

#### TICKET-034: Implement base cell renderers

- Priority: `P0`
- Size: `L`
- Depends on: `TICKET-033`

Tasks:

- text cell
- checkbox cell
- bullet cell
- numbered cell

Acceptance criteria:

- text, checkbox, and marker-column rendering paths function correctly

#### TICKET-034A: Implement advanced typed cell renderers

- Priority: `P1`
- Size: `L`
- Depends on: `TICKET-034`

Tasks:

- date cell
- time cell
- dropdown cell

Acceptance criteria:

- advanced typed cells support editing, validation display, and persistence

#### TICKET-035: Implement row add/delete/insert UI

- Priority: `P1`
- Size: `M`
- Depends on: `TICKET-033`, `TICKET-034`

Tasks:

- add row button
- insert row actions
- delete row action

Acceptance criteria:

- user can add, insert, and remove rows from a block

#### TICKET-036: Implement row drag reorder

- Priority: `P1`
- Size: `M`
- Depends on: `TICKET-033`

Tasks:

- drag handle
- row sortable behavior
- order persistence

Acceptance criteria:

- rows reorder correctly inside a block

#### TICKET-037: Implement column context menu and mutation flows

- Priority: `P1`
- Size: `L`
- Depends on: `TICKET-031`, `TICKET-030`

Tasks:

- rename column
- move column left/right
- add left/right
- delete column
- change type
- expose required checkbox behavior toggles
- expose required date/time alert toggle

Acceptance criteria:

- user can manage block columns from the UI
- column reorder required for v1 is achievable without direct header drag

#### TICKET-038: Implement column resize polish

- Priority: `P2`
- Size: `M`
- Depends on: `TICKET-031`, `TICKET-037`

Tasks:

- resize widths
- persist widths

Acceptance criteria:

- columns can be resized without layout breakage

### EPIC-08: Editing, Formatting, and Inspector

Goal:

- deliver the visual customization layer that differentiates the app

#### TICKET-039: Implement selection model across block/column/row/cell

- Priority: `P0`
- Size: `M`
- Depends on: `TICKET-011`, `TICKET-033`

Tasks:

- block selection
- column selection
- row selection
- cell selection

Acceptance criteria:

- one active inspector target is always determinable from UI state

#### TICKET-040: Implement formatting merge/resolution helpers

- Priority: `P0`
- Size: `M`
- Depends on: `TICKET-005`

Tasks:

- merge formatting helper
- resolve cell formatting
- resolve row styling

Acceptance criteria:

- UI can compute effective formatting from layered overrides

#### TICKET-041: Build inspector shell and target summary

- Priority: `P1`
- Size: `M`
- Depends on: `TICKET-014`, `TICKET-039`

Tasks:

- collapsible panel
- target summary
- no-selection state

Acceptance criteria:

- inspector opens and reflects current selection type

#### TICKET-042: Implement text formatting controls

- Priority: `P1`
- Size: `L`
- Depends on: `TICKET-041`, `TICKET-040`

Tasks:

- font family
- font size
- bold
- italic
- underline
- text color
- fill color

Acceptance criteria:

- formatting changes can be applied at supported target levels and are visible immediately

#### TICKET-043: Implement border formatting controls

- Priority: `P1`
- Size: `M`
- Depends on: `TICKET-041`, `TICKET-040`

Tasks:

- border width
- border color
- edge toggles

Acceptance criteria:

- border styling can be edited and rendered for supported targets

#### TICKET-044: Implement row/cell/column/block formatting persistence

- Priority: `P1`
- Size: `M`
- Depends on: `TICKET-042`, `TICKET-043`

Tasks:

- persist override payloads
- reload into view correctly

Acceptance criteria:

- formatting survives save/reload cycles

#### TICKET-045: Implement checkbox automation behavior

- Priority: `P1`
- Size: `M`
- Depends on: `TICKET-034`, `TICKET-040`, `TICKET-037`

Tasks:

- strikeout row when checked
- move checked rows to bottom when enabled

Acceptance criteria:

- checkbox automation rules behave according to column settings

#### TICKET-046: Implement type-specific inspector settings

- Priority: `P2`
- Size: `M`
- Depends on: `TICKET-041`, `TICKET-037`

Tasks:

- dropdown options editor
- richer checkbox settings presentation
- richer date/time settings presentation

Acceptance criteria:

- type-specific column settings are editable in inspector
- MVP-critical toggles are not blocked on this ticket

### EPIC-09: Sorting, Clipboard, and Shortcuts

Goal:

- make the editor efficient and desktop-usable

#### TICKET-047: Implement block row sorting domain logic

- Priority: `P1`
- Size: `M`
- Depends on: `TICKET-034`, `TICKET-034A`

Tasks:

- comparators for all supported types
- null handling
- stable row identity
- add unit coverage for comparator behavior

Acceptance criteria:

- rows sort correctly by chosen column types

#### TICKET-048: Implement sort menu UI

- Priority: `P1`
- Size: `S`
- Depends on: `TICKET-047`, `TICKET-025`

Tasks:

- show available columns
- choose sort direction if included

Acceptance criteria:

- user can trigger sort from block header/menu

#### TICKET-049: Implement clipboard serialization for internal rows

- Priority: `P1`
- Size: `M`
- Depends on: `TICKET-032`, `TICKET-034`

Tasks:

- serialize row payload
- deserialize row payload
- map into compatible block shapes
- same-block paste first
- cross-block compatible-shape paste second

Acceptance criteria:

- copied rows can be pasted internally with structure preserved where valid

#### TICKET-050: Implement cut/copy/paste row UI flows

- Priority: `P1`
- Size: `M`
- Depends on: `TICKET-049`, `TICKET-035`

Tasks:

- context menu actions
- selected-row flows
- insertion behavior on paste

Acceptance criteria:

- rows can be cut/copied/pasted within supported contexts

#### TICKET-051: Implement plain text clipboard for text cells

- Priority: `P1`
- Size: `M`
- Depends on: `TICKET-034`

Tasks:

- copy plain text out
- paste plain text in

Acceptance criteria:

- text cells support normal desktop clipboard behavior

#### TICKET-052: Implement hotkey layer

- Priority: `P2`
- Size: `M`
- Depends on: `TICKET-012`, `TICKET-050`, `TICKET-051`

Tasks:

- undo/redo
- copy/cut/paste
- select all if applicable
- delete
- escape

Acceptance criteria:

- standard desktop shortcuts work in intended contexts

### EPIC-10: Alerts and Reminder UX

Goal:

- implement local in-app alerts tied to date/time fields

#### TICKET-053: Implement alert evaluation domain logic

- Priority: `P1`
- Size: `M`
- Depends on: `TICKET-034A`, `TICKET-037`

Tasks:

- evaluate due date/time cells
- build workspace alert summary
- define date-only due semantics
- define time-only due semantics
- ignore invalid values
- suppress alerts for completed rows
- add unit coverage for alert evaluation rules

Acceptance criteria:

- app can compute active alerts from persisted document state
- due semantics are documented in code-level tests

#### TICKET-054: Implement in-app alert scheduler

- Priority: `P1`
- Size: `M`
- Depends on: `TICKET-053`, `TICKET-011`

Tasks:

- startup scan
- interval-based checks
- scan on relevant edits

Acceptance criteria:

- alert state updates while app is open without manual refresh

#### TICKET-055: Implement dock alert indicators

- Priority: `P1`
- Size: `S`
- Depends on: `TICKET-054`, `TICKET-017`

Tasks:

- badge/dot rendering
- optional short subtext

Acceptance criteria:

- dock communicates active alert state per workspace

#### TICKET-056: Implement alert navigation and highlight behavior

- Priority: `P2`
- Size: `M`
- Depends on: `TICKET-054`, `TICKET-039`

Tasks:

- navigate to workspace/block target
- scroll target into view
- flash row/cell

Acceptance criteria:

- selecting alerted workspace brings user to relevant item with visible highlight

### EPIC-11: Settings, Theming, and Defaults

Goal:

- make app defaults editable and persistent

#### TICKET-057: Implement theme mode switching

- Priority: `P1`
- Size: `M`
- Depends on: `TICKET-016`, `TICKET-008`

Tasks:

- light theme
- dark theme
- saved preference

Acceptance criteria:

- theme can be switched and persists after reload

#### TICKET-058: Implement editor default settings UI

- Priority: `P2`
- Size: `M`
- Depends on: `TICKET-016`, `TICKET-040`

Tasks:

- default font family
- default font size
- default text color
- default fill color
- default border settings

Acceptance criteria:

- user can change app-level formatting defaults from settings

#### TICKET-059: Implement workspace default settings UI

- Priority: `P2`
- Size: `M`
- Depends on: `TICKET-016`, `TICKET-020`

Tasks:

- default workspace background
- default workspace text color
- default accent behavior

Acceptance criteria:

- new workspaces pick up configured default styles

### EPIC-12: Testing, QA, and Packaging

Goal:

- stabilize the app enough to ship a credible v1

#### TICKET-060: Expand unit coverage for domain helpers

- Priority: `P1`
- Size: `L`
- Depends on: `TICKET-022`, `TICKET-030`, `TICKET-032`, `TICKET-040`, `TICKET-047`, `TICKET-053`

Tasks:

- templates
- formatting merge
- sorting
- checkbox automation
- validation
- alerts

Acceptance criteria:

- high-risk pure logic has broad coverage beyond ticket-level tests

#### TICKET-061: Add integration tests for critical editing flows

- Priority: `P1`
- Size: `L`
- Depends on: `TICKET-018`, `TICKET-024`, `TICKET-035`, `TICKET-044`, `TICKET-012`, `TICKET-063`

Tasks:

- workspace CRUD
- block CRUD
- row editing
- save/load
- undo/redo

Acceptance criteria:

- core workflows are covered by repeatable tests

#### TICKET-062: Add Playwright smoke flow

- Priority: `P2`
- Size: `M`
- Depends on: `TICKET-061`

Tasks:

- first launch
- create workspace
- create checklist block
- add/edit rows
- reload and verify persistence

Acceptance criteria:

- one end-to-end smoke path passes reliably

#### TICKET-063: Implement autosave debounce and dirty-state UX

- Priority: `P1`
- Size: `M`
- Depends on: `TICKET-008`, `TICKET-010`, `TICKET-012`

Tasks:

- autosave debounce
- dirty state tracking
- lightweight save status
- save after undo/redo
- preserve retry path after save failure

Acceptance criteria:

- committed changes save automatically and user is not left uncertain about save state
- autosave behavior is coherent with history behavior

#### TICKET-064: Add packaging assets and Windows build config

- Priority: `P1`
- Size: `M`
- Depends on: `TICKET-001`

Tasks:

- app icon
- Tauri window metadata
- packaging metadata

Acceptance criteria:

- app can be packaged with proper identity and icon assets

#### TICKET-065: Run manual QA pass and fix release blockers

- Priority: `P1`
- Size: `L`
- Depends on: all MVP features substantially complete

Tasks:

- verify dock behavior
- verify block editing
- verify formatting
- verify alerts
- verify save/load
- fix critical defects

Acceptance criteria:

- no known critical blockers remain for MVP release

## Recommended Build Order

Implement in this sequence:

1. `TICKET-001` to `TICKET-010`
2. `TICKET-012` and `TICKET-063` before broad UI editing
3. `TICKET-014` to `TICKET-021`
4. `TICKET-022` to `TICKET-029`
5. `TICKET-030` to `TICKET-037`
6. `TICKET-034A`, `TICKET-039` to `TICKET-045`
7. `TICKET-047` to `TICKET-056`
8. `TICKET-057` to `TICKET-065`

This order keeps storage, state, and shell stable before deeper editing features start stacking on top.

## MVP Tiers

### MVP Core

If schedule pressure appears, this is the smallest safe first release:

- `TICKET-001` to `TICKET-037`
- `TICKET-039` to `TICKET-045`
- `TICKET-051`
- `TICKET-057`
- `TICKET-063`
- `TICKET-064`
- `TICKET-065`

Scope of MVP Core:

- durable storage and autosave
- workspace CRUD
- block CRUD
- row CRUD and reorder
- text and checkbox editing
- bullet/numbered templates with marker columns
- basic formatting and checkbox automation
- packaging

### MVP Extended

Add these before calling the full planned v1 complete:

- `TICKET-034A`
- `TICKET-047` to `TICKET-055`
- `TICKET-058`
- `TICKET-059`

These can slide after MVP Core if necessary:

- `TICKET-038` column resize polish
- `TICKET-046` richer inspector presentation for type-specific settings
- `TICKET-052` broader hotkey layer beyond essentials
- `TICKET-056` richer alert navigation polish
- `TICKET-062` broader e2e coverage beyond smoke path

## Definition of MVP Core Done

MVP Core is done when all of the following are true:

- app launches as a packaged Windows desktop app
- local JSON data bootstraps, saves atomically, and recovers safely from simple write failures
- user can manage workspaces from the dock
- user can create and manage blocks from supported templates
- user can add, edit, delete, and reorder rows
- text and checkbox cells function reliably
- formatting works at the agreed v1 levels with inheritance/reset behavior defined
- checkbox automation works
- undo/redo works for core document edits
- text clipboard flows work
- no critical data-loss or crash issues remain in normal use

## Definition of Full Planned v1 Done

The broader planned v1 is done when MVP Core is complete and all of the following are also true:

- date, time, and dropdown cells function reliably
- row sorting works for supported typed columns
- row clipboard flows work
- in-app alerts work while the app is open
- workspace alert indicators work

## Post-MVP Backlog Seeds

Natural next items after v1:

- inline partial rich text in cells
- better date/time pickers
- recurring reminders
- archive/completed views
- search
- macOS packaging
- import/export
