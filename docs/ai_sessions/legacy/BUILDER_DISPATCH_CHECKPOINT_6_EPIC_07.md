# Builder Dispatch: Checkpoint 6 / EPIC-07 Entry

## Objective

Implement the first constrained EPIC-07 checkpoint for the row/column engine.

This checkpoint is limited to:

- `TICKET-030` implement column domain helpers
- `TICKET-031` render column header row
- `TICKET-032` implement row domain helpers
- `TICKET-033` render rows and base cell grid

Stop at the checkpoint boundary.

Do not start:

- `TICKET-034` base cell renderers
- `TICKET-034A` advanced typed cell renderers
- `TICKET-035` row add/delete/insert UI
- `TICKET-036` row drag reorder
- `TICKET-037` column context menu and mutation UI
- selection model
- inspector work
- sorting
- clipboard
- alerts

## Current Repo State

Checkpoint 5 is accepted.

Implemented and accepted already:

- app shell
- settings shell
- workspace CRUD, styling, and reorder
- block templates
- add-block flows
- block cards and headers
- block title inline editing
- block collapse / expand
- block reorder within workspace
- move block to another workspace
- block context menu

Current constraints that must remain true:

- normal user-created workspaces start empty
- the first-launch starter Home workspace still seeds a block
- persistence stays routed through `documentStore`
- business logic stays out of React components where practical
- transaction/history/autosave behavior must not regress

## Required Read Order

Read before changing code:

1. `docs/ai_sessions/HANDOFF.md`
2. `docs/ai_sessions/STATUS.md`
3. `docs/TODO_APP_PLAN.md`
4. `docs/TODO_APP_TECH_SPEC.md`
5. `docs/TODO_APP_UI_SPEC.md`
6. `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md`

Then inspect the current implementation in:

- `src/types/block.ts`
- `src/types/column.ts`
- `src/types/row.ts`
- `src/stores/documentStore.ts`
- `src/components/block/BlockCard.tsx`
- `src/domain/templates/blockTemplates.ts`
- `src/tests/unit/documentStore.test.ts`

## Scope Details

### TICKET-030: Column domain helpers

Add pure domain helpers for column operations.

Minimum useful scope for this checkpoint:

- stable column ordering helper
- create-column helper for supported column types
- reorder-columns helper

If safe and cheap, include a narrow type-conversion helper signature now, but do not build the full UI flow for changing column type in this checkpoint.

Keep these helpers framework-agnostic and test them directly.

Suggested files:

- `src/domain/columns/createColumn.ts`
- `src/domain/columns/reorderColumns.ts`

### TICKET-031: Render column header row

Replace the current block-body placeholder with a real column header row.

Requirements:

- render visible columns in display order
- show the stored column label
- show a compact visual treatment for the column type
- respect existing block collapsed behavior
- keep the UI calm and table-like, aligned with the UI spec

This checkpoint only needs rendering, not header menus, resizing, or mutation controls.

Suggested files:

- `src/components/block/BlockColumnHeaderRow.tsx`
- `src/components/block/BlockCard.tsx`

### TICKET-032: Row domain helpers

Add pure row helpers.

Minimum useful scope for this checkpoint:

- create row from a block's current columns
- insert row at index helper
- delete row by id helper
- reorder rows helper

The UI for add/delete/reorder is not part of this checkpoint, but the helpers should exist now so later tickets can wire them without reshaping store logic again.

Suggested files:

- `src/domain/rows/createRow.ts`
- `src/domain/rows/reorderRows.ts`

If you prefer fewer files, keep the split coherent and testable.

### TICKET-033: Render rows and base cell grid

Render the block body as rows and cell slots using the block's existing persisted data.

Requirements:

- render rows in stored order
- render visible columns in stored order
- align each cell under its column header
- render a non-editable base representation for each supported current template cell type:
  - checkbox
  - text
  - bullet
  - numbered
- marker columns should render derived markers only
- do not introduce editable cell inputs in this checkpoint
- do not add row menus, row drag handles, or row insertion controls yet

The goal is to replace the generic "next checkpoint" placeholder with a real structural grid shell backed by actual data.

Suggested files:

- `src/components/row/RowView.tsx`
- `src/components/block/BlockCard.tsx`

You may add a tiny internal presentational helper if needed, but avoid prebuilding the full cell-renderer layer from later tickets.

## Store Integration Guidance

Keep store changes minimal and checkpoint-scoped.

For this checkpoint, `documentStore` should only grow if necessary to support upcoming row/column operations cleanly, for example:

- utility lookups
- narrow block update helpers
- row/column mutation actions if they materially simplify the current implementation

Do not overbuild future editing APIs yet.

If you add store actions now, keep them directly tied to:

- column reorder support
- row helper integration

Do not implement full row CRUD UI flows in this checkpoint.

## Data and Rendering Rules

Follow the existing persisted model already present in the repo:

- column definitions are the source of truth for cell interpretation
- marker columns (`bullet`, `numbered`) do not carry user-authored text payload
- rows store cell payloads keyed by column id

Rendering rules for this checkpoint:

- checkbox cell: render checked/unchecked state from stored boolean
- text cell: render stored string
- bullet cell: render bullet marker only
- numbered cell: render row-position-based numbering only
- empty/missing values should degrade quietly without crashing the block

Do not change the bootstrap template behavior unless a real defect forces it.

## UI Expectations

Match the existing visual language already in the repo.

The row/grid shell should feel:

- compact
- structured
- desktop-oriented
- not spreadsheet-heavy

Keep:

- block header behavior unchanged
- collapsed blocks hidden below the header
- existing block drag/menu/title flows intact

## Tests Required

Add or update unit coverage alongside the implementation.

Required coverage:

- column helper tests
- row helper tests
- document store tests only if store behavior changes
- component/render tests only if they add value without excessive fragility

At minimum, verify:

- create-row produces cells compatible with the block's columns
- marker columns get null payloads
- checkbox columns get boolean payloads
- text-like columns get string or nullable string payloads as appropriate
- reorder helpers preserve ids and only change ordering
- rendered block body reflects column order and row order

Suggested test files:

- `src/tests/unit/columnHelpers.test.ts`
- `src/tests/unit/rowHelpers.test.ts`
- `src/tests/unit/documentStore.test.ts`

## Verification Commands

Run all of these before handing back:

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run lint`

## Non-Negotiable Guardrails

- keep work inside `TICKET-030` through `TICKET-033`
- do not start editable cells
- do not start row action menus or drag handles
- do not start column mutation UI
- do not regress accepted block-management behavior
- do not move persistence logic into components
- do not bypass `documentStore` for durable state changes

## Handoff Format

When you return the checkpoint, report:

- completed tickets
- exact files changed
- whether store APIs changed
- tests added or updated
- commands run and pass/fail status
- known gaps or residual risks
- anything intentionally deferred to `TICKET-034` and later
