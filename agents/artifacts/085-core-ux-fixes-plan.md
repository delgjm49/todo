# Plan: Core UX fixes

## Overview
Fix the seven promoted UX observations from `agents/OBSERVATIONS.md` for core workspace/block use: scroll containment, workspace and block menu actions, row reordering, distinct block Sort/Menu behavior, and the interaction-driven text-color/opacity flash. The implementation should preserve the existing local JSON/Zustand data model and add regression coverage for the repaired flows.

## Verified Current-State Facts
- `agents/artifacts/085-core-ux-fixes-dispatch.md` scopes exactly seven observations and excludes hide-completed rows, archive state, search, alerts, new APIs, and new dependencies.
- `agents/OBSERVATIONS.md` lists the seven open issues: workspace context menu actions, workspace list scrolling, Sort vs Menu behavior, block content scrolling, Delete Block via Menu, row drag-and-drop reordering, and text color flash after interactions.
- `docs/TODO_APP_UI_SPEC.md` says the workspace list and workspace canvas must be vertically scrollable; the Sort button opens a sort menu for available columns; the block actions menu opens block actions; rows have a drag handle and drag-preview state.
- `docs/TODO_APP_TECH_SPEC.md` lists `dnd-kit` as the intended drag/drop library, says row reorder is v1 drag order item 3, and says drag reorder should create one history entry on drop. `package.json` includes `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities`.
- `src/components/layout/AppShell.tsx` uses `grid h-screen overflow-hidden` and wraps the main area in `flex min-w-0 flex-col` plus a `grid min-h-0 flex-1 min-w-0`, so child scroll regions need explicit `min-h-0`/overflow containment to work reliably.
- `src/components/layout/LeftDock.tsx` currently renders an `aside` with `flex h-full ... flex-col` and the workspace list container as `mt-4 min-h-0 flex-1 overflow-y-auto pr-1`; workspace Rename/Delete menu handlers already call `window.prompt`, `renameWorkspace`, `window.confirm`, and `deleteWorkspace`, but there is no direct regression test for those menu actions.
- `src/components/workspace/WorkspaceCard.tsx` is a native `draggable` card and opens the workspace menu on right-click. It calls its parent-provided callbacks for select, drag, and menu behavior.
- `src/components/layout/MainPane.tsx` currently renders the main canvas as `section className="min-h-0 min-w-0 overflow-y-auto ..."` and immediately inside it a `div className="h-full ..."`. Blocks render inside non-scroll-specific wrappers (`mt-6`, `space-y-4`), so the inner `h-full` can make content/scroll containment brittle when many blocks/rows are present.
- `src/components/block/BlockCard.tsx` currently wires both the header `Sort` button (`data-testid="sort-menu-${block.id}"`) and the `Menu` button to the same `onOpenMenu`, which opens `BlockContextMenu`; this matches the Sort-vs-Menu observation.
- `src/components/block/BlockContextMenu.tsx` currently combines block actions with a `Sort by` section and has a `Delete block` button that calls the supplied `onDelete`; `MainPane.tsx` supplies a confirm-and-`deleteBlock` handler. There is no dedicated sort-only popover component.
- `src/components/block/BlockColumnHeaderRow.tsx` supports column-header sorting by calling `onSortColumn` and showing `data-sort-direction`, so sort domain/store behavior already exists independently of the header Sort button.
- `src/domain/rows/reorderRows.ts` and `src/stores/documentStore.ts` already provide pure/store row reorder support. `documentStore.reorderRows` commits with mutation kind `"drag"`, and `src/tests/unit/documentStore.test.ts` already contains a store-level "reorders rows within a block and persists" test.
- `src/components/row/RowView.tsx` currently uses native HTML5 row dragging on each row with a `[data-drag-handle]` button and calls `documentStore.reorderRows` on drop. It does not import or use `@dnd-kit`; a repo-wide grep for `@dnd-kit`, `DndContext`, `useSortable`, and `SortableContext` found only `package.json`/`package-lock.json`, not source usage.
- `src/components/row/RowView.tsx` stops propagation only when a drag starts from the handle; in the non-handle branch it calls `event.preventDefault()` and returns without `event.stopPropagation()`. `BlockCard.tsx` is also native `draggable`, so this is a plausible source of accidental block drag state/opacity during attempted row or cell interactions, but it must be confirmed by implementation tests.
- `src/domain/formatting/formattingToCellStyle.ts`, `src/domain/formatting/formattingToBorderStyle.ts`, and `src/domain/formatting/resolveCellFormatting.ts` apply text/color formatting through inline cell style; Tailwind theme colors are defined in `src/styles/globals.css` and `tailwind.config.ts`. No source code currently ties drag state directly to text color, but `dragging ? "opacity-50"` exists on `BlockCard` and row containers.
- Existing relevant tests include `src/tests/unit/blockHeaderSort.test.tsx`, `src/tests/unit/blockGridRender.test.tsx`, `src/tests/unit/contextMenuDismissal.test.tsx`, `src/tests/unit/workspaceCard.test.tsx`, `src/tests/unit/rowContextMenu.test.tsx`, `src/tests/unit/documentStore.test.ts`, `src/tests/unit/blockRowSorting.test.ts`, and `src/tests/e2e/smoke.spec.ts`.

## Prerequisites
- Keep scope strictly to the seven observations from dispatch 085.
- Do not change the persisted data schema/storage format.
- Do not add dependencies; use existing `@dnd-kit/*` packages if replacing row native DnD.
- Preserve current store/domain action names where possible so existing tests remain useful.

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Modify | `src/components/layout/AppShell.tsx` | Ensure layout children can shrink/scroll (`min-h-0`, `h-full` where needed) without document-body scrolling. |
| Modify | `src/components/layout/LeftDock.tsx` | Harden workspace list scroll containment and add stable test hooks for the scroll region/menu actions if needed. |
| Modify | `src/components/layout/MainPane.tsx` | Harden canvas/block content scroll containment; split block Sort and Menu state/handlers; wire delete/menu actions with tests. |
| Modify | `src/components/block/BlockCard.tsx` | Separate `onOpenSortMenu` from `onOpenMenu`; adjust block body/content overflow classes; avoid nested native drag interactions causing opacity flash. |
| Create | `src/components/block/BlockSortMenu.tsx` | Sort-only popover content for available sortable columns, reusing current sort labels/buttons behavior from `BlockContextMenu`. |
| Modify | `src/components/block/BlockContextMenu.tsx` | Remove or de-emphasize the sort section from the general Menu if a dedicated sort menu is added; keep Rename/Collapse/Move/Delete actions. |
| Modify | `src/components/row/RowView.tsx` | Make row reordering functional and reliable, preferably with `@dnd-kit` sortable rows; prevent row/cell drag attempts from bubbling into block drag state. |
| Modify | `src/stores/uiStore.ts` | Add narrowly scoped transient state for a dedicated block sort menu only if it cannot be held locally in `MainPane`; keep existing selection/menu semantics intact. |
| Modify | `src/types/ui.ts` | Add a `BlockSortMenuState` type only if `uiStore` owns that state. |
| Modify | `src/styles/globals.css` and/or `tailwind.config.ts` | Only if needed to stabilize text/opacity transitions; avoid broad theme changes. |
| Modify | `src/tests/unit/contextMenuDismissal.test.tsx` | Add workspace Rename/Delete and block Delete via Menu regression coverage; add Sort-vs-Menu behavior coverage. |
| Modify | `src/tests/unit/blockGridRender.test.tsx` | Update expectations for dedicated sort menu/general block menu separation. |
| Modify | `src/tests/unit/blockHeaderSort.test.tsx` | Add or update coverage for the header Sort button opening only sort actions and sorting rows. |
| Modify | `src/tests/unit/documentStore.test.ts` or `src/tests/unit/rowHelpers.test.ts` | Add row reorder edge-case coverage if current helper/store behavior is adjusted. |
| Modify | `src/tests/e2e/smoke.spec.ts` | Add Playwright regression coverage for user-visible scroll/menu/sort/reorder flows where stable in browser automation. |
| Create | `agents/artifacts/085-core-ux-fixes-complete.md` | Dev completion artifact describing implementation and verification. |

## Implementation Steps

### Step 1: Lock down scroll containment for the shell, workspace list, and main canvas
- In `AppShell.tsx`, ensure the right-side flex column has `min-h-0` in addition to `min-w-0`, and that the top-bar sibling grid/flex children preserve `min-h-0` all the way to `MainPane`.
- In `LeftDock.tsx`, keep the fixed header/actions/settings sections `shrink-0`, keep the workspace list `min-h-0 flex-1 overflow-y-auto`, and add a stable `data-testid="workspace-list-scroll"` on the scroll container for tests.
- In `MainPane.tsx`, make the canvas scroll region explicit: the outer section should remain the only vertical scroll container (`min-h-0 h-full overflow-y-auto`), and the inner panel should use `min-h-full` rather than brittle `h-full` so overflowing block content increases scroll height.
- In `BlockCard.tsx`, ensure wide row grids keep horizontal scroll (`overflow-x-auto`) while vertical overflow is owned by the main canvas, not clipped by the block body.
- **Verify**: With artificially many workspaces and many block rows, the workspace list and main canvas scroll independently inside the fixed `h-screen` shell and no body/window scroll is required.

### Step 2: Add direct regression tests for workspace menu Rename/Delete
- In `contextMenuDismissal.test.tsx` or a new focused unit test, render `LeftDock` with two workspaces and an open `workspaceMenu`.
- Stub `window.prompt` to return a new workspace title, click the Rename menu item, and assert `documentStore.workspaceIndex` contains the renamed title and `uiStore.workspaceMenu` is closed.
- Stub `window.confirm` to return true, click Delete workspace, and assert the target workspace is removed/reconciled using `documentStore.deleteWorkspace` behavior and the menu is closed.
- Add a negative delete test with `window.confirm` false if cheap, asserting no workspace removal.
- If these tests already pass without code changes, leave the implementation intact and document in the complete artifact that regression coverage was the fix; if they fail, repair only the wiring causing the failure.
- **Verify**: `npm test -- --test-name-pattern` is not supported by the custom runner unless already available, so Dev should run the full required test command or the project’s existing targeted command if known.

### Step 3: Split block Sort from general Menu
- Create `BlockSortMenu.tsx` with the current `Sort by` section behavior from `BlockContextMenu.tsx`: list visible user-sortable columns, render Asc/Desc buttons with stable `data-testid` values, show the current active sort state, and show an empty state when no sortable columns exist.
- In `MainPane.tsx`, add separate open/close state for the sort popover. Prefer local React state if it is only used in `MainPane`; use `uiStore` only if consistency with existing menu dismissal tests requires store ownership.
- Change `BlockCard.tsx` props so the Sort button calls `onOpenSortMenu(x, y)` and the Menu button still calls `onOpenMenu(x, y)`.
- Keep `BlockContextMenu.tsx` focused on block actions (Rename, Collapse/Expand, Move to workspace, Delete block). If keeping a sort section inside Menu is intentionally desired for redundancy, it must not be what the Sort button opens; however, the UI spec says Sort opens a sort menu and Menu opens block context menu, so prefer removing sort from the general Menu.
- Ensure only one of workspace/block/sort/column/row menus is open at a time, using the existing close functions or local state cleanup on workspace changes.
- **Verify**: Clicking Sort shows sort-only choices and not Delete/Move/Rename; clicking Menu shows block actions and not the exact same sort-only menu. Existing column-header sorting remains unchanged.

### Step 4: Harden block Delete via Menu
- Keep `MainPane.tsx` delete flow confirm-gated: `window.confirm(\`Delete block "${title}"?\`)` then `deleteBlock(workspaceId, blockId)` and close the menu.
- Add a regression test that opens the block Menu for a known block, stubs `window.confirm` true, clicks Delete block, and asserts the block is removed and `uiStore.blockMenu` is closed.
- Add a confirm-false test if cheap, asserting the block remains.
- Confirm the test uses the general Menu, not the new Sort menu.
- **Verify**: Store-level block lifecycle tests still pass and the UI-level menu delete test passes.

### Step 5: Make row drag-and-drop reorder functional and prevent nested drag flash
- Prefer implementing row reorder with the already-installed `@dnd-kit` stack to match `docs/TODO_APP_TECH_SPEC.md`:
  - Wrap each block’s row list in a `DndContext` + vertical `SortableContext` scoped to that block’s row ids.
  - Use `useSortable` for row items or a small internal row component; attach drag listeners/attributes only to the row drag handle, not the whole row/cells.
  - On drag end, if `active.id !== over?.id`, call `documentStore.reorderRows(workspaceId, block.id, active.id, over.id)` once.
  - Keep row click/selection/context-menu behavior intact and avoid drag activation from editable cells.
- If a smaller native-DnD fix is chosen instead, it must at minimum set/consume `dataTransfer`, call `event.stopPropagation()` in all row drag-start paths including the non-handle preventDefault branch, and prove it works in browser-level tests. Do not leave nested row/block native draggable propagation ambiguous.
- Ensure row drag state cleanup cannot leave `draggingBlockId`, `draggingRowBlockId`, or opacity classes stuck after cancel/drop. If dnd-kit replaces `uiStore` row drag state, remove or stop using stale row drag state rather than maintaining two competing mechanisms.
- Preserve `documentStore.reorderRows` as the persistence/history boundary so the reorder remains one `"drag"` history entry on drop.
- **Verify**: Dragging row 2 above row 1 changes DOM/store order to row 2,row 1 and persists after save/reload where covered; attempting to drag/select inside a cell does not set block opacity or leave text lighter.

### Step 6: Investigate and eliminate the text color/opacity flash
- Treat the current evidence as a hypothesis: nested native drag propagation may set block `dragging` opacity or leave transient drag state behind. Confirm during implementation by reproducing before/after via a unit/DOM test or Playwright interaction.
- After row DnD changes, verify that row drag state affects only the active row/drag overlay and not all text in the block.
- If the flash persists, inspect whether `settings`/`effectiveAppDefaults` temporarily becomes null during state transitions in `RowView.tsx`; do not change default theme colors unless the bug is proven to be a style-token issue.
- Prefer removing broad `transition` of color/opacity from containers that do not need it over changing the app palette. For example, keep drag preview opacity scoped to the dragged row/block only and avoid inherited opacity on non-dragged block content.
- **Verify**: Repeated row drag attempts, canceled drags, sorting, checkbox toggles, and menu actions do not leave block text in a lighter state; leaving/re-entering the workspace should no longer be necessary to recover normal text.

### Step 7: Add/adjust Playwright coverage for visible UX flows
- Extend `src/tests/e2e/smoke.spec.ts` or add a focused e2e spec under the existing `src/tests/e2e/` pattern.
- Cover at least:
  - creating enough workspaces to require dock scrolling and asserting a lower workspace can be scrolled into view/selected;
  - creating enough rows/blocks to require main canvas scrolling and asserting a lower row/control can be scrolled into view;
  - workspace context-menu rename/delete using Playwright dialog handling for `prompt`/`confirm`;
  - block Menu delete via confirm;
  - Sort button opens sort choices while Menu opens block actions;
  - row drag reorder if Playwright drag simulation is stable for the chosen implementation.
- If a specific Playwright drag operation is unreliable in this renderer boundary, include robust unit/component coverage for drag logic and note the e2e limitation in the complete artifact; do not silently omit row reorder verification.
- **Verify**: `npm run test:e2e` passes, or any environment-specific failure is reported using the required verification format in the complete artifact.

### Step 8: Final verification and documentation
- Run `npm run typecheck`, `npm run test`, and `npm run test:e2e` if the environment supports browser installation. Also run `npm run lint` if practical for changed TS/TSX.
- Write `agents/artifacts/085-core-ux-fixes-complete.md` with files changed, deviations, and command results using `agents/CLOSING.md` verification format.
- Create the next channel message as Dev → Review with `State = ready-for-review`.
- Append a session entry to `docs/SESSIONS_PENDING.md`.

## Data / Storage / Schema Changes
None expected. All fixes should use existing store actions and transient UI state. If a local sort-menu state type is added, it is UI-only and must not affect persisted JSON.

## UI Specifications
- Workspace dock remains fixed-width with fixed top/bottom sections and a scrollable workspace list between them.
- Main workspace canvas is the vertical scroll region for blocks/rows; block bodies may scroll horizontally for wide columns but should not trap vertical scrolling unless deliberately introduced later.
- Workspace context menu Rename/Delete must visibly perform actions after prompt/confirm and close the menu.
- Block header Sort opens a dedicated sort menu for available sortable columns; block header Menu opens general block actions. They must no longer appear to be the same menu.
- Delete Block remains destructive and confirmation-gated.
- Row drag must originate from the drag handle, not normal cell editing/selection. Drag preview/drop target styling should be scoped and should not temporarily wash out all block text.

## Assumptions / Hypotheses
- Hypothesis: the reported text-color flash is caused by nested native drag event propagation or stale drag opacity state, because `RowView.tsx` does not stop propagation in its non-handle drag-start branch and `BlockCard.tsx` applies `opacity-50` while dragging. Confirm before relying on this as the sole fix.
- Assumption: Browser `window.prompt`/`window.confirm` are acceptable for v1 confirmation flows because current code already uses them and dispatch 085 does not request a custom modal system.
- Assumption: It is acceptable to use existing `@dnd-kit` dependencies because they are already in `package.json` and are named by the tech spec; no new dependency is introduced.

## Acceptance Criteria
- [ ] Workspace list scrolls when content exceeds viewport.
- [ ] Block/main content area scrolls when rows/blocks exceed viewport.
- [ ] Workspace context menu Delete and Rename perform expected actions and close the menu.
- [ ] Block Menu → Delete Block deletes after confirmation and does not delete when canceled.
- [ ] Row drag-and-drop reorders rows within a block through the row drag handle.
- [ ] Sort button provides distinct sort UI; Menu button remains a general block-actions menu.
- [ ] No text color/opacity flash remains after drag attempts or state-changing interactions.
- [ ] Relevant unit/integration tests and Playwright tests pass or environment-scoped failures are documented by Dev.
- [ ] No unrelated files are modified.

## Estimated Complexity
- Medium-large.
- Expected file count: 8–14 source/test files plus the Dev complete artifact and channel/session logs.
