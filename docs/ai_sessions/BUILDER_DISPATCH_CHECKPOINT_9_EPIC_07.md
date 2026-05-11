# Builder Dispatch: Checkpoint 9 / EPIC-07 Column Context Menu and Mutation Flows

## Objective

Implement the next constrained EPIC-07 checkpoint immediately after the accepted advanced typed-cell and row-reorder pass.

This checkpoint is limited to:

- `TICKET-037` implement column context menu and mutation flows

Stop at the checkpoint boundary.

Do not start:

- `TICKET-039` selection model
- formatting merge/resolution helpers
- inspector expansion beyond what already exists
- checkbox automation behavior
- sorting
- clipboard
- alerts
- column resize polish

## Current Repo State

Checkpoint 8 is accepted and closed.

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
- base and advanced typed cell renderers
- persisted text/checkbox/date/time/dropdown cell mutations through `documentStore`
- row add / insert / delete UI flows
- row drag reorder with transient drag state reset discipline

Current constraints that must remain true:

- normal user-created workspaces start empty
- the first-launch starter Home workspace still seeds a block
- persistence stays routed through `documentStore`
- business logic stays out of React components where practical
- transaction/history/autosave behavior must not regress
- block and row drag behavior must not regress

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
- `src/components/block/BlockColumnHeaderRow.tsx`
- `src/components/row/RowView.tsx`
- `src/stores/documentStore.ts`
- `src/stores/uiStore.ts`
- `src/types/column.ts`
- `src/types/ui.ts`
- `src/domain/columns/createColumn.ts`
- `src/domain/columns/reorderColumns.ts`
- `src/tests/unit/columnHelpers.test.ts`
- `src/tests/unit/documentStore.test.ts`
- `src/tests/unit/contextMenuDismissal.test.tsx`

## Scope Details

### TICKET-037: Column context menu and mutation flows

Add the first usable column-management path for block columns.

Required UI capabilities:

- open a column context menu from the header row
- rename a column label
- move a column left
- move a column right
- add a column to the left of the current column
- add a column to the right of the current column
- delete a column
- change a column type
- expose the required checkbox behavior toggles
- expose the required date/time alert toggle

V1 scope for this checkpoint is explicit:

- reorder must use menu actions, not direct header drag
- width/resize is out of scope
- selection/highlight model is out of scope unless minimal local UI state is required just to anchor a menu
- inspector integration is out of scope

Suggested files:

- `src/components/block/BlockColumnHeaderRow.tsx`
- `src/components/block/BlockCard.tsx`
- `src/stores/documentStore.ts`
- `src/domain/columns/createColumn.ts`
- `src/domain/columns/reorderColumns.ts`
- `src/types/column.ts`

### Safe mutation expectations

This checkpoint will likely require new durable store actions for:

- renaming a column
- adding a column relative to an existing column
- deleting a column
- moving a column left/right
- changing a column type
- updating checkbox/date/time column settings

Those changes are in scope if they remain disciplined.

Requirements:

- keep durable mutations in `documentStore`
- keep any conversion logic in domain/store helpers, not inline inside React event handlers
- preserve row validity after every column mutation
- preserve existing row ids and block ids during column mutations
- preserve history/autosave semantics

### Column type-conversion guidance

Changing a column type must keep the persisted payload valid for every existing row.

Minimum safe conversion rules for this checkpoint:

- to `text`: store a string value
- to `checkbox`: store a boolean value
- to `bullet` or `numbered`: store marker-style null payloads
- to `date`, `time`, or `dropdown`: store nullable string payloads

Use pragmatic defaults when the prior value is incompatible, but do not leave invalid row payloads behind.

This checkpoint does not need to preserve every previous value perfectly across incompatible type changes. It does need to remain internally valid, predictable, and non-destructive beyond the type conversion itself.

### Settings exposure guidance

Minimum settings UI required in this checkpoint:

- checkbox columns:
  - `strikeoutRowWhenChecked`
  - `moveCheckedRowsToBottom`
- date columns:
  - `alertsEnabled`
- time columns:
  - `alertsEnabled`

Keep these controls compact. Prompt-based or inline menu-based controls are acceptable if they are clear and testable.

Do not start the richer type-specific inspector work from `TICKET-046`.

Dropdown options editing is not required in this checkpoint unless needed to keep the change-type path minimally usable. If added, keep it lightweight and checkpoint-scoped.

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
- existing row drag and row editing flows intact

For column menus:

- outside-click dismissal should be safe and should not fall through to underlying interactions
- destructive actions should remain clearly separated
- move-left/move-right should be disabled or inert at boundaries instead of corrupting order

## Tests Required

Add or update tests alongside the implementation.

Required coverage:

- pure helper coverage for new column mutation helpers or conversion logic
- `documentStore` coverage for column add/delete/reorder/rename/change-type flows
- row-payload validity after type changes
- UI coverage for opening the column menu and triggering core actions where practical
- dismissal/backdrop coverage if the new menu uses an overlay pattern

At minimum, verify:

- adding a column creates compatible cells for every existing row
- deleting a column removes the cell payload from every existing row
- move-left/move-right only changes column ordering
- rename persists the new label
- change-type rewrites row cell payloads into valid shapes for the new type
- checkbox/date/time setting toggles persist to the column definition
- boundary actions do not corrupt order

Suggested test files:

- `src/tests/unit/columnHelpers.test.ts`
- `src/tests/unit/documentStore.test.ts`
- `src/tests/unit/blockGridRender.test.tsx`
- `src/tests/unit/contextMenuDismissal.test.tsx`
- add a focused new test file if column menu interactions become awkward inside existing tests

## Verification Commands

Run all of these before handing back:

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run lint`

Use the actual local shell available in the environment. In this repo that normally means PowerShell.

If `npm run build` hits the known sandbox `spawn EPERM` restriction, rerun it through the approved escalation path before deciding it failed.

## Non-Negotiable Guardrails

- keep work inside `TICKET-037`
- do not start selection-model work
- do not start inspector expansion work beyond what is required to avoid regressions
- do not start formatting merge/resolution or formatting persistence work
- do not start checkbox automation behavior itself
- do not start sorting, clipboard, or alerts
- do not implement direct header drag reorder or resize
- do not regress accepted block, row, or typed-cell behavior
- do not move persistence logic into components
- do not bypass `documentStore` for durable state changes

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
