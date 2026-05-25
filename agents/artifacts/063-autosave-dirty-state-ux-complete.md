# Complete: Autosave Debounce and Dirty-State UX

## Summary

Implemented a polished save status indicator component for the top bar and verified that the dirty/autosave pipeline is coherent across all document mutation paths. The existing inline `<span>` in `TopBar.tsx` (a bordered pill) was replaced with a dedicated `SaveStatusIndicator` component using plain text styling for a more subtle, lightweight appearance. Five distinct visual states are supported (Saved, Saving…, Unsaved changes, Save failed · Retry, Partially saved · Retry), with error/partial states rendered as keyboard-accessible `<button>` elements that call `retrySave()`. The dirty/save coherence audit confirmed all 30+ mutation paths correctly mark dirty and schedule autosave — no code fixes needed.

## Files Changed

| Action | Path | Notes |
|--------|------|-------|
| Created | `src/components/layout/SaveStatusIndicator.tsx` | Save status indicator component with all 6 states (loading → null, saving → pulsing text, error → retry button, partial → retry button, dirty→idle → "Unsaved changes", saved/idle clean → "Saved") |
| Modified | `src/components/layout/TopBar.tsx` | Removed `saveStatus`/`dirty` selectors and inline `<span>`, replaced with `<SaveStatusIndicator />` |
| Created | `src/tests/unit/saveStatusIndicator.test.tsx` | 7 tests covering all indicator states + retry click interaction |
| Created | `src/tests/unit/dirtyStateCoherence.test.ts` | 5 tests covering dirty/autosave coherence for cell edit, undo, redo, updateSettings, and selectWorkspace |

## Deviations from Plan

- **None.** The plan was followed exactly as specified. The dirty/save coherence audit (Step 3) found no code issues — documented in the audit findings below.

## Dirty/Save Coherence Audit (Step 3)

All 30+ mutation methods that modify user-authored document state go through `commitSnapshot()`, which sets `dirty: true` via `setCommittedSnapshot()` and calls `scheduleAutosave()`. These include: workspace CRUD (`createWorkspace`, `renameWorkspace`, `deleteWorkspace`, `updateWorkspaceStyle`, `reorderWorkspaces`), block CRUD (`createBlockFromTemplate`, `updateBlockTitle`, `toggleBlockCollapsed`, `reorderBlocks`, `moveBlockToWorkspace`, `deleteBlock`), row CRUD (`appendRowToBlock`, `insertRowInBlock`, `deleteRowFromBlock`, `reorderRows`, `sortBlockRows`), cell edits (`updateTextCellValue`, `toggleCheckboxCellValue`, `updateDateCellValue`, `updateTimeCellValue`, `updateDropdownCellValue`), column CRUD (`renameColumn`, `moveColumnLeft`, `moveColumnRight`, `addColumnLeft`, `addColumnRight`, `deleteColumn`, `changeColumnType`, `updateColumnSettings`), formatting (`updateSelectedTextFormatting`, `updateSelectedBorderFormatting`), clipboard (`cutRows`, `pasteRows`).

Additional paths with manual dirty/autosave handling:
- `updateSettings()` — calls `markDirty(true)` + `scheduleAutosave()` directly (correct — settings changes bypass history since they aren't undoable per current design).
- `updateDocumentTransaction()` — calls `setDirtyState(set)` which sets `dirty: true` (called during live transactions like typing).
- `commitDocumentTransaction()` — calls `setCommittedSnapshot(…, true)` + `scheduleAutosave()` (correct).

Correctly excluded from dirty marking:
- `selectWorkspace()` / `setActiveWorkspaceId()` — UI-only selection change, not a data mutation.
- `copyRows()` — writes to `uiStore` clipboard, no document state change.
- `updateWorkspaceAlertSummary()` — derived state, calls `scheduleAutosave()` (persists alert summaries) but doesn't mark dirty (alert summaries are recomputed on load, not user-authored data).

Undo/redo save interaction:
- Both `undo()` and `redo()` call `setCommittedSnapshot(set, nextSnapshot, true)` which sets `dirty: true`, then call `scheduleAutosave()`. This correctly handles the case where a user undoes a change that was already saved — the undone state differs from what's on disk, so dirty is correct, and autosave re-persists.

**Conclusion:** No code changes required. All mutation paths are coherent.

## Open Questions

- None.

## Verification

- command: `npm run test`
- shell used: zsh (macOS environment)
- result: 319 tests pass, 0 fail
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped (all existing tests plus new tests pass)
- was this the actual shell provided by the environment: Yes (zsh on macOS)

- command: `npm run lint`
- shell used: zsh (macOS environment)
- result: 0 errors, 0 warnings
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped
- was this the actual shell provided by the environment: Yes (zsh on macOS)

## Known Issues

- None.
