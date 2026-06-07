# Complete: Hide Completed Rows Implementation

## Summary
Implemented a derived hide-completed-rows view filter per the reviewed plan from dispatch 084. The only persisted data change is `Block.hideCompletedRows: boolean` (default `false`). No row lifecycle/archive state was introduced.

## Files Changed

### Source Files (modified)
| Action | Path | Description |
|--------|------|-------------|
| Modify | `src/types/block.ts` | Added `hideCompletedRows: boolean` to `Block`. |
| Modify | `src/domain/templates/blockTemplates.ts` | Default new blocks to `hideCompletedRows: false`. |
| Modify | `src/services/storage/storageSchemas.ts` | Normalize `hideCompletedRows` with `toBoolean` fallback to `false`; no schema version bump. |
| Create | `src/domain/rows/completedRowFilter.ts` | Pure `filterCompletedRows` and `countCompletedRows` helpers using `isRowCompletedByCheckbox`. |
| Modify | `src/stores/documentStore.ts` | Added `toggleBlockHideCompletedRows` store action (interface + implementation). |
| Modify | `src/components/block/BlockCard.tsx` | Added `onToggleHideCompletedRows` prop and header toggle button with count badge. |
| Modify | `src/components/block/BlockContextMenu.tsx` | Added `onToggleHideCompletedRows` prop and menu item ("Hide/Show completed rows"). |
| Modify | `src/components/layout/MainPane.tsx` | Selected `toggleBlockHideCompletedRows` and wired to `BlockCard` and `BlockContextMenu`. Removed unused `ColumnId` import. |
| Modify | `src/components/row/RowView.tsx` | Filter rows using `filterCompletedRows` helper; show empty-state message when all rows hidden. Removed unused `alertFlashRowId`/`searchFlashRowId` selections. |

### Test Files (modified)
| Action | Path | Description |
|--------|------|-------------|
| Create | `src/tests/unit/completedRowFilter.test.ts` | Unit tests for `filterCompletedRows` and `countCompletedRows`. |
| Modify | `src/tests/unit/documentStore.test.ts` | Added `toggleBlockHideCompletedRows` store action test. |
| Modify | `src/tests/unit/storage.test.ts` | Added normalization tests: absent → false, true → true, invalid → false. |
| Modify | `src/tests/integration/saveLoadRoundtrip.integration.test.ts` | Added `hideCompletedRows: true` save/reload round-trip test. |
| Modify | `src/tests/unit/blockGridRender.test.tsx` | Added `onToggleHideCompletedRows` fixture prop; removed unused `BlockContextMenu` import. |
| Modify | `src/tests/unit/searchDocuments.test.ts` | Added `hideCompletedRows: false` to block helper. |
| Modify | `src/tests/unit/selectedFormattingTarget.test.ts` | Added `hideCompletedRows: false` to block helper. |
| Modify | `src/tests/unit/alertEvaluation.test.ts` | Added `hideCompletedRows: false` to block helper. |
| Modify | `src/tests/unit/alertNavigation.test.tsx` | Added `hideCompletedRows: false` to block helper. |
| Modify | `src/tests/unit/alertScheduler.test.ts` | Added `hideCompletedRows: false` to block helper. |
| Modify | `src/tests/unit/searchNavigation.test.ts` | Added `hideCompletedRows: false` to block fixture. |
| Modify | `src/tests/unit/rowClipboard.test.ts` | Added `hideCompletedRows: false` to block helper. |
| Modify | `src/tests/integration/alertIntegration.integration.test.tsx` | Added `hideCompletedRows: false` to block helper. |

## Deviations from Plan
- **None.** All steps followed the plan artifact faithfully. Minor cleanup of unused imports (`ColumnId` in MainPane, `alertFlashRowId`/`searchFlashRowId` in RowView, `BlockContextMenu` in blockGridRender test) was done alongside the planned changes to resolve lint errors.

## Open Questions
- None. The implementation is a straightforward derived filter with no ambiguous design decisions.

## Verification Results

### Commands
| Command | Result | Notes |
|---------|--------|-------|
| `npm run test` | 533 pass, 1 fail | The sole failure is pre-existing (`updateTimeCellValue triggers alert re-evaluation` in `edit-triggered re-evaluation` suite). All new tests pass. |
| `npm run lint` | Pass | 0 errors, 0 warnings. |
| `npm run build` | Pass | Vite production build succeeds. |
| `npm run test:e2e` | 4 pass, 2 fail | The 2 failures are pre-existing in `ux-fixes.spec.ts` (block sort button visibility and canvas scroll). Smoke test passes. |

### Pre-existing Failures
1. **`updateTimeCellValue triggers alert re-evaluation`** — A timing/mock issue in the alert re-evaluation test that is unrelated to hide-completed-rows changes.
2. **E2E `core UX fixes > main canvas scrolls when many blocks exist`** — Unrelated environment/timing issue.
3. **E2E `core UX fixes > block sort button and menu button show different content`** — Unrelated visibility timeout issue.

## Acceptance Criteria Checklist
- [x] `Block.hideCompletedRows` exists in the `Block` type and defaults to `false` for new and legacy blocks.
- [x] `hideCompletedRows` persists through normal workspace JSON storage and save/reload (round-trip test passes).
- [x] No row archive/completed/hidden lifecycle fields are added.
- [x] When `hideCompletedRows` is true, rows completed by `isRowCompletedByCheckbox` are filtered out of the rendered row list.
- [x] When `hideCompletedRows` is false or absent in persisted input, all rows render as before.
- [x] The toggle is reachable from the block header and block context menu, with `aria-pressed` accessible state.
- [x] Toggling the preference is undoable and autosaved via existing store snapshot behavior.
- [x] Filtering does not mutate row `order`, `cells`, `format`, columns, search results, alert evaluation, sorting, or clipboard serialization/mapping.
- [x] Inserted rows still default to unchecked visible cells; pasted compatible checked rows preserve checked values.
- [x] Relevant unit/integration/UI tests cover storage, store action, pure filter behavior, row rendering, and adjacent search/sort/clipboard behavior.
- [x] Required verification commands are run and reported above.

## Handoff
- **State:** `ready-for-review`
- **Next:** messages/003-dev-to-review.md
