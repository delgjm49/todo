# Plan: Integration tests for critical editing flows

## Overview

Add a new `src/tests/integration/` directory with six integration test files that exercise the
critical editing workflows end-to-end inside the renderer process. The tests drive the real
`useDocumentStore` / `useUiStore` / `useHistoryStore` together with a real `StorageService`
backed by the in-memory storage backend, so they cover multi-store coordination, autosave
debouncing, and full save → reload round-trips that the existing unit suite tests in
isolation. UI-layer integration is covered for the two flows that span multiple components
(row editing through `MainPane`, and alert evaluation → dock indicator → navigation highlight).

## Prerequisites

- TICKET-018 (Workspace CRUD UI), TICKET-024 (Block CRUD), TICKET-035 (Row editing),
  TICKET-044 (Formatting persistence), TICKET-012 (History / undo-redo), TICKET-063
  (Autosave + dirty-state UX) — all complete (per backlog).
- No production code changes required. If a missing `data-testid` is discovered during
  implementation, Dev should add a single `data-testid` rather than adding new test hooks.

## Deviation from dispatch wording — call out for Dev

The dispatch lists "Vitest with React Testing Library" as the test framework. The repo
actually runs Node's built-in test runner (`node:test`) via
`scripts/run-tests.mjs` against `.test-dist`, with React Testing Library used only for its
`fireEvent` helper inside the JSDOM harness (see `src/tests/unit/rowEditing.test.tsx`).
**Use the existing `node:test` pattern for these integration tests.** Vitest is not
installed; the dispatch wording is aspirational, not a constraint. The `npm run test`
command already builds and runs everything under `src/tests/**` matching `*.test.{ts,tsx}`,
so simply placing new files under `src/tests/integration/` is enough — no config changes.

## Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Create | `src/tests/integration/workspaceLifecycle.integration.test.ts` | Workspace CRUD round-trip through real storage |
| Create | `src/tests/integration/blockLifecycle.integration.test.ts` | Block CRUD + reorder + cross-workspace move with save/reload |
| Create | `src/tests/integration/rowCellEditing.integration.test.ts` | Row CRUD + all cell types + checkbox automation persisted across reload |
| Create | `src/tests/integration/saveLoadRoundtrip.integration.test.ts` | Full save/load round-trip for formatting, sorting, column config, alert summaries |
| Create | `src/tests/integration/undoRedoFlows.integration.test.ts` | Undo/redo coherence across workspace, block, row, cell, formatting flows + autosave + reload after redo |
| Create | `src/tests/integration/alertIntegration.integration.test.tsx` | Alert evaluation → dock indicator → navigation highlight (multi-component, multi-store) |
| Create | `src/tests/integration/helpers/integrationHarness.ts` | Shared helpers: `createRealStorageService()`, `resetAllStores()`, `flushAutosave()`, JSDOM `installDomGlobals` re-export |

The seventh file is a small helper module — without it each test file would re-copy ~60
lines of JSDOM boilerplate and store-reset code. It is the *only* abstraction the plan
introduces; everything else is plain `describe` / `test` blocks.

## Implementation Steps

### Step 1: Shared helpers

Create `src/tests/integration/helpers/integrationHarness.ts` exporting:

- `createRealStorageService()` — returns `{ service, backend }` by calling
  `createMemoryStorageBackend()` then `createStorageService(backend)`. This gives tests a
  **real** storage service backed by an in-memory map, so `saveAppData` actually writes JSON
  and `loadAppData` actually parses it. Distinct from the existing
  `createMemoryStorageService()` which is also fine but is what the unit tests use; using
  the explicit backend lets us also assert on the persisted JSON when needed.
- `resetAllStores(initialDocument, initialUi, initialHistory)` — sets every Zustand store
  back to its captured initial state. Capture initial state at module load (same pattern as
  `rowEditing.test.tsx`).
- `flushAutosave(ms = 20)` — `await new Promise(r => setTimeout(r, ms))` wrapper, so each
  test reads as English rather than raw timers.
- `installDomGlobals(window)` — port the function from
  `src/tests/unit/rowEditing.test.tsx` verbatim. Only used by the `.tsx` integration file.

Keep this helper file under ~120 lines. Don't add anything that's not used by at least two
test files.

- **Verify**: `npm run test:build` compiles cleanly.

### Step 2: Workspace lifecycle integration

File: `src/tests/integration/workspaceLifecycle.integration.test.ts`

Test cases (each is one `test(...)`):

1. **create → save → reload → list contains new workspace**
   - Init store with real service. Call `createWorkspace("Project A")`. `flushAutosave()`.
     Read back via a *new* `useDocumentStore.initializeAppData(service)` call (same backend).
     Assert the new workspace title, order, and that it became the active workspace.
2. **rename persists and the renamed title comes back after reload**
   - Init, rename the starter workspace to `"Renamed"`, flush, re-initialize, assert.
3. **reorder persists across reload**
   - Init, create a second workspace, `reorderWorkspaces(second, first)`, flush, re-init,
     assert `workspaceIndex[0].id === secondId`.
4. **style update persists across reload**
   - Init, `updateWorkspaceStyle(id, { background: "#101828", accentStripe: { enabled: false, color: "#38BDF8" } })`,
     flush, re-init, assert style values restored.
5. **delete persists across reload; deleting the last workspace creates a default replacement**
   - Init, delete the only workspace, flush, re-init, assert exactly one workspace named
     `"Home"` exists.
6. **switching active workspace does not mark document dirty**
   - Init, create second workspace, flush, `selectWorkspace(first)`, assert
     `dirty === false`.

- **Verify**: `npm run test` passes the six new cases; no test in the existing suite
  regresses.

### Step 3: Block lifecycle integration

File: `src/tests/integration/blockLifecycle.integration.test.ts`

Test cases:

1. **create blocks from each template; types persist across reload**
   - For each of `basic_checklist`, `bulleted_list`, `numbered_list`: call
     `createBlockFromTemplate(type)`. Flush. Re-init. Assert the block list contains the
     expected `blockType` values in order.
2. **rename, collapse, reorder persist across reload**
   - Init, create two extra blocks, rename the bulleted block, collapse it, reorder so
     numbered is first. Flush, re-init, assert title/collapsed/order restored.
3. **move block to another workspace updates `workspaceId` and survives reload**
   - Init, create second workspace, create extra block in primary, `moveBlockToWorkspace`,
     flush, re-init. Assert source workspace lost the block, target gained it with
     `block.workspaceId === targetId`.
4. **delete block persists across reload**
   - Init, create extra block, delete it, flush, re-init. Assert it does not come back.
5. **block-level format applied via `updateSelectedTextFormatting` persists**
   - Init, apply `{ bold: true, fontSize: 20 }` to block selection, flush, re-init. Assert
     restored block format equals the patch.

- **Verify**: `npm run test` passes; check that asserts work after reload (the most
  common failure mode is assertion on stale in-memory state rather than reloaded state).

### Step 4: Row and cell editing integration

File: `src/tests/integration/rowCellEditing.integration.test.ts`

Test cases:

1. **append, insert above, insert below, delete; final row order persists**
   - Init, append two rows, insert one above the second, delete the inserted one. Flush,
     re-init. Assert row IDs and `order` values are contiguous `[0, 1, ...]`.
2. **text cell edit persists across reload**
   - Use `updateTextCellValue` with `"Prepare report"`. Flush, re-init, assert value.
3. **checkbox toggle persists across reload**
   - Toggle, flush, re-init, assert `true`. Toggle again, flush, re-init, assert `false`.
4. **checkbox automation `moveCheckedRowsToBottom` reorders and survives reload**
   - Seed a block with three rows where `moveCheckedRowsToBottom: true` on the checkbox
     column (set via `updateColumnSettings`). Toggle the first row's checkbox. Assert it
     moves to the bottom. Flush, re-init, assert the persisted order is preserved.
5. **date, time, dropdown cell edits persist across reload**
   - Extend the starter block's columns with date, time, dropdown columns via the store
     `addColumnRight` action. Edit each cell value. Flush, re-init, assert each value.
   - Clear each cell (set `null` or empty string per type). Flush, re-init, assert null.
6. **column add, rename, move, change type, delete all persist across reload**
   - Run the full column flow in sequence. Flush, re-init. Assert columns list and the
     row `cells` map were both kept in sync after reload.

- **Verify**: `npm run test` passes. Watch for the common gotcha of `cells[deletedColumnId]`
  still being present after reload — `deleteColumn` should strip it; this test pins that.

### Step 5: Save/load round-trip integration

File: `src/tests/integration/saveLoadRoundtrip.integration.test.ts`

These are the "torture-test" round-trips that exercise the serialization layer harder than
any of the per-flow tests above:

1. **format overrides at every layer (block / column / row / cell) round-trip and resolve correctly**
   - Apply distinct formats at each layer via `updateSelectedTextFormatting` /
     `updateSelectedBorderFormatting`. Flush, re-init, call `resolveCellFormatting` on the
     reloaded state, assert the precedence chain (cell > row > column > block > defaults).
2. **sort metadata round-trips and rows stay in sorted order after reload**
   - Seed a block with three text rows out of order. Call `sortBlockRows(blockId, textColumnId, "asc")`.
     Flush, re-init. Assert rows are still in ascending order **and** `block.sort` is
     `{ columnId, direction: "asc" }` — proves both data and metadata round-trip.
3. **column settings (`strikeoutRowWhenChecked`, `moveCheckedRowsToBottom`, dropdown `options`, date/time `alertsEnabled`) round-trip**
   - Set non-default values for each type's settings. Flush, re-init. Assert each value.
4. **workspace alert summary round-trips**
   - Call `updateWorkspaceAlertSummary(workspaceId, { count: 2, blockId, rowId, columnId })`.
     Flush, re-init. Assert the alertSummary is intact on the reloaded workspace index entry.
5. **partial-save failure does not corrupt loadable state**
   - Wrap the backend's `rename` to throw on the workspace-index file (mirroring the
     existing `storage.test.ts` pattern). Make a workspace change. Flush. Assert the store
     reports `saveStatus === "error" | "partial"`. Then re-init from the *same* backend and
     assert the loaded workspace data is at least the pre-failure state (no partial JSON
     surfaces as a load error).

- **Verify**: `npm run test` passes. Step 5 in particular tends to surface real bugs — if
  it fails the right move is to file a Main message asking for triage, not to patch around it.

### Step 6: Undo/redo integration

File: `src/tests/integration/undoRedoFlows.integration.test.ts`

Test cases:

1. **undo a cell edit → state reverts and autosave fires the reverted state**
   - Edit text cell. Flush. Undo. `flushAutosave()`. Re-init. Assert text is the pre-edit
     value.
2. **redo restores the change and autosave fires again**
   - Continue from the above flow: redo, flush, re-init, assert edited value.
3. **undo across mixed flows (workspace rename → block create → row edit → format) walks back one at a time**
   - Perform four distinct ops in order. Undo four times. After each undo, assert exactly
     the latest op is reverted while earlier ops remain.
4. **`canUndo` / `canRedo` flags track correctly through an undo/redo sequence**
   - Assert flags after each step in a `commit → undo → redo → commit` cycle.
5. **history is preserved across an autosave failure (retry path works)**
   - Reuse the `attempts === 1 ⇒ throw` pattern from `documentStore.test.ts:393`. Commit a
     snapshot, let autosave fail, assert `canUndo === true`, call `retrySave`, assert success.

The first three tests should each do at least one re-init from the backend to prove the
**post-undo / post-redo state actually persisted**, not just that the in-memory store
reverted. This is the integration concern; existing unit tests already cover the in-memory
undo behavior.

- **Verify**: `npm run test` passes.

### Step 7: Alert integration (UI + multi-store)

File: `src/tests/integration/alertIntegration.integration.test.tsx`

This is the only `.tsx` integration file. It mounts `AppShell` (or `LeftDock` + `MainPane`
together — choose whichever already wires `useAlertNavigation`; check
`src/app/providers/` and `src/components/layout/AppShell.tsx` first) inside JSDOM and
exercises:

1. **Setting an alert summary on a workspace renders the dock badge**
   - Call `updateWorkspaceAlertSummary(workspaceId, { count: 3 })`. Render the workspace
     dock UI. Assert `[data-testid="alert-badge"]` is present and
     `[data-testid="alert-count"]` shows `"3"`.
2. **Active alert with `blockId` + `rowId` highlights the row after navigation**
   - Seed a block with a row whose date cell would trigger an alert (or set the alert
     summary directly), render the dock + main pane, wait the flash timeout (mirror the
     `alertNavigation.test.tsx` `wait(600)` pattern), assert the
     `useUiStore` selection is `{ kind: "row", rowId }` **and** `alertFlashRowId === rowId`.
3. **Switching workspace clears stale flash state**
   - Trigger a flash on workspace A, switch to workspace B, switch back to A. Assert
     dedup prevents the flash from re-firing (matches existing
     `alertNavigation.test.tsx:412` behavior, but verified end-to-end through real
     mounting).

If `useAlertNavigation` already has thorough coverage in `alertNavigation.test.tsx`, keep
this file's case count small (2–3 tests). The integration value here is "the dock badge
*and* the flash *and* the selection are all driven by the same alert summary in one mount,"
not re-testing every navigation branch.

- **Verify**: `npm run test` passes. If the integration mount surfaces missing test IDs
  (e.g., the workspace dock row needs a stable `data-testid="workspace-dock-${id}"`), Dev
  may add **one** `data-testid` attribute per such element; do not add other production
  hooks. Note any such additions in the Complete artifact.

### Step 8: Lint + run full suite

- Run `npm run lint`. Fix any new warnings.
- Run `npm run test`. All existing and new tests must pass.
- **Verify**: both commands exit 0.

## Data / Storage Changes

None. Tests use `createMemoryStorageBackend()` which already exists.

## UI Specifications

Not applicable — no production UI changes. The alert integration test may add at most one
`data-testid` per element if a needed selector is missing; document any such addition in
the Complete artifact and keep it minimal.

## Acceptance Criteria

- [ ] `src/tests/integration/` directory created with six `*.integration.test.{ts,tsx}` files plus one helper.
- [ ] Workspace CRUD round-trip covered (create, rename, reorder, style update, delete, replacement-on-empty).
- [ ] Block CRUD round-trip covered (create from each template, rename, collapse, reorder, cross-workspace move, delete, block format).
- [ ] Row CRUD + all cell types (text, checkbox, date, time, dropdown) round-trip across reload.
- [ ] Column CRUD (add, rename, move, change type, delete, settings) round-trip across reload.
- [ ] Format overrides at every layer (block, column, row, cell) round-trip and resolve via `resolveCellFormatting`.
- [ ] Sort metadata + sorted row order round-trip across reload.
- [ ] Workspace alert summary round-trips.
- [ ] Partial-save failure leaves a loadable backend (does not corrupt JSON).
- [ ] Undo and redo each verified to persist the reverted/redone state across reload.
- [ ] `canUndo`/`canRedo` flags correct through commit/undo/redo cycles.
- [ ] History preserved across autosave failure; `retrySave` succeeds.
- [ ] Alert integration: dock badge renders, flash + selection fire on active alert, dedup holds across workspace switch.
- [ ] `npm run test` exits 0.
- [ ] `npm run lint` exits 0.

## Estimated Complexity

- **Large** — 6 test files + 1 helper. Estimated 35–50 individual `test(...)` cases total.
- Most cases are mechanical (init → mutate → flush → re-init → assert), so once the helper
  is in place each file is straightforward.
- Highest-risk step is Step 5 case 5 (partial-save corruption) because it can surface real
  bugs. If that happens, Dev should route via Main rather than fix in this dispatch.

## Architectural Notes for Main

No architectural decisions added beyond what `docs/TODO_APP_TECH_SPEC.md` already documents.
The one wording deviation (Vitest → `node:test`) is noted at the top of this plan and
should be reflected back in the dispatch artifact at closeout if Main wants future
dispatches to match the actual stack.
