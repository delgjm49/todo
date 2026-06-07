# Plan: Hide Completed Rows

## Overview
Implement a per-block, non-destructive "hide completed rows" preference derived from the existing checkbox completion predicate. The only persisted data change is a backward-compatible `Block.hideCompletedRows: boolean` preference that defaults to `false`; no row lifecycle/archive state is introduced.

## Verified Current-State Facts
- `agents/channels/086-hide-completed-rows/messages/001-main-to-plan.md` is addressed to Plan with `State = ready-for-plan` and instructs Plan to scope exactly to the derived hide-completed-rows filter and preference.
- `agents/artifacts/086-hide-completed-rows-dispatch.md` requires `Block.hideCompletedRows`, derived row-list filtering, a block/workspace settings toggle or minimal toggle, normal storage persistence, tests, and no row archive lifecycle/data-model changes.
- Dispatch 084 was reviewed as PASS in `agents/artifacts/084-archive-completed-views-planning-review.md`; the reviewed recommendation is a derived completed-row filter with one backward-compatible persisted block preference, `Block.hideCompletedRows: boolean`, and no persisted row lifecycle/archive state.
- `src/types/block.ts` currently defines `Block` with `id`, `workspaceId`, `title`, `blockType`, `order`, `collapsed`, `border`, `sort`, `format`, `columns`, and `rows`; it does not yet define `hideCompletedRows`.
- `src/domain/rows/applyCheckboxRules.ts` currently defines `isRowCompletedByCheckbox(columns, row)` as true when any checkbox column has `settings.strikeoutRowWhenChecked === true` and that row's cell for that column has `value === true`.
- `src/domain/rows/reorderRows.ts` currently provides `getRowsInDisplayOrder(rows)` as a stable order clone by `row.order`; insert/delete/reorder helpers reindex stored row order.
- `src/components/row/RowView.tsx` currently renders every row from `getRowsInDisplayOrder(block.rows)`, computes `completed` per row with `isRowCompletedByCheckbox(block.columns, row)`, sets `data-completed="true"`, and applies the line-through class to completed row cells.
- `src/components/block/BlockCard.tsx` currently renders the block header controls `Sort`, `+ Row`, `Expand/Collapse`, and `Menu`, then renders `RowView` when the block is not collapsed. There is no hide-completed toggle today.
- `src/components/block/BlockContextMenu.tsx` currently exposes Rename, Collapse/Expand, Move to workspace, and Delete block actions; it has no hide-completed menu item.
- `src/components/layout/MainPane.tsx` currently wires `toggleBlockCollapsed`, `appendRowToBlock`, `sortBlockRows`, block menu actions, column menu actions, row clipboard actions, and block selection into `BlockCard`/`BlockContextMenu`.
- `src/stores/documentStore.ts` currently exposes `toggleBlockCollapsed` and many block/row actions through `DocumentStoreState`; mutations build a snapshot and call `commitSnapshot`, which marks dirty and schedules autosave. There is no hide-completed action.
- `src/services/storage/storageSchemas.ts` currently normalizes blocks through `normalizeBlock`; it returns fixed block fields and defaults `collapsed` with `toBoolean(rawValue.collapsed, false)`. Unknown fields are not preserved unless explicitly added to the normalized output.
- `src/domain/templates/blockTemplates.ts` and `src/services/storage/bootstrapData.ts` create default blocks with `collapsed: false`, `sort: null`, `format: {}`, columns, and rows; they do not yet set `hideCompletedRows`.
- `src/components/layout/TypeSpecificColumnSettings.tsx` and `src/components/block/ColumnContextMenu.tsx` expose checkbox-column settings for `Strikeout when checked` and `Move checked to bottom`; these are column settings, not block preference surfaces.
- `docs/TODO_APP_UI_SPEC.md` says block headers contain collapse/title/sort/add-row/actions controls, block context menus include block actions, and completed rows may be struck through/moved to bottom when enabled by checkbox settings.
- `src/domain/search/searchDocuments.ts` searches all rows from `getRowsInDisplayOrder(block.rows)` and text/date/time/dropdown values; it does not know about row visibility filters. This should remain unchanged for this dispatch.
- `src/domain/clipboard/mapPastedRows.ts` preserves compatible source checkbox values during paste; pasted checked rows can therefore be completed immediately if target columns match. This dispatch should not change clipboard mapping semantics.
- Existing tests provide nearby coverage: `src/tests/unit/checkboxAutomation.test.ts` covers completion detection and auto-move; `src/tests/unit/rowEditing.test.tsx` verifies checked strikeout rows render with `data-completed` and line-through; `src/tests/unit/blockGridRender.test.tsx` statically renders `BlockCard`; `src/tests/unit/documentStore.test.ts` covers block mutations/autosave/undo patterns; `src/tests/integration/saveLoadRoundtrip.integration.test.ts` covers persisted block/column metadata round-trips; `src/tests/integration/rowCellEditing.integration.test.ts` covers checkbox toggles and auto-move across reload; `src/tests/unit/rowClipboard.test.ts` covers compatible checkbox value preservation.
- Many tests construct `Block` fixtures directly (for example `src/tests/unit/blockGridRender.test.tsx`, `src/tests/unit/rowClipboard.test.ts`, `src/tests/unit/searchDocuments.test.ts`, `src/tests/unit/alertEvaluation.test.ts`, and alert/navigation/scheduler fixtures). Adding a required `Block.hideCompletedRows` property will require updating direct fixtures or fixture helpers.

## Prerequisites
- Keep scope to a derived view filter plus the persisted block preference. Do not add `Row.archived`, `Row.archivedAt`, hidden row state, deletion lifecycle, archive views, or schema-version migrations.
- If implementation discovers an existing hide-completed feature or a scope-affecting mismatch, stop and route to Main rather than expanding scope.

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Modify | `src/types/block.ts` | Add `hideCompletedRows: boolean` to `Block`. |
| Modify | `src/domain/templates/blockTemplates.ts` | Default new blocks to `hideCompletedRows: false`. |
| Modify | `src/services/storage/storageSchemas.ts` | Normalize/persist `hideCompletedRows` with default `false`; no schema version bump. |
| Modify | `src/stores/documentStore.ts` | Add store action for toggling the block preference through snapshot/history/autosave. |
| Create | `src/domain/rows/completedRowFilter.ts` | Pure derived filter/count helpers using `isRowCompletedByCheckbox`. |
| Modify | `src/components/row/RowView.tsx` | Render only visible rows when the preference is true; show a small empty/hidden-completed message if all rows are hidden. |
| Modify | `src/components/block/BlockCard.tsx` | Add accessible header toggle near existing block controls and wire callback prop. |
| Modify | `src/components/block/BlockContextMenu.tsx` | Add a block-menu toggle item so the preference is available from block actions/settings surface. |
| Modify | `src/components/layout/MainPane.tsx` | Select the new store action and wire it to `BlockCard` and `BlockContextMenu`. |
| Modify | `src/tests/unit/checkboxAutomation.test.ts` | Add pure filter/count coverage or move/add equivalent tests for the new helper. |
| Create/Modify | `src/tests/unit/completedRowFilter.test.ts` | Preferred location for pure helper tests if not added to `checkboxAutomation.test.ts`. |
| Modify | `src/tests/unit/documentStore.test.ts` | Cover toggle action, dirty/autosave/history behavior, and undo/redo of the preference. |
| Modify | `src/tests/unit/storage.test.ts` | Cover normalize default `false`, persisted `true`, invalid value fallback, and no schema-version bump. |
| Modify | `src/tests/integration/saveLoadRoundtrip.integration.test.ts` | Cover `hideCompletedRows: true` surviving save/reload. |
| Modify | `src/tests/unit/blockTemplates.test.ts` | Assert new templates default `hideCompletedRows` to `false`. |
| Modify | `src/tests/unit/blockGridRender.test.tsx` and/or `src/tests/unit/rowEditing.test.tsx` | Cover header/menu toggle rendering and row filtering in rendered UI. |
| Modify | `src/tests/integration/rowCellEditing.integration.test.ts` | Cover checking a strikeout-enabled checkbox hides the row when the block preference is on, and unchecking reveals it. |
| Modify as needed | Existing direct `Block` test fixtures under `src/tests/**` | Add `hideCompletedRows: false` to direct fixtures or central helper defaults so typecheck passes. |
| Modify | `docs/SESSIONS_PENDING.md` | Dev session entry at close. |
| Create | `agents/artifacts/086-hide-completed-rows-complete.md` | Dev completion artifact. |
| Create | `agents/channels/086-hide-completed-rows/messages/003-dev-to-review.md` | Dev handoff with `State = ready-for-review`. |

## Implementation Steps

### Step 1: Add the block preference to type and defaults
- In `src/types/block.ts`, add `hideCompletedRows: boolean` to `Block` near `collapsed` or other block preferences.
- In `src/domain/templates/blockTemplates.ts`, set `hideCompletedRows: false` in the object returned by `createBlockTemplate`.
- Confirm `src/services/storage/bootstrapData.ts` inherits the default via `createBlockTemplate`; no separate default should be necessary unless typecheck shows another direct object.
- Update direct test fixtures and helper builders that return `Block` so they include `hideCompletedRows: false` unless a test is explicitly exercising `true`.
- **Verify:** `npm run test:build` should no longer report missing `hideCompletedRows` on `Block` fixtures after this step.

### Step 2: Persist and normalize the preference
- In `src/services/storage/storageSchemas.ts`, update `normalizeBlock` to include `hideCompletedRows: toBoolean(rawValue.hideCompletedRows, false)` in the returned `Block`.
- Do not change `STORAGE_SCHEMA_VERSION`; this is a backward-compatible optional boolean preference with default `false`.
- Confirm `createPersistedWorkspaceFile` / `coerceWorkspaceForSave` continue to save the field because they pass blocks through `validateWorkspaceFile`/`normalizeBlock`.
- Add storage tests in `src/tests/unit/storage.test.ts`:
  - block with absent `hideCompletedRows` normalizes to `false`;
  - block with `hideCompletedRows: true` normalizes/persists as `true`;
  - invalid non-boolean value normalizes to `false`;
  - `STORAGE_SCHEMA_VERSION` remains `1`.
- Extend `src/tests/integration/saveLoadRoundtrip.integration.test.ts` with a save/reload case where the store toggles the preference to `true`, autosaves, reloads from the same backend, and asserts the block still has `hideCompletedRows === true`.
- **Verify:** Targeted storage and round-trip tests pass.

### Step 3: Add pure derived filter/count helpers
- Create `src/domain/rows/completedRowFilter.ts` with helpers similar to:
  - `filterCompletedRows(rows: Row[], columns: ColumnDefinition[], hideCompletedRows: boolean): Row[]` returning the original ordered input cloned/filtered only by derived completion when `hideCompletedRows` is true;
  - `countCompletedRows(rows: Row[], columns: ColumnDefinition[]): number` for UI labels/counts.
- Use `isRowCompletedByCheckbox(columns, row)` as the only completion predicate.
- Do not mutate row order, row cells, row format, or column settings.
- Add unit tests covering:
  - hide off returns all rows in input order;
  - hide on excludes only rows completed by strikeout-enabled checked checkbox columns;
  - checked checkbox columns with `strikeoutRowWhenChecked: false` remain visible;
  - no checkbox columns / empty rows;
  - multiple checkbox columns where any strikeout-enabled checked column completes the row;
  - helper output does not mutate input rows.
- **Verify:** Pure helper tests pass.

### Step 4: Add the store action
- In `src/stores/documentStore.ts`, add a `DocumentStoreState` action named `toggleBlockHideCompletedRows(workspaceId, blockId, options?) => boolean`.
- Implement it like `toggleBlockCollapsed`: require initialized settings and existing workspace/block, clone state, flip `block.hideCompletedRows`, commit through `commitSnapshot(set, get, nextSnapshot, "formatting", options)`, and return `false` if the target is missing.
- Keep this action block-scoped; do not add row lifecycle actions.
- Add/extend `src/tests/unit/documentStore.test.ts` to assert:
  - initial blocks default to `false`;
  - toggling sets `true`, toggling again sets `false`;
  - missing workspace/block returns `false`;
  - the action schedules autosave/marks history like other formatting actions;
  - undo/redo restores/toggles the preference.
- **Verify:** Targeted `documentStore` tests pass.

### Step 5: Wire UI controls
- In `src/components/block/BlockCard.tsx`:
  - add an `onToggleHideCompletedRows` prop;
  - compute `completedCount` from `block.rows`/`block.columns` using the new helper;
  - add a compact button in the header controls near `Sort`/`+ Row` with `data-testid={`hide-completed-toggle-${block.id}`}`, `aria-pressed={block.hideCompletedRows}`, and label `Hide completed` when off / `Show completed` when on, optionally including the count like `(3)`;
  - visually distinguish the active state but keep it subtle and consistent with existing Tailwind styles.
- In `src/components/block/BlockContextMenu.tsx`:
  - add an `onToggleHideCompletedRows` prop;
  - add a menu item labelled `Hide completed rows` or `Show completed rows` based on `block.hideCompletedRows`.
- In `src/components/layout/MainPane.tsx`:
  - select `toggleBlockHideCompletedRows` from the document store;
  - wire it to the `BlockCard` prop and the block context menu item;
  - close the block menu after the menu action, matching existing menu-action behavior.
- Do not add a workspace-level view or settings screen for this dispatch.
- **Verify:** Static/component tests can find the header toggle and context-menu label, and clicking the wired control flips store state.

### Step 6: Filter the rendered row list only
- In `src/components/row/RowView.tsx`, compute ordered rows first:
  - `const orderedRows = getRowsInDisplayOrder(block.rows);`
  - `const rows = filterCompletedRows(orderedRows, block.columns, block.hideCompletedRows);`
- Use the filtered `rows` for `SortableContext items`, `rows.map`, and the `rowIndex` passed to `SortableRow`. This keeps numbered/visual indexes based on visible rows.
- Continue computing `completed` in `SortableRow` for the line-through/data attribute when rows are visible.
- If `block.hideCompletedRows === true`, `orderedRows.length > 0`, and `rows.length === 0`, render a small non-interactive message such as `All completed rows are hidden. Use Show completed to reveal them.` inside the row list. Keep the block header visible so users can toggle back.
- Do not mutate store rows, `order`, cells, selection, clipboard payloads, sorting, alert evaluation, or search results as part of filtering.
- **Verify:** A block with one completed row and one incomplete row renders only the incomplete row while the preference is true; toggling false renders both rows and the completed row retains line-through.

### Step 7: Preserve adjacent domain behavior with tests
- Add/extend tests to prove this feature is display-only:
  - `src/tests/unit/rowEditing.test.tsx` or a new component test: completed rows are hidden when `hideCompletedRows` is true and visible with line-through when false.
  - `src/tests/integration/rowCellEditing.integration.test.ts`: with hide enabled, checking a strikeout-enabled checkbox hides that row; toggling it back off (for example after temporarily showing completed or via store action in the test) reveals it; save/reload preserves preference and checkbox state.
  - `src/tests/unit/searchDocuments.test.ts`: search still returns matches from completed rows even when their block has `hideCompletedRows: true`.
  - `src/tests/unit/alertEvaluation.test.ts` only needs fixture updates unless implementation accidentally touches alerts; if adding coverage, assert alert behavior is unchanged for checked rows.
  - `src/tests/unit/rowClipboard.test.ts`/`rowClipboardActions.test.ts` only need fixture updates unless implementation touches clipboard; if adding coverage, assert clipboard helpers preserve checked compatible checkbox values independent of `hideCompletedRows`.
  - Sorting tests: ensure `sortBlockRows` still sorts all rows regardless of `hideCompletedRows`, because filtering is applied after stored order is computed.
- Ensure tests avoid requiring a hidden row to be selected through UI; hidden rows can be shown again by toggling the block preference off.
- **Verify:** Targeted unit/integration tests pass.

### Step 8: Run required verification and document results
- Run verification in the actual shell available:
  - `npm run test`
  - `npm run lint`
  - `npm run build`
  - `npm run test:e2e` if Playwright browsers are available; if unavailable, report the exact environment failure per `agents/CLOSING.md`.
- If a pre-existing unrelated failure appears, identify the exact failing test/command and whether it is checkpoint-scoped or unrelated; do not claim a pass without evidence.
- Write `agents/artifacts/086-hide-completed-rows-complete.md` with changed files, deviations, open questions, and command results in the required verification-reporting format.

## Data / Storage / Schema Changes
- Add one field to the persisted block shape: `hideCompletedRows: boolean`.
- Default is `false` for backward compatibility. Old workspace files without the field must load as `false`, preserving current behavior.
- No `Row` fields are added. No archive/completed lifecycle state is added. No row data is deleted or moved by the filter.
- No `STORAGE_SCHEMA_VERSION` bump is required because this is an optional backward-compatible preference with a safe default.
- `normalizeBlock` must explicitly include the field; otherwise storage normalization will drop it.
- Store toggle mutations go through existing snapshot history and autosave, making the preference undoable and persistent.

## UI Specifications
- Add a per-block toggle in the block header near existing controls (`Sort`, `+ Row`, collapse, menu). The label should be clear: `Hide completed` when off and `Show completed` when on. Include a count if straightforward, e.g. `Hide completed (2)`.
- Add the same preference in the block context menu as `Hide completed rows` / `Show completed rows` so it is reachable from the existing block actions/settings surface.
- Active state must be accessible via `aria-pressed` on the header toggle and should have a subtle active style.
- When active, completed rows are removed from the rendered row list only. Header, column headers, sort, add row, and menu controls remain visible.
- If all rows are hidden, show a short empty-state message in the block body telling the user to use `Show completed` to reveal them.
- The toggle must not imply archive/delete. Do not add archive language, restore flows, bulk lifecycle controls, or workspace-level completed views.

## Assumptions / Hypotheses
- Verified: there is no existing block settings panel dedicated to block preferences. The existing block header and block context menu are the appropriate minimal surfaces for this dispatch.
- Assumption: Search should continue to include completed rows even when hidden, matching dispatch 084's recommendation and avoiding a larger search/navigation scope.
- Assumption: Clipboard helpers should preserve compatible checked checkbox values; a pasted row that is already completed may be hidden immediately when the target block has `hideCompletedRows` enabled. This is acceptable if tests document it and the implementation does not alter clipboard data.

## Acceptance Criteria
- [ ] `Block.hideCompletedRows` exists in the `Block` type and defaults to `false` for new and legacy blocks.
- [ ] `hideCompletedRows` persists through normal workspace JSON storage and save/reload.
- [ ] No row archive/completed/hidden lifecycle fields are added.
- [ ] When `hideCompletedRows` is true, rows completed by `isRowCompletedByCheckbox` are filtered out of the rendered row list.
- [ ] When `hideCompletedRows` is false or absent in persisted input, all rows render as before, including completed rows with existing strike-through behavior.
- [ ] The toggle is reachable from the block header and block context menu, with accessible active state.
- [ ] Toggling the preference is undoable and autosaved via existing store snapshot behavior.
- [ ] Filtering does not mutate row `order`, `cells`, `format`, columns, search results, alert evaluation, sorting, or clipboard serialization/mapping.
- [ ] Inserted rows still default to unchecked visible cells; pasted compatible checked rows preserve checked values and may be hidden if the preference is active.
- [ ] Relevant unit/integration/UI tests cover storage, store action, pure filter behavior, row rendering, and adjacent search/sort/clipboard behavior.
- [ ] Required verification commands are run and reported in the complete artifact.

## Estimated Complexity
- Medium.
- Expected implementation surface: 8-12 source files plus fixture/test updates.
- Main risk is test-fixture churn from adding a required `Block` field and ensuring row filtering remains display-only.
