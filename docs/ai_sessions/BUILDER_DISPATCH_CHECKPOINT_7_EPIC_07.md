# Builder Dispatch: Checkpoint 7 / EPIC-07 Base Cell Editing

## Objective

Implement the next constrained EPIC-07 checkpoint immediately after the accepted display-only grid shell.

This checkpoint is limited to:

- `TICKET-034` implement base cell renderers
- `TICKET-035` implement row add/delete/insert UI

Stop at the checkpoint boundary.

Do not start:

- `TICKET-034A` advanced typed cell renderers for `date`, `time`, `dropdown`
- `TICKET-036` row drag reorder
- `TICKET-037` column context menu and mutation UI
- `TICKET-039` selection model
- inspector work
- sorting
- clipboard
- alerts

## Current Repo State

Checkpoint 6 is accepted.

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
- display-only row/cell grid rendering

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

- `src/components/block/BlockCard.tsx`
- `src/components/row/RowView.tsx`
- `src/stores/documentStore.ts`
- `src/domain/rows/createRow.ts`
- `src/domain/rows/reorderRows.ts`
- `src/domain/templates/blockTemplates.ts`
- `src/types/column.ts`
- `src/types/row.ts`
- `src/tests/unit/blockGridRender.test.tsx`
- `src/tests/unit/documentStore.test.ts`

## Scope Details

### TICKET-034: Base cell renderers

Replace the inline base rendering in `RowView` with dedicated cell components for the current MVP-core cell types:

- `text`
- `checkbox`
- `bullet`
- `numbered`

Minimum useful scope for this checkpoint:

- text cells support inline editing against persisted row data
- checkbox cells toggle immediately against persisted row data
- bullet and numbered cells remain marker-only and non-editable
- rendering stays aligned to the block's visible columns and row order

This checkpoint should move the current inline per-type branching out of `RowView` and into small typed cell components.

Suggested files:

- `src/components/cell/CellRenderer.tsx`
- `src/components/cell/TextCell.tsx`
- `src/components/cell/CheckboxCell.tsx`
- `src/components/cell/BulletCell.tsx`
- `src/components/cell/NumberedCell.tsx`
- `src/components/row/RowView.tsx`

Do not implement date/time/dropdown editing here. Those remain deferred to `TICKET-034A`.

### TICKET-035: Row add/delete/insert UI

Add the first row-mutation UI flows on top of the accepted row helpers.

Minimum useful scope for this checkpoint:

- add row action from the block surface
- insert row above
- insert row below
- delete row

The implementation can be compact and pragmatic. It does not need a full context menu yet.

Acceptable UI shapes for this checkpoint:

- `+ Row` button in the block header
- small inline row action buttons revealed on hover or always visible in a compact action column

Requirements:

- row creation uses the block's current columns
- row operations persist through `documentStore`
- row ids remain stable
- row order reindexes correctly after insert/delete
- row actions create sensible history/autosave transactions

Do not implement row drag handles or drag/drop in this checkpoint.

## Store Integration Guidance

This checkpoint will likely require `documentStore` expansion.

Expected store work is in scope if kept disciplined:

- update text-like cell values
- toggle checkbox values
- append row to block
- insert row above/below
- delete row

Requirements:

- keep mutation logic in `documentStore`
- use the existing snapshot/history/autosave patterns
- choose transaction kinds coherently:
  - typing-style edits for text commits
  - formatting or drag should not be reused carelessly for row mutations
- do not bypass durable state through local-only React state

If you need tiny internal helper functions inside `documentStore`, add them there rather than pushing mutation logic down into components.

## Data and Editing Rules

Follow the existing persisted model already present in the repo:

- column definitions are the source of truth for cell interpretation
- marker columns (`bullet`, `numbered`) do not carry user-authored text payload
- rows store cell payloads keyed by column id

Editing rules for this checkpoint:

- text cell:
  - inline text editing
  - commit on blur and Enter
  - Escape may cancel local edits if easy to support
- checkbox cell:
  - click toggles persisted boolean value immediately
- bullet cell:
  - render marker only
- numbered cell:
  - render derived numbering only
- date/time/dropdown cells:
  - do not become interactive in this checkpoint
  - may remain quiet placeholders or non-editable string/null display

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

For row actions, prefer low-noise controls that do not make the block feel cluttered.

## Tests Required

Add or update tests alongside the implementation.

Required coverage:

- documentStore row and cell mutation behavior
- base cell component behavior where useful
- UI interaction tests for row add/insert/delete flows

At minimum, verify:

- editing a text cell updates persisted row data
- toggling a checkbox updates persisted row data
- add row creates a row with cells aligned to current block columns
- insert above/below places the new row in the correct position
- delete row removes the target row and reindexes remaining rows
- history-compatible store behavior is not obviously broken by row/cell mutations

Suggested test files:

- `src/tests/unit/documentStore.test.ts`
- `src/tests/unit/rowHelpers.test.ts` if helper expectations need extension
- `src/tests/unit/rowEditing.test.tsx`
- `src/tests/unit/blockGridRender.test.tsx`

## Verification Commands

Run all of these before handing back:

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run lint`

## Non-Negotiable Guardrails

- keep work inside `TICKET-034` and `TICKET-035`
- do not implement advanced typed cell editing
- do not implement row drag/drop
- do not implement column mutation UI
- do not start selection or inspector work
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
- anything intentionally deferred to `TICKET-034A` and later
