# Handoff

## Read First

Before making changes:

1. `docs/ai_sessions/STATUS.md`
2. `docs/TODO_APP_PLAN.md`
3. `docs/TODO_APP_TECH_SPEC.md`
4. `docs/TODO_APP_UI_SPEC.md`
5. `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md`

## Current Situation

The project has moved past pure planning and into implementation.

Foundation, storage, history/autosave, CI, and the reviewed workspace-shell pass are in place.

Checkpoint 3 has now been formally reviewed in this primary session thread and refined where the builder pass missed acceptance behavior.
Checkpoint 4 / EPIC-06 initial block creation and block-card shell work has now been formally reviewed and accepted after the empty-workspace follow-up fix.
Checkpoint 5 / remaining EPIC-06 block management work has now been formally reviewed and accepted in this primary session thread after the follow-up fixes.
Checkpoint 6 / EPIC-07 row-column engine entry work has now been formally reviewed and accepted in this primary session thread.
Checkpoint 7 / EPIC-07 base cell editing and row mutation work has now been formally reviewed and accepted in this primary session thread.
Checkpoint 8 / EPIC-07 advanced typed cells and row reorder work has now been accepted and closed in this primary session thread.
Checkpoint 9 / EPIC-07 column context menu and mutation flows has now been formally reviewed and accepted in this primary session thread.
Checkpoint 10 / EPIC-08 selection model entry (`TICKET-039`) has now been formally reviewed and accepted in this primary session thread.
Checkpoint 11 / EPIC-08 formatting merge/resolution helpers (`TICKET-040`) has now been implemented by Dev and is awaiting Review.

## Most Recent Meaningful Events

- Windows GitHub Actions Tauri build is green after icon-related fixes
- The user can preview the web shell through `npm run dev`
- The user cannot run local Tauri builds on this work PC because Rust/MSVC tooling is unavailable
- A markdown-based continuity workflow has now been added for future agents
- Builder/reviewer dispatch workflow now keeps durable scope in `docs/ai_sessions/` artifacts while sending the copy/paste prompt directly to the user; prompts should reference the artifact file when one exists
- AI session routing is now formalized as `Main -> Dev -> Review`, with Review returning either to Dev or Main; dispatches should use an immutable scope artifact plus a mutable dispatch-channel artifact
- Local `npm run typecheck`, `npm run test`, `npm run build`, and `npm run lint` pass after the latest checkpoint 5 review-fix pass on 2026-05-07
- Checkpoint 4 block template and block-card shell work has now been reviewed and accepted
- Checkpoint 5 block title editing, collapse, reorder, move, and block context menu work is now implemented
- Checkpoint 5 has now been accepted by review; residual risk is limited to missing end-to-end browser coverage for the full drag-reorder/move/delete flow
- Checkpoint 6 added pure row/column helper coverage plus display-only column headers and row/cell grid rendering inside blocks
- Local `npm run typecheck`, `npm run test`, `npm run build`, and `npm run lint` pass after the checkpoint 6 builder pass and review on 2026-05-11
- Checkpoint 7 added dedicated base cell components for text, checkbox, bullet, and numbered columns plus persisted row add/insert/delete flows
- Local `npm run typecheck`, `npm run test`, `npm run build`, and `npm run lint` pass after the checkpoint 7 builder pass and review on 2026-05-11
- Checkpoint 8 was closed directly in Main after delegate-loop misses on the typed-cell UI path
- Reviewer workflow is now tightened: Review is read-only on code, must run required verification, and should treat React/jsdom controlled-input tests as high-risk
- Local `npm run typecheck`, `npm run test`, and `npm run build` pass after the checkpoint 8 main-thread close on 2026-05-11
- Repo-wide `npm run lint` is still blocked only by unrelated `.pi/extensions/todo-app-footer.ts` state
- Checkpoint 9 Dev pass completed on 2026-05-11 with `npm run typecheck`, `npm run test`, and `npm run build` passing
- Checkpoint 9 added column context menus, rename, move left/right, add left/right, delete, change type, and settings toggles
- `npm run lint` remains blocked only by the same unrelated `.pi/extensions/todo-app-footer.ts` state

## Most Recent Review Outcome

Reviewed checkpoint 3 scope:

- `TICKET-014`
- `TICKET-015`
- `TICKET-016`
- `TICKET-017`
- `TICKET-018`
- `TICKET-019`
- `TICKET-020`
- `TICKET-021`
- plus documentStore transaction batching integration cleanup

Checkpoint 3 review fixes applied:

- workspace dock cards now render stored workspace background/text styling instead of only showing the hex values
- downward workspace drag reorder now produces the expected persisted order
- workspace reorder coverage was updated to pin the downward-move case

Checkpoint 3 changed files:

- `src/app/App.tsx`
- `src/stores/documentStore.ts`
- `src/stores/uiStore.ts`
- `src/types/ui.ts`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/InspectorShell.tsx`
- `src/components/layout/LeftDock.tsx`
- `src/components/layout/MainPane.tsx`
- `src/components/layout/TopBar.tsx`
- `src/components/settings/SettingsPage.tsx`
- `src/components/workspace/WorkspaceCard.tsx`
- `src/tests/unit/documentStore.test.ts`

Checkpoint 3 accepted gaps:

- add-block control is shell-only and disabled
- settings screen is read-only shell content
- block/row/cell editing is still deferred

Checkpoint 4 status:

- reviewed and accepted in this thread
- implemented scope:
  - block templates
  - empty workspace add-block affordances
  - top bar add-block flow
  - block cards and headers
- accepted follow-up behavior:
  - normal user-created workspaces now start empty
  - first-launch bootstrap still seeds the starter Home workspace with a block

Checkpoint 5 status:

- reviewed and accepted in this thread
- implemented scope:
  - `TICKET-026` block title inline edit
  - `TICKET-026` collapse / expand with persisted collapsed state
  - `TICKET-027` block reorder within the active workspace
  - `TICKET-028` move block to another workspace through the block menu
  - `TICKET-029` block context menu with rename, move, collapse/expand, and delete
- local verification run on 2026-05-07:
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
  - `npm run lint`
- review findings fixed on 2026-05-07 before acceptance:
  - downward block reorder now inserts before the hovered target instead of one slot too low
  - block drag state is now cleared when switching to settings and again on `MainPane` unmount
  - workspace drag state is now cleared when switching to settings and again on `LeftDock` unmount
  - block and workspace context menus now dismiss through full-screen backdrops so outside clicks do not fall through to underlying cards
- accepted residual risk:
  - no end-to-end browser coverage yet for a complete drag-reorder / move / delete user flow
- changed files:
  - `src/stores/documentStore.ts`
  - `src/stores/uiStore.ts`
  - `src/types/ui.ts`
  - `src/components/layout/MainPane.tsx`
  - `src/components/layout/LeftDock.tsx`
  - `src/components/block/BlockCard.tsx`
  - `src/components/block/BlockContextMenu.tsx`
  - `src/tests/unit/documentStore.test.ts`
  - `src/tests/unit/uiStore.test.ts`
  - `src/tests/unit/contextMenuDismissal.test.tsx`
  - `src/tests/types/jsdom.d.ts`

Checkpoint 6 status:

- reviewed and accepted in this thread
- implemented scope:
  - `TICKET-030` column domain helpers
  - `TICKET-031` column header row rendering
  - `TICKET-032` row domain helpers
  - `TICKET-033` display-only row and base cell grid rendering
- local verification run on 2026-05-11:
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
  - `npm run lint`
- review outcome:
  - no blocking findings in scoped files
  - accepted as a display-only grid shell checkpoint
- accepted intentional deferrals:
  - editable cell inputs and typed cell editor components
  - row add/delete/insert UI
  - row drag/drop
  - column menus and mutation UI
  - selection model
  - inspector integration
  - sorting
  - clipboard
  - alerts
- changed files:
  - `src/domain/columns/createColumn.ts`
  - `src/domain/columns/reorderColumns.ts`
  - `src/domain/rows/createRow.ts`
  - `src/domain/rows/reorderRows.ts`
  - `src/components/block/BlockColumnHeaderRow.tsx`
  - `src/components/row/RowView.tsx`
  - `src/components/block/BlockCard.tsx`
  - `src/tests/unit/columnHelpers.test.ts`
  - `src/tests/unit/rowHelpers.test.ts`
  - `src/tests/unit/blockGridRender.test.tsx`

Checkpoint 7 status:

- reviewed and accepted in this thread
- implemented scope:
  - `TICKET-034` base cell renderers
  - `TICKET-035` row add/delete/insert UI
- local verification run on 2026-05-11:
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
  - `npm run lint`
- review outcome:
  - no blocking findings in scoped files
  - accepted as the base row/cell editing checkpoint
- store APIs added:
  - `updateTextCellValue`
  - `toggleCheckboxCellValue`
  - `appendRowToBlock`
  - `insertRowInBlock`
  - `deleteRowFromBlock`
- accepted residual risks:
  - `rowEditing` tests still emit React `act(...)` warnings from async autosave timing
  - UI interaction coverage is strongest for checkbox and row operations; text-cell interaction coverage is lighter than store coverage
- accepted intentional deferrals:
  - `TICKET-034A` advanced typed cell renderers for `date`, `time`, `dropdown`
  - row drag/drop
  - column menus and mutation UI
  - selection model
  - inspector integration
  - sorting
  - clipboard
  - alerts
- changed files:
  - `src/components/cell/CellRenderer.tsx`
  - `src/components/cell/TextCell.tsx`
  - `src/components/cell/CheckboxCell.tsx`
  - `src/components/cell/BulletCell.tsx`
  - `src/components/cell/NumberedCell.tsx`
  - `src/components/row/RowView.tsx`
  - `src/components/block/BlockCard.tsx`
  - `src/components/layout/MainPane.tsx`
  - `src/stores/documentStore.ts`
  - `src/tests/unit/documentStore.test.ts`
  - `src/tests/unit/rowEditing.test.tsx`
  - `src/tests/unit/blockGridRender.test.tsx`

Checkpoint 8 status:

- implemented scope:
  - `TICKET-034A` advanced typed cell renderers (`date`, `time`, `dropdown`)
  - `TICKET-036` row drag reorder within a block
- store APIs added:
  - `updateDateCellValue`
  - `updateTimeCellValue`
  - `updateDropdownCellValue`
  - `reorderRows`
- uiStore APIs added:
  - `setRowDragState`
  - `resetRowInteractionState`
  - `draggingRowBlockId`, `draggingRowId`, `dropTargetRowId`
- changed files:
  - `src/components/cell/DateCell.tsx` (new)
  - `src/components/cell/TimeCell.tsx` (new)
  - `src/components/cell/DropdownCell.tsx` (new)
  - `src/components/cell/CellRenderer.tsx`
  - `src/components/row/RowView.tsx`
  - `src/components/layout/MainPane.tsx`
  - `src/stores/documentStore.ts`
  - `src/stores/uiStore.ts`
  - `src/types/ui.ts`
  - `src/tests/unit/documentStore.test.ts`
  - `src/tests/unit/uiStore.test.ts`
  - `src/tests/unit/rowEditing.test.tsx`
- Main verification and direct close on 2026-05-11:
  - `npm run typecheck`: pass
  - `npm run test`: pass
  - `npm run build`: pass
  - `npm run lint`: fail only in unrelated repo state at `.pi/extensions/todo-app-footer.ts`
- Main direct fix applied after delegate loop stalled:
  - `src/components/cell/DateCell.tsx`
  - `src/components/cell/TimeCell.tsx`
  - `src/tests/unit/rowEditing.test.tsx`
- review-process issue:
  - Review directly edited a test file, which is now explicitly disallowed under the normal workflow
- dispatch channel updated with final Main closeout
- status: accepted and closed in the main thread

### Checkpoint 8 Fix Passes (Dev)

- diagnosis: the failures were test-harness-only, caused by React's internal value tracker for controlled inputs in jsdom
  - direct `.value` assignment on a DOM input followed by native `dispatchEvent("input")` bypasses React's value tracker, so React's `onChange` handler sees no difference and does not fire
  - `focus()` calls triggered jsdom `attachEvent`/`detachEvent` errors
- first fix pass applied:
  - removed `focus()` calls from all typed-cell UI tests
  - split `input` and `blur` event dispatches into separate sequential `act()` calls
- second fix pass applied:
  - replaced manual native event dispatch with `fireEvent` from `@testing-library/react` in typed-cell UI tests
  - `fireEvent.change()` properly updates React's internal value tracker before dispatching the event, making controlled input tests reliable in jsdom
- files changed in fix passes:
  - `src/tests/unit/rowEditing.test.tsx`
- Main re-verification after the second fix pass:
  - `npm run typecheck`: pass
  - `npm run test`: fail
  - `npm run build`: pass
  - `npm run lint`: fail only in unrelated repo state at `.pi/extensions/todo-app-footer.ts`
- blocking checkpoint-scoped failures still present:
  - `src/tests/unit/rowEditing.test.tsx`
    - `renders and edits date, time, and dropdown cells`
    - `shows invalid styling for bad date and time values without crashing`
- remaining warning surface:
  - repeated React `act(...)` warnings still appear in the test output
- final resolution in Main thread:
  - `rowEditing.test.tsx` date/time assertions were updated to use `fireEvent.input`
  - `DateCell` and `TimeCell` now update draft state on `onInput` in addition to `onChange`
  - final local verification cleared the checkpoint blocker
- status: checkpoint accepted and closed

### Checkpoint 9 status (Dev pass complete, awaiting Review)

- implemented scope:
  - `TICKET-037` column context menu and mutation flows
- new domain helpers:
  - `addColumn`, `deleteColumn`, `renameColumn`, `changeColumnType`, `moveColumnLeft`, `moveColumnRight`, `updateColumnSettings`
- store APIs added:
  - `renameColumn`, `moveColumnLeft`, `moveColumnRight`, `addColumnLeft`, `addColumnRight`, `deleteColumn`, `changeColumnType`, `updateColumnSettings`
- uiStore APIs added:
  - `columnMenu`, `openColumnMenu`, `closeColumnMenu`
- changed files:
  - `src/types/ui.ts`
  - `src/stores/uiStore.ts`
  - `src/stores/documentStore.ts`
  - `src/domain/columns/createColumn.ts`
  - `src/domain/rows/createRow.ts`
  - `src/domain/columns/addColumn.ts` (new)
  - `src/domain/columns/deleteColumn.ts` (new)
  - `src/domain/columns/renameColumn.ts` (new)
  - `src/domain/columns/changeColumnType.ts` (new)
  - `src/domain/columns/moveColumn.ts` (new)
  - `src/domain/columns/updateColumnSettings.ts` (new)
  - `src/components/block/BlockColumnHeaderRow.tsx`
  - `src/components/block/BlockCard.tsx`
  - `src/components/block/ColumnContextMenu.tsx` (new)
  - `src/components/layout/MainPane.tsx`
  - `src/tests/unit/uiStore.test.ts`
  - `src/tests/unit/columnHelpers.test.ts`
  - `src/tests/unit/documentStore.test.ts`
  - `src/tests/unit/blockGridRender.test.tsx`
  - `src/tests/unit/contextMenuDismissal.test.tsx`
- Dev verification on 2026-05-11:
  - `npm run typecheck`: pass
  - `npm run test`: pass (48 tests)
  - `npm run build`: pass
  - `npm run lint`: fail only in unrelated `.pi/extensions/todo-app-footer.ts`

## Immediate Next Step

Checkpoint 9 has been reviewed, accepted, and closed.

Recommended next scope:

- `TICKET-039` selection model

Reason for the recommendation:

- column management UI is now complete; the remaining structural EPIC-07 gaps are closed
- selection model is the natural next layer before deeper inspector/formatting work

Checkpoint 10 scope:

- `TICKET-039`

Recommended first files to verify:

- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md`
- `docs/ai_sessions/STATUS.md`
- `docs/ai_sessions/DISPATCH_CHANNEL_CHECKPOINT_10_EPIC_08.md`
- `docs/ai_sessions/README.md`

Dispatch artifacts for checkpoint 10:

- `docs/ai_sessions/BUILDER_DISPATCH_CHECKPOINT_10_EPIC_08.md`
- `docs/ai_sessions/DISPATCH_CHANNEL_CHECKPOINT_10_EPIC_08.md`

## Constraints To Preserve

- keep work checkpoint-scoped
- keep Tauri/Rust thin
- keep business logic out of UI components where practical
- preserve the refined persistence and save semantics
- use GitHub Actions as the Windows native build gate
- keep the next pass aligned with the accepted sequencing; selection state may move forward now, but do not jump ahead to inspector expansion, formatting, sorting, clipboard, or alerts until the checkpoint scope explicitly allows it
- keep block mutation logic in `documentStore` instead of pushing it down into React components
- keep upcoming column mutation logic in `documentStore` and helper code instead of pushing it down into React components
- keep upcoming selection state ephemeral in `uiStore` instead of pushing it into durable document state
- Review is read-only on implementation/test files under the normal workflow

### Checkpoint 10 status (reviewed and accepted)

- implemented scope:
  - `TICKET-039` selection model across block/column/row/cell
- new types:
  - `Selection` discriminated union in `src/types/ui.ts`
- uiStore APIs added:
  - `selection`, `selectBlock`, `selectColumn`, `selectRow`, `selectCell`, `clearSelection`
- visual treatment added:
  - block selection: subtle ring/border accent on `BlockCard`
  - column selection: header background/border emphasis on `BlockColumnHeaderRow`
  - row selection: row background emphasis in `RowView`
  - cell selection: stronger border/ring treatment on cell containers in `RowView`
- interaction changes:
  - block header click selects the block
  - column header left-click selects the column; right-click opens column context menu
  - row surface click selects the row
  - cell container click selects the cell and stops propagation to avoid row selection
  - selection clears on workspace switch and settings navigation
- inspector minimal wiring:
  - `InspectorShell` now shows a small selection kind readout
- changed files:
  - `src/types/ui.ts`
  - `src/stores/uiStore.ts`
  - `src/components/layout/MainPane.tsx`
  - `src/components/layout/InspectorShell.tsx`
  - `src/components/block/BlockCard.tsx`
  - `src/components/block/BlockColumnHeaderRow.tsx`
  - `src/components/row/RowView.tsx`
  - `src/tests/unit/uiStore.test.ts`
  - `src/tests/unit/blockGridRender.test.tsx`
  - `src/tests/unit/selectionModel.test.tsx` (new)
- Dev verification on 2026-05-11:
  - `npm run typecheck`: pass
  - `npm run test`: pass (57 tests)
  - `npm run build`: pass
  - `npm run lint`: pass
- Review verification rerun on 2026-05-11:
  - `npm run typecheck`: pass
  - `npm run test`: pass (57 tests, 0 failures)
  - `npm run build`: pass
  - `npm run lint`: pass
- accepted residual risks:
  - Block header child button clicks incidentally select the block due to event propagation. Functional behavior is preserved.
  - Pre-existing React `act(...)` warnings from async autosave timing persist in test output.
- review findings:
  - no blockers or scope-critical regressions
  - all acceptance criteria met

## Immediate Next Step

Checkpoint 11 is reviewed, accepted, and closed.

Recommended next scope:
- `TICKET-041` inspector shell and target summary work

Reason for the recommendation:
- formatting resolution semantics are now locked down and tested
- the current inspector is still a placeholder shell and is now the next clean dependency boundary
- `TICKET-042` text formatting controls and `TICKET-043` border controls build on top of a proper inspector shell

Checkpoint 12 scope:

- `TICKET-041`

Recommended first files to verify:

- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md`
- `docs/ai_sessions/STATUS.md`
- `docs/ai_sessions/DISPATCH_CHANNEL_CHECKPOINT_12_EPIC_08.md`
- `docs/ai_sessions/README.md`

Dispatch artifacts for checkpoint 12:

- `docs/ai_sessions/BUILDER_DISPATCH_CHECKPOINT_12_EPIC_08.md`
- `docs/ai_sessions/DISPATCH_CHANNEL_CHECKPOINT_12_EPIC_08.md`

## Constraints To Preserve

- keep work checkpoint-scoped
- keep Tauri/Rust thin
- keep business logic out of UI components where practical
- preserve the refined persistence and save semantics
- use GitHub Actions as the Windows native build gate
- keep the next pass aligned with the accepted sequencing; inspector shell work may move forward now, but do not jump ahead to formatting controls/persistence, sorting, clipboard, or alerts until the checkpoint scope explicitly allows it
- keep block mutation logic in `documentStore` instead of pushing it down into React components
- keep upcoming column mutation logic in `documentStore` and helper code instead of pushing it down into React components
- keep upcoming selection state ephemeral in `uiStore` instead of pushing it into durable document state
- keep upcoming formatting resolution logic pure and framework-agnostic where possible
- keep upcoming inspector work read-only and summary-focused until a later checkpoint explicitly opens formatting controls
- Review is read-only on implementation/test files under the normal workflow

## Files To Update At Session End

- `docs/ai_sessions/HANDOFF.md`
- `docs/ai_sessions/STATUS.md`
- `docs/ai_sessions/WORKLOG.md`
