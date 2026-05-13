# Complete: TICKET-048 Sort Menu UI

## Summary
Implemented the block sort menu UI and store integration for `TICKET-048`.

- Added `documentStore.sortBlockRows()` to validate sortable columns, apply existing `TICKET-047` helpers, update `block.sort`, reindex row order, and commit one `sort` history transaction.
- Added a compact block header `Sort` affordance that opens the existing block menu.
- Added a `Sort by` section to the block context menu listing visible sortable columns in display order, excluding `numbered` columns, with Asc/Desc actions and a no-sortable-columns empty state.
- Wired sort actions through `MainPane`, closing the menu after a sort is requested.
- Added focused store and UI tests for sort application, invalid sort requests, metadata-only stable sorts, menu rendering, empty state, and a header/menu-triggered sort interaction.

## Files Changed
- `src/stores/documentStore.ts`
- `src/components/block/BlockCard.tsx`
- `src/components/block/BlockContextMenu.tsx`
- `src/components/layout/MainPane.tsx`
- `src/tests/unit/documentStore.test.ts`
- `src/tests/unit/blockGridRender.test.tsx`
- `src/tests/unit/contextMenuDismissal.test.tsx`

## Implementation Notes
- `sortBlockRows(workspaceId, blockId, columnId, direction, options?)` returns `false` when document state, workspace, block, column, or sortable-column validation fails.
- Valid sorts use `sortRowsByColumn(block.rows, block.columns, sort)` and `isSortableColumn()` from `src/domain/sorting/` rather than duplicating comparator logic.
- A requested sort commits only when sort metadata changes or row order state changes. Exact repeat no-ops return `false` and do not create an extra history entry.
- Bullet marker sorts remain valid: they are stable row-order no-ops but commit when they change `block.sort` metadata.
- The menu derives choices from `getVisibleColumnsInDisplayOrder(block.columns).filter(isSortableColumn)`, so hidden columns and `numbered` marker columns are not offered.
- Row ids, row formatting, cell values, and cell formatting are preserved; sort only updates `block.sort` and row `order` state.

## Verification Results

- command: `npm run typecheck`
- shell used: Bash via pi harness on macOS/zsh environment
- result: PASS
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
- was this the actual shell provided by the environment: yes

- command: `npm run test`
- shell used: Bash via pi harness on macOS/zsh environment
- result: PASS — 165/165 tests passed; existing React `act(...)` warnings were printed by pre-existing UI test patterns
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
- was this the actual shell provided by the environment: yes

- command: `npm run build`
- shell used: Bash via pi harness on macOS/zsh environment
- result: PASS
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
- was this the actual shell provided by the environment: yes

- command: `npm run lint`
- shell used: Bash via pi harness on macOS/zsh environment
- result: PASS
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
- was this the actual shell provided by the environment: yes

## Acceptance Criteria Status
- [x] A user can open a sort control from a block header/menu.
- [x] The sort control lists visible sortable columns in display order and excludes unsupported `numbered` columns.
- [x] Blocks with no sortable visible columns show a clear disabled/empty state.
- [x] The user can apply ascending and descending sorts.
- [x] Applying a sort updates row display order immediately using `sortRowsByColumn`.
- [x] Applying a sort updates `block.sort` metadata and records one undoable history transaction of kind `sort`.
- [x] Missing/unsupported sort requests return `false` without mutating document state or history.
- [x] Row ids, cell payloads, and formats are preserved; only row `order` values and `block.sort` change.
- [x] Focused store and UI tests cover the new behavior.
- [x] Verification passes: `npm run typecheck`, `npm run test`, `npm run build`, and `npm run lint`.
