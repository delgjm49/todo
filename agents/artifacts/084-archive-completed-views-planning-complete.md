# Complete: Archive/Completed Views Planning & Audit

## Verified Current-State Facts

These facts were independently verified from current on-disk files (not from the plan artifact alone).

### Row Lifecycle Model (Present State)

| Term | Current Implementation | Evidence |
|------|----------------------|----------|
| **completed** | Derived UI/behavioral state. A row is "completed" when **any** checkbox column has `settings.strikeoutRowWhenChecked === true` **and** that row's cell for that column has `value === true`. There is no persisted completion flag. | `src/domain/rows/applyCheckboxRules.ts:8-14` (`isCheckboxColumnCompleted`), `:17-19` (`isRowCompletedByCheckbox`); `src/components/row/RowView.tsx:78` computes `completed` on every render; `src/tests/unit/checkboxAutomation.test.ts:22-58` confirms all edge cases |
| **checked** | Boolean checkbox cell state (`PersistedCell.value === true` for a checkbox column). This is the only persisted state related to row lifecycle. Distinct from "completed" — a row can be checked without being completed if `strikeoutRowWhenChecked` is false. | `src/types/row.ts:4-8` (`CheckboxCellPayload`); `src/domain/rows/applyCheckboxRules.ts:5-7` (`isChecked`) |
| **archived** | Not implemented. No type field, no store action, no UI. | `src/types/row.ts:14-18` — `Row` has only `id`, `order`, `format`, `cells` |
| **hidden** | Not implemented. No per-row visibility toggle. Block `collapsed` hides all rows in a block, but that's block-level only. | `src/types/block.ts:23` (`Block.collapsed`); no row-level hide field exists |
| **restored** | Not implemented. Nothing can currently be restored because nothing can be archived or hidden. | No restore action exists in `src/stores/documentStore.ts` |
| **deleted** | Destructive removal via `deleteRowFromBlock` or `cutRows`. Row data is permanently removed (recoverable only via undo within the same session). | `src/stores/documentStore.ts:1645-1680` (`deleteRowFromBlock`), `:1698-1750` (`cutRows`) |
| **alert-suppressed** | A row with **any** checked checkbox cell (`value === true`) suppresses all alerts, regardless of `strikeoutRowWhenChecked`. This is broader than the UI completion rule. | `src/domain/alerts/evaluateRow.ts:123-126` — exits early with `{ hasAlert: false }` on any checked checkbox |

### Checkbox Automation Rules

- `isRowCompletedByCheckbox(columns, row)`: returns `true` iff any column has `type === "checkbox"` AND `settings.strikeoutRowWhenChecked === true` AND the row's cell for that column has `value === true`. (`src/domain/rows/applyCheckboxRules.ts:17-19`)
- `applyCheckboxAutoMove(rows, columns, toggledColumnId)`: if the toggled checkbox column has `moveCheckedRowsToBottom === true`, re-groups unchecked rows before checked rows and rewrites every row's `order`. Only the toggled column is used for grouping, not all checkbox columns. (`src/domain/rows/applyCheckboxRules.ts:21-40`)
- Default checkbox column settings (from `src/domain/columns/createColumn.ts` and templates): `strikeoutRowWhenChecked: true`, `moveCheckedRowsToBottom: false`.
- `RowView.tsx` applies `line-through` CSS class when completed, sets `data-completed="true"` DOM attribute. (`src/components/row/RowView.tsx:78,138`)
- Completed rows still render in normal row order, are fully interactive (drag, edit, delete, insert above/below), and have no visual difference besides strikeout.

### Storage and Schema

- `STORAGE_SCHEMA_VERSION = 1` (`src/services/storage/bootstrapData.ts:7`)
- `normalizeRow` in `storageSchemas.ts` constructs a `Row` with only `id`, `order`, `format`, and `cells`. Any unknown fields on a raw row object are silently dropped — there is no spread or passthrough of extra properties. (`src/services/storage/storageSchemas.ts:316-340`)
- `normalizeBlock` similarly constructs a fixed set of fields. (`src/services/storage/storageSchemas.ts:344-405`)
- `PersistedWorkspaceFile` schema: `{ schemaVersion, id, blocks }`. No archive collection or lifecycle registry. (`src/services/storage/storageSchemas.ts:66-70`)
- Workspace index entries have no archive-related fields. (`src/types/workspace.ts:13-17`)
- Coercion functions (`createPersistedWorkspaceFile`, `coerceWorkspaceForSave`) pass through blocks directly — they call `validateWorkspaceFile` which normalizes through `normalizeBlock` → `normalizeRow`. Any future field added to `Row` or `Block` types would need corresponding normalization to survive save/load.

### Store Mutation Architecture

All mutations flow through `commitSnapshot` → `useHistoryStore.getState().commitSnapshot()` → `setCommittedSnapshot()` → `scheduleAutosave()`. Key properties:
- Row mutations use `structuredClone` throughout, so extra fields on a cloned object could theoretically survive in memory but **will be stripped on save/load** by `normalizeRow`.
- `toggleCheckboxCellValue` applies `applyCheckboxAutoMove` after toggling, which rewrites `order` on every row. (`src/stores/documentStore.ts:1400-1425`)
- `deleteRowFromBlock` removes rows entirely from the block. No soft-delete or trash. (`src/stores/documentStore.ts:1645-1680`)
- `cutRows` serializes rows to clipboard payload then deletes from block. (`src/stores/documentStore.ts:1698-1750`)
- All store operations are undoable through the history store (snapshot-based undo, not command-based).

### Domain Impacts Summary

| Domain | Current Behavior | Impact on Future Archive/Completed Views |
|--------|-----------------|------------------------------------------|
| **Alerts** | Suppresses on ANY checked checkbox (`evaluateRow.ts:123-126`). Uses broader rule than UI completion. | Future completed/archive filters must decide: should alerts still suppress for checked-but-not-completed rows? Should archived rows retain alert suppression? |
| **Search** | Excludes checkbox booleans, bullet/numbered markers, formatting, and ids. Searches only text/date/time/dropdown string values. (`searchDocuments.ts:38-59`) | If completed/archived rows are hidden from view, search must define whether they are still included in results. Current architecture makes it easy to add a `includeArchived?: boolean` option. |
| **Sorting** | Checkbox columns are sortable. `sortBlockRows` writes `order` on every row. `moveCheckedRowsToBottom` also rewrites `order`. (`compareValues.ts:54-57`, `documentStore.ts:1932-1975`) | View filters that reorder or hide rows must not corrupt the stored sort order. A filter should be a view-layer transform, not a store mutation. |
| **Clipboard** | Serializes only `sourceRowId`, `order`, `format`, `cells`. No lifecycle metadata. (`rowClipboardTypes.ts:19-27`). On paste, `mapClipboardRowsToBlock` preserves compatible checkbox cell values through `normalizeCellForColumnType` + `structuredClone` (`mapPastedRows.ts:50-51`), so pasted rows can remain checked/completed when source and target columns are compatible. | If persisted archive state is ever added, clipboard must decide whether to copy/paste it. Currently, pasted completed rows preserve checked state when columns are compatible, so they may appear hidden immediately after paste if `hideCompletedRows` is active. |
| **Undo/History** | Snapshot-based. Every mutation creates a full document snapshot. | Any archive/hide/restore action would be undoable by default since it goes through `commitSnapshot`. No special undo handling needed. |
| **Autosave** | Fires via `scheduleAutosave` after every `commitSnapshot`. Default 250ms debounce. | No special autosave handling needed — works automatically with the snapshot mechanism. |
| **Row Order** | Managed by `order` field. Written by sort, drag-and-drop, and auto-move. | View-level filters must not mutate `order`. A hide/show toggle should preserve the underlying row order. |

## Recommendation

### Recommended First Implementation Slice: Derived Completed-Row View/Filter with Persistent Block Toggle

**Direction**: Implement a **derived completed-row view/filter** at the block level. The completion predicate is recomputed from existing checkbox column settings and row cell values — no new `Row` fields and no row lifecycle persistence. The filter toggle's on/off state is persisted as a single backward-compatible `Block.hideCompletedRows` boolean field (default `false`). This is the narrowest possible schema addition: one block-level boolean, zero `STORAGE_SCHEMA_VERSION` bump, zero migration logic, and zero row-coercion risk. Reject any persisted row archive/lifecycle state for the first slice.

**Rationale**:

1. **Completeness can be derived from existing data.** `isRowCompletedByCheckbox` already exists and is tested. A "hide completed rows" filter is a pure view-layer transform — recomputed from existing checkbox column settings and row cell values on every render.

2. **Minimal, backward-compatible schema addition.** The only new persisted field is `Block.hideCompletedRows: boolean` (default `false`). No new `Row` fields, no `STORAGE_SCHEMA_VERSION` bump, no migration logic. Old documents without the field normalize to `false` — identical to today's behavior. The existing `normalizeRow` behavior is untouched; only `normalizeBlock` gains one `toBoolean` line.

3. **No data-loss risk.** Hiding completed rows is a reversible filter. Users can toggle it off and see all rows again. No data is moved, deleted, or transformed. This contrasts sharply with "archive" which implies moving rows out of the active view permanently.

4. **Implied by existing UX.** The app already has strikeout-on-complete and move-checked-to-bottom. A "hide completed" toggle is a natural next step that doesn't introduce new concepts — it just applies the existing completion derivation to visibility.

5. **Tests can build on existing coverage.** `checkboxAutomation.test.ts` already covers completion detection. New filter tests would be additive.

6. **Postpones the lifecycle question.** A derived filter doesn't force a decision about what "archived" means or how it differs from "completed." Users get immediate value (cleaner views) while the project can observe usage patterns before committing to a persistence decision.

### Rejected Alternative: Persisted Archive State (Deferred)

A persisted archive state (e.g., `Row.archivedAt: string | null`) is rejected for the first slice because:

- It requires schema changes (`Row` type, `normalizeRow`, `STORAGE_SCHEMA_VERSION`)
- It requires migration logic for existing documents
- It introduces semantic ambiguity: is "archived" the same as "completed"? If different, what UI distinguishes them? If the same, why persist separate state?
- It introduces data-loss anxiety: users must trust that archived rows are recoverable
- The current storage validation/coercion strips unknown fields, so any persisted field silently dropped by an older version of the app could cause data loss
- It would need clipboard rules, search inclusion rules, alert suppression rules, and sort behavior decisions — each of which is a small product decision that shouldn't be bundled into a first slice

The derived filter approach defers all of these decisions while still delivering user value.

## Future UI/View Semantics (for the Recommended Slice)

### Block-Level "Hide Completed" Toggle

A per-block toggle that filters out completed rows from the visible row list. Recommended shape:

- **Toggle control**: A small button or checkbox in the block header area (near collapse, sort controls). Label: "Hide completed" with a count badge, e.g., "Hide completed (3)".
- **Active state**: When on, `getRowsInDisplayOrder` is filtered to exclude completed rows before rendering in `RowView`. The filter is derived at render time — no store mutation.
- **Inactive state (default)**: All rows visible, completed rows shown with strikeout as today.
- **Persistence**: Store toggle state in a new per-block field, `Block.hideCompletedRows: boolean` (default `false`). This is the only new persisted field — a single backward-compatible block-level boolean added to `normalizeBlock` with `toBoolean(rawValue.hideCompletedRows, false)`. Users will expect the preference to survive app restart, and the cost is one line of type/schema code with no migration impact.
- **Interactions**: 
  - Toggle does not mutate row order or data.
  - When toggled on, insert/paste rows at the correct position (after the last visible unchecked row? before the first completed row? TBD in implementation dispatch).
  - Drag-and-drop should show completed rows as valid drop targets even when hidden? **Recommendation**: When hiding is on, completed rows become invisible in the row list but drag operations still respect their position (they act as invisible spacers). This prevents confusion about where a dragged row will land.

### Workspace-Level View (Deferred or Optional)

A workspace-level "completed view" panel that shows only completed rows across all blocks could be a second slice. Recommend deferring this from the first dispatch to keep scope narrow.

### What "Hide Completed" Is NOT

- **Not delete/archive**: Hidden completed rows are still fully present in the block data. Unchecking the checkbox column un-completes the row, making it visible again.
- **Not sort**: Hiding is a filter, not a reorder. The underlying `order` values are preserved.
- **Not destructive**: No row data is modified by the hide toggle.

## Data / Storage / Schema Analysis

### For the Recommended Derived View/Filter Slice

| Aspect | Assessment |
|--------|------------|
| **New row fields** | None required. Skip entirely. |
| **New block fields** | One boolean: `hideCompletedRows` (default `false`). Add to `Block` type, `normalizeBlock` in `storageSchemas.ts`. |
| **Schema version** | No bump needed. New boolean field with default `false` is backward compatible. Old documents without the field normalize to `false`. |
| **normalizeRow changes** | None. |
| **normalizeBlock changes** | Append `hideCompletedRows: toBoolean(rawValue.hideCompletedRows, false)` — one line. |
| **Store mutations** | Add `toggleHideCompletedRows(workspaceId, blockId)` action. Works through existing `commitSnapshot` → history → autosave path. |
| **Migration risk** | None. Old documents load with `hideCompletedRows: false` — same behavior as today. |
| **Backward compatibility** | Full. New field with default works in old and new app versions. |
| **Recovery risk** | None. Hiding is a reversible filter. |

### For a Future Persisted Archive State (Deferred)

If a future dispatch adds explicit archive state, the minimum required changes would be:

- `Row` type: add `archivedAt: string | null`
- `normalizeRow`: add `archivedAt` to output (only if valid ISO string or null)
- `STORAGE_SCHEMA_VERSION`: bump to 2
- Migration: set `archivedAt: null` for all existing rows on load
- Store: add `archiveRow`, `restoreRow` actions
- UI: add archive/restore controls, archived rows panel
- Clipboard: decide whether `archivedAt` is copied/pasted
- Search: decide whether archived rows appear in results
- Alerts: decide whether archived rows still suppress alerts
- Sort: decide sort behavior for archived rows

This set of changes is significant and should be a separate dispatch after the derived filter is shipped and user feedback collected.

## Domain Impact Coverage

### Alerts

- **Current rule**: Any checked checkbox suppresses alerts for the entire row, regardless of `strikeoutRowWhenChecked`. (`evaluateRow.ts:123-126`)
- **Recommended position for first slice**: No change. Alerts remain suppressed for any row with a checked checkbox. The "hide completed" toggle is purely a display filter; it doesn't interact with alert evaluation.
- **Future consideration**: If users want alerts on completed-but-not-archived rows, the alert suppression rule could be narrowed to only suppress for explicitly archived rows. This would be a product decision for a later dispatch.

### Sorting

- **Current behavior**: `sortBlockRows` writes `order` on every row. `moveCheckedRowsToBottom` also rewrites `order`.
- **Recommended position for first slice**: "Hide completed" is a view-layer filter applied after sorting. `getRowsInDisplayOrder()` (or its consumer in `RowView`) filters completed rows before rendering. Stored `order` and sort state (`Block.sort`) are untouched.
- **Risk**: If a user sorts while completed rows are hidden, should the hidden completed rows be reordered too? **Recommendation**: Yes — sort affects all rows regardless of visibility, preserving a consistent data model. The filter is purely a display concern.

### Search

- **Current behavior**: Searches only text/date/time/dropdown string values. Excludes checkbox booleans. No filtering by row state. (`searchDocuments.ts:38-59`)
- **Recommended position for first slice**: No change. Search returns all matches regardless of completion status. If a future slice wants to filter search results by completion, add an `includeCompleted?: boolean` option to `SearchDocumentsOptions`. This keeps the first slice simple.
- **Risk if search highlights a hidden completed row**: Row navigation would need to temporarily reveal or at least indicate that the result is in a hidden completed row. **Recommendation**: For the first slice, let the search highlight work normally — navigating to a completed row while it's hidden could either (a) temporarily show it, or (b) flash the row but keep it hidden. Defer the decision to the implementation dispatch.

### Clipboard

- **Current behavior**: Serializes `sourceRowId`, `order`, `format`, `cells`. No lifecycle metadata. (`rowClipboardTypes.ts:19-27`). On paste, `mapClipboardRowsToBlock` (`src/domain/clipboard/mapPastedRows.ts:46-52`) first attempts to map compatible source cells through `normalizeCellForColumnType`, and if the source cell is compatible with the target column type, the cell value (including boolean `true` for checkboxes) is preserved via `structuredClone`. If incompatible, `createCellForColumn` provides a fresh default cell.
- **Consequence for hide-completed**: Copying a completed row and pasting it into a compatible target block can produce a pasted row that is still checked and therefore completed. If `hideCompletedRows` is active in the target block, the pasted row will be immediately hidden. This is correct behavior — paste preserves data fidelity — but the UX interaction (pasting a row that vanishes) must be handled in the implementation. The future implementation dispatch should decide: (a) keep the current preservation behavior and accept that pasted completed rows may be hidden, (b) show a brief "pasted X rows (Y hidden)" notification, or (c) add a `resetCheckboxesOnPaste` option to `mapClipboardRowsToBlock`.
- **Recommended position for first slice**: Keep the current clipboard preservation behavior unchanged — it is a separate concern from visibility filtering. The implementation dispatch should add at minimum a clipboard test that verifies pasted completed rows are hidden when `hideCompletedRows` is active, to prevent regressions in either direction.
- **Edge case**: If a user copies a completed row and pastes it into an incompatible target block (different column types/shapes), `createCellForColumn` produces fresh default cells (checkbox `false`). In that case the pasted row is not completed and will be visible regardless of `hideCompletedRows`.

### Undo/History

- **Current behavior**: Snapshot-based undo through `commitSnapshot`. All mutations are undoable.
- **Recommended position for first slice**: Toggling `hideCompletedRows` goes through `commitSnapshot` like every other mutation, so it's automatically undoable. No special handling needed.
- **Important**: The hide toggle itself is undoable. Row data is never modified by the toggle, so undoing the toggle just shows completed rows again.

### Autosave

- **Current behavior**: `scheduleAutosave` fires after every `commitSnapshot`, 250ms debounce.
- **Recommended position for first slice**: Toggling `hideCompletedRows` triggers an autosave (block state changed). This is correct — users expect the hide preference to persist.

### Row Order

- **Current behavior**: `order` field is the canonical row position. Written by sort, drag-and-drop, and `applyCheckboxAutoMove`.
- **Recommended position for first slice**: "Hide completed" does not touch `order`. It's a render-time filter on `getRowsInDisplayOrder` output. The underlying order survives the filter.
- **Edge case with `moveCheckedRowsToBottom`**: If both `moveCheckedRowsToBottom` AND `hideCompletedRows` are active, checked rows are at the bottom of the list AND hidden. This could be confusing — a user might toggle "hide completed" and see fewer rows than expected because checked rows were auto-moved to the bottom. **Recommendation**: Document this interaction in the implementation dispatch. Behavior is correct (both features work as designed) but the combination should be tested.

## Future Test & Acceptance Criteria

### Tests for the Recommended Slice

| File | Type | What to Test |
|------|------|-------------|
| `src/tests/unit/checkboxAutomation.test.ts` | Unit | Expand with test for `isRowCompletedByCheckbox` used as filter predicate (already covered; add filter integration test) |
| New: `src/tests/unit/completedViewFilter.test.ts` | Unit | Pure filter function that takes rows, columns, and `hideCompleted: boolean` and returns visible rows. Test: hide on shows only non-completed; hide off shows all; empty rows; no checkbox columns; multiple checkbox columns with mixed settings |
| `src/tests/unit/documentStore.test.ts` | Store | `toggleHideCompletedRows` toggles block field; field is `false` by default; toggle commits snapshot; undo restores toggle state |
| `src/tests/integration/saveLoadRoundtrip.integration.test.ts` | Integration | Extend with: `hideCompletedRows: true` survives save/reload round-trip; old documents without the field normalize to `false` |
| New: `src/tests/unit/rowViewFiltering.test.tsx` | Component | RowView renders only non-completed rows when hide is on; renders all rows when hide is off; completed rows are still in data; toggling hide does not mutate row data |
| `src/tests/integration/rowCellEditing.integration.test.ts` | Integration | Extend: checking a checkbox with strikeout+hide hides the row after save/reload; unchecking reveals it again |
| `src/tests/unit/rowClipboard.test.ts` | Unit | Extend: verify pasted completed rows preserve checked state in compatible target blocks and are hidden when `hideCompletedRows` is active |
| `src/tests/e2e/smoke.spec.ts` | E2E | Optional: use "hide completed" toggle, verify rows appear/disappear, toggle off and verify all rows visible |

### Acceptance Criteria for the Future Implementation Dispatch

- [ ] A "hide completed rows" toggle is available per block (placement: block header, near collapse/sort controls).
- [ ] When toggled on, rows completed by any strikeout-enabled checkbox column are hidden from the row list.
- [ ] When toggled off, all rows are visible (completed rows shown with strikeout as today).
- [ ] Toggle state is persisted in `Block.hideCompletedRows` and survives save/reload.
- [ ] Toggle is undoable (undo restores previous visibility).
- [ ] Hiding does not mutate row data: `order`, `cells`, and `format` are unchanged.
- [ ] Sorting still affects all rows (hidden completed rows are reordered according to sort).
- [ ] Insert operations work correctly when completed rows are hidden: newly inserted rows always default to unchecked cells (`createRow` defaults checkboxes to `false`) and are therefore uncompleted and always visible. Paste operations preserve compatible checkbox cell values per current `mapClipboardRowsToBlock` behavior (`src/domain/clipboard/mapPastedRows.ts:46-52`); pasted completed rows may be hidden immediately when `hideCompletedRows` is active, and the implementation must provide a clear UX expectation and test coverage for that case.
- [ ] Drag-and-drop to reorder works correctly with hidden completed rows (drop position is unambiguous).
- [ ] Row deletion still works on visible rows; hidden completed rows can be deleted by toggling hide off first.
- [ ] Alert evaluation is unchanged (still suppresses on any checked checkbox, regardless of row visibility).
- [ ] Search results include completed rows even when they are hidden from the row list.
- [ ] Clipboard copy/paste works normally; pasted completed rows preserve checked checkbox values when columns are compatible (current `mapClipboardRowsToBlock` behavior), and are hidden immediately if `hideCompletedRows` is active.
- [ ] Standard verification commands pass: `npm run test`, `npm run lint`, `npm run build`, and `npm run test:e2e` when Playwright browsers are available.

### Verification Commands for the Future Dispatch

```bash
npm run test        # unit + integration tests
npm run lint        # typecheck + lint
npm run build       # production build
npm run test:e2e    # Playwright E2E (when browsers available)
```

## Future File Map for Implementation Dispatch

Files that would be created or modified (not done in dispatch 084):

| Action | Path | Description |
|--------|------|-------------|
| Modify | `src/types/block.ts` | Add `hideCompletedRows: boolean` to `Block` |
| Modify | `src/services/storage/storageSchemas.ts` | Add `hideCompletedRows` to `normalizeBlock` |
| Modify | `src/stores/documentStore.ts` | Add `toggleHideCompletedRows` action |
| Modify | `src/components/row/RowView.tsx` | Filter rows by `hideCompletedRows` before rendering |
| Modify | `src/components/block/BlockHeader.tsx` or equivalent | Add "Hide completed" toggle UI |
| Create | `src/tests/unit/completedViewFilter.test.ts` | Pure filter unit tests |
| Modify | `src/tests/unit/documentStore.test.ts` | Store tests for toggle action |
| Modify | `src/tests/unit/checkboxAutomation.test.ts` | Add optional filter integration tests |
| Modify | `src/tests/integration/rowCellEditing.integration.test.ts` | Checkbox → hide → reload round-trip |
| Modify | `src/tests/integration/saveLoadRoundtrip.integration.test.ts` | `hideCompletedRows` field round-trip |
| Modify | `src/tests/unit/rowClipboard.test.ts` | Clipboard paste + hide-completed interaction tests |
| Create/Modify | `src/tests/unit/rowViewFiltering.test.tsx` | RowView filter component tests |

## Out of Scope for the Recommended Slice

- Persisted archive/lifecycle row state (`archivedAt`, `archived`, etc.)
- Workspace-level "show all completed" view or panel
- Bulk archive/restore actions
- Auto-archive of completed rows
- Archive/restore via clipboard
- Archive-aware search filtering
- Archive-aware alert suppression
- Migration logic or `STORAGE_SCHEMA_VERSION` bumps
- Date-based archive triggers or expiration
- Any behavior that hides rows without a clear and obvious restore/visibility path

## Conclusion

The app's current "completed" semantics are well-defined, test-covered, and entirely derived from checkbox column settings. A persisted archive/lifecycle state is unnecessary for the first value slice. A derived "hide completed rows" per-block toggle delivers user value (cleaner views, fewer distractions) with one minimal backward-compatible schema addition (`Block.hideCompletedRows: boolean`, default `false`), no row lifecycle changes, no migration, no data-loss anxiety, and a small, additive implementation surface. The toggle is fully undoable, autosaved, and backwards-compatible. 

A future dispatch for explicit archive state should wait until the derived filter is shipped, tested, and user feedback collected. At that point, the distinction between "completed" and "archived" will be clearer from real usage patterns, and the product decision about persistence can be made with evidence rather than speculation.

## Review Fix Notes (Session 284, 2026-06-06)

### Issue 1 (High): Schema/Persistence Contradiction — RESOLVED

The artifact originally claimed "zero schema changes, zero new persisted fields" in the Recommendation heading and Direction paragraph while simultaneously recommending a persisted `Block.hideCompletedRows` field in the UI semantics and data analysis sections. This was contradictory.

**Fix applied**: The Recommendation now consistently describes the slice as having **one** backward-compatible schema addition (`Block.hideCompletedRows: boolean`, default `false`). The heading, Direction, Rationale point 2, Persistence bullet, and Conclusion all now agree: no new `Row` fields, no `STORAGE_SCHEMA_VERSION` bump, no migration logic — but one block-level boolean in the `Block` type and `normalizeBlock`. This is the narrowest possible schema change that still delivers persistent UX.

### Issue 2 (Medium): Incorrect Clipboard Paste Behavior — RESOLVED

The artifact originally claimed pasted rows "never" retain completed state because `createRow` defaults checkboxes to `false`. This was incorrect. Current code in `src/domain/clipboard/mapPastedRows.ts:46-52` first attempts to map compatible source cells through `normalizeCellForColumnType`, and if the source cell is compatible with the target column type, the value (including boolean `true` for checkboxes) is preserved via `structuredClone`. Only incompatible cells fall through to `createCellForColumn` defaults.

**Fix applied**:
- Domain Impacts Summary table (Clipboard row): Updated to accurately describe the `mapClipboardRowsToBlock` preservation behavior.
- Clipboard domain impact section: Rewritten with accurate current behavior, UX consequence analysis (pasted completed rows may be instantly hidden), and three implementation options for the future dispatch to choose from.
- Acceptance criteria: Updated from "pasted rows are never completed" to "pasted completed rows preserve checked checkbox values when columns are compatible."
- Test table and Future File Map: Added `src/tests/unit/rowClipboard.test.ts` for clipboard + hide-completed interaction coverage.

### Issue 3 (Medium): Remaining Stale Acceptance Criterion (Session 286, 2026-06-06) — RESOLVED

The acceptance criteria still contained the conflicting line: "Insert/paste operations work correctly when completed rows are hidden (new rows are uncompleted, so always visible)." This was stale after the clipboard correction — paste operations may produce completed rows.

**Fix applied**: Split the criterion into separate insert and paste semantics. Inserted rows are always uncompleted/visible (createRow defaults to `false`). Pasted rows preserve compatible checkbox values and may be hidden immediately when `hideCompletedRows` is active; the implementation must provide clear UX and test coverage for that case.

### Verification

- [x] All changes are to `agents/artifacts/084-archive-completed-views-planning-complete.md` only. No product source/test files modified.
- [x] Recommendation is internally consistent on schema scope.
- [x] Clipboard behavior is grounded in actual `mapPastedRows.ts` code.
- [x] All acceptance criteria are consistent with the clipboard analysis.
- [x] Ready for re-review.
