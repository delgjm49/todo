# Plan: TICKET-048 Sort Menu UI

## Overview
Implement the user-facing block sort control and route it through the existing `TICKET-047` sorting helpers. The work should add one document-store action that updates `block.sort` metadata and row `order` values together in a single `sort` history transaction, then expose that action from the block header/menu with a compact column/direction UI.

This dispatch should stay small: no comparator redesign, no multi-column sorting, no live automatic resorting after later cell edits, no storage schema changes, and no new menu/popover framework.

## Prerequisites
- `TICKET-047` helpers are available:
  - `isSortableColumn` in `src/domain/sorting/compareValues.ts`
  - `sortRowsByColumn` in `src/domain/sorting/sortRows.ts`
- `BlockSort` already exists in `src/types/block.ts`.
- `HistoryTransactionKind` already includes `"sort"` in `src/stores/historyStore.ts`.
- Current UI menu state is coordinated through `blockMenu` in `src/stores/uiStore.ts` and rendered by `src/components/layout/MainPane.tsx`.

## Files to Modify
| Action | Path | Description |
|--------|------|-------------|
| Modify | `src/stores/documentStore.ts` | Add `sortBlockRows(workspaceId, blockId, columnId, direction, options?)` and commit one `sort` history snapshot. |
| Modify | `src/components/block/BlockCard.tsx` | Add a compact header sort affordance or clearly route the existing header menu to the sort section. |
| Modify | `src/components/block/BlockContextMenu.tsx` | Add a `Sort by` section listing sortable visible columns with Asc/Desc actions and an empty state. |
| Modify | `src/components/layout/MainPane.tsx` | Wire `sortBlockRows` into the block menu and close the menu after applying a sort. |
| Modify | `src/tests/unit/documentStore.test.ts` | Add focused store tests for sort application, unsupported/missing columns, metadata, history, and payload preservation. |
| Modify | `src/tests/unit/blockGridRender.test.tsx` and/or add a small TSX unit test | Cover sort UI rendering/opening and triggering at least one direction. |
| Reference only | `src/domain/sorting/*` | Use these helpers; do not duplicate comparator logic in React. |

## Implementation Steps

### Step 1: Add the document-store action
- Extend `DocumentStoreState` in `src/stores/documentStore.ts` with:
  ```ts
  sortBlockRows: (
    workspaceId: WorkspaceId,
    blockId: BlockId,
    columnId: ColumnId,
    direction: BlockSort["direction"],
    options?: DocumentMutationOptions
  ) => boolean;
  ```
- Import `type { BlockSort }` if needed, plus `isSortableColumn` and `sortRowsByColumn`.
- Implementation pattern should match existing block/row mutations:
  1. Return `false` if document state is uninitialized, workspace/block is missing, column is missing, or `isSortableColumn(column)` is false.
  2. Build `const sort: BlockSort = { columnId, direction }`.
  3. Use `sortRowsByColumn(block.rows, block.columns, sort)` to produce the next rows.
  4. Return an updated block with both `sort` metadata and `rows` replaced.
  5. Commit exactly one snapshot via `commitSnapshot(..., "sort", options)`.
- A sort that only changes metadata is still valid and should commit. Example: sorting by a bullet column or applying a sort that leaves row order unchanged but changes `block.sort` from `null`/different metadata.
- If the requested sort metadata and resulting row order are both identical to the current block state, return `false` to avoid a no-op history entry.
- Do not change row ids, row formats, cell maps, cell payloads, block ids, column ids, or storage shapes.

### Step 2: Add the compact sort menu UI
- Prefer reusing the existing block context menu instead of adding global popover architecture.
- In `BlockContextMenu`, add a `Sort by` section before the move/delete sections.
- Compute displayed sort columns from visible columns in display order:
  ```ts
  getVisibleColumnsInDisplayOrder(block.columns).filter(isSortableColumn)
  ```
  This excludes `numbered` and hidden columns while keeping the same ordering users see in the grid.
- For each sortable column, render:
  - a readable label using `column.label.trim()` when present;
  - a fallback label for unlabeled marker/checkbox columns such as `Checkbox`, `Bullet`, `Date`, `Time`, `Dropdown`, or `Text`;
  - two small actions: `Asc` and `Desc`.
- Highlight or annotate the currently active `block.sort` direction for that column when possible, but keep this simple.
- If no sortable visible columns exist, render a clear disabled/empty state like `No sortable columns available.`.
- Add stable test selectors where useful, for example:
  - `data-testid="block-sort-section"`
  - `data-testid={`sort-${block.id}-${column.id}-asc`}`
  - `data-testid={`sort-${block.id}-${column.id}-desc`}`
- Add an explicit header `Sort` button in `BlockCard` if it can be done without adding state complexity. It may open the existing block menu at the click coordinates, as long as the sort choices are reachable from the block header. Keep the existing `Menu` button behavior intact.

### Step 3: Wire the menu in `MainPane`
- Select `sortBlockRows` from `useDocumentStore`.
- Pass an `onSort(columnId, direction)` callback to `BlockContextMenu`.
- On sort action:
  1. call `sortBlockRows(activeBlockMenuBlock.workspaceId, activeBlockMenuBlock.id, columnId, direction)`;
  2. clear block editing state if needed;
  3. close the block menu.
- Preserve existing rename, collapse, move, delete, add row, drag, selection, and column context menu behavior.

### Step 4: Store tests
- Extend `src/tests/unit/documentStore.test.ts` with targeted tests after row sorting/domain-related coverage.
- Cover at least:
  - Applying ascending and descending sorts updates displayed row order and normalizes row `order` values.
  - `block.sort` is updated to `{ columnId, direction }`.
  - One undoable history entry is created with `canUndo === true`; undo restores the previous row order and previous `block.sort`, redo reapplies it.
  - Missing columns and `numbered` columns return `false` and do not create history entries.
  - Row ids, row formats, cell values, and cell formats are preserved.
  - Applying a metadata-changing no-op sort (for example bullet when `block.sort` was null) still commits metadata if Dev keeps bullet in the visible sortable list.
- Use the existing memory storage service pattern and short autosave delay where tests need save integration.

### Step 5: UI tests
- Add or extend TSX unit coverage using existing project patterns (`renderToStaticMarkup` for static structure or JSDOM + `act`/events for interactions).
- Cover at least:
  - The block menu renders a `Sort by` section with visible sortable columns in display order and excludes a `numbered` column.
  - A no-sortable-columns block renders the disabled/empty state.
  - Opening the block menu from the block header/menu and clicking an Asc/Desc sort action calls the store action and updates row display order.
- Keep tests local and deterministic; no Playwright requirement for this dispatch unless Dev finds an existing e2e flow that is trivial to extend.

## Data / Storage Changes
None.

- Use existing `BlockSort` metadata.
- Do not add migrations or schema fields.
- Do not alter persisted row/cell/column payload formats.

## Out of Scope
- Comparator semantics beyond small integration fixes required to consume `TICKET-047` helpers.
- Multi-column sorting.
- Live automatic resorting on every later cell edit.
- Sort clearing/reset UI unless Dev finds it simpler than expected; not required for acceptance.
- Clipboard, shortcuts, alerts, packaging, column resizing, row drag/drop redesign, or inspector type-specific settings.
- New menu primitives or external runtime dependencies.

## Acceptance Criteria
- [ ] A user can open a sort control from a block header/menu.
- [ ] The sort control lists visible sortable columns in display order and excludes unsupported `numbered` columns.
- [ ] Blocks with no sortable visible columns show a clear disabled/empty state.
- [ ] The user can apply ascending and descending sorts.
- [ ] Applying a sort updates row display order immediately using `sortRowsByColumn`.
- [ ] Applying a sort updates `block.sort` metadata and records one undoable history transaction of kind `sort`.
- [ ] Missing/unsupported sort requests return `false` without mutating document state or history.
- [ ] Row ids, cell payloads, and formats are preserved; only row `order` values and `block.sort` change.
- [ ] Focused store and UI tests cover the new behavior.
- [ ] Verification passes: `npm run typecheck`, `npm run test`, `npm run build`, and `npm run lint`.

## Estimated Complexity
- Small to medium.
- Expected file count: 4 source files plus 2 test files.
