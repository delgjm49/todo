# Dev Completion: Workspace Scroll/Reorder Regression

## Implementation Summary

### Changes Made

| Action | Path | Description |
|--------|------|-------------|
| Modify | `src/components/layout/LeftDock.tsx` | Added `min-h-0 max-h-screen overflow-hidden` to the root `<aside>` element, constraining the dock to viewport height so the existing `workspace-list-scroll` container can shrink and scroll. |
| Modify | `src/components/layout/MainPane.tsx` | Added `data-testid="main-canvas-scroll"` to the scrollable `<section>` for stable Playwright targeting. |
| Modify | `src/stores/documentStore.ts` | Changed `reorderWorkspaces(...)` insertion index to use the same insert-before-target semantics as `reorderBlocks(...)`: `insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex`. |
| Modify | `src/tests/unit/documentStore.test.ts` | Updated existing CRUD reorder test to use an upward move (preserving assertion expectations). Added dedicated test for both upward and downward reorder with insert-before-target semantics, order reassignment, and persistence verification. |
| Modify | `src/tests/integration/workspaceLifecycle.integration.test.ts` | Added "downward reorder persists after insert-before-target fix" test that creates 3 workspaces, performs a downward reorder (drag Home before Third → [Second, Home, Third]), and verifies persistence across store reload. |
| Modify | `src/tests/e2e/ux-fixes.spec.ts` | Full refresh per plan: workspace-list scroll test asserts `scrollHeight > clientHeight`, `overflowY`, and aside viewport constraint; main-canvas scroll test uses stable `data-testid="main-canvas-scroll"` and disambiguated button labels; context-menu tests use filtered selectors avoiding brittle accessible-name assumptions; sort/menu test uses `getByRole` and `.first()` for strict-mode safety. |

### Files Unchanged (no changes needed)
- `src/components/workspace/WorkspaceCard.tsx`
- `src/components/layout/AppShell.tsx`
- `src/services/storage/*`
- `src/domain/templates/blockTemplates.ts`
- `src/tests/unit/contextMenuDismissal.test.tsx`

### Deviations from Plan
- **E2E button labels**: The plan suggested using `Add Checklist` visible names for the main canvas test, but the initial bootstrap workspace already has a pre-populated "Today" block, so the "Add another block" section uses `disambiguateNames` aria-labels (`Add block preset 1`, etc.). The test uses these aria-labels instead, which is the correct current behavior.
- **Block count**: The initial workspace has 1 block by default (from `bootstrapData.ts`), so after adding 5 more, the expected count is 6, not 5.
- **Separate services for upward/downward unit test**: Used separate memory storage services for upward and downward reorder tests to avoid persistence state contamination between the two direction checks.

## Verification Results

### Command 1: `npm run test:build`
```
> tsc -p tsconfig.test.json
```
Result: **PASS** (exit code 0)

### Command 2: Targeted unit/integration tests
```bash
node --test .test-dist/tests/unit/contextMenuDismissal.test.js \
  .test-dist/tests/unit/documentStore.test.js \
  .test-dist/tests/integration/workspaceLifecycle.integration.test.js
```
Result: **PASS** — 52/52 tests pass across 4 suites.

Key test outcomes:
- `document store autosave` → 32/32 pass (including new reorder test with upward + downward + persistence)
- `workspace lifecycle integration` → 7/7 pass (including new downward reorder persistence test)
- `context menu dismissal` → 9/9 pass (existing behavior preserved)
- `light-mode default workspace creation` → 4/4 pass

### Command 3: Playwright E2E
```bash
npx playwright test src/tests/e2e/ux-fixes.spec.ts --project=chromium
```
Result: **PASS** — 5/5 tests pass.

- Workspace list scroll: verifies `scrollHeight > clientHeight`, `overflowY` in `auto`/`scroll`, aside height ≤ viewport
- Main canvas scroll: verifies scrollability via `data-testid="main-canvas-scroll"` with 6 blocks
- Workspace context-menu rename: uses filtered `hasText` selector (passes)
- Workspace context-menu delete: uses filtered `hasText` selector (passes)
- Block sort/menu: uses `getByRole` and `.first()` for strict-mode safety (passes)

## Acceptance Criteria Status

| Criterion | Status |
|-----------|--------|
| Dock scrolls with `scrollHeight > clientHeight` and viewport constraint | ✅ Confirmed via E2E |
| Workspace context-menu rename and delete still work | ✅ Confirmed via E2E + unit |
| Reorder tests cover upward and downward movement | ✅ Added: upward + downward with order + persistence |
| Main canvas E2E uses current selectors and verifies real scrollability | ✅ Confirmed via E2E |
| `ux-fixes.spec.ts` passes for Chromium | ✅ 5/5 pass |
| Targeted JS tests pass | ✅ 52/52 pass |
| No storage schema changes | ✅ Verified |

## Working Tree
Only the intended source/test files were modified. No unrelated changes.

---

## Follow-Up Fix Round (Message 005 → Dev)

### Root Cause Analysis

**Context menu layering**: The `backdrop-blur` Tailwind class on the `<aside>` in LeftDock creates a CSS stacking context. The `MenuPopover` (rendered inside the aside with `position: fixed` and `z-50`) was painted within the aside's stacking context, appearing behind the main pane content — also why context-menu clicks (rename, delete) were unreachable in the app. Additionally, `overflow-hidden` on the aside could clip the fixed-position menu in some rendering scenarios.

**Workspace reorganization**: HTML5 drag/drop can be unreliable in Tauri/WebView2, especially within a scroll container with `overflow-hidden`. Even if the store-level `reorderWorkspaces` works correctly, the UI drag/drop path may not fire `drop`/`dragover` events reliably.

### Fixes Applied

| Action | Path | Description |
|--------|------|-------------|
| Modify | `src/components/layout/LeftDock.tsx` | Portaled the workspace context menu to `document.body` via `createPortal` so it escapes the aside's stacking context. Added "Move up" and "Move down" context menu items as a reliable fallback for workspace reorder. Updated `MenuButton` to support a `disabled` prop; move buttons are disabled at boundary positions.
| Modify | `src/tests/unit/contextMenuDismissal.test.tsx` | Added 4 new tests: move up reorder, move down reorder, move up disabled at first position, move down disabled at last position.
| Modify | `src/tests/e2e/ux-fixes.spec.ts` | Added 2 new tests: workspace context-menu move up works, workspace context-menu move down works.

### Specific Changes

**Portal**: The workspaceMenu `MenuPopover` is now wrapped in `createPortal(..., document.body)`. The backdrop and menu container are rendered at the root level, above all stacking contexts, ensuring the menu is always visually and interactively on top.

**Move up** (`reorderWorkspaces(source, targetAbove)`): Reorders the workspace immediately before the one above it. Disabled when at index 0.

**Move down** (`reorderWorkspaces(itemBelow, source)`): Pushes the source one position down by reordering the item below before the source. Disabled when at the last index.

### MenuButton disabled prop
Added `disabled?: boolean` with visual styling (`cursor-not-allowed text-textMuted/40`) and a no-op click handler when disabled.

### Verification Results (Follow-Up Round)

#### Command 1: `npm run test:build`
```
> tsc -p tsconfig.test.json
```
Result: **PASS** (exit code 0)

#### Command 2: Targeted unit/integration tests
```bash
node --test .test-dist/tests/unit/contextMenuDismissal.test.js \
  .test-dist/tests/unit/documentStore.test.js \
  .test-dist/tests/integration/workspaceLifecycle.integration.test.js
```
Result: **PASS** — 56/56 tests pass across 4 suites (4 new context-menu tests added).

Key additions:
- `context menu dismissal` → 13/13 pass (4 new: move up, move down, move-up disabled, move-down disabled)
- All prior 52 tests unchanged and passing

#### Command 3: Playwright E2E
```bash
npx playwright test src/tests/e2e/ux-fixes.spec.ts --project=chromium
```
Result: **PASS** — 7/7 tests pass (2 new: move up E2E, move down E2E).

All prior 5 E2E tests still pass. The new move-up and move-down tests verify the full context-menu reorder path works in Chromium/Playwright.

### Acceptance Criteria Status (Follow-Up)

| Criterion | Status |
|-----------|--------|
| Workspace context menu appears above main pane (not clipped/behind) | ✅ Portaled to `document.body` |
| Workspace delete works through the visible overlay | ✅ Menu is now top-level; E2E delete test passes |
| Workspace reorder works through UI (not just store) | ✅ Move up/down buttons tested at unit + E2E level |
| Prior scrolling fixes preserved | ✅ Verified: all scroll tests still pass |
| No storage schema changes | ✅ Verified |

### Open Questions
- HTML5 drag/drop may still be unreliable in Tauri WebView2 within the scroll container. The move up/down buttons provide a reliable fallback path. If drag/drop remains desired, consider switching to a pointer-event-based custom drag implementation in a future dispatch.
- The portal approach adds a `react-dom` dependency (`createPortal`); this is already available in the project (React 18) and used at runtime only. No new npm dependencies needed.

---

## Second Follow-Up Fix Round (Message 008 → Dev)

### Root Cause Analysis

**Delete/Rename not working**: The workspace context menu now renders correctly above the main pane (from round 1 portal fix). However, the remaining failures for Delete and Rename were caused by `window.confirm` and `window.prompt` — these native browser dialogs are blocked or unreliable in Tauri WebView2. Non-dialog menu actions (color, stripe, move up/down) worked fine because they didn't use native dialogs.

**Drag-to-reposition**: HTML5 drag/drop (`draggable` attribute + native drag events) does not work reliably in the Tauri WebView2 runtime, especially within an `overflow-hidden` scroll container. Store-level reorder semantics were proven correct by unit tests, but the UI affordance (draggable card, drag feedback) was misleading.

### Fixes Applied

| Action | Path | Description |
|--------|------|-------------|
| Modify | `src/components/layout/LeftDock.tsx` | Replaced `window.prompt("Rename workspace", ...)` with an inline uncontrolled text input (ref-based) inside the portaled menu. Replaced `window.confirm("Delete workspace...")` with inline confirmation UI showing "Delete" / "Keep" buttons. Added rename/delete inline state management (`renaming`, `confirmingDelete`). Updated dock description to reference context menu for reorder.
| Modify | `src/components/workspace/WorkspaceCard.tsx` | Removed `draggable` attribute and all HTML5 drag/drop event handlers (`onDragStart`, `onDragEnd`, `onDrop`, `onDragOver`). Removed related props (`dragging`, `dropTarget`, drag callbacks) from the component interface.
| Modify | `src/tests/unit/workspaceCard.test.tsx` | Removed the "WorkspaceCard drag contract" test (no longer applicable). Removed all unused drag-related props from every WorkspaceCard usage across all test cases.
| Modify | `src/tests/unit/contextMenuDismissal.test.tsx` | Updated rename test to click "Rename workspace" → fill inline input → click "Save". Updated delete test to click "Delete workspace" → click confirm "Delete". Updated delete-cancel test to click "Delete workspace" → click "Keep". Removed all `window.prompt` / `window.confirm` mocking.
| Modify | `src/tests/e2e/ux-fixes.spec.ts` | Updated rename E2E to use inline input (`fill`) and Save button instead of `page.once("dialog")`. Updated delete E2E to use inline "Delete" confirm button instead of dialog handler.

### Specific Implementation Details

**Inline rename**: When "Rename workspace" is clicked, the menu switches to show an uncontrolled `<input>` (pre-filled with the current title) plus "Cancel" and "Save" buttons. Pressing Enter also saves. The ref-based approach avoids React controlled-input testing issues in JSDOM.

**Inline delete confirm**: When "Delete workspace" is clicked, the menu switches to show a confirmation message with "Keep" and "Delete" buttons. "Delete" calls `deleteWorkspace` and closes the menu. "Keep" closes the menu (same UX as clicking the backdrop).

**Drag affordance removed**: WorkspaceCard no longer has `draggable` attribute or any drag event handlers. The drag-related visual feedback (`opacity-50` on dragging, `ring-2` on drop target) and CSS cursor are also removed since they were never triggered without the drag events. The dock description now reads "Switch workspaces, open the context menu to rename, reorder, or delete." instead of mentioning drag reorder.

### Verification Results (Second Follow-Up Round)

#### Command 1: `npm run test:build`
```
> tsc -p tsconfig.test.json
```
Result: **PASS** (exit code 0)

#### Command 2: Targeted unit/integration tests
```bash
node --test .test-dist/tests/unit/contextMenuDismissal.test.js \
  .test-dist/tests/unit/workspaceCard.test.js \
  .test-dist/tests/unit/documentStore.test.js \
  .test-dist/tests/integration/workspaceLifecycle.integration.test.js
```
Result: **PASS** — 73/73 tests pass across 6 suites.

- `context menu dismissal` → 13/13 pass (rename, delete, delete-cancel all updated to inline UI)
- `WorkspaceCard alert badge` → 12/12 pass (drag contract test removed)
- `WorkspaceCard light-mode rendering` → 5/5 pass
- All prior 43 tests unchanged and passing

#### Command 3: Playwright E2E
```bash
npx playwright test src/tests/e2e/ux-fixes.spec.ts --project=chromium
```
Result: **PASS** — 7/7 tests pass.

- Rename E2E: updated to use inline input fill + Save button
- Delete E2E: updated to use inline confirm Delete button
- All prior 5 E2E tests still pass

### Acceptance Criteria Status (Second Follow-Up)

| Criterion | Status |
|-----------|--------|
| Workspace Rename works without `window.prompt` | ✅ Inline input + Save button |
| Workspace Delete works without `window.confirm` | ✅ Inline confirm + Keep/Delete buttons |
| No misleading drag affordance in UI | ✅ `draggable` removed from WorkspaceCard; dock copy updated |
| Prior fixes preserved (portal, scrolling, move up/down) | ✅ All prior tests still pass |
| No storage schema changes | ✅ Verified |

### Known Issues
- HTML5 drag/drop is intentionally removed. The "context menu to rename, reorder, or delete" is the supported UX path.
- The `window.prompt`/`window.confirm` removal is specific to workspace actions only. Other parts of the app (block delete via `BlockContextMenu`) may still use `window.confirm`. If those also fail in Tauri, they should be migrated similarly in a future dispatch.

### Open Questions
- Should block-level delete/rename also be migrated away from native dialogs? Currently only workspace actions are fixed. If `window.confirm` is systematically blocked in Tauri WebView2, the block-context-menu delete dialog should be migrated too.
