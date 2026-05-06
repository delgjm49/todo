# Todo App Technical Build Spec

## Purpose

This document translates the product plan in [TODO_APP_PLAN.md](C:/Users/jdelgro2/OneDrive%20-%20University%20of%20Rochester/Desktop/Todo_app/docs/TODO_APP_PLAN.md) into a build-oriented technical specification.

It defines:

- project structure
- module boundaries
- frontend architecture
- persistence architecture
- state model
- data contracts
- implementation order

The intent is to remove ambiguity before coding starts.

## Stack Decision

### Selected stack

- Tauri 2.x
- React 18+
- TypeScript
- Vite
- Zustand
- dnd-kit
- Tailwind CSS
- Vitest
- React Testing Library
- Playwright

### Rationale

- Tauri provides a native-feeling desktop shell with Windows packaging and a future macOS path.
- React is appropriate for the nested editor-like UI.
- Zustand is sufficient for document and UI state without introducing Redux-scale ceremony.
- dnd-kit is flexible enough for workspace, block, and row drag/reorder interactions.
- Tailwind is useful for fast iteration, but should sit behind small app-specific UI primitives.

## High-Level Architecture

The app should be split into four layers:

1. Presentation layer
2. Application state layer
3. Domain/model layer
4. Persistence/platform layer

### 1. Presentation layer

Responsible for:

- rendering workspace dock
- rendering block list
- rendering rows/cells
- context menus
- inspectors/toolbars
- settings UI
- drag/drop handles

Presentation components should stay thin. They should call store actions or domain helpers instead of encoding business rules inline.

### 2. Application state layer

Responsible for:

- currently loaded document
- selected workspace/block/row/cell
- undo/redo history
- dirty state
- UI mode state
- alert highlights

This layer should live primarily in Zustand stores.

### 3. Domain/model layer

Responsible for pure logic:

- block template creation
- formatting merge rules
- sorting
- checkbox automation
- reminder evaluation
- row/column move helpers
- copy/paste mapping
- validation

This layer should be framework-agnostic TypeScript.

### 4. Persistence/platform layer

Responsible for:

- filesystem reads/writes
- app data directory resolution
- initial data bootstrapping
- autosave/manual save support
- packaging metadata

This should be isolated behind a small storage API so React code does not talk to Tauri filesystem APIs directly.

## Repository Layout

Recommended initial structure:

```text
Todo_app/
  docs/
    TODO_APP_PLAN.md
    TODO_APP_TECH_SPEC.md
  src/
    app/
      App.tsx
      routes.tsx
      providers/
        ThemeProvider.tsx
        HotkeyProvider.tsx
    components/
      ui/
        IconButton.tsx
        Menu.tsx
        Dialog.tsx
        TextInput.tsx
        Select.tsx
        ColorPicker.tsx
        Toggle.tsx
        Tooltip.tsx
      layout/
        AppShell.tsx
        TopBar.tsx
        LeftDock.tsx
        MainPane.tsx
      workspace/
        WorkspaceCard.tsx
        WorkspaceList.tsx
        WorkspaceContextMenu.tsx
      block/
        BlockCard.tsx
        BlockHeader.tsx
        BlockToolbar.tsx
        BlockContextMenu.tsx
        BlockColumnHeaderRow.tsx
      row/
        RowView.tsx
        RowContextMenu.tsx
        RowDragHandle.tsx
      cell/
        CellRenderer.tsx
        TextCell.tsx
        CheckboxCell.tsx
        BulletCell.tsx
        NumberedCell.tsx
        DateCell.tsx
        TimeCell.tsx
        DropdownCell.tsx
      inspector/
        FormatInspector.tsx
        BorderInspector.tsx
        ColumnInspector.tsx
      settings/
        SettingsPage.tsx
        ThemeSettings.tsx
        DefaultStyleSettings.tsx
    domain/
      ids.ts
      templates/
        createBasicChecklist.ts
        createBulletedList.ts
        createNumberedList.ts
      formatting/
        formattingTypes.ts
        mergeFormatting.ts
        resolveCellFormatting.ts
      sorting/
        sortRows.ts
        compareValues.ts
      alerts/
        evaluateAlerts.ts
        buildWorkspaceAlertSummary.ts
      clipboard/
        serializeRows.ts
        deserializeRows.ts
        mapPastedRows.ts
      blocks/
        moveBlock.ts
        createBlock.ts
      rows/
        moveRow.ts
        applyCheckboxRules.ts
      columns/
        createColumn.ts
        reorderColumns.ts
      validation/
        validateWorkspace.ts
        validateSettings.ts
    stores/
      documentStore.ts
      uiStore.ts
      historyStore.ts
      selectors.ts
    services/
      storage/
        storageService.ts
        storageSchemas.ts
        bootstrapData.ts
      alerts/
        alertScheduler.ts
      clipboard/
        clipboardService.ts
      commands/
        commandTypes.ts
        executeCommand.ts
    hooks/
      useSelectedWorkspace.ts
      useBlockActions.ts
      useRowActions.ts
      useHotkeys.ts
      useAlertScheduler.ts
    types/
      app.ts
      workspace.ts
      block.ts
      row.ts
      column.ts
      settings.ts
      ui.ts
    utils/
      invariant.ts
      deepClone.ts
      debounce.ts
    styles/
      globals.css
      tokens.css
    tests/
      unit/
      integration/
  src-tauri/
    src/
      lib.rs
      storage.rs
      paths.rs
    tauri.conf.json
    icons/
  public/
  package.json
  tsconfig.json
  vite.config.ts
```

## Frontend Architecture

## Application Shell

`AppShell` should own the main two-panel layout:

- left dock with fixed width
- top bar across the main area
- main scroll region for blocks
- optional right-side inspector panel

Recommended default layout:

- left dock: 260px to 320px
- top bar: fixed height
- inspector: collapsible panel on right, optional in v1 if complexity must be contained

### Recommendation on inspector

Use a compact right-side inspector for formatting and configuration instead of putting every control directly into each block.

Reason:

- keeps block UI cleaner
- reduces duplicated controls
- fits desktop workflows
- makes cell/row/column formatting easier to reason about

## View Composition

### Primary screen tree

```text
App
  AppShell
    LeftDock
      WorkspaceList
        WorkspaceCard*
    MainPane
      TopBar
      WorkspaceView
        BlockList
          BlockCard*
            BlockHeader
            BlockColumnHeaderRow
            RowView*
              CellRenderer*
    FormatInspector
```

### Settings route

The app can use a simple internal route model:

- `/` main workspace view
- `/settings` settings page

Use a lightweight router only if it simplifies structure. Otherwise, simple view state is enough.

## Domain Model Contracts

These types should be defined explicitly before UI work begins.

### Core ids

```ts
type WorkspaceId = string;
type BlockId = string;
type ColumnId = string;
type RowId = string;
```

### Column type enum

```ts
type ColumnType =
  | "text"
  | "checkbox"
  | "bullet"
  | "numbered"
  | "date"
  | "time"
  | "dropdown";
```

### Formatting contract

```ts
type TextFormatting = {
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textColor?: string;
  backgroundColor?: string;
  horizontalAlign?: "left" | "center" | "right";
};

type BorderFormatting = {
  borderColor?: string;
  borderWidth?: number;
  edges?: Array<"top" | "right" | "bottom" | "left">;
};

type CellFormatting = TextFormatting & BorderFormatting;
type RowFormatting = TextFormatting & BorderFormatting;
type ColumnFormatting = TextFormatting & BorderFormatting;
type BlockFormatting = TextFormatting & BorderFormatting;
```

### Cell value contract

Persisted cell shape should derive from the owning column type.

The column definition is the source of truth for how a cell is interpreted.

Use column-specific persisted payloads without a redundant per-cell `type` field:

```ts
type TextCellData = { value: string; format?: CellFormatting };
type CheckboxCellData = { value: boolean; format?: CellFormatting };
type BulletCellData = { value?: null; format?: CellFormatting };
type NumberedCellData = { value?: null; format?: CellFormatting };
type DateCellData = { value: string | null; format?: CellFormatting };
type TimeCellData = { value: string | null; format?: CellFormatting };
type DropdownCellData = { value: string | null; format?: CellFormatting };
```

V1 interpretation rules:

- `bullet` and `numbered` columns are marker columns
- editable list text for those templates lives in an adjacent `text` column
- runtime renderer behavior is selected from `column.type`, not from cell payload
- changing a column type must run an explicit value-conversion path

### Column settings contract

```ts
type CheckboxColumnSettings = {
  strikeoutRowWhenChecked: boolean;
  moveCheckedRowsToBottom: boolean;
};

type DropdownColumnSettings = {
  options: string[];
};

type DateColumnSettings = {
  alertsEnabled: boolean;
};

type TimeColumnSettings = {
  alertsEnabled: boolean;
};
```

## State Architecture

Use separate Zustand stores by concern.

### `documentStore`

Owns the persistent document state:

- settings
- workspace index
- workspace documents
- loaded workspace ids
- active workspace id
- dirty flag
- last save timestamp

V1 should eagerly load all workspace documents at startup.

Reason:

- simpler undo/redo semantics
- simpler cross-workspace move behavior
- simpler autosave and recovery behavior
- acceptable for the expected v1 scale

Representative actions:

- `initializeAppData()`
- `createWorkspace()`
- `renameWorkspace()`
- `deleteWorkspace()`
- `reorderWorkspaces()`
- `createBlock()`
- `moveBlock()`
- `deleteBlock()`
- `updateBlockTitle()`
- `toggleBlockCollapsed()`
- `addColumn()`
- `updateColumn()`
- `reorderColumns()`
- `addRow()`
- `updateCellValue()`
- `updateCellFormatting()`
- `updateRowFormatting()`
- `updateColumnFormatting()`
- `sortBlockRows()`
- `saveAll()`

### `uiStore`

Owns transient UI state:

- selected block id
- selected row id
- selected cell coordinates
- open context menu
- inspector mode
- drag overlay state
- highlighted alert targets

Representative actions:

- `selectWorkspace()`
- `selectBlock()`
- `selectCell()`
- `openMenu()`
- `closeMenu()`
- `setInspectorTarget()`
- `flashAlertTarget()`

### `historyStore`

Owns undo/redo state:

- undo stack
- redo stack
- current transaction state

Representative actions:

- `pushSnapshot()`
- `undo()`
- `redo()`
- `clearHistory()`

## Undo/Redo Implementation

Use document-level snapshots or Immer patches.

### Recommendation

Start with snapshot-based history in v1 if the data size remains moderate.

Reason:

- faster to implement correctly
- easier to debug
- lower risk than patch bookkeeping early on

### Rule

Only persistent document mutations create history entries.

Do not record:

- selection changes
- menu open state
- hover state
- drag preview state

### Transaction guidance

Batch rapid sequential edits where appropriate:

- typing in a cell should not create one undo entry per keystroke forever
- commit on blur, Enter, or short debounce interval
- drag reorder creates one history entry on drop
- sort creates one history entry per applied sort
- formatting changes create one history entry per committed inspector action

### Scope and limits

V1 undo scope should be the full in-memory app document:

- settings
- workspace index
- all loaded workspace documents

Recommended limits:

- target history depth: `100` committed transactions
- if memory pressure becomes measurable, reduce depth before changing model

### Autosave interaction

- undo and redo should both trigger normal post-commit save behavior
- save failure must not clear undo history
- save success must not collapse history entries

## Persistence Architecture

All filesystem operations should go through `storageService.ts`.

### Storage service responsibilities

- resolve app data root
- create initial data directory and files
- read settings
- read workspace index
- read single workspace
- write settings
- write workspace index
- write single workspace
- validate before writing
- perform atomic write/replace operations
- keep last-known-good backup files
- run recovery logic on invalid or partial files

### Tauri boundary

Tauri-specific code should be hidden behind a small service interface. Frontend code should call:

- `loadAppData()`
- `saveAppData()`
- `saveWorkspace()`
- `ensureBootstrapFiles()`

instead of importing filesystem APIs everywhere.

### Persistence contract

Every persisted file should include:

- `schemaVersion`
- the document payload

Recommended write protocol:

1. validate outgoing payload
2. write `*.tmp`
3. fsync/flush if supported by the API path
4. rotate previous file to backup where practical
5. atomically replace target file with temp file

### Multi-file save ordering

When a change affects both the workspace index and workspace files:

1. write changed workspace files first
2. write workspace index second

This reduces orphaned index references on interrupted saves.

### Recovery rules

At startup:

- if a primary file is invalid and a backup is valid, restore from backup
- if a workspace file is missing but referenced by the index, remove it from the live index after logging recovery
- if a workspace file exists but the index is missing it, ignore it in v1 unless a later import/recovery feature is added
- recovery should fail soft and keep the app usable where possible

### Save model

Recommended v1 behavior:

- autosave after committed document changes with debounce
- also provide explicit save command if desired

Autosave debounce target:

- 400ms to 1000ms after change commit

### Failure behavior

On save error:

- keep document in memory
- show a non-destructive error toast/banner
- allow retry
- avoid mutating on-disk history or clearing backups

## Tauri Responsibilities

Tauri should be used narrowly in v1.

### Required responsibilities

- app window shell
- filesystem access
- app data path resolution
- packaging and icons

### Optional later responsibilities

- native notifications
- native menu integration
- startup with last opened state

### Rust surface area guidance

Keep Rust code thin. Use it for:

- path helpers
- storage wrappers if needed

Do not move app business rules into Rust for v1.

## Component Responsibilities

### `WorkspaceCard`

Responsible for:

- display workspace title and styles
- show alert indicator
- handle click selection
- expose drag handle
- open context menu

Should not:

- mutate storage directly
- implement reorder logic itself

### `BlockCard`

Responsible for:

- render one block
- block title editing
- collapse state UI
- block actions menu
- render header row and rows

Should delegate:

- sorting to domain/store action
- movement to drag/drop wrapper
- formatting changes to inspector/store

### `CellRenderer`

Responsible for:

- choose the correct cell component from column type
- apply resolved formatting
- route edit events to store

### Typed cell components

Each cell component should be small and type-specific:

- `TextCell`
- `CheckboxCell`
- `BulletCell`
- `NumberedCell`
- `DateCell`
- `TimeCell`
- `DropdownCell`

This keeps conditional complexity out of one large renderer.

### `FormatInspector`

Responsible for:

- showing formatting controls for selected target
- editing block/column/row/cell formatting
- showing current effective values vs direct overrides where possible

## Drag and Drop Architecture

Use dnd-kit with separate sortable contexts for:

- workspace list
- block list within a workspace
- row list within a block

### Guidance

- do not attempt arbitrary nested drag/drop everywhere on day one
- implement one level at a time
- do not make cross-workspace block drag part of MVP
- do not make direct column drag/resize part of MVP

### V1 drag order

Implement in this sequence:

1. workspace reorder
2. block reorder within workspace
3. row reorder within block

For v1:

- cross-workspace block move should use a menu action
- column reorder should use explicit move-left/move-right actions
- direct cross-workspace drag and column resize are post-MVP polish

## Alert Scheduler Design

Use a lightweight in-app scheduler service.

### `alertScheduler.ts`

Responsibilities:

- evaluate due items on interval
- compute workspace alert summaries
- update UI alert state
- trigger visual highlight on navigation to alert target

### Polling strategy

V1 can use a periodic check:

- every 30 to 60 seconds

Also trigger evaluation on:

- app startup
- workspace load
- relevant cell edits to date/time fields

### Due-time semantics

V1 alert rules:

- alert evaluation is per row and per alert-enabled column
- date-only cells become due at `09:00` local time on the saved date
- time-only cells are treated as alerts for the current local day at the saved time
- date and time columns are not auto-paired in v1
- invalid date/time values never trigger alerts
- overdue items remain active until edited or the row is completed
- if a row contains a checked checkbox value, alerts for that row are suppressed
- repeated polling must not re-trigger repeated flash animations for the same unresolved alert target in a single session

## Formatting Resolution

Formatting should be resolved dynamically by helper functions.

### Resolution order

1. app defaults
2. block format
3. column format
4. row format
5. cell format

### Required helpers

- `mergeFormatting(base, override)`
- `resolveCellFormatting(settings, block, column, row, cell)`
- `resolveRowStyle(...)`

Do not eagerly denormalize resolved formatting into saved data.

### Applicability rules

V1 formatting should follow these constraints:

- sparse override objects only; omitted keys mean inherit
- each editable property needs a `reset to inherited` path
- text properties apply fully to text-bearing cells: `text`, `date`, `time`, `dropdown`
- checkbox, bullet, and numbered columns primarily support text color, fill, and border treatment
- if an override object becomes empty, omit it from persisted output where practical

## Copy/Paste Design

Split clipboard logic into app-level clipboard operations and OS clipboard operations.

### Clipboard paths

1. Plain text paste into text-like cells
2. Internal row copy/cut/paste using serialized app payload

### Recommendation

When copying internal rows, use a custom JSON payload in memory and optionally mirror a readable plain text fallback to the clipboard.

This helps:

- preserve structure for internal paste
- keep normal OS clipboard behavior understandable

## Sorting Design

Sorting should be pure and reversible by history, not destructive beyond row order.

### Required comparator behavior

- text: locale-aware string compare
- checkbox: unchecked before checked by default
- date: compare parsed dates, nulls last
- time: compare normalized time values, nulls last
- dropdown: string compare

`numbered` columns are derived marker columns and should not be offered as meaningful sort keys in v1.

### Important rule

Sorting must never rewrite row ids or cell payloads. It only changes row order.

## Validation Rules

Add lightweight validation before save/load completion.

### Settings validation

- valid theme
- valid numeric defaults
- valid color strings

### Workspace validation

- unique ids
- column ids unique within block
- row ids unique within block
- every row contains cells for required columns
- every persisted cell payload shape matches the owning column type
- marker columns do not carry user-authored text payloads

On invalid persisted data:

- attempt safe fallback
- log recoverable issue
- avoid app crash where possible

## Hotkeys

V1 hotkeys should be limited and explicit:

- `Ctrl+C`
- `Ctrl+X`
- `Ctrl+V`
- `Ctrl+Z`
- `Ctrl+Y`
- `Ctrl+A`
- `Delete`
- `Enter`
- `Esc`

Use a dedicated `useHotkeys` hook or provider so shortcuts stay centralized.

## Testing Plan

Test timing rule:

- pure domain helpers should gain tests alongside their implementation tickets
- the later test tickets are for coverage hardening and integration expansion, not the first time logic is tested

### Unit tests first

Prioritize pure logic:

- template creation
- formatting merge
- sorting
- checkbox rules
- row move logic
- alert evaluation
- validation

### Integration tests second

Cover:

- workspace creation/reorder/delete
- block creation from template
- row add/edit/delete
- cell edit persistence
- undo/redo
- cross-workspace block move via menu action

### Playwright smoke flows

At minimum:

1. launch app
2. create workspace
3. create checklist block
4. add rows
5. mark checkbox
6. change formatting
7. save and reopen
8. verify state restored

## Implementation Sequence

Use this order. It minimizes rework.

### Step 1: Bootstrap

- scaffold Tauri + React + TypeScript app
- add Tailwind
- add Zustand
- add dnd-kit
- create base folder structure

### Step 2: Types and storage contracts

- define all app/domain types
- define JSON persistence schemas
- implement storage bootstrap/load/save

### Step 3: Core state stores

- document store
- UI store
- history store
- initial selectors

### Step 4: Shell UI

- app shell
- left dock
- top bar
- settings route/screen

### Step 5: Workspace flows

- workspace CRUD
- reorder workspaces
- dock styling

### Step 6: Block flows

- block templates
- block CRUD
- block reorder
- collapse/expand

### Step 7: Row and cell engine

- column definitions
- row CRUD
- typed cells
- basic editing

### Step 8: Formatting

- formatting data types
- inspector
- block/column/row/cell overrides
- border editing

### Step 9: Undo/redo and clipboard

- history transactions
- copy/cut/paste
- hotkeys

### Step 10: Alerts and polish

- alert scheduler
- dock indicators
- focus/highlight behavior
- packaging assets

## Engineering Constraints

These constraints should be treated as hard guidance:

- no inline partial rich text in v1
- no database in v1
- no business logic in React components if it can live in domain helpers
- no direct Tauri filesystem calls scattered across UI code
- no giant all-purpose store action files without type discipline
- no overdesigned plugin/template system in v1

## Open Technical Choices

These still need a decision when implementation begins:

1. Snapshot-based undo history vs Immer patch history
2. Whether settings live in a dedicated route or modal
3. Whether the inspector is always visible or collapsible
4. Whether autosave should be the default with no manual save affordance

### Recommended defaults

- snapshot history first
- settings as a dedicated route/page
- collapsible right inspector
- autosave enabled by default

## Build Readiness Checklist

Before coding starts, confirm:

- stack choice remains Tauri + React + TypeScript
- JSON file layout is accepted
- right-side inspector pattern is accepted
- v1 formatting remains cell/row/column/block only
- no hidden requirement for inline rich text or closed-app notifications

If those stay true, this spec is sufficient to begin scaffolding.
