# Dispatch: Workspace Pointer Drag Reorder

## What
Implement reliable pointer-based drag-and-drop reorder for workspace cards in the left dock. This should restore an intuitive drag UX without using native HTML5 drag/drop, while preserving the Move up / Move down context-menu fallback added in dispatch 088.

## Why
Dispatch 088 intentionally removed native workspace drag affordance because HTML5 drag/drop was unreliable in Tauri/WebView: the cursor/drag feedback could appear, but drops did not reliably reorder workspaces. The user still wants drag-and-drop as a primary interaction. A pointer-event-based implementation should be more reliable in Tauri and easier to test as direct visible-order changes.

## Scope
- Add pointer-driven workspace drag reorder for `WorkspaceCard` / `LeftDock`.
- Avoid native HTML5 `draggable`, `dragstart`, `dragover`, and `drop` for workspace cards.
- Provide clear visual feedback while dragging, including a cursor/drag affordance and drop-target/insert feedback.
- Preserve dispatch 088 behavior: workspace dock scrolling, context-menu portal layering, inline rename/delete, color/stripe controls, and Move up / Move down buttons.
- Persist reordered workspace order through existing `reorderWorkspaces(...)` store behavior.
- Update tests so the UI drag path verifies visible order changes, not only store-level order.
- Out of scope: block/row drag-and-drop, storage schema changes, broad dock redesign, or replacing Move up / Move down.

## Related Spec Sections
- `src/components/layout/LeftDock.tsx` — workspace list rendering, context menu actions, current Move up/down fallback.
- `src/components/workspace/WorkspaceCard.tsx` — workspace card interaction surface.
- `src/stores/documentStore.ts` — `reorderWorkspaces(...)` insert-before-target semantics and persistence.
- `src/tests/e2e/ux-fixes.spec.ts` — UX regression coverage for workspace scroll/menu/reorder.
- `src/tests/unit/contextMenuDismissal.test.tsx`, `src/tests/unit/workspaceCard.test.tsx`, `src/tests/unit/documentStore.test.ts`, `src/tests/integration/workspaceLifecycle.integration.test.ts` — existing coverage to preserve/extend.
- `agents/artifacts/088-workspace-scroll-reorder-regression-review.md` — documents why native HTML5 drag was removed and why pointer-drag is the intended follow-up.

## Constraints
- Do not reintroduce native HTML5 workspace drag/drop.
- Use existing React state/Zustand patterns; keep changes targeted.
- The pointer implementation must coexist with scrollable workspace list behavior.
- The context menu must remain accessible and not conflict with pointer-drag initiation.
- Prefer mouse/pointer events with deterministic tests; avoid timing/flaky heuristics where possible.
- Maintain accessible fallback via Move up / Move down for keyboard/non-drag users.

## Acceptance Criteria
- [ ] Dragging a workspace card with pointer/mouse interaction visibly changes workspace order in the left dock.
- [ ] Reordered workspace order persists via existing store/storage behavior.
- [ ] The cursor/visual state communicates when a workspace is draggable/being dragged.
- [ ] Workspace list scrolling still works with many workspaces.
- [ ] Workspace context menu actions from dispatch 088 still work: inline rename, inline delete, color/stripe, Move up/down.
- [ ] Tests cover the pointer-drag UI path and verify visible order changes.
- [ ] Existing dispatch 088 targeted verification remains passing, including the UX-fixes Playwright spec.
