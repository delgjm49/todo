# Builder Dispatch: Checkpoint 8 / EPIC-07 Advanced Typed Cells and Row Reorder

## Objective

Implement the next constrained EPIC-07 checkpoint immediately after the accepted base cell editing and row mutation pass.

This checkpoint is limited to:

- `TICKET-034A` implement advanced typed cell renderers
- `TICKET-036` implement row drag reorder

Stop at the checkpoint boundary.

Do not start:

- `TICKET-037` column context menu and mutation UI
- `TICKET-039` selection model
- inspector work
- sorting
- clipboard
- alerts

## Current Repo State

Checkpoint 7 is accepted.

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
- pure column helpers
- pure row helpers
- display-only column header row
- base cell components for `text`, `checkbox`, `bullet`, and `numbered`
- persisted text-cell and checkbox-cell mutations through `documentStore`
- row add / insert / delete UI flows

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

- `src/components/cell/CellRenderer.tsx`
- `src/components/cell/TextCell.tsx`
- `src/components/cell/CheckboxCell.tsx`
- `src/components/row/RowView.tsx`
- `src/components/block/BlockCard.tsx`
- `src/components/layout/MainPane.tsx`
- `src/stores/documentStore.ts`
- `src/stores/uiStore.ts`
- `src/types/ui.ts`
- `src/tests/unit/documentStore.test.ts`
- `src/tests/unit/rowEditing.test.tsx`
- `src/tests/unit/uiStore.test.ts`

## Scope Details

### TICKET-034A: Advanced typed cell renderers

Add typed cell components and store wiring for:

- `date`
- `time`
- `dropdown`

Minimum useful scope for this checkpoint:

- each type renders through dedicated components, not inline branching in `RowView`
- each type supports editing against persisted row data
- invalid `date` and `time` values show a clear but non-blocking invalid state
- `dropdown` cells use the stored option list from column settings
- empty values remain allowed where the current model allows them

Suggested files:

- `src/components/cell/DateCell.tsx`
- `src/components/cell/TimeCell.tsx`
- `src/components/cell/DropdownCell.tsx`
- `src/components/cell/CellRenderer.tsx`
- `src/stores/documentStore.ts`

Editing guidance:

- `date` and `time` may use text inputs in this checkpoint
- you do not need to build calendar or time pickers
- validation display should be subtle, not modal or blocking
- `dropdown` should be a compact select-style control

Store guidance:

- add targeted `documentStore` mutations for the new cell types
- keep the payload model unchanged: nullable string values for `date`, `time`, and `dropdown`
- preserve history/autosave semantics

### TICKET-036: Row drag reorder

Implement row drag/drop reorder inside one block.

Requirements:

- rows reorder correctly inside a block
- order persists through `documentStore`
- drag state is explicit and reset safely
- visual feedback is clear but low-noise

This checkpoint should follow the interaction-state discipline already established for workspaces and blocks.

Expected scope:

- row drag handle or equivalent explicit drag affordance
- row sortable behavior within a block only
- persisted reindexing on drop
- drag/drop feedback in the UI

Suggested files:

- `src/components/row/RowView.tsx`
- `src/stores/documentStore.ts`
- `src/stores/uiStore.ts`
- `src/types/ui.ts`
- `src/tests/unit/uiStore.test.ts`
- `src/tests/unit/documentStore.test.ts`

Important:

- do not implement cross-block row drag
- do not implement column drag
- do not couple row drag state to block drag state

## Store Integration Guidance

This checkpoint will require `documentStore` and likely `uiStore` expansion.

Expected `documentStore` work is in scope if kept disciplined:

- update date cell value
- update time cell value
- update dropdown cell value
- reorder rows within a block

Expected `uiStore` work is in scope if kept disciplined:

- row drag state
- row drop-target state
- safe reset paths on navigation and unmount

Requirements:

- keep durable mutations in `documentStore`
- keep transient drag state in `uiStore`
- use the existing snapshot/history/autosave patterns
- do not bypass durable state through local-only React state
- clear stale row drag state when switching screens and on relevant unmount paths

## Data and Editing Rules

Follow the existing persisted model already present in the repo:

- column definitions are the source of truth for cell interpretation
- rows store cell payloads keyed by column id
- `date`, `time`, and `dropdown` cells persist nullable string payloads

Editing rules for this checkpoint:

- `date` cell:
  - editable text input
  - null/empty allowed
  - invalid input visually indicated but still non-destructive
- `time` cell:
  - editable text input
  - null/empty allowed
  - invalid input visually indicated but still non-destructive
- `dropdown` cell:
  - compact options control
  - options sourced from the column definition
  - empty value allowed if no option is selected

Do not change the canonical cell payload model.

## UI Expectations

Match the existing visual language already in the repo.

The grid should remain:

- compact
- structured
- desktop-oriented
- not spreadsheet-heavy

Keep:

- block header behavior intact
- collapsed blocks hidden below the header
- existing block drag/menu/title flows intact

For row drag:

- prefer an explicit handle or equally clear drag affordance
- avoid making text inputs themselves the drag target
- keep drag visuals readable but restrained

## Tests Required

Add or update tests alongside the implementation.

Required coverage:

- `documentStore` mutations for advanced typed cells
- row reorder persistence behavior
- `uiStore` row drag-state reset behavior
- UI interaction tests for typed-cell editing and row drag/drop where practical

At minimum, verify:

- date cell edits persist nullable string payloads
- time cell edits persist nullable string payloads
- dropdown edits persist selected option values
- invalid date/time values receive invalid-state rendering without crashing
- row reorder preserves row ids and only changes ordering
- row drag state is cleared on settings navigation and on relevant unmount paths
- row reorder creates a persisted block-row order after drop

Suggested test files:

- `src/tests/unit/documentStore.test.ts`
- `src/tests/unit/rowEditing.test.tsx`
- `src/tests/unit/uiStore.test.ts`
- add a focused new test file if row drag behavior becomes too awkward inside existing tests

## Verification Commands

Run all of these before handing back:

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run lint`

## Non-Negotiable Guardrails

- keep work inside `TICKET-034A` and `TICKET-036`
- do not start column mutation/menu UI
- do not start selection or inspector work
- do not start sorting, clipboard, or alerts
- do not regress accepted block-management behavior
- do not regress accepted row add/insert/delete behavior
- do not move persistence logic into components
- do not bypass `documentStore` for durable state changes
- do not keep row drag state only inside local component state

## Dev Handoff Requirements

When handing off to Review:

- update the linked dispatch-channel artifact
- report completed tickets
- list exact files changed
- list store/api changes
- list tests added or updated
- list commands run and pass/fail status
- list known gaps or residual risks
- list everything intentionally deferred beyond this checkpoint
- produce a copy/paste prompt for the Review agent that references:
  - this dispatch artifact
  - the linked dispatch-channel artifact
