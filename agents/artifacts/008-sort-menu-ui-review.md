# Review: TICKET-048 Sort Menu UI

## Verdict
PASS

## Summary
Reviewed the sort menu UI implementation against the dispatch, plan, and complete artifact. The store action routes through the existing `TICKET-047` helpers, updates `block.sort` metadata and row order atomically in a single `sort` history transaction, and the block header/menu UI exposes the supported sortable columns with Asc/Desc actions and a graceful empty state. Scope, tests, and verification all line up with the dispatch.

## Findings

### Store action — `documentStore.sortBlockRows`
- Validates upstream state (`settings`, workspace, block) and the target column via `isSortableColumn` from `src/domain/sorting/compareValues.ts`, returning `false` for missing/unsupported (e.g. `numbered`) columns without touching state or history.
- Builds a single `BlockSort` and uses `sortRowsByColumn(block.rows, block.columns, sort)` to compute the next rows — no comparator logic duplicated in the store.
- Updates `block.sort` and `rows` together and commits via `commitSnapshot(..., "sort", options)`, so exactly one undoable history entry of kind `sort` is recorded per applied change.
- No-op detection (`blockSortsEqual` AND `rowOrderStateEqual` both true) correctly skips redundant commits while still allowing metadata-only changes (e.g. setting bullet sort from `null`) to commit. `HistoryTransactionKind` already includes `"sort"` (`src/stores/historyStore.ts:4`).
- Row ids, cell payloads, and row/cell formats are preserved — `sortRowsByColumn` only reindexes `order`, and the store does not rewrite cell maps.

### UI — `BlockContextMenu` / `BlockCard` / `MainPane`
- Sortable choices come from `getVisibleColumnsInDisplayOrder(block.columns).filter(isSortableColumn)`, which keeps display order, drops hidden columns, and excludes unsupported `numbered` markers.
- Asc/Desc buttons share a single `SortButton` with active-state highlighting based on `block.sort`, and stable `data-testid` selectors (`sort-${block.id}-${column.id}-{asc|desc}` and `block-sort-section`).
- Empty state ("No sortable columns available.") renders when no sortable visible columns exist.
- `formatColumnLabel` falls back to type-named labels when a column has no label; the `numbered` case is unreachable in practice (filtered out) but keeps the switch exhaustive for TypeScript.
- A compact `Sort` header button in `BlockCard` opens the existing block menu at the click coordinates — reuses `onOpenMenu`, no new popover framework, and the original `Menu` button behavior is preserved.
- `MainPane` wires `sortBlockRows` to `onSort`, clears block editing state, and closes the block menu after a sort is requested. Other block menu actions (rename, collapse, move, delete) are unchanged.

### Tests
- Store tests in `src/tests/unit/documentStore.test.ts` cover: ascending sort with text column updates row order, normalizes `order`, sets `block.sort`, and produces a single undoable history entry with working undo/redo; cell values and cell/row formats are preserved; missing column ids and `numbered` columns return `false` and do not mutate state or history; metadata-only bullet sort commits the first time and the exact repeat is a no-op.
- UI tests in `src/tests/unit/blockGridRender.test.tsx` cover: the header `Sort` button renders, the `Sort by` section lists visible sortable columns in display order excluding `numbered`, and a numbered-only block renders the empty-state message.
- A JSDOM interaction test in `src/tests/unit/contextMenuDismissal.test.tsx` clicks the header `Sort` button, then a sort Asc action, and asserts row order, `block.sort` metadata, and that the block menu closes after the action.

### Scope
- No comparator semantics changed in `src/domain/sorting/`. No multi-column sorting, no live automatic resorting, no storage schema changes, no clipboard/shortcut/alert/packaging/inspector work. No new runtime dependencies.

## Notes
- The repeat-sort no-op detection compares `getRowsInDisplayOrder(block.rows)` (un-reindexed) against `sortRowsByColumn(...)` (reindexed). This is correct in practice for the cases this dispatch targets, because the store keeps row `order` contiguous (every mutation path reindexes), so the comparison resolves to a true equality after the first sort. Worth keeping in mind only if a future code path stops normalizing `order` values.
- The `Sort` header button visually looks like another `Menu` button and currently routes to the same popover. The plan explicitly permits this; users still reach sort choices from the header without new state complexity. A more distinct affordance is a separate UX dispatch if desired.
- Pre-existing React `act(...)` warnings still appear during the full test suite and are unrelated to this dispatch.

## Acceptance Criteria
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

## Verification Results

- command: `npm run typecheck`
- shell used: Bash via Claude harness on macOS/zsh environment
- result: PASS
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
- was this the actual shell provided by the environment: yes

- command: `npm run test`
- shell used: Bash via Claude harness on macOS/zsh environment
- result: PASS — 165/165 tests passed; pre-existing React `act(...)` warnings printed by unrelated UI tests
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed; warnings are unrelated pre-existing repo state
- was this the actual shell provided by the environment: yes

- command: `npm run build`
- shell used: Bash via Claude harness on macOS/zsh environment
- result: PASS
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
- was this the actual shell provided by the environment: yes

- command: `npm run lint`
- shell used: Bash via Claude harness on macOS/zsh environment
- result: PASS
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
- was this the actual shell provided by the environment: yes

## Recommendation
Ready for Main to close the dispatch, update phase status, commit, and push after confirming no post-review source/test/artifact/user-facing doc changes are made outside Main close bookkeeping.
