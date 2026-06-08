# Plan: Workspace Scroll/Reorder Regression

## Overview
Fix the left workspace dock so long workspace lists are constrained to the viewport and scroll within the dock, then harden workspace reorder semantics with targeted persistence coverage. Refresh the stale `ux-fixes` Playwright spec to assert real scrollability using current selectors while preserving workspace context-menu rename/delete and main-canvas scrolling behavior.

## Verified Current-State Facts
- `agents/channels/088-workspace-scroll-reorder-regression/messages/001-main-to-plan.md` addresses Plan with `State = ready-for-plan` and asks for `agents/artifacts/088-workspace-scroll-reorder-regression-plan.md`, focused on left dock scrolling, workspace reorder semantics/coverage, and stale Playwright coverage.
- `agents/artifacts/088-workspace-scroll-reorder-regression-dispatch.md` reports browser triage evidence that the left dock expands beyond a 720px viewport while `workspace-list-scroll` has `clientHeight === scrollHeight`, and that the main pane already scrolls (`overflowY: auto`) when content overflows.
- `src/components/layout/AppShell.tsx` renders a root `<main>` with `grid h-screen overflow-hidden grid-cols-[280px_minmax(0,1fr)]`; the right pane uses `flex min-h-0 min-w-0 flex-col` and its grid child uses `min-h-0 flex-1 min-w-0`.
- `src/components/layout/LeftDock.tsx` renders the dock as `<aside className="flex h-full w-[280px] flex-col ...">`; its workspace list child already has `mt-4 min-h-0 flex-1 overflow-y-auto pr-1` and `data-testid="workspace-list-scroll"`, but the aside itself does not currently include `min-h-0`, `max-h-screen`, or `overflow-hidden`.
- `src/components/layout/MainPane.tsx` renders the canvas as `<section className="min-h-0 min-w-0 overflow-y-auto ...">`; it currently has no stable test id for the scroll container.
- `src/components/layout/LeftDock.tsx` wires workspace context menu actions to `renameWorkspace(...)` via `window.prompt(...)` and `deleteWorkspace(...)` via `window.confirm(...)`; `src/tests/unit/contextMenuDismissal.test.tsx` already covers both actions and confirm-cancel behavior at component/store level.
- `src/components/workspace/WorkspaceCard.tsx` exposes each workspace card as a draggable `role="button"` whose accessible name includes the title plus additional card text such as `Workspace {entry.order + 1}` and color values; this makes exact accessible-name assertions for titles brittle.
- `src/stores/documentStore.ts` currently implements `reorderWorkspaces(sourceWorkspaceId, targetWorkspaceId, options?)` by removing the source and then inserting it at the original `targetIndex`. In contrast, `reorderBlocks(...)` adjusts the insertion index when moving downward (`sourceIndex < targetIndex ? targetIndex - 1 : targetIndex`), so workspace reorder behavior is asymmetric relative to block reorder.
- `src/tests/unit/documentStore.test.ts` currently has workspace reorder/delete/style coverage and one persistence-focused workspace reorder test, but it does not separately assert upward and downward workspace reorder semantics after the intended behavior is clarified in code.
- `src/tests/integration/workspaceLifecycle.integration.test.ts` verifies workspace reorder persistence only for moving the second workspace before the first; it does not cover a downward reorder case.
- `src/tests/e2e/ux-fixes.spec.ts` currently checks workspace scrolling by scrolling `workspace-list-scroll` and expecting an exact role name `Workspace 15`; it does not assert `scrollHeight > clientHeight`.
- `src/tests/e2e/ux-fixes.spec.ts` currently checks main canvas scrolling with `section` filtering and expects `getByRole("button", { name: "Add another block" })`, but `Add another block` is rendered as text in a `<div>`, not a button, and subsequent add-block buttons in `MainPane` receive aria labels like `Add block preset 1`.
- `package.json` provides the relevant verification scripts: `npm run test:build`, targeted `node --test` against compiled `.test-dist` files, and `npx playwright test ... --project=chromium`.

## Prerequisites
- Dev should not change storage schema or introduce new drag libraries/handles.
- Treat current code as authoritative over the dispatch summary if further inspection disproves any hypothesis below. If Main intended a broader before/after drop-zone redesign rather than stabilizing current card-drop semantics, route back to Main before widening scope.

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Modify | `src/components/layout/LeftDock.tsx` | Constrain the dock itself to viewport height so the existing workspace-list scroll container can shrink and scroll. Preserve existing menu and drag/drop handlers. |
| Modify | `src/components/layout/MainPane.tsx` | Add a stable test id to the existing canvas scroll container if needed for Playwright; do not change scrolling behavior beyond selector hardening. |
| Modify | `src/stores/documentStore.ts` | Align workspace reorder insertion semantics with the documented/tested behavior, likely matching block reorder's insert-before-target behavior for current card-level drops. |
| Modify | `src/tests/unit/documentStore.test.ts` | Add/update targeted workspace reorder tests for upward and downward moves, order reindexing, and persistence. Update any old expectations that encode the previous asymmetric behavior. |
| Modify | `src/tests/integration/workspaceLifecycle.integration.test.ts` | Add a downward reorder persistence case if not fully covered by the unit test, or expand the existing integration test to cover both directions. |
| Modify | `src/tests/e2e/ux-fixes.spec.ts` | Refresh stale selectors and assert actual left-dock/main-canvas scrollability with element dimensions. Keep context-menu rename/delete coverage. |
| Create | `agents/artifacts/088-workspace-scroll-reorder-regression-complete.md` | Dev completion artifact summarizing implementation, deviations, and verification results. |

## Implementation Steps

### Step 1: Constrain the left dock without changing menu behavior
- In `src/components/layout/LeftDock.tsx`, update the root `<aside>` classes so it is both a constrained flex column and an overflow boundary. Start with a minimal class change such as adding `min-h-0 max-h-screen overflow-hidden` alongside the existing `flex h-full w-[280px] flex-col ...`.
- Keep the existing workspace list child classes (`min-h-0 flex-1 overflow-y-auto`) and `data-testid="workspace-list-scroll"`.
- Do not change context menu handlers, prompt/confirm text, workspace card rendering, or drag/drop callbacks in this step.
- **Verify**: In Chromium/Playwright, the `workspace-list-scroll` element should report `scrollHeight > clientHeight` after many workspaces, and the containing `aside` should not exceed `window.innerHeight`.

### Step 2: Stabilize workspace reorder semantics
- In `src/stores/documentStore.ts`, make `reorderWorkspaces(...)` deterministic for both upward and downward movement using the same semantic as current block drops unless new evidence shows otherwise: dropping onto a target card inserts the source immediately before that target.
- Implement this by sorting/using the current ordered `workspaceIndex`, removing the source, and using an adjusted insertion index when the source was before the target (`sourceIndex < targetIndex ? targetIndex - 1 : targetIndex`), then passing through `reindexSnapshotWorkspaces(...)`.
- Preserve current no-op behavior for missing ids and `sourceWorkspaceId === targetWorkspaceId`.
- Preserve active workspace id, loaded workspace ids, undo/history, autosave scheduling, and storage shapes.
- If Dev discovers a current UI affordance that explicitly means "drop after target", update the plan in the complete artifact and add equivalent before/after tests; otherwise keep the minimal insert-before-target behavior aligned with `reorderBlocks(...)`.
- **Verify**: Unit tests should show source-after-target and source-before-target moves both produce expected order arrays with sequential `[0, 1, 2, ...]` order values.

### Step 3: Expand targeted reorder tests
- In `src/tests/unit/documentStore.test.ts`, update the existing workspace CRUD/reorder test if its expectation encodes the old downward-after-target behavior.
- Add or expand a dedicated test for at least three workspaces:
  - upward: `[Home, Second, Third]`, `reorderWorkspaces(Third, Home)` → `[Third, Home, Second]`;
  - downward: from that or a reset order, `reorderWorkspaces(Home, Third)` with insert-before-target semantics → `[Second, Home, Third]` (or equivalent ids depending on the setup);
  - assert all `order` values are `[0, 1, 2]` after each move.
- Keep or add persistence coverage by waiting for autosave/reinitializing from the memory storage service and asserting the persisted order remains the same.
- In `src/tests/integration/workspaceLifecycle.integration.test.ts`, add a downward persistence assertion if the unit test is not enough to cover reload through the real storage harness.
- **Verify**: The targeted compiled tests pass after `npm run test:build`.

### Step 4: Add stable canvas selector for E2E if needed
- In `src/components/layout/MainPane.tsx`, add `data-testid="main-canvas-scroll"` to the existing scrollable `<section>`.
- Do not change the section's existing `min-h-0 min-w-0 overflow-y-auto` layout classes unless Playwright dimension checks show a real regression.
- **Verify**: Existing unit tests that render `MainPane` still pass, and Playwright can locate `page.getByTestId("main-canvas-scroll")`.

### Step 5: Refresh `ux-fixes` Playwright tests
- In `src/tests/e2e/ux-fixes.spec.ts`, keep `resetTodoStorage(...)` and `waitForAppReady(...)`, but update stale selectors and assertions.
- For the workspace-list scroll test:
  - create enough workspaces to overflow the dock (increase the count if 15 is marginal on CI viewport sizes);
  - locate `page.getByTestId("workspace-list-scroll")`;
  - evaluate dimensions and styles, asserting `scrollHeight > clientHeight`, `clientHeight > 0`, and `getComputedStyle(el).overflowY` is `auto` or `scroll`;
  - also assert the closest `aside` height/client height is `<= window.innerHeight`;
  - scroll to the bottom and verify a late workspace card is reachable with a non-exact selector, e.g. `getByRole("button").filter({ hasText: "Workspace 16" })`, avoiding exact accessible-name assumptions.
- For the main-canvas scroll test:
  - add enough blocks to overflow the canvas using current button names: the initial empty-state buttons can use visible names like `Add Checklist`, while subsequent buttons should use current aria labels such as `Add block preset 1` or a helper that handles both states;
  - locate `page.getByTestId("main-canvas-scroll")`;
  - assert `scrollHeight > clientHeight`, `clientHeight > 0`, and `overflowY` is `auto` or `scroll`;
  - scroll to the bottom and assert the add-another-block region is visible via text or a stable locator, not `getByRole("button", { name: "Add another block" })`.
- For workspace context-menu rename/delete tests:
  - avoid exact role names for workspace cards because `WorkspaceCard` accessible names include extra metadata;
  - select the Home card using `page.getByRole("button").filter({ hasText: /^Home/ }).first()` or equivalent;
  - select menu actions via `getByRole("button", { name: "Rename workspace" })` and `getByRole("button", { name: "Delete workspace" })`.
- Keep the sort/menu test only if it still reflects current behavior; if touched, prefer existing `data-testid` values (`sort-menu-*`) and role/menu text that exists today.
- **Verify**: `npx playwright test src/tests/e2e/ux-fixes.spec.ts --project=chromium` passes locally.

### Step 6: Preserve context-menu and main-scroll behavior
- After the layout/reorder/test changes, run the targeted unit/integration tests that Main identified:
  - `src/tests/unit/contextMenuDismissal.test.tsx`
  - `src/tests/unit/documentStore.test.ts`
  - `src/tests/integration/workspaceLifecycle.integration.test.ts`
- If any context-menu test fails, fix only the regression introduced by this dispatch; do not redesign the menu.
- If the main-canvas dimension test fails, inspect whether content creation is insufficient before changing `MainPane` layout, because current code and Main triage already show main canvas scrolling works.
- **Verify**: Targeted tests pass with the exact command listed below.

## Data / Storage / Schema Changes
None expected. Workspace order remains represented by `workspaceIndex[].order`; no migration or JSON shape change is needed.

## UI Specifications
- Left dock remains 280px wide with the existing header, create button, workspace list, settings card, workspace cards, and context menu.
- With many workspaces, only the workspace list area scrolls; the dock header, add button row, and settings card stay within the viewport and do not force the root app to grow taller than `h-screen`.
- Workspace context-menu rename/delete prompts and confirm dialogs remain unchanged.
- Current card-level workspace drag/drop should produce a stable final order in both upward and downward directions. No new drag handles or broad drag UI redesign should be introduced in this dispatch.
- Main canvas remains a scrollable section when block content overflows; selector hardening must not alter user-facing scrolling behavior.

## Assumptions / Hypotheses
- Hypothesis: the left-dock regression is caused by the dock grid/flex item not being a constrained overflow boundary even though the child list has `overflow-y-auto`; Dev should confirm with dimension checks after adding `min-h-0 max-h-screen overflow-hidden`.
- Assumption: current workspace card drop semantics should match existing `reorderBlocks(...)` insert-before-target semantics because the UI exposes only one target card, not separate before/after drop zones. If this is not Main's intended UX, route to Main before expanding scope.
- Assumption: Playwright's default Chromium viewport is sufficient to overflow after creating 15-25 workspaces/blocks; if not, increase fixture counts rather than weakening dimension assertions.

## Acceptance Criteria
- [ ] With many workspaces, `workspace-list-scroll` has `scrollHeight > clientHeight`, scrolls inside the dock, and the dock/root app do not expand beyond the viewport.
- [ ] Workspace context-menu rename and delete still work through refreshed E2E coverage and existing targeted unit coverage.
- [ ] Workspace reorder tests cover both upward and downward movement, assert sequential `order` values, and verify persistence through reload where applicable.
- [ ] Main canvas E2E coverage uses current selectors and verifies real scrollability via dimensions when content overflows.
- [ ] `src/tests/e2e/ux-fixes.spec.ts` passes locally for Chromium.
- [ ] Targeted JS tests pass for context menu, document store workspace reorder/delete, and workspace lifecycle coverage.
- [ ] No storage schema changes or unrelated source/test/doc changes are included.

## Verification Commands for Dev
1. `npm run test:build`
2. `node --test .test-dist/tests/unit/contextMenuDismissal.test.js .test-dist/tests/unit/documentStore.test.js .test-dist/tests/integration/workspaceLifecycle.integration.test.js`
3. `npx playwright test src/tests/e2e/ux-fixes.spec.ts --project=chromium`

Report all command outcomes in `agents/artifacts/088-workspace-scroll-reorder-regression-complete.md` using the `agents/CLOSING.md` verification format.

## Estimated Complexity
- Medium
- Expected file count: 5-7 modified source/test files plus 1 Dev completion artifact.
