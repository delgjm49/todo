# Dispatch 085: Hide Completed Rows

## Summary

Implement a per-block "hide completed rows" toggle that filters completed checkbox rows from the visible row list. This is the implementation slice recommended by dispatch 084's planning/audit artifact.

## Scope

### In Scope
- Add `hideCompletedRows: boolean` (default `false`) to `Block` type and `normalizeBlock`
- Add `toggleHideCompletedRows(workspaceId, blockId)` store action (undoable via existing snapshot mechanism)
- Create a pure `getVisibleRows(rows, columns, hideCompleted): Row[]` filter helper using existing `isRowCompletedByCheckbox`
- Add "Hide completed" toggle UI in the block header area with a count badge showing how many rows are hidden
- Ensure insert/paste/drag/sort all work correctly with hidden rows
- Unit tests for filter helper
- Store tests for toggle action
- Integration tests for save/load round-trip of `hideCompletedRows`
- Clipboard interaction test: pasted completed rows may be immediately hidden when `hideCompletedRows` is active
- Standard verification: `npm run test`, `npm run lint`, `npm run build`

### Out of Scope
- Persisted archive/lifecycle row state (`archivedAt`, `archived`, etc.)
- Workspace-level "show all completed" view or panel
- Bulk archive/restore actions
- Auto-archive of completed rows
- Search filtering by completion status (search includes all rows as today)
- Any `STORAGE_SCHEMA_VERSION` bump or migration
- E2E tests (optional; unit + integration coverage is sufficient)

## Background

Dispatch 084 produced a thorough planning/audit artifact (`agents/artifacts/084-archive-completed-views-planning-complete.md`) that:
- Verified current completion semantics: `isRowCompletedByCheckbox(columns, row)` returns true when any checkbox column has `strikeoutRowWhenChecked === true` and the row's cell is checked
- Confirmed no new Row fields are needed — completion is derivable from existing data
- Recommended one backward-compatible block-level boolean with no schema version bump
- Analyzed all domain impacts (alerts, search, sort, clipboard, undo, autosave)
- Defined acceptance criteria and a future file map

Dev should read that artifact as the primary reference for current-state facts and domain impact decisions.

## Key Design Decisions (from dispatch 084)

1. **Filter is view-layer only**: `getVisibleRows` is a render-time transform. No row data (order, cells, format) is mutated by hiding.
2. **Sort affects all rows**: Sorting while completed rows are hidden still reorders hidden rows — the filter is applied after sorting.
3. **Alerts unchanged**: Alert evaluation ignores row visibility; checked checkboxes still suppress alerts regardless of hide state.
4. **Search unchanged**: Search includes completed rows even when hidden. Navigating to a hidden completed row is a UX detail for the implementation to handle (flash, temporary reveal, or indicator).
5. **Clipboard unchanged**: Pasted rows preserve compatible checkbox values. A pasted completed row may be immediately hidden when `hideCompletedRows` is active — this is correct data-fidelity behavior. The implementation should provide a clear UX expectation (e.g., brief count indicator or just let it be silent since the count badge updates).
6. **moveCheckedRowsToBottom interaction**: If both `moveCheckedRowsToBottom` and `hideCompletedRows` are active, checked rows are moved to bottom AND hidden. This is correct but should be tested.

## Acceptance Criteria

- [ ] `Block.hideCompletedRows: boolean` field added (default `false`), persisted in `normalizeBlock`
- [ ] `toggleHideCompletedRows(workspaceId, blockId)` store action toggles the field and commits a snapshot (undoable)
- [ ] Pure `getVisibleRows` filter helper correctly hides rows where `isRowCompletedByCheckbox` returns true when `hideCompleted` is on; returns all rows when off
- [ ] "Hide completed" toggle UI appears per block with a count badge (e.g., "Hide completed (3)")
- [ ] Toggle state survives save/reload
- [ ] Toggle is undoable (undo restores previous visibility)
- [ ] Hiding does not mutate row data: `order`, `cells`, and `format` are unchanged
- [ ] Sorting still affects all rows (hidden completed rows are reordered)
- [ ] Insert operations produce visible (uncompleted) rows as before
- [ ] Paste operations preserve compatible checkbox values; pasted completed rows may be hidden immediately
- [ ] Drag-and-drop works correctly with hidden completed rows
- [ ] Alert evaluation is unchanged
- [ ] Search results include completed rows even when hidden
- [ ] Clipboard copy/paste works normally; pasted completed rows tested with `hideCompletedRows`
- [ ] `npm run test`, `npm run lint`, `npm run build` all pass

## Verification Commands

```bash
npm run test
npm run lint
npm run build
```

## Reference

- Planning artifact: `agents/artifacts/084-archive-completed-views-planning-complete.md`
- Existing completion logic: `src/domain/rows/applyCheckboxRules.ts`
- Block type: `src/types/block.ts`
- Storage schemas: `src/services/storage/storageSchemas.ts`
- Document store: `src/stores/documentStore.ts`
- Row rendering: `src/components/row/RowView.tsx`
