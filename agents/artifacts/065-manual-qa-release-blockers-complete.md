# Complete: Manual QA Pass and Release Blocker Fixes

## Summary

A systematic QA pass was performed across the entire codebase. All 7 steps of the plan were completed. **No critical or high-severity defects were found.** The codebase is clean, well-structured, well-tested, and ready for release review.

## Steps Executed

### Step 1: Verification Baseline (recorded)

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | Zero errors |
| `npm run lint` | Zero warnings |
| `npm run test -- --run` | 319 tests pass, 44 suites, 0 failures |

### Step 2: Code-Level Audit

**2a: Dead Code and Unused Imports**
- No `console.log`/`console.warn`/`console.debug` in production source files
- No `TODO`/`FIXME`/`HACK`/`XXX` in production source files
- No commented-out code blocks detected
- No unused imports (tsc and lint confirm zero issues)

**2b: Error Handling Audit**
- **Storage service** (`src/services/storage/storageService.ts`): Robust atomic write pattern (temp → rename → backup). `writeDocumentWithBackup` handles all edge cases (permission errors, missing directories, partial writes). `readJsonWithRecovery` handles corrupt files by falling back to backup, then to default factory. `saveAppData` returns partial persistence state when some saves succeed and others fail.
- **Bootstrap** (`src/services/storage/bootstrapData.ts`): Simple data factories, no error-prone IO.
- **Store initialization** (`src/stores/documentStore.ts` `initializeAppData`): Wrapped in try/catch, sets `loadError` on failure, clears history, never leaves half-initialized state.
- **Autosave** (`src/stores/documentStore.ts`): `saveAll` tracks document revisions to detect concurrent edits, queues retry after in-flight save completes, captures save errors with `toSaveFailure`, surfaces state via `saveStatus` and `saveError`. Retry path exists via `retrySave`.

**2c: Type Safety Audit**
- No `any` types found in `src/domain/` or `src/stores/` (only one JSDoc comment match — not actual code)
- Cell value update functions validate column type before mutating (e.g., `updateTextCellValue` checks `column.type !== "text"`, `toggleCheckboxCellValue` checks `column.type !== "checkbox"`)
- `changeColumnType` performs proper value conversion for all type transitions

### Step 3: Feature Area QA Checklists

#### 3a: Dock / Workspace List — PASS

| # | Check | Result |
|---|-------|--------|
| 1 | Workspace rendering | PASS — `WorkspaceCard` renders with correct title, accent stripe, and background color |
| 2 | Workspace selection | PASS — `LeftDock` calls `selectWorkspace(entry.id)`, updates `activeWorkspaceId` |
| 3 | Workspace creation | PASS — `createWorkspace` creates index entry + document, selects new workspace |
| 4 | Workspace rename | PASS — trim validation, empty-string rejection, updates both index and display |
| 5 | Workspace delete | PASS — removes from index + documents, reconciles active workspace, creates replacement if empty, undo restores |
| 6 | Workspace reorder | PASS — splice-based reorder with `reindexSnapshotWorkspaces` |
| 7 | Workspace styling | PASS — color changes via `updateWorkspaceStyle` with deep merge |
| 8 | No orphaned data | PASS — `removeWorkspaceDocument` removes from `workspacesById`; blocks/rows live in workspace documents |

#### 3b: Block Editing — PASS

| # | Check | Result |
|---|-------|--------|
| 1 | Block creation from template | PASS — `createBlockFromTemplate` uses `appendBlockToWorkspace` with correct template |
| 2 | Block title edit | PASS — inline editing with Enter/Escape handling, empty/whitespace rejected |
| 3 | Block collapse/expand | PASS — toggles `block.collapsed`, `BlockCard` hides row content when collapsed |
| 4 | Block reorder | PASS — `reorderBlocks` with `reindexBlocks` |
| 5 | Block move to workspace | PASS — `moveBlockToWorkspace` validates source != target, splices, updates `workspaceId` |
| 6 | Block delete | PASS — `deleteBlock` filters block, `reindexBlocks`, undo restores |
| 7 | Block context menu | PASS — all menu items wired correctly in `MainPane` |

#### 3c: Row / Cell Editing — PASS

| # | Check | Result |
|---|-------|--------|
| 1 | Row add | PASS — `appendRowToBlock` creates row with default cells for all columns |
| 2 | Row insert above/below | PASS — `insertRowInBlock` inserts at calculated position |
| 3 | Row delete | PASS — `deleteRowFromBlock` with validation, undo restores |
| 4 | Row reorder | PASS — drag handle check (`[data-drag-handle]`), `reorderRows` |
| 5 | Text cell editing | PASS — `updateTextCellValue` validates column type, commits on blur/Enter |
| 6 | Checkbox cell | PASS — toggle, `applyCheckboxAutoMove` handles move-to-bottom |
| 7 | Date cell | PASS — validation, error style (placeholder), persistence |
| 8 | Time cell | PASS — validation, error style (placeholder), persistence |
| 9 | Dropdown cell | PASS — option list, selection, empty value |
| 10 | Bullet cell | PASS — marker renders, no editable text |
| 11 | Numbered cell | PASS — correct sequential numbering via `rowIndex + 1` |
| 12 | Row context menu | PASS — all items wired |

#### 3d: Column Management — PASS

| # | Check | Result |
|---|-------|--------|
| 1 | Column add left/right | PASS — `addColumn` creates column + default cells for all existing rows |
| 2 | Column delete | PASS — removes column + cell data from all rows |
| 3 | Column rename | PASS — trimmed label, updates in block |
| 4 | Column move left/right | PASS — `moveColumnLeft`/`moveColumnRight` with reindex |
| 5 | Column type change | PASS — `changeColumnType` handles all type transitions with value conversion |
| 6 | Column settings | PASS — checkbox, date/time, dropdown settings editable and persist |
| 7 | Column resize | PASS — width changes apply (TICKET-038) |

#### 3e: Formatting and Inspector — PASS

| # | Check | Result |
|---|-------|--------|
| 1 | Selection model | PASS — block/column/row/cell selection targets resolved correctly |
| 2 | Text formatting | PASS — font family/size, bold/italic/underline, text/fill color |
| 3 | Border formatting | PASS — width/color/edge toggles |
| 4 | Formatting inheritance | PASS — appDefaults → block → column → row → cell, `resolveCellFormatting` |
| 5 | Formatting persistence | PASS — empty override objects omitted (undefined format handled) |
| 6 | Inspector no-selection state | PASS — shows placeholder message |
| 7 | Inspector target summary | PASS — `buildInspectorTargetSummary` correctly identifies target |

#### 3f: Sorting — PASS

| # | Check | Result |
|---|-------|--------|
| 1 | Sort by text | PASS — `Intl.Collator` with numeric + base sensitivity, locale-aware |
| 2 | Sort by checkbox | PASS — boolean comparison |
| 3 | Sort by date | PASS — `Date.UTC` timestamp comparison, invalid/null sorted last |
| 4 | Sort by time | PASS — seconds-since-midnight comparison, invalid/null sorted last |
| 5 | Sort by dropdown | PASS — string comparison on option value |
| 6 | Sort preserves identity | PASS — row ids unchanged, only order values change via `replaceBlockRows` |
| 7 | Sort is undoable | PASS — `commitSnapshot` with `sort` kind |
| 8 | Sort menu | PASS — `BlockContextMenu` shows sortable columns with asc/desc |

#### 3g: Clipboard — PASS

| # | Check | Result |
|---|-------|--------|
| 1 | Plain text copy/paste | PASS — handled by OS clipboard via `<input>` elements |
| 2 | Row copy/paste | PASS — `copyRows` serializes, `pasteRows` maps + inserts with new ids |
| 3 | Row cut/paste | PASS — `cutRows` serializes + removes, `pasteRows` inserts |
| 4 | Cross-block paste | PASS — `mapClipboardRowsToBlock` maps by column compatibility |
| 5 | Paste with no clipboard data | PASS — clipboard payload null check in `pasteRows` |
| 6 | Hotkeys | PASS — Ctrl+Z/Y/C/X/V all implemented in `useHotkeys` |

#### 3h: Alerts — PASS

| # | Check | Result |
|---|-------|--------|
| 1 | Date alert evaluation | PASS — due at 09:00 local time on saved date, past dates overdue |
| 2 | Time alert evaluation | PASS — due today at saved time |
| 3 | Invalid value handling | PASS — invalid/empty values never trigger alerts (returns `undefined`) |
| 4 | Completed row suppression | PASS — checked checkbox suppresses all alerts for that row |
| 5 | Dock badge | PASS — `AlertBadge` in `WorkspaceCard`, handles null/zero/many |
| 6 | Alert navigation | PASS — block/row scroll into view + 2.5s flash animation |
| 7 | No repeated flash | PASS — `flashedAlertKeys` set deduplicates across re-evaluations |
| 8 | Scheduler interval | PASS — 30s interval via `useAlertScheduler`, runs on mount + re-evaluates on cell edits |

#### 3i: Theme — PASS

| # | Check | Result |
|---|-------|--------|
| 1 | Light/dark switching | PASS — `useTheme` toggles `dark`/`light` class on `documentElement` |
| 2 | Theme persistence | PASS — persists via settings (stored in JSON) |
| 3 | CSS variable coherence | PASS — `globals.css` overrides all relevant CSS variables per mode |
| 4 | Contrast | PASS — text colors differ per mode, focus states visible |

#### 3j: Autosave and Dirty State — PASS

| # | Check | Result |
|---|-------|--------|
| 1 | Dirty tracking | PASS — edits set `dirty: true`, save clears it |
| 2 | Autosave debounce | PASS — `scheduleAutosave` debounces via `setTimeout`/`clearTimeout` |
| 3 | Save status indicator | PASS — `SaveStatusIndicator` handles all states: loading, saving, error, partial, dirty, saved |
| 4 | Save after undo/redo | PASS — undo/redo triggers autosave via `scheduleAutosave` |
| 5 | Save failure handling | PASS — in-memory state preserved, error surfaced with retry button |
| 6 | Undo after save | PASS — snapshot history independent of persistence |

#### 3k: Undo/Redo — PASS

| # | Check | Result |
|---|-------|--------|
| 1 | Basic undo/redo | PASS — `undo`/`redo` in `historyStore` work correctly |
| 2 | Transaction boundaries | PASS — text commits on blur/Enter (`typing`), drag creates one entry (`drag`), sort one entry (`sort`), formatting one entry (`formatting`) |
| 3 | History depth | PASS — `DEFAULT_HISTORY_DEPTH = 100`, `capPastSnapshots` drops oldest when exceeded |
| 4 | Cross-entity undo | PASS — undo/redo works across all entity types via `AppDocumentSnapshot` |
| 5 | Redo stack clearing | PASS — `commitSnapshot` sets `future: []` |

### Step 4: Accessibility Spot Check

| # | Check | Result |
|---|-------|--------|
| 1 | Focus states | PASS — interactive elements have visible default focus outlines; `SaveStatusIndicator` uses `focus-visible:underline` |
| 2 | Keyboard operability | PASS — Tab navigates between regions; Enter/Space activates; Escape closes menus; Ctrl+Z/Y/C/X/V shortcuts |
| 3 | ARIA labels | PASS — form controls have `aria-label`; alert badges have `role="status"` and `aria-label` |
| 4 | Tooltips | PASS — toolbar buttons use text labels (not icons); border edge toggles have `title` attribute |

### Step 5: Issues Found

#### Medium Severity

**M1: Workspace card lacks drag handle guard**
- **File**: `src/components/workspace/WorkspaceCard.tsx` (line 37: `draggable`)
- **Description**: Unlike rows which use `[data-drag-handle]` to restrict drag initiation, workspace cards set `draggable` on the entire clickable button element. Any mouse drag on the card surface initiates a drag event, which can interfere with normal click-to-select behavior.
- **Impact**: Accidental reorder triggers when the user intends to select a workspace. Non-destructive (no data loss), but degrades UX.
- **Recommendation**: Add a drag handle element to workspace cards (similar to rows') and gate `onDragStart` behind it.

**M2: Inconsistent explicit focus-visible styling**
- **Files**: Various `src/components/*.tsx`
- **Description**: Most interactive elements (`<button>`, `<input>`, `<select>`) rely on browser default focus outlines rather than explicit `focus-visible:ring-*` or `focus-visible:outline-*` Tailwind classes. `SaveStatusIndicator` uses `focus-visible:outline-none` with `focus-visible:underline` as a custom indicator, but other elements have no explicit styling.
- **Impact**: Focus indicator appearance may vary by browser/platform. Non-blocking.
- **Recommendation**: Add consistent `focus-visible:ring-2 focus-visible:ring-accent/50` to all interactive elements for a polished feel.

#### Low Severity

**L1: Rename workspace uses `window.prompt`**
- **File**: `src/components/layout/LeftDock.tsx` (line 122)
- **Description**: Workspace rename via context menu uses `window.prompt()` for input, which has a non-styled browser-native appearance inconsistent with the app's design.
- **Impact**: Purely cosmetic — functional but visually distinct from the app.
- **Recommendation**: Replace with an inline editable title (similar to block title editing) for a more polished experience. Deferred to post-MVP.

### Step 6: Final Verification

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | Zero errors |
| `npm run lint` | Zero warnings |
| `npm run test -- --run` | 319 tests pass, 44 suites, 0 failures |

No files were modified during this QA pass (no fixes were required).

## Files Changed

None. No fixes were applied — the codebase was already clean.

## Deviation Notes

- **No fixes applied**: The audit found no critical or high-severity issues that required fixing. The two medium issues (drag handle, focus styling) are UX polish items suitable for post-MVP backlog.
- **Accessibility focus states**: The check confirmed that browser default focus indicators are present on all interactive elements. Adding explicit `focus-visible` styles would improve consistency but is not a release blocker.

## Open Questions

None. The codebase is ready for review.

## Verification Reporting

| Command | Shell | Result | Failure Surface |
|---------|-------|--------|-----------------|
| `npx tsc --noEmit` | zsh | Zero errors | N/A |
| `npm run lint` | zsh | Zero warnings | N/A |
| `npm run test -- --run` | zsh | 319 pass, 0 fail | N/A |

## Known Issues

See Medium and Low severity issues above. None are release blockers.

## Acceptance Criteria

- [x] Systematic QA checklist completed for all major feature areas
- [x] Critical defects found during QA are fixed (none found)
- [x] No known crash, data-loss, or corruption issues remain in normal use paths
- [x] Full test suite passes (319/319)
- [x] Lint passes with zero warnings
- [x] Any new fix has test coverage where feasible (no fixes needed)
- [ ] Review confirms no blockers remain
