# Plan: Workspace Pointer Drag Reorder

## Overview
Implement a custom pointer-event workspace reorder interaction for the left dock, without restoring native HTML5 `draggable` / `dragstart` / `dragover` / `drop` behavior on workspace cards. The implementation should use the existing workspace index and persistence path, preserve dispatch 088's scrollable dock and context-menu fallback actions, and add deterministic tests that verify visible card order changes through a pointer/mouse drag path.

## Verified Current-State Facts
- `agents/channels/089-workspace-pointer-drag-reorder/messages/001-main-to-plan.md` addresses Plan and requires this plan artifact plus exactly one `002-plan-to-dev.md` or `002-plan-to-main.md` message.
- `agents/artifacts/089-workspace-pointer-drag-reorder-dispatch.md` explicitly requires pointer-driven workspace drag reorder, forbids native HTML5 workspace drag/drop, preserves dispatch 088 scroll/menu/inline rename/delete/Move up-down behavior, and asks tests to verify visible order changes.
- `agents/artifacts/088-workspace-scroll-reorder-regression-review.md` confirms dispatch 088 removed `WorkspaceCard` native HTML5 drag handlers because Tauri/WebView drag/drop was unreliable, portaled the workspace menu to `document.body`, added inline rename/delete, and added Move up / Move down menu items.
- `src/components/layout/LeftDock.tsx` currently renders workspace cards inside `data-testid="workspace-list-scroll"`, keeps the dock constrained with `min-h-0 max-h-screen overflow-hidden`, portals `MenuPopover` to `document.body`, and implements inline rename/delete plus Move up / Move down actions using `reorderWorkspaces(...)`.
- `src/components/workspace/WorkspaceCard.tsx` currently has no native `draggable` attribute and no `onDragStart` / `onDragOver` / `onDrop` handlers. It is a focusable `role="button"` card with click selection, context-menu opening, and keyboard Enter/Space selection.
- `src/stores/documentStore.ts` exposes `reorderWorkspaces(sourceWorkspaceId, targetWorkspaceId, options?)`; current implementation removes the source entry, inserts it before the target, calls `reindexSnapshotWorkspaces(...)`, and commits with transaction kind `"drag"`.
- `src/stores/uiStore.ts` still contains workspace drag UI state (`draggingWorkspaceId`, `dropTargetWorkspaceId`, `setWorkspaceDragState`, `resetWorkspaceInteractionState`) even though `LeftDock.tsx` no longer subscribes to it after dispatch 088.
- `src/tests/e2e/ux-fixes.spec.ts` already covers workspace-list scrolling, inline context-menu rename/delete, Move up, Move down, and sort/menu separation. The Move up/down E2E checks are currently weak visible-presence assertions rather than exact ordered-card assertions.
- `src/tests/unit/contextMenuDismissal.test.tsx` renders `LeftDock`, polyfills `PointerEvent`, verifies menu backdrop dismissal, inline rename/delete, and Move up/down store order. JSDOM layout will require mocked `getBoundingClientRect()` values for pointer-drag reorder tests.
- `src/tests/unit/workspaceCard.test.tsx` renders `WorkspaceCard` directly for alert badge and light-mode styling; it currently passes only `entry`, `theme`, `active`, `onOpenMenu`, and `onSelect` props.
- `src/tests/unit/documentStore.test.ts` and `src/tests/integration/workspaceLifecycle.integration.test.ts` already verify upward/downward `reorderWorkspaces(...)` persistence and sequential `order` values.
- `package.json` already includes `@dnd-kit/*`, and rows use `@dnd-kit`, but this dispatch can be completed with a targeted custom pointer interaction and does not require adding dependencies or using native HTML5 DnD.

## Prerequisites
- None. Work should start from the current post-088 files. Do not run git commands and do not edit existing dispatch channel messages.

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Modify | `src/components/layout/LeftDock.tsx` | Add pointer-drag session management, target calculation, visual state wiring, and reorder commit logic while preserving scroll and menu behavior. |
| Modify | `src/components/workspace/WorkspaceCard.tsx` | Add non-native pointer props, stable card/title test ids, drag/drop visual classes, and click suppression support. |
| Modify | `src/stores/documentStore.ts` | Keep existing insert-before-target semantics and, if needed for dropping after the final card, extend `reorderWorkspaces` to accept `targetWorkspaceId: WorkspaceId | null` as append-to-end without changing storage schema. |
| Modify | `src/tests/unit/contextMenuDismissal.test.tsx` | Add LeftDock pointer-drag reorder coverage with mocked card rects and preserve existing menu tests. |
| Modify | `src/tests/unit/workspaceCard.test.tsx` | Update direct `WorkspaceCard` renders for new optional props and add focused assertions for pointer callbacks / visual states if useful. |
| Modify | `src/tests/unit/documentStore.test.ts` | Add append-to-end coverage only if `reorderWorkspaces(..., null, ...)` is implemented. Keep existing upward/downward tests passing. |
| Modify | `src/tests/integration/workspaceLifecycle.integration.test.ts` | Add or adjust persistence coverage only if append-to-end semantics are added. |
| Modify | `src/tests/e2e/ux-fixes.spec.ts` | Add a pointer/mouse drag E2E that asserts visible workspace-card order; strengthen Move up/down assertions to use the same ordered-card helper if practical. |

## Implementation Steps

### Step 1: Add stable workspace-card DOM hooks and optional pointer props
- File: `src/components/workspace/WorkspaceCard.tsx`.
- Extend props with optional fields so existing tests can remain simple where possible:
  - `dragging?: boolean`
  - `dropTarget?: boolean`
  - `onPointerDragStart?: (event: React.PointerEvent<HTMLDivElement>) => void` or `onPointerDown?: ...` using a name that clearly indicates it is for the custom workspace drag path.
  - `suppressSelect?: boolean` or a callback from `LeftDock` if Dev chooses to centralize click suppression there.
- Add stable selectors:
  - `data-testid="workspace-card"` on the card root.
  - `data-workspace-id={entry.id}` on the card root.
  - `data-testid="workspace-card-title"` on the title text.
- Keep `role="button"`, `tabIndex={0}`, context-menu handling, and keyboard Enter/Space selection intact.
- Do not add `draggable`, `onDragStart`, `onDragOver`, `onDragEnd`, or `onDrop` to workspace cards.
- Add visual states through Tailwind classes:
  - Default: communicate affordance with `cursor-grab` (while keeping current active/hover styling).
  - Dragging source: `cursor-grabbing opacity-60 ring-2 ring-accent/50` or similar.
  - Drop target: accent border/ring such as `border-accent/70 ring-2 ring-accent/40`.
  - Consider `select-none` during pointer drag to avoid text selection.
- **Verify**: Existing `WorkspaceCard` unit tests compile and still pass after prop updates; no workspace card native drag attributes or native drag event props are present.

### Step 2: Wire custom pointer-drag state in LeftDock
- File: `src/components/layout/LeftDock.tsx`.
- Subscribe again to existing `useUiStore` workspace drag fields/actions:
  - `draggingWorkspaceId`
  - `dropTargetWorkspaceId`
  - `setWorkspaceDragState`
  - keep existing `resetWorkspaceInteractionState` cleanup.
- Add local refs/state for the pointer interaction:
  - `cardRefs = useRef<Map<WorkspaceId, HTMLElement>>(new Map())` or an equivalent ref callback map.
  - A drag session ref/state containing `sourceId`, `pointerId`, `startX`, `startY`, and whether the drag is active.
  - A `suppressNextClickRef` so a completed drag does not trigger the card's normal select click.
  - If implementing append-to-end feedback, a local `dropAfterEnd` boolean because `dropTargetWorkspaceId` cannot represent an end-of-list target.
- Pass each card:
  - `dragging={entry.id === draggingWorkspaceId}`
  - `dropTarget={entry.id === dropTargetWorkspaceId}`
  - pointer-down callback
  - ref registration callback, either as a prop or by wrapping each `WorkspaceCard` in a keyed element with the ref and data attributes.
- Pointer-start rules:
  - Only start a pending drag on primary pointer/button (`event.isPrimary !== false`, `event.button === 0`).
  - Ignore right-click/context-menu and any interactive child target if one is introduced later.
  - Do not immediately reorder or set drag UI on pointerdown; wait for movement threshold so normal click selection and dock scrolling are not misclassified.
- **Verify**: A simple click still selects a workspace; right-click still opens the portaled workspace menu.

### Step 3: Implement target calculation and drop commit
- File: `src/components/layout/LeftDock.tsx`.
- Install document-level `pointermove`, `pointerup`, and `pointercancel` listeners while a pending/active session exists; remove them on completion/unmount.
- Use a small threshold (for example 6 px total movement) before promoting pending drag to active. On activation, close any open workspace menu, call `setWorkspaceDragState(sourceId, null)`, and prevent text selection/default drag side effects.
- Calculate the insert target from current card rects in display order:
  - Exclude the source card from target candidates.
  - For each remaining card, compare `event.clientY` to the card's vertical midpoint.
  - The first card whose midpoint is below the pointer becomes the insert-before target.
  - If the pointer is below every remaining card, treat it as an end-of-list drop.
- Commit behavior:
  - If there is an insert-before target, call `reorderWorkspaces(sourceId, targetId)` only if that would change the current order (avoid committing a no-op when the source is already immediately before the target).
  - If the pointer is at end-of-list, either:
    1. Preferred: extend `reorderWorkspaces(sourceId, null)` in Step 4 and call it when source is not already last; or
    2. If Dev determines the store API must remain strictly two-id only, document the limitation in the complete artifact and restrict the UI indicator to insert-before targets.
  - Always reset `setWorkspaceDragState(null)`, clear local end/drop state, and clear the drag session on pointerup/cancel.
- Avoid native drag/drop events entirely. This implementation should be based on pointer/mouse events and DOM geometry.
- **Verify**: Dragging over another card visibly updates `dropTarget`; releasing calls the store once for a real reorder and does not leave stale UI drag state.

### Step 4: Extend store append semantics only if needed for full reorder coverage
- File: `src/stores/documentStore.ts`.
- If Step 3 needs an end-of-list target, update the `reorderWorkspaces` interface and implementation so `targetWorkspaceId` can be `WorkspaceId | null`:
  - Preserve all current behavior when `targetWorkspaceId` is a workspace id.
  - When `targetWorkspaceId === null`, remove the source entry and append it to the end.
  - Return `false` if settings are missing, source is missing, or the source is already last in the append case.
  - Continue using `structuredClone`, `reindexSnapshotWorkspaces(...)`, and `commitSnapshot(..., "drag", options)`.
- Do not change the JSON document shape or migration behavior.
- Update type annotations anywhere `reorderWorkspaces` is referenced if TypeScript requires it.
- **Verify**: Existing upward/downward reorder tests still pass; optional append test proves `[Home, Second, Third]` + append `Home` becomes `[Second, Third, Home]` and persists.

### Step 5: Preserve dispatch 088 menu and scroll behavior
- File: `src/components/layout/LeftDock.tsx`.
- Keep the existing `<aside>` constraints and `workspace-list-scroll` container classes unchanged unless a class addition is directly required for the drag indicator.
- Keep `createPortal(..., document.body)` for the workspace menu and all inline rename/delete views unchanged.
- Keep Move up / Move down menu actions and disabled boundary behavior unchanged.
- Ensure pointer drag does not start from the portaled menu and does not interfere with color input, Rename, Save, Delete, Keep, Move up, or Move down buttons.
- **Verify**: Existing context menu unit tests and all seven current `ux-fixes.spec.ts` tests continue to pass.

### Step 6: Add deterministic unit/integration coverage
- File: `src/tests/unit/contextMenuDismissal.test.tsx`.
- Add a test that renders `LeftDock` with three workspaces and initialized settings/storage, mocks each workspace card's `getBoundingClientRect()` to deterministic vertical positions, dispatches pointerdown/move/up, and asserts the final `workspaceIndex` id order plus sequential `[0, 1, 2]` order values.
- Include a no-drag click regression assertion if practical: pointerdown/up below threshold followed by click should still select normally and should not call reorder.
- File: `src/tests/unit/workspaceCard.test.tsx`.
- Update render helpers/usages for any new optional props. Add a small test for drag/drop visual class or pointer callback only if it is stable and not duplicative.
- File: `src/tests/unit/documentStore.test.ts` and `src/tests/integration/workspaceLifecycle.integration.test.ts`.
- Add append-to-end unit/integration tests only if `reorderWorkspaces(..., null, ...)` is implemented in Step 4.
- **Verify**: Targeted JS tests pass after `npm run test:build`.

### Step 7: Add E2E pointer-drag visible-order coverage
- File: `src/tests/e2e/ux-fixes.spec.ts`.
- Add a helper that reads current visible workspace titles from `data-testid="workspace-card"` / `workspace-card-title` inside `workspace-list-scroll`.
- Add a test:
  - reset storage;
  - create at least two extra workspaces;
  - assert initial visible order `Home`, `Workspace 2`, `Workspace 3`;
  - use `page.mouse.move`, `page.mouse.down`, multiple `page.mouse.move` calls, and `page.mouse.up` from the source card bounding box toward the target/end position (avoid Playwright `dragTo` if it relies on native DnD behavior);
  - assert the visible order changed exactly as expected.
- Strengthen the existing Move up and Move down E2E tests to assert exact visible order using the same helper, if doing so does not make the tests brittle.
- Keep the existing scrollability, inline rename/delete, and sort/menu tests.
- **Verify**: `npx playwright test src/tests/e2e/ux-fixes.spec.ts --project=chromium` passes.

## Data / Storage / Schema Changes
No JSON storage schema changes, migrations, or external APIs are required. If `reorderWorkspaces(sourceWorkspaceId, null, options?)` is added for append-to-end support, it is an in-memory/store API extension only and should still persist through the same cloned snapshot, `reindexSnapshotWorkspaces(...)`, and autosave path.

## UI Specifications
- Workspace cards should visibly communicate that pointer dragging is available: default grab cursor, active grabbing/source state while dragging, and accent drop-target/insert feedback.
- Use pointer movement thresholding so ordinary clicks remain selection clicks and accidental tiny movements do not reorder.
- Right-click context menu remains the accessible/precise fallback for rename, delete, style, Move up, and Move down.
- The scroll container remains `overflow-y-auto`; pointer listeners should not change dock sizing or disable list scrolling globally.
- If an end-of-list drop is implemented, show a clear bottom insert indicator while dragging below the final card; otherwise only show insert-before feedback on actual target cards.
- Do not show native browser/Tauri drag ghosts or rely on native drag cursor/drop feedback.

## Assumptions / Hypotheses
- Hypothesis to confirm during implementation: document-level pointer listeners plus thresholding will behave reliably in Tauri/WebView where native HTML5 drag/drop did not.
- Assumption: Adding stable `data-testid="workspace-card"` / `workspace-card-title` attributes is acceptable test instrumentation and does not affect UI.
- Assumption: Extending `reorderWorkspaces` with `null` as append-to-end is acceptable if required for full drag-to-bottom behavior because it preserves current two-id insert-before semantics and storage shape.

## Acceptance Criteria
- [ ] Workspace cards can be reordered through pointer/mouse dragging in the left dock without native HTML5 workspace drag/drop attributes or handlers.
- [ ] Releasing a drag changes the visible workspace-card order exactly as expected in unit/E2E coverage.
- [ ] Reordered workspace order persists through the existing document store/autosave path; order values are reindexed sequentially.
- [ ] Dragging provides clear source and target/end visual feedback and uses an appropriate grab/grabbing cursor affordance.
- [ ] Simple click selection, keyboard selection, right-click context menu, inline rename/delete, color/stripe controls, and Move up/down continue to work.
- [ ] Workspace list scrolling with many workspaces remains functional.
- [ ] Targeted TypeScript build, unit/integration tests, and `ux-fixes.spec.ts` Playwright tests pass.

## Estimated Complexity
- Medium.
- Expected file count: 5-8 modified files depending on whether append-to-end store semantics and persistence tests are added.
