# Dispatch Channel: Checkpoint 9 / EPIC-07

## Channel Metadata

- Checkpoint: `Checkpoint 9`
- Epic / tickets: `EPIC-07`, `TICKET-037`
- Current status: `accepted_closed_by_main`
- Current owner: `Main`
- Next route: `Checkpoint 10 planning`
- Created by: `Main`
- Created date: `2026-05-11`

## Linked Artifacts

- Dispatch artifact: `docs/ai_sessions/BUILDER_DISPATCH_CHECKPOINT_9_EPIC_07.md`
- Relevant planning docs:
  - `docs/TODO_APP_PLAN.md`
  - `docs/TODO_APP_TECH_SPEC.md`
  - `docs/TODO_APP_UI_SPEC.md`
  - `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md`
- Relevant continuity docs:
  - `docs/ai_sessions/HANDOFF.md`
  - `docs/ai_sessions/STATUS.md`
  - `docs/ai_sessions/WORKLOG.md`
  - `docs/ai_sessions/README.md`

## Immutable Scope Summary

- In scope:
  - column context menu entry from the header row
  - column rename
  - move-left and move-right flows
  - add-column-left and add-column-right flows
  - delete-column flow
  - safe column type change flow
  - minimum checkbox/date/time column-setting toggles
- Out of scope:
  - selection model
  - inspector expansion
  - formatting helpers or persistence
  - checkbox automation behavior
  - sorting
  - clipboard
  - alerts engine or alert UX
  - column resize polish
  - direct header drag reorder
- Non-negotiable guardrails:
  - keep durable mutations in `documentStore`
  - keep conversion logic in helpers/store code, not UI event handlers
  - keep existing row/block/workspace behavior intact
  - do not embed the copy/paste prompt in this file

## Current Acceptance Bar

Review should only pass this checkpoint back to Main when:

- no blockers remain
- no scope-critical regression remains
- no required dispatch test gap remains
- no trivial low-effort cleanup remains that should still be done inside the checkpoint

## Main -> Dev

### Main Dispatch Summary

- checkpoint objective:
  - complete the first usable column-management UI pass without starting selection, inspector, formatting, sorting, clipboard, or alerts work
- intended ticket boundary:
  - `TICKET-037`
- required verification commands:
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
  - `npm run lint`
- artifact references the user prompt must mention:
  - `docs/ai_sessions/BUILDER_DISPATCH_CHECKPOINT_9_EPIC_07.md`
  - `docs/ai_sessions/DISPATCH_CHANNEL_CHECKPOINT_9_EPIC_07.md`

### Main Notes

- assumptions:
  - menu-based left/right reordering is the correct v1 column-mutation path
  - prompt-based or compact inline controls are acceptable for the minimum type-specific settings in this checkpoint
  - safe, predictable payload conversion is more important than preserving every incompatible prior cell value during type changes
- risks to watch:
  - corrupting existing row cell payloads during add/delete/type-change operations
  - introducing stale menu state or unsafe outside-click dismissal
  - coupling column mutation logic too tightly to UI components
  - accidentally drifting into selection or inspector work
- files likely to change:
  - `src/components/block/BlockColumnHeaderRow.tsx`
  - `src/components/block/BlockCard.tsx`
  - `src/stores/documentStore.ts`
  - `src/domain/columns/*`
  - `src/types/column.ts`
  - `src/tests/unit/*`

## Dev -> Review

### Implementation Summary

- completed tickets: `TICKET-037`
- exact files changed:
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
- store/api changes:
  - `uiStore`: added `columnMenu` state, `openColumnMenu`, `closeColumnMenu`
  - `documentStore`: added `renameColumn`, `moveColumnLeft`, `moveColumnRight`, `addColumnLeft`, `addColumnRight`, `deleteColumn`, `changeColumnType`, `updateColumnSettings`
- tests added or updated:
  - `uiStore.test.ts`: added column menu open/close test, updated settings-screen clearance test
  - `columnHelpers.test.ts`: added 10 new tests covering addColumn, deleteColumn, renameColumn, changeColumnType, moveColumnLeft/Right, updateColumnSettings
  - `documentStore.test.ts`: added comprehensive column mutation test covering rename, add, move, change type, settings update, and delete
  - `blockGridRender.test.tsx`: added assertions for column header test ids
  - `contextMenuDismissal.test.tsx`: added column menu backdrop dismissal test
- commands run and results:
  - `npm run typecheck`: pass
  - `npm run test`: pass (48 tests, 0 failures)
  - `npm run build`: pass
  - `npm run lint`: fail only in unrelated `.pi/extensions/todo-app-footer.ts`
- known gaps:
  - column menu UI interactions (rename inline, type picker, add picker) are rendered but not exercised through DOM interaction tests beyond backdrop dismissal
  - dropdown options editing is display-only in the menu; no mutation path for options yet
- intentionally deferred items:
  - selection model (`TICKET-039`)
  - inspector expansion
  - formatting helpers/persistence
  - checkbox automation behavior
  - sorting
  - clipboard
  - alerts
  - column resize polish
  - direct header drag reorder

### Dev Self-Check

- stayed inside dispatch scope: yes
- required commands run: yes
- shell/environment used for command execution: PowerShell
- was that the actual shell provided by the environment: yes
- for each command, exact result:
  - `npm run typecheck`: zero exit code, no output
  - `npm run test`: zero exit code, 48 tests passed
  - `npm run build`: zero exit code, Vite build completed
  - `npm run lint`: exit code 1, 3 errors in `.pi/extensions/todo-app-footer.ts` only
- if any command was skipped, exact blocker: none
- if any command failed, checkpoint-scoped or unrelated repo-state: `npm run lint` failed only in unrelated repo-state
- any unresolved warnings or oddities: React `act(...)` warnings persist in `rowEditing` tests from async autosave timing (pre-existing)

## Review -> Dev or Main

### Review Outcome

- status: `pass`
- reviewer summary: TICKET-037 implementation meets dispatch scope and guardrails. All durable mutations live in documentStore, conversion logic is in domain helpers, row payloads remain valid across mutations, boundary moves are safe, menu dismissal uses the established backdrop pattern, and existing block/row/typed-cell behavior is preserved.

### Findings

No actionable findings. Order by severity.

- none

### Verification Notes

- code paths reviewed:
  - `src/domain/columns/addColumn.ts`
  - `src/domain/columns/deleteColumn.ts`
  - `src/domain/columns/renameColumn.ts`
  - `src/domain/columns/changeColumnType.ts`
  - `src/domain/columns/moveColumn.ts`
  - `src/domain/columns/updateColumnSettings.ts`
  - `src/stores/documentStore.ts`
  - `src/stores/uiStore.ts`
  - `src/types/ui.ts`
  - `src/components/block/BlockColumnHeaderRow.tsx`
  - `src/components/block/BlockCard.tsx`
  - `src/components/block/ColumnContextMenu.tsx`
  - `src/components/layout/MainPane.tsx`
  - `src/tests/unit/columnHelpers.test.ts`
  - `src/tests/unit/documentStore.test.ts`
  - `src/tests/unit/contextMenuDismissal.test.tsx`
  - `src/tests/unit/uiStore.test.ts`
  - `src/tests/unit/blockGridRender.test.tsx`
- commands rerun by reviewer, if any: all four required commands rerun
- shell/environment used for command execution: PowerShell
- was that the actual shell provided by the environment: yes
- remaining risks:
  - column menu DOM interaction coverage is limited to backdrop dismissal; rename inline, type picker, and add picker are not exercised through DOM interaction tests
  - dropdown options editing is display-only in the menu with no mutation path yet
  - pre-existing React `act(...)` warnings persist in rowEditing tests from async autosave timing
- did reviewer run every required verification command: yes
- if not, what real blocker prevented it: n/a
- for each required command, exact result:
  - `npm run typecheck`: pass (zero exit code, no output)
  - `npm run test`: pass (48 tests, 0 failures)
  - `npm run build`: pass (zero exit code, Vite production build completed)
  - `npm run lint`: exit code 1, 3 errors only in unrelated `.pi/extensions/todo-app-footer.ts`
- if any command failed, checkpoint-scoped or unrelated repo-state: `npm run lint` failed only in unrelated repo-state
- were any React/jsdom controlled-input tests added or touched: no new controlled-input tests added in this checkpoint
- if yes, did those tests pass locally: n/a
- were any `attachEvent` / `detachEvent` / repeated `act(...)` warnings observed: repeated `act(...)` warnings from pre-existing rowEditing tests were observed; no `attachEvent`/`detachEvent` warnings

### Routing Decision

- next route: `Main`
- why: no blockers, no scope-critical regressions, no required test gaps that should be filled inside this checkpoint, and no trivial low-effort cleanup remains

### Review Boundaries

- review edited code: `no`
- if yes, why the normal read-only review boundary was broken: n/a

## Return To Main

- accepted tickets: `TICKET-037`
- accepted residual risks:
  - column menu DOM interaction tests are limited to backdrop dismissal
  - dropdown options editing has no mutation path yet
  - pre-existing `act(...)` warnings in rowEditing tests persist
- recommended next checkpoint: `TICKET-039` selection model
- session docs Main should update:
  - `docs/ai_sessions/HANDOFF.md`
  - `docs/ai_sessions/STATUS.md`
  - `docs/ai_sessions/WORKLOG.md`

## Change Log

- 2026-05-11:
  - owner: `Main`
  - update: `Created checkpoint 9 dispatch artifacts for the EPIC-07 column mutation pass and routed the checkpoint to Dev.`
- 2026-05-11:
  - owner: `Dev`
  - update: `Implemented TICKET-037 column context menu and mutation flows. All required commands pass except lint, which fails only in unrelated .pi/extensions/todo-app-footer.ts. Handed off to Review.`
- 2026-05-11:
  - owner: `Review`
  - update: `Reviewed TICKET-037, reran all required verification commands in PowerShell, found no actionable issues, and routed the checkpoint to Main.`
- 2026-05-11:
  - owner: `Main`
  - update: `Accepted and closed checkpoint 9 after verifying the dispatch channel, continuity docs, and review outcome.`
