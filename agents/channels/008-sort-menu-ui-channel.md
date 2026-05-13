# Dispatch Channel: TICKET-048 Sort Menu UI

## Summary
- Dispatch: agents/artifacts/008-sort-menu-ui-dispatch.md
- Current status: closed
- Created by: Main
- Created: 2026-05-13

## Message 1 — Main → Plan — 2026-05-13

### To
Plan

### State
ready-for-plan

### Read
- agents/artifacts/008-sort-menu-ui-dispatch.md
- agents/artifacts/007-block-row-sorting-domain-logic-dispatch.md
- agents/artifacts/007-block-row-sorting-domain-logic-complete.md
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md
- docs/TODO_APP_TECH_SPEC.md
- docs/TODO_APP_UI_SPEC.md
- src/types/block.ts
- src/types/column.ts
- src/types/row.ts
- src/domain/sorting/compareValues.ts
- src/domain/sorting/sortRows.ts
- src/domain/columns/createColumn.ts
- src/stores/documentStore.ts
- src/stores/uiStore.ts
- src/types/ui.ts
- src/components/block/BlockCard.tsx
- src/components/block/BlockContextMenu.tsx
- src/components/layout/MainPane.tsx
- src/tests/unit/blockRowSorting.test.ts
- src/tests/unit/documentStore.test.ts
- src/tests/unit/blockGridRender.test.tsx

### Task
Create the implementation plan for `TICKET-048` sort menu UI. Focus on routing block-level sort actions through the existing `TICKET-047` domain helpers, adding a small block header/menu sort UI, updating block sort metadata and row order with one history transaction, and adding focused store/UI tests. Keep comparator redesign, multi-column sorting, live automatic resorting, clipboard, shortcuts, alerts, packaging, and inspector type-specific settings out of scope. Write the plan to `agents/artifacts/008-sort-menu-ui-plan.md`.

### Close Requirements
- Append the next message to this channel for Dev.
- Update `docs/SESSIONS.md`.
- Do not commit; Main handles git.

## Message 2 — Plan → Dev — 2026-05-13

### To
Dev

### State
ready-for-dev

### Read
- agents/artifacts/008-sort-menu-ui-dispatch.md
- agents/artifacts/008-sort-menu-ui-plan.md
- agents/artifacts/007-block-row-sorting-domain-logic-complete.md
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md
- docs/TODO_APP_TECH_SPEC.md
- docs/TODO_APP_UI_SPEC.md
- src/types/block.ts
- src/types/column.ts
- src/types/row.ts
- src/domain/sorting/compareValues.ts
- src/domain/sorting/sortRows.ts
- src/domain/columns/createColumn.ts
- src/stores/documentStore.ts
- src/stores/historyStore.ts
- src/stores/uiStore.ts
- src/types/ui.ts
- src/components/block/BlockCard.tsx
- src/components/block/BlockContextMenu.tsx
- src/components/layout/MainPane.tsx
- src/tests/unit/blockRowSorting.test.ts
- src/tests/unit/documentStore.test.ts
- src/tests/unit/blockGridRender.test.tsx
- src/tests/unit/contextMenuDismissal.test.tsx

### Task
Implement the plan for `TICKET-048` sort menu UI. Add a focused `documentStore.sortBlockRows()` action that validates sortable columns, uses the existing `TICKET-047` sorting helpers, updates `block.sort` and row `order` values together, and commits one history transaction of kind `sort`. Add a compact block header/menu sort UI that lists visible sortable columns in display order, excludes unsupported `numbered` columns, supports Asc/Desc actions, and handles no-sortable-column blocks gracefully. Add focused store/UI tests. Keep comparator redesign, multi-column sorting, live automatic resorting, storage schema changes, clipboard, shortcuts, alerts, packaging, and inspector type-specific settings out of scope. Write the complete artifact to `agents/artifacts/008-sort-menu-ui-complete.md`.

### Close Requirements
- Run `npm run typecheck`, `npm run test`, `npm run build`, and `npm run lint`.
- Write/update `agents/artifacts/008-sort-menu-ui-complete.md` with implementation notes and verification results.
- Append the next message to this channel for Review.
- Update `docs/SESSIONS.md`.
- Do not commit; Main handles git.

## Message 3 — Dev → Review — 2026-05-13

### To
Review

### State
ready-for-review

### Read
- agents/artifacts/008-sort-menu-ui-dispatch.md
- agents/artifacts/008-sort-menu-ui-plan.md
- agents/artifacts/008-sort-menu-ui-complete.md
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md
- docs/TODO_APP_TECH_SPEC.md
- docs/TODO_APP_UI_SPEC.md
- src/types/block.ts
- src/types/column.ts
- src/types/row.ts
- src/domain/sorting/compareValues.ts
- src/domain/sorting/sortRows.ts
- src/domain/columns/createColumn.ts
- src/stores/documentStore.ts
- src/stores/historyStore.ts
- src/stores/uiStore.ts
- src/types/ui.ts
- src/components/block/BlockCard.tsx
- src/components/block/BlockContextMenu.tsx
- src/components/layout/MainPane.tsx
- src/tests/unit/blockRowSorting.test.ts
- src/tests/unit/documentStore.test.ts
- src/tests/unit/blockGridRender.test.tsx
- src/tests/unit/contextMenuDismissal.test.tsx

### Task
Review the `TICKET-048` sort menu UI implementation against the dispatch, plan, and complete artifact. Verify the store action routes through existing sorting helpers, validates unsupported/missing columns, updates `block.sort` and row order in a single `sort` history transaction, preserves row/cell payloads and formats, and avoids no-op history entries. Verify the block header/menu UI lists visible sortable columns in display order, excludes `numbered` columns, handles no-sortable-column blocks gracefully, and closes the menu after sort actions. Confirm focused store/UI tests and full verification results.

### Close Requirements
- Write `agents/artifacts/008-sort-menu-ui-review.md` with verdict, findings, and verification notes.
- Append the next message to this channel based on the review verdict.
- Update `docs/SESSIONS.md`.
- Do not commit; Main handles git.

## Message 4 — Review → Main — 2026-05-13

### To
Main

### State
review-pass

### Read
- agents/channels/008-sort-menu-ui-channel.md
- agents/artifacts/008-sort-menu-ui-dispatch.md
- agents/artifacts/008-sort-menu-ui-plan.md
- agents/artifacts/008-sort-menu-ui-complete.md
- agents/artifacts/008-sort-menu-ui-review.md

### Task
Close the `TICKET-048` sort menu UI dispatch. Review verdict is PASS: the store action routes through existing `TICKET-047` helpers, updates `block.sort` and row order in one `sort` history transaction, rejects missing/unsupported columns without mutating state, and preserves row ids and cell payloads/formats. The block header/menu UI lists visible sortable columns in display order, excludes `numbered` columns, renders an empty state when no sortable columns are available, and closes the menu after a sort is requested. Focused store and UI tests cover the new behavior, and `npm run typecheck`, `npm run test` (165/165), `npm run build`, and `npm run lint` all pass.

### Close Requirements
- Update `docs/SESSIONS.md` and phase status for `TICKET-048`.
- Commit and push the cycle (artifacts, channel messages, source/test changes).
- Provide the next pickup instruction.
- Confirm no post-review source/test/artifact/user-facing doc changes outside Main close bookkeeping; otherwise append `Main → Review` with `State = ready-for-re-review`.
