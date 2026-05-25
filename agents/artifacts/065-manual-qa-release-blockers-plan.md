# Plan: Manual QA Pass and Release Blocker Fixes

## Overview

Run a systematic QA audit across the entire app to identify and fix critical defects before MVP release. The Dev agent will execute a structured checklist covering every major feature area (workspaces, blocks, rows, cells, formatting, sorting, clipboard, alerts, theme, autosave), run code-level audits (dead code, error handling, accessibility, lint, types, tests), and fix any critical blockers found. This is the final P1 ticket — after this, MVP Core should be shippable.

## Prerequisites

- All prior feature tickets (TICKET-001 through TICKET-064) are complete
- Current state: lint passes clean, 319 tests pass, TypeScript has zero errors
- Dev environment can run the app via `npm run tauri dev` or `npm run dev` (Vite-only)

## Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Create | `agents/artifacts/065-manual-qa-release-blockers-complete.md` | Dev's completion artifact with findings and fixes |
| Modify | Various `src/` files | Targeted fixes for any critical defects found during QA |
| Modify | Various `src/tests/` files | Tests for any new fixes |

No new files are expected unless a fix requires one. The Dev agent should not create new features, refactor subsystems, or restructure code. Fixes should be minimal and targeted.

## Implementation Steps

### Step 1: Verification Baseline

Before any QA work, confirm the project compiles and tests pass:

1. Run `npx tsc --noEmit` — must produce zero errors
2. Run `npm run lint` — must produce zero warnings
3. Run `npm run test -- --run` — all tests must pass
4. Record baseline counts (test count, any warnings)

**Verify**: All three commands pass cleanly. If any fail, fix them first before proceeding.

### Step 2: Code-Level Audit

Perform a static code audit across the source tree. For each category below, scan all non-test source files under `src/`.

#### 2a: Dead Code and Unused Imports

- Grep for unused imports (TypeScript compiler and lint should catch most, but verify manually for re-exports or barrel files that mask unused code)
- Search for `TODO` comments — if any exist, determine whether they represent deferred work (acceptable) or forgotten incomplete work (blocker)
- Search for `console.log` or `console.warn` — remove any that are debug-only; keep any that are part of intentional error reporting
- Search for commented-out code blocks — remove them

**Verify**: `grep -rn 'console\.\(log\|warn\|debug\)' src/ --include='*.ts' --include='*.tsx' | grep -v 'tests/'` returns only intentional error-path logging. `grep -rn 'TODO\|FIXME\|HACK\|XXX' src/ --include='*.ts' --include='*.tsx' | grep -v 'tests/'` returns zero or only clearly-deferred items.

#### 2b: Error Handling Audit

Review error handling at system boundaries:

- **Storage service** (`src/services/storage/storageService.ts`): Verify that `loadAppData`, `saveAll`, and individual workspace save/load functions handle filesystem errors (missing files, permission errors, corrupt JSON) without crashing. Verify atomic write (temp + rename) is implemented.
- **Bootstrap** (`src/services/storage/bootstrapData.ts`): Verify first-launch behavior creates valid initial state. Verify recovery from missing/corrupt settings or workspace index.
- **Store initialization** (`src/stores/documentStore.ts`): Verify `initializeAppData` handles storage failures gracefully (doesn't leave store in half-initialized state).
- **Autosave** (`src/stores/documentStore.ts`): Verify save failure doesn't discard in-memory state, and retry path exists.

**Verify**: Read each file and confirm error paths exist. No new error handling needs to be added unless a path is genuinely missing (e.g., an unhandled promise rejection that would crash the app).

#### 2c: Type Safety Spot Check

- Verify no `any` types in domain logic (`src/domain/`) or store files (`src/stores/`)
- Verify cell value update functions in `documentStore.ts` validate that the column type matches the expected value type before mutating
- Verify column type change (`changeColumnType`) runs proper value conversion for existing cells

**Verify**: `grep -rn ': any\|as any' src/domain/ src/stores/ --include='*.ts'` returns zero or only justified uses.

### Step 3: Feature Area QA Checklist

For each feature area, the Dev agent should read the relevant source files and verify correctness against the spec. Where a bug is found, fix it and add a test if feasible.

#### 3a: Dock / Workspace List

Source files: `src/components/workspace/WorkspaceCard.tsx`, `src/components/layout/LeftDock.tsx`, `src/stores/documentStore.ts` (workspace actions)

| # | Check | What to verify |
|---|-------|----------------|
| 1 | Workspace rendering | Workspace cards render with correct title, accent stripe color, and background color from store state |
| 2 | Workspace selection | Clicking a workspace card updates `uiStore.activeWorkspaceId` and `documentStore.activeWorkspaceId`; main pane shows correct workspace content |
| 3 | Workspace creation | Creating a new workspace adds it to the index, creates a valid workspace document with no blocks, selects it, and triggers save |
| 4 | Workspace rename | Renaming via context menu updates both the index and the dock display; empty string or whitespace-only name is handled (rejected or trimmed) |
| 5 | Workspace delete | Deleting a workspace removes it from the index and the store; if the deleted workspace was active, another workspace is selected (or the app handles the empty state); undo restores it |
| 6 | Workspace reorder | Drag reorder updates order values correctly; order persists after save/reload |
| 7 | Workspace styling | Context menu color changes (background, text, accent stripe) apply visually and persist |
| 8 | No orphaned data | Deleting a workspace does not leave its blocks/rows in the document store |

#### 3b: Block Editing

Source files: `src/components/block/BlockCard.tsx`, `src/components/block/BlockHeader.tsx` (if exists), `src/components/block/BlockContextMenu.tsx`, `src/components/block/BlockTemplateMenu.tsx`, `src/domain/templates/blockTemplates.ts`

| # | Check | What to verify |
|---|-------|----------------|
| 1 | Block creation from template | Each template (checklist, bullet, numbered) creates a valid block with correct default columns; block appears in the workspace canvas |
| 2 | Block title edit | Title is editable inline; empty/whitespace title is handled; edit commits on blur or Enter; undo restores previous title |
| 3 | Block collapse/expand | Collapse hides row content, preserves header; expand restores; collapsed state persists after save/reload |
| 4 | Block reorder | Drag reorder within a workspace works; order values update correctly; persists after save/reload |
| 5 | Block move to workspace | Moving a block via context menu removes it from the source workspace and adds it to the target; block content (rows, columns, formatting) is fully preserved; undo restores it to the original workspace |
| 6 | Block delete | Delete removes the block and all its rows; undo restores the full block; no orphaned row/column data in the store |
| 7 | Block context menu | All menu items (rename, move, collapse/expand, sort, delete) function correctly and dismiss the menu after action |

#### 3c: Row / Cell Editing

Source files: `src/components/row/RowView.tsx`, `src/components/row/RowContextMenu.tsx`, `src/components/cell/*.tsx`, `src/domain/rows/`, `src/stores/documentStore.ts` (row/cell actions)

| # | Check | What to verify |
|---|-------|----------------|
| 1 | Row add | Adding a row creates a new row with correct default cell values for all columns in the block |
| 2 | Row insert above/below | Insert operations place the new row at the correct position; order values are correct |
| 3 | Row delete | Delete removes the row; undo restores it with all cell values intact |
| 4 | Row reorder | Drag reorder updates order correctly; row identity (id) is preserved; persists after save/reload |
| 5 | Text cell editing | Typing in a text cell updates the value; commit on blur/Enter creates an undo entry; multi-line text (if wrapping is supported) renders correctly |
| 6 | Checkbox cell | Click toggles boolean value immediately; strikeout-on-check applies when column setting is enabled; move-to-bottom applies when enabled; undo restores previous state |
| 7 | Date cell | Text entry accepted; invalid date shows error styling (not crash); valid date persists correctly |
| 8 | Time cell | Text entry accepted; invalid time shows error styling; valid time persists correctly |
| 9 | Dropdown cell | Click opens option list; selecting an option updates value; empty/null value handled |
| 10 | Bullet cell | Marker renders; no editable text in bullet column itself; adjacent text column is editable |
| 11 | Numbered cell | Marker renders with correct sequential number; numbers update when rows reorder |
| 12 | Row context menu | All items (insert above/below, cut, copy, paste, delete, format row) work and dismiss correctly |

#### 3d: Column Management

Source files: `src/components/block/ColumnContextMenu.tsx`, `src/components/block/BlockColumnHeaderRow.tsx`, `src/domain/columns/`

| # | Check | What to verify |
|---|-------|----------------|
| 1 | Column add left/right | Adds a column at the correct position; existing rows gain a default cell for the new column |
| 2 | Column delete | Removes the column; cell data for that column is removed from all rows; undo restores |
| 3 | Column rename | Updates column label; reflected in header row display |
| 4 | Column move left/right | Reorder updates column order values; visual order matches |
| 5 | Column type change | Changes type and runs value conversion for existing cells; e.g., text → checkbox converts non-empty to true; checkbox → text converts boolean to string |
| 6 | Column settings | Checkbox settings (strikeout, move-to-bottom), date/time alert toggle, dropdown options are editable and persist |
| 7 | Column resize | Width changes apply visually and persist (if TICKET-038 is implemented) |

#### 3e: Formatting and Inspector

Source files: `src/components/layout/InspectorShell.tsx`, `src/components/layout/TextFormattingControls.tsx`, `src/components/layout/BorderFormattingControls.tsx`, `src/domain/formatting/`

| # | Check | What to verify |
|---|-------|----------------|
| 1 | Selection model | Selecting a block, column, row, or cell updates the inspector target correctly; only one target active at a time |
| 2 | Text formatting | Font family, font size, bold, italic, underline, text color, fill color controls apply to the selected target and are visible immediately |
| 3 | Border formatting | Border width, color, and edge toggles apply correctly |
| 4 | Formatting inheritance | Cell inherits from row → column → block → app defaults; overrides at lower levels take precedence |
| 5 | Formatting persistence | Formatting changes survive save/reload; empty override objects are omitted from saved data |
| 6 | Inspector no-selection state | Inspector shows appropriate content when nothing is selected (not blank or broken) |
| 7 | Inspector target summary | Target summary correctly identifies the selected entity type and name |

#### 3f: Sorting

Source files: `src/domain/sorting/`, `src/stores/documentStore.ts` (sortBlockRows)

| # | Check | What to verify |
|---|-------|----------------|
| 1 | Sort by text | Rows sort alphabetically; locale-aware comparison |
| 2 | Sort by checkbox | Unchecked before checked |
| 3 | Sort by date | Valid dates sort chronologically; null/invalid values sort last |
| 4 | Sort by time | Valid times sort correctly; null/invalid values sort last |
| 5 | Sort by dropdown | Sorts alphabetically by option string |
| 6 | Sort preserves identity | Row ids are unchanged after sort; only order values change |
| 7 | Sort is undoable | Undo after sort restores previous row order |
| 8 | Sort menu | Sort menu shows available columns; triggering sort from menu works |

#### 3g: Clipboard

Source files: `src/domain/clipboard/`, `src/hooks/useHotkeys.ts`, `src/stores/documentStore.ts` (clipboard actions)

| # | Check | What to verify |
|---|-------|----------------|
| 1 | Plain text copy/paste | Ctrl+C in a text cell copies plain text to OS clipboard; Ctrl+V pastes plain text from OS clipboard |
| 2 | Row copy/paste | Copy row via context menu or hotkey; paste inserts the row with new ids; cell values preserved |
| 3 | Row cut/paste | Cut row removes it from source; paste inserts it at target location |
| 4 | Cross-block paste | Pasting a row into a block with compatible columns maps values correctly; incompatible columns get default values |
| 5 | Paste with no clipboard data | Paste when clipboard is empty does nothing (no crash or error) |
| 6 | Hotkeys | Ctrl+Z undo, Ctrl+Y redo, Ctrl+C copy, Ctrl+X cut, Ctrl+V paste, Delete key all function in correct contexts |

#### 3h: Alerts

Source files: `src/domain/alerts/`, `src/hooks/useAlertScheduler.ts`, `src/hooks/useAlertNavigation.ts`, `src/components/workspace/WorkspaceCard.tsx` (alert badge), `src/stores/uiStore.ts` (alert state)

| # | Check | What to verify |
|---|-------|----------------|
| 1 | Date alert evaluation | Date-only cells with alertsEnabled become due at 9:00 AM local time on the saved date; past dates are overdue |
| 2 | Time alert evaluation | Time-only cells with alertsEnabled are due on the current day at the saved time |
| 3 | Invalid value handling | Invalid date/time strings never trigger alerts |
| 4 | Completed row suppression | Rows with a checked checkbox suppress alerts even if date/time is due |
| 5 | Dock badge | Workspace card shows alert badge/count when alerts are active; badge clears when alerts resolve |
| 6 | Alert navigation | Clicking an alerted workspace navigates to it; the target block/row is scrolled into view and briefly highlighted |
| 7 | No repeated flash | Repeated alert scheduler ticks do not re-trigger flash animation for the same unresolved alert |
| 8 | Scheduler interval | Alert scheduler runs on startup and at regular intervals (~30-60s); also re-evaluates on date/time cell edits |

#### 3i: Theme

Source files: `src/hooks/useTheme.ts`, `src/components/settings/SettingsPage.tsx`, `src/styles/`

| # | Check | What to verify |
|---|-------|----------------|
| 1 | Light/dark switching | Theme toggle switches between light and dark modes; all UI regions update correctly |
| 2 | Theme persistence | Selected theme persists after save/reload |
| 3 | CSS variable coherence | All themed UI elements use CSS variables or Tailwind dark: variants consistently; no hardcoded colors that break in one mode |
| 4 | Contrast | Text is readable in both modes; focus states and selection highlights are visible |

#### 3j: Autosave and Dirty State

Source files: `src/stores/documentStore.ts` (autosave logic), `src/components/layout/SaveStatusIndicator.tsx`, `src/stores/historyStore.ts`

| # | Check | What to verify |
|---|-------|----------------|
| 1 | Dirty tracking | Making an edit marks the document as dirty; saving clears the dirty flag |
| 2 | Autosave debounce | Changes trigger save after the debounce interval (~500-1000ms); rapid edits reset the timer |
| 3 | Save status indicator | UI shows current save state (saved, saving, error) accurately |
| 4 | Save after undo/redo | Undoing or redoing triggers autosave correctly; the saved state matches the current document state |
| 5 | Save failure handling | If save fails, in-memory state is preserved; error is surfaced to user; retry path exists |
| 6 | Undo after save | Undoing after a successful save correctly restores previous state and marks dirty again |

#### 3k: Undo/Redo

Source files: `src/stores/historyStore.ts`, `src/stores/documentStore.ts` (mutation options)

| # | Check | What to verify |
|---|-------|----------------|
| 1 | Basic undo/redo | Undo restores previous state; redo restores the undone state |
| 2 | Transaction boundaries | Typing commits on blur/Enter (not per-keystroke); drag creates one entry on drop; sort creates one entry; formatting creates one entry per committed action |
| 3 | History depth | History is capped at a reasonable depth (target: 100); oldest entries are dropped when cap is exceeded |
| 4 | Cross-entity undo | Undo works across workspace, block, row, column, and formatting operations |
| 5 | Redo stack clearing | Making a new edit after undo clears the redo stack |

### Step 4: Accessibility Spot Check

This is not a full WCAG audit but a baseline check for desktop usability:

| # | Check | What to verify |
|---|-------|----------------|
| 1 | Focus states | Interactive elements (buttons, inputs, cells) have visible focus rings/outlines |
| 2 | Keyboard operability | Tab moves focus between major regions; Enter/Space activates buttons; Escape closes menus |
| 3 | ARIA labels | Icon-only buttons have `aria-label` or `title`; context menus use appropriate ARIA roles |
| 4 | Tooltips | Icon-only toolbar buttons (undo, redo, add block, inspector toggle) have tooltips |

### Step 5: Fix Critical Defects

For any issue found in Steps 2-4:

1. **Classify severity**:
   - **Critical (must fix)**: Crash, data loss, data corruption, UI completely broken in normal use path
   - **High (should fix)**: Incorrect behavior that affects usability but doesn't lose data
   - **Medium (fix if time allows)**: Visual inconsistency, missing edge-case handling, incomplete error message
   - **Low (note only)**: Polish, minor visual issue, non-blocking behavior

2. **Fix critical and high severity issues**. For each fix:
   - Make the minimal targeted change
   - Add a test if the fix is testable
   - Verify the fix doesn't break existing tests

3. **Document medium and low issues** in the complete artifact for future backlog consideration.

### Step 6: Final Verification

After all fixes are applied:

1. Run `npx tsc --noEmit` — must pass
2. Run `npm run lint` — must pass with zero warnings
3. Run `npm run test -- --run` — all tests must pass (including any new tests)
4. Record final counts and compare to baseline

**Verify**: All three commands pass cleanly. Test count should be >= baseline.

## Data / Storage Changes

None expected. This is a QA and fix pass, not a feature. If a fix requires a data shape change, it must be backward-compatible and documented in the complete artifact.

## UI Specifications

No new UI components. Fixes may adjust existing component behavior, styling, or error states.

## Acceptance Criteria

- [ ] Verification baseline recorded (Step 1)
- [ ] Code-level audit completed (Step 2) — dead code removed, error paths verified, no unsafe `any` types
- [ ] All feature area checklists completed (Step 3a-3k) — each item marked pass/fail
- [ ] Accessibility spot check completed (Step 4)
- [ ] All critical defects found are fixed with tests where feasible (Step 5)
- [ ] All high-severity defects found are fixed (Step 5)
- [ ] Medium/low issues documented in complete artifact (Step 5)
- [ ] Final verification passes (Step 6) — tsc, lint, and all tests pass
- [ ] No known crash, data-loss, or corruption issues remain in normal use paths

## Estimated Complexity

- **Large** — systematic audit across ~80 source files plus targeted fixes
- Estimated file changes: 0-15 files modified (depending on defects found)
- No new features; all changes are fixes within existing patterns
