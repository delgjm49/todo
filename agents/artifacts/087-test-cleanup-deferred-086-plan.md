# Plan: Test cleanup for deferred 086 items

## Overview
Add the three deferred low-severity test assertions from dispatch 086 without changing production behavior, storage schemas, or UI implementation. The Dev work should be limited to the three named test files; the deferred ledger status update is a post-review closeout action because the dispatch explicitly says to mark those entries done after review-pass.

## Verified Current-State Facts
- `agents/channels/087-test-cleanup-deferred-086/messages/001-main-to-plan.md` is addressed to Plan with `State = ready-for-plan` and requests this plan artifact plus `002-plan-to-dev.md`.
- `agents/artifacts/087-test-cleanup-deferred-086-dispatch.md` scopes exactly three test additions: one integration test in `src/tests/integration/rowCellEditing.integration.test.ts`, one template default assertion in `src/tests/unit/blockTemplates.test.ts`, and one rendering test in `src/tests/unit/rowEditing.test.tsx`.
- `agents/DEFERRED.md` currently has three `[open]` entries from 086 matching those test gaps: checkbox hide/show integration flow, explicit `createBlockTemplate` `hideCompletedRows: false` assertion, and RowView/rendered UI filtering.
- `agents/workflows/deferred-protocol.md` states Dev is intentionally not ledger-aware and that promoted deferred items become `[done]` when the dispatch closes; therefore Dev should not mark these 086 entries `[done]` before Review passes.
- `src/tests/integration/rowCellEditing.integration.test.ts` uses the Node test runner, initializes the real storage integration harness in `beforeEach`, and already has helpers `getActiveWorkspaceId`, `getStarterBlockInfo`, `flushAutosave`, and `reloadFromBackend` for store-level round-trip tests. It currently has checkbox persistence and row reorder tests but no `hideCompletedRows` visibility/filter assertion.
- `src/tests/unit/blockTemplates.test.ts` already creates checklist, bulleted, and numbered template blocks in `creates checklist, bullet, and numbered block payloads with valid default columns`; it asserts default columns/cells but not `hideCompletedRows`.
- `src/tests/unit/rowEditing.test.tsx` renders `<MainPane />` under JSDOM via `renderMainPane()` and sets `useDocumentStore`/`useUiStore` directly per test. It already has `marks strikeout-enabled checked rows as completed`, which builds a completed checklist row and asserts `data-completed="true"` plus `line-through`, but it has no hidden-row rendering test.
- `src/components/row/RowView.tsx` derives `orderedRows` with `getRowsInDisplayOrder(block.rows)` and then derives rendered `rows` with `filterCompletedRows(orderedRows, block.columns, block.hideCompletedRows)`. When `rows.length === 0 && block.hideCompletedRows && orderedRows.length > 0`, it renders the empty-state text `All completed rows are hidden...` instead of mapping `SortableRow` elements.
- `src/domain/rows/completedRowFilter.ts` exports `filterCompletedRows(rows, columns, hideCompletedRows)` and filters out rows completed by `isRowCompletedByCheckbox` only when `hideCompletedRows` is `true`.
- `src/domain/templates/blockTemplates.ts` currently returns `hideCompletedRows: false` from `createBlockTemplate(...)`, and basic checklist checkbox columns default `strikeoutRowWhenChecked: true`.
- `package.json` defines `npm run test` as `npm run test:build && node --experimental-specifier-resolution=node scripts/run-tests.mjs`, covering the repository's Node-based unit and integration tests.

## Prerequisites
- Work from the current on-disk files; do not rely on dispatch 086 memory beyond the referenced artifacts and ledger entries.
- Do not modify production source, schemas, specs, dependencies, or UI behavior for this dispatch.
- Do not update `agents/DEFERRED.md` during Dev unless Main explicitly reroutes and changes the sequencing. Per the dispatch wording and deferred protocol, mark the three entries `[done]` only after Review returns `review-pass`.

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Modify | `src/tests/integration/rowCellEditing.integration.test.ts` | Add a store/integration test proving a strikeout-enabled checked row is hidden by `hideCompletedRows` and becomes visible again when unchecked. |
| Modify | `src/tests/unit/blockTemplates.test.ts` | Add explicit assertions that `createBlockTemplate(...)` returns `hideCompletedRows: false` by default. |
| Modify | `src/tests/unit/rowEditing.test.tsx` | Add a JSDOM rendering test that a completed row is absent when its block has `hideCompletedRows: true`. |
| Later/Main closeout | `agents/DEFERRED.md` | After Review returns `review-pass`, mark the three 086 entries `[done]` with a resolved note for dispatch 087. This is not a Dev implementation step. |

## Implementation Steps

### Step 1: Add the integration visibility round-trip test
- File: `src/tests/integration/rowCellEditing.integration.test.ts`
- Import `filterCompletedRows` from `../../domain/rows/completedRowFilter.js`.
- Add a test near the existing checkbox tests, e.g. `checkbox toggle hides and reveals completed rows when hideCompletedRows is enabled`.
- Use the existing `getActiveWorkspaceId()` and `getStarterBlockInfo(wsId)` helpers to get `blockId`, `checkboxColumnId`, and `starterRowId` from the starter checklist.
- Enable the block preference with `useDocumentStore.getState().toggleBlockHideCompletedRows(wsId, blockId)` and assert it returned `true` and the block now has `hideCompletedRows === true`.
- Before checking the row, derive visible rows with `filterCompletedRows(block.rows, block.columns, block.hideCompletedRows)` and assert the starter row is visible.
- Toggle the checkbox on with `toggleCheckboxCellValue(wsId, blockId, starterRowId, checkboxColumnId)`, then assert the row cell value is `true` and `filterCompletedRows(...)` no longer includes `starterRowId`.
- Toggle the same checkbox off by ID with `toggleCheckboxCellValue(...)`, then assert the row cell value is `false` and `filterCompletedRows(...)` includes `starterRowId` again.
- Keep the test store-level, consistent with the rest of this integration file; do not render React UI here.
- **Verify**: The new test fails if the filter call ignores `hideCompletedRows` or if checkbox completion is not connected to the strikeout-enabled checkbox predicate.

### Step 2: Add explicit template default assertions
- File: `src/tests/unit/blockTemplates.test.ts`
- In the existing `creates checklist, bullet, and numbered block payloads with valid default columns` test, add assertions after creating `checklist`, `bulletList`, and `numberedList`:
  - `assert.equal(checklist.hideCompletedRows, false);`
  - `assert.equal(bulletList.hideCompletedRows, false);`
  - `assert.equal(numberedList.hideCompletedRows, false);`
- If Dev prefers a separate small test, keep it in the same file and call `createBlockTemplate` directly; do not add new fixtures or dependencies.
- **Verify**: The unit test fails if any template begins defaulting `hideCompletedRows` to `true` or leaves it undefined.

### Step 3: Add the rendered UI hidden-row test
- File: `src/tests/unit/rowEditing.test.tsx`
- Add a test near `marks strikeout-enabled checked rows as completed`, because it already demonstrates the completed-row fixture pattern.
- Build a basic checklist block with `createBlockTemplate("basic_checklist", "ws_home", { blockId: "block_home", title: "Today", order: 0 })`.
- Capture `rowId` and the checkbox column id, asserting both exist.
- Create a `completedHiddenBlock: Block` that:
  - spreads the template block,
  - sets `hideCompletedRows: true`,
  - ensures the checkbox column has `settings: { strikeoutRowWhenChecked: true, moveCheckedRowsToBottom: false }`, and
  - sets the row's checkbox cell to `{ value: true, format: {} }`.
- Set `useDocumentStore` state using the same workspace/settings shape as nearby row editing UI tests, with `workspacesById.ws_home.blocks: [completedHiddenBlock]` and `activeWorkspaceId: "ws_home"`.
- Call `await renderMainPane()`.
- Assert `document.querySelector(`[data-testid="row-${rowId}"]`)` is `null`.
- Also assert the empty-state guidance is present, for example by checking `document.body.textContent?.includes("All completed rows are hidden") === true`.
- **Verify**: The test fails if `RowView` renders completed rows despite `hideCompletedRows: true`, or if it renders neither the row nor the hidden-all empty state.

### Step 4: Keep the deferred ledger for post-review closeout
- File: `agents/DEFERRED.md`
- Do not change this file in Dev. The three entries should remain `[open]` while the work is awaiting Review.
- In the Dev complete artifact, mention that the ledger remains open by protocol until review-pass.
- After Review passes, Main should mark these exact entries `[done]` and add a `Resolved: 2026-06-08 by dispatch 087 (...)` note.
- **Verify**: Review/Main can confirm no premature ledger close occurred and the final closeout updates all three entries.

### Step 5: Run verification
- Run `npm run test` in the actual shell provided by the environment.
- If feasible and quick, Dev may also run `npm run lint`, but `npm run test` is the required verification for the test-only scope.
- Report commands in `agents/artifacts/087-test-cleanup-deferred-086-complete.md` using the verification format from `agents/CLOSING.md` / `agents/ARTIFACTS.md`.
- If existing unrelated failures appear, capture exact failure surfaces and classify them as unrelated only with evidence.

## Data / Storage / Schema Changes
None. This dispatch must not alter JSON shapes, storage normalization, schema versions, migrations, or persisted data behavior.

## UI Specifications
No UI behavior or styling changes. The rendered UI test should assert existing behavior: completed rows are not rendered by `RowView` when `block.hideCompletedRows` is `true`, and the existing hidden-all empty-state text appears when every row is hidden.

## Assumptions / Hypotheses
- Assumption: `toggleBlockHideCompletedRows` is available on `useDocumentStore` in the integration test context; this is supported by current grep results and existing tests, but Dev should use the exact store action signature from TypeScript if it differs.
- Assumption: `npm run test` is sufficient for the dispatch acceptance item "Full test suite (unit + integration)" because `package.json` wires it to compile and run the repository's Node unit/integration tests.

## Acceptance Criteria
- [ ] `src/tests/integration/rowCellEditing.integration.test.ts` includes a test where `hideCompletedRows: true` plus a strikeout-enabled checked checkbox hides the row, and unchecking reveals it again.
- [ ] `src/tests/unit/blockTemplates.test.ts` explicitly asserts `createBlockTemplate(...).hideCompletedRows === false` for template defaults.
- [ ] `src/tests/unit/rowEditing.test.tsx` renders a completed block with `hideCompletedRows: true` and confirms the completed row is absent from the DOM.
- [ ] No production source, storage schema, dependency, or UI implementation file is changed.
- [ ] `npm run test` is run and results are recorded in the complete artifact.
- [ ] After Review returns `review-pass`, Main marks the three 086 entries in `agents/DEFERRED.md` as `[done]` for dispatch 087.

## Estimated Complexity
- Small.
- Expected Dev file count before Review/Main closeout: 3 test files plus the Dev complete artifact and channel message.
