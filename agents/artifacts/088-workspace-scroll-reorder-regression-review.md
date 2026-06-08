# Review: Workspace Scroll/Reorder Regression

## Plan Reviewed
- `agents/artifacts/088-workspace-scroll-reorder-regression-plan.md`

## Complete Reviewed
- `agents/artifacts/088-workspace-scroll-reorder-regression-complete.md`

## Findings

### Correctness
- ✅ The left dock `<aside>` now includes `min-h-0 max-h-screen overflow-hidden`, correctly constraining it to the viewport so the existing `workspace-list-scroll` container can shrink and scroll.
- ✅ `reorderWorkspaces()` now uses the same insert-before-target semantics as `reorderBlocks()`: `insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex`. The logic is identical to `reorderBlocks()` (lines 1387–1416).
- ✅ `data-testid="main-canvas-scroll"` was added to the MainPane scrollable `<section>` without changing layout behavior.
- ✅ No storage schema changes. `reindexSnapshotWorkspaces()` is called as before; the only change is the insertion index calculation.

### Completeness
- ✅ All 6 plan steps were addressed. Each step maps cleanly to the implementation.
- ✅ Dev documented three deviations in the complete artifact, all reasonable and well-explained: (1) E2E uses `Add block preset N` aria-labels instead of visible names — correct because `disambiguateNames` is the actual current behavior; (2) block count is 6 not 5 due to bootstrap block — verified in code; (3) separate memory services for upward/downward unit test — prevents state contamination.
- ✅ Acceptance criteria all met, confirmed by verification runs.
- ✅ No missing error states — reorderWorkspaces handles missing IDs, same-source, and null settings.

### Quality
- ✅ Code follows existing conventions: PascalCase components, camelCase stores, kebab-case files. Tailwind class ordering is consistent.
- ✅ No console.logs, debug code, or leftover comments in any changed file.
- ✅ The E2E spec refresh avoids brittle accessible-name assumptions, uses `data-testid` and filtered `getByRole` selectors, and asserts real scrollability via `scrollHeight > clientHeight` and `overflowY` — a significant improvement over the previous stale tests.
- ✅ No performance concerns — the `<aside>` class change is purely layout, and the `reorderWorkspaces` logic change is a single `sourceIndex < targetIndex` condition matching an already-established pattern.

### Data Integrity
- ✅ `reorderWorkspaces()` uses `structuredClone` on `workspaceIndex`, removes and inserts the moved entry, then passes through `reindexSnapshotWorkspaces()` to re-assign sequential `order` values. This is the same pattern used by all other mutation methods.
- ✅ No JSON shape change. Snapshots remain identical in structure.
- ✅ Unit tests assert sequential `[0, 1, 2]` order values after both upward and downward reorder, plus persistence across store re-initialization.

### Test Coverage
- ✅ Upward reorder: `[Third, Home, Second]` — unit test + persistence
- ✅ Downward reorder: `[Second, Home, Third]` — unit test + persistence
- ✅ Existing CRUD reorder test updated to use upward move
- ✅ Integration downward reorder persistence test added
- ✅ E2E: workspace scrollability, main canvas scrollability, context-menu rename, context-menu delete, sort/menu separation — all 5 pass

## Verification

### Command 1: `npm run test:build`
- **Command**: `npm run test:build`
- **Shell used**: zsh (macOS)
- **Result**: PASS — exit code 0, no TypeScript errors
- **If failed, exact failure surface**: N/A
- **Checkpoint-scoped or unrelated repo-state**: Checkpoint-scoped
- **Was this the actual shell provided by the environment**: Yes

### Command 2: Targeted unit/integration tests
- **Command**: `node --test .test-dist/tests/unit/contextMenuDismissal.test.js .test-dist/tests/unit/documentStore.test.js .test-dist/tests/integration/workspaceLifecycle.integration.test.js`
- **Shell used**: zsh (macOS)
- **Result**: PASS — 52/52 tests pass across 4 suites
- **If failed, exact failure surface**: N/A
- **Checkpoint-scoped or unrelated repo-state**: Checkpoint-scoped
- **Was this the actual shell provided by the environment**: Yes

### Command 3: Playwright E2E
- **Command**: `npx playwright test src/tests/e2e/ux-fixes.spec.ts --project=chromium`
- **Shell used**: zsh (macOS)
- **Result**: PASS — 5/5 tests pass (3.8s)
- **If failed, exact failure surface**: N/A
- **Checkpoint-scoped or unrelated repo-state**: Checkpoint-scoped
- **Was this the actual shell provided by the environment**: Yes

## Out-of-Scope Working Tree Changes

| Path | Suspected Cause | Recommendation | Blocking |
|------|----------------|----------------|----------|
| `docs/SESSIONS_PENDING.md` | Dev appended session entry per protocol | keep | non-blocking |

All five modified source/test files are the exact files listed in the plan. The three new untracked artifact files and the channel directory are expected dispatch infrastructure. No other dirty files.

---

## Re-Review — Fix Round (Message 006 → Review)

### Context
After initial PASS (message 004), Main user-tested the app and found blocking UX issues: the workspace context menu rendered behind the main pane (invisible/unclickable), rendering workspace delete and rename non-functional. Additionally, workspace reorganization via HTML5 drag/drop was unreliable in Tauri/WebView2 within the scroll container. Main routed back to Dev for fixes (message 005).

### Fixes Reviewed

#### Portal for workspace context menu
- ✅ The workspace context menu is now rendered via `createPortal(..., document.body)`, escaping the `<aside>`'s `backdrop-blur` stacking context and `overflow-hidden`.
- ✅ `createPortal` is imported from `react-dom` — a standard React 18 API already available in the project; no new npm dependency.
- ✅ The `MenuPopover` component was not modified; the portal wraps it from the outside. Its `fixed` positioning and `z-50` now operate at the document root level, guaranteeing the menu appears above all content.
- ✅ The backdrop (`z-40`, `fixed inset-0`) is also portaled, so backdrop-dismiss works globally.

#### Move up / Move down context menu items
- ✅ "Move up" reorders the current workspace before the one above it via `reorderWorkspaces(entry.id, workspaceIndex[currentIndex - 1].id)` — correctly uses existing insert-before-target semantics.
- ✅ "Move down" reorders the item below before the current one via `reorderWorkspaces(nextItemId, entry.id)` — effectively pushes the current item down one position.
- ✅ Both buttons are disabled at boundary positions: move-up disabled when `currentIndex <= 0`; move-down disabled when `currentIndex >= length - 1`.
- ✅ `MenuButton` component gained a `disabled` prop with appropriate visual styling (`cursor-not-allowed text-textMuted/40`) and no-op click.

#### Test coverage
- ✅ 4 new unit tests in `contextMenuDismissal.test.tsx`: move up reorder, move down reorder, move-up disabled at first, move-down disabled at last — all verify exact order arrays and order values (0, 1, 2).
- ✅ 2 new E2E tests in `ux-fixes.spec.ts`: workspace context-menu move up, workspace context-menu move down — both verify visibility after reorder.
- ✅ All prior 52 targeted JS tests and 5 E2E tests continue to pass — scrolling fixes are preserved.

### Verification (Re-Review)

#### Command 1: `npm run test:build`
- **Shell used**: zsh (macOS)
- **Result**: PASS — exit code 0, no TypeScript errors

#### Command 2: Targeted unit/integration tests
- **Command**: `node --test .test-dist/tests/unit/contextMenuDismissal.test.js .test-dist/tests/unit/documentStore.test.js .test-dist/tests/integration/workspaceLifecycle.integration.test.js`
- **Shell used**: zsh (macOS)
- **Result**: PASS — 56/56 tests pass across 4 suites (13 context-menu dismissal, 32 document store, 7 workspace lifecycle, 4 light-mode)

#### Command 3: Playwright E2E
- **Command**: `npx playwright test src/tests/e2e/ux-fixes.spec.ts --project=chromium`
- **Shell used**: zsh (macOS)
- **Result**: PASS — 7/7 tests pass (4.2s): workspace scroll, main canvas scroll, rename, delete, move up, move down, sort/menu

### Out-of-Scope Working Tree Changes (Re-Review)

| Path | Suspected Cause | Recommendation | Blocking |
|------|----------------|----------------|----------|
| `docs/SESSIONS_PENDING.md` | Dev (Session 301) + Review (Session 300, 302) appended session entries | keep | non-blocking |

Modified files are the expected set for this dispatch + fix round: LeftDock.tsx, MainPane.tsx, documentStore.ts, ux-fixes.spec.ts, workspaceLifecycle.integration.test.ts, contextMenuDismissal.test.tsx, documentStore.test.ts. The `contextMenuDismissal.test.tsx` is newly modified in this round (was unchanged in the initial implementation) — expected since 4 new tests were added. No unexpected dirty files.

### Notes
- **Drag/drop reliability**: The Dev completion artifact notes that HTML5 drag/drop may still be unreliable in Tauri WebView2 and suggests a pointer-event-based custom implementation in a future dispatch. The move up/down menu buttons provide a reliable in-scope fallback. This is an acceptable open question for Main to prioritize — it does not block the current fix.
- **E2E test precision**: The move-up and move-down E2E tests verify visibility after reorder but do not assert exact workspace order (which is verified at the unit level). This is appropriate given the difficulty of exact accessible-name assertions on WorkspaceCard elements.

---

## Re-Review — Second Fix Round (Message 009 → Review)

### Context
After the first fix round PASS (message 007), Main user-tested again after clearing Tauri app data/cache. Workspace Rename and Delete still failed — confirmed not stale data. Main identified `window.prompt` / `window.confirm` as unreliable or blocked in Tauri WebView2 context, since non-dialog menu actions (color, stripe, move up/down) in the same portaled menu worked. Additionally, drag-to-reposition was still broken despite store-level reorder and move up/down working. Main routed back to Dev for second fix round (message 008), requesting: inline rename/delete UI replacing native dialogs, and removal of misleading drag affordance.

### Fixes Reviewed

#### Inline rename (replaces `window.prompt`)
- ✅ Uses ref-based uncontrolled `<input>` with `defaultValue` seeded from current workspace title.
- ✅ Save button calls `handleCommitRename` which reads `renameInputRef.current?.value`, trims, and calls `renameWorkspace()` only if non-empty.
- ✅ Cancel button calls `handleCancelRename` which resets renaming state without changing the workspace.
- ✅ Keyboard support: Enter commits, Escape cancels.
- ✅ State cleanup: `useEffect` resets `renaming`/`confirmingDelete` whenever `workspaceMenu` closes (menu dismiss or action completion).
- ⚠️ **Minor**: Input does not auto-focus when renaming view appears. The user must click into it. This matches the interaction requirement of the old `window.prompt` dialog (which also required the user to type). The E2E `fill()` handles this without issue. Not blocking.

#### Inline delete confirmation (replaces `window.confirm`)
- ✅ Shows workspace name in confirmation text: `Delete "{title}"?`.
- ✅ Warning text: "This cannot be undone."
- ✅ "Keep" button acts as cancel (closes menu, preserves workspace).
- ✅ "Delete" button calls `deleteWorkspace()` and closes menu.
- ✅ No native dialog reliance; works fully within the portaled menu.

#### Drag removal
- ✅ `WorkspaceCard` component simplified: `draggable` attribute removed, all HTML5 drag/drop event handlers (`onDragStart`, `onDragEnd`, `onDrop`, `onDragOver`) removed, `dragging` and `dropTarget` props removed.
- ✅ `LeftDock` no longer imports `draggingWorkspaceId`, `dropTargetWorkspaceId`, `setWorkspaceDragState` from uiStore.
- ✅ Dock description copy updated: "open the context menu to rename, reorder, or delete" replaces "reorder the dock".
- ✅ No misleading drag affordance remains in the UI.
- ✅ `workspaceCard.test.tsx`: drag contract test removed; all unused drag props stripped from every test's WorkspaceCard usage.
- ✅ `uiStore` drag state fields (`draggingWorkspaceId`, `dropTargetWorkspaceId`) remain in the store but are harmless — not referenced by any workspace component now.

#### Code quality
- ✅ Menu handlers refactored to use memoized `currentEntry` and `currentIndex` computed at component level, avoiding repeated `workspaceIndex.find()` calls inside each handler.
- ✅ Three sub-views of the portaled menu (`renaming`, `confirmingDelete`, default) cleanly separated.
- ✅ No `console.log` or debug code in any changed file.
- ✅ No storage schema changes.

#### Test coverage
- ✅ `contextMenuDismissal.test.tsx`: Rename test now clicks "Rename workspace", sets input value directly, clicks "Save", asserts renamed title. Delete test clicks "Delete workspace", clicks "Delete" in confirmation, asserts workspace removed. Delete-cancel test clicks "Delete workspace", clicks "Keep", asserts workspace preserved. All `window.prompt`/`window.confirm` mocking removed from workspace tests.
- ✅ `workspaceCard.test.tsx`: Drag contract test removed. All test renderings updated to omit drag props. 17 existing/unchanged tests still pass.
- ✅ `ux-fixes.spec.ts`: Rename E2E uses `fill()` on inline input + "Save" click. Delete E2E uses "Delete workspace" → "Delete" confirm button.

### Verification (Second Re-Review)

#### Command 1: `npm run test:build`
- **Shell used**: zsh (macOS)
- **Result**: PASS — exit code 0, no TypeScript errors

#### Command 2: Targeted unit/integration tests (expanded scope)
- **Command**: `node --test .test-dist/tests/unit/contextMenuDismissal.test.js .test-dist/tests/unit/workspaceCard.test.js .test-dist/tests/unit/documentStore.test.js .test-dist/tests/integration/workspaceLifecycle.integration.test.js`
- **Shell used**: zsh (macOS)
- **Result**: PASS — 73/73 tests pass across 6 suites (13 context-menu dismissal, 12 alert badge, 5 light-mode rendering, 32 document store, 7 workspace lifecycle, 4 light-mode default workspace creation)

#### Command 3: Playwright E2E
- **Command**: `npx playwright test src/tests/e2e/ux-fixes.spec.ts --project=chromium`
- **Shell used**: zsh (macOS)
- **Result**: PASS — 7/7 tests pass (4.6s): workspace scroll, main canvas scroll, rename (inline input + Save), delete (inline confirm), move up, move down, sort/menu

### Out-of-Scope Working Tree Changes (Second Re-Review)

| Path | Suspected Cause | Recommendation | Blocking |
|------|----------------|----------------|----------|
| `docs/SESSIONS_PENDING.md` | Dev (Session 303) + Review (Sessions 300, 302, 304) appended session entries | keep | non-blocking |

Modified files for this dispatch through all fix rounds: LeftDock.tsx, MainPane.tsx, WorkspaceCard.tsx, documentStore.ts, ux-fixes.spec.ts, workspaceLifecycle.integration.test.ts, contextMenuDismissal.test.tsx, documentStore.test.ts, workspaceCard.test.tsx. `WorkspaceCard.tsx` and `workspaceCard.test.tsx` are newly modified in this round (drag removal) — expected. No unexpected dirty files.

### Notes
- **Block-level dialogs**: The complete artifact correctly notes that `BlockContextMenu` delete still uses `window.confirm`. If `window.confirm` is systematically blocked in Tauri WebView2, block delete should be migrated in a future dispatch. This is a known issue, not a regression, and is explicitly out of scope for this dispatch.
- **Rename auto-focus**: The inline rename input does not auto-focus when the rename view appears. This is a minor UX note — the old `window.prompt` dialog also required user typing. If auto-focus is desired, it's a one-line `useEffect` addition (`renameInputRef.current?.focus()`) that can be addressed in a future polish dispatch.

## Final Verdict

**PASS — Ready for Main**

All Main-identified blocking UX issues from the second round are resolved: workspace rename works via inline input + Save (no `window.prompt`), workspace delete works via inline confirmation + Delete button (no `window.confirm`), and all misleading drag affordances are removed (`draggable`, drag handlers, dock copy). All prior fixes (scrolling, portal, move up/down) are preserved. All three verification commands pass cleanly (73/73 targeted JS, 7/7 E2E). No required fixes, no deferred notes.
