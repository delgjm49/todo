# Dispatch: Workspace Drag Polish

## What
Polish the workspace pointer-drag interaction so the drop destination is communicated as an insertion slot between workspaces, not primarily by highlighting the target card. Add refined cursor/active-drag feedback and subtle movement/animation so neighboring cards visually make room for the dragged workspace.

## Why
Dispatch 089 made pointer-based workspace drag reorder functional and tested, but live testing found the feedback still feels too crude: the current behavior highlights the workspace the dragged card will go above. The preferred UX is a clear landing slot between cards, with adjacent cards nudging apart and a thin highlighted/shadow rectangle indicating where the dragged workspace will land.

## Scope
- Replace or de-emphasize target-card highlighting in favor of a clear insertion-slot indicator between workspace cards.
- While dragging, nudge the neighboring cards around the prospective insertion point apart enough to communicate the landing slot.
- Show a thin rectangle/slot with highlight or shadow color where the workspace will land if released.
- Adapt slot behavior for top-of-list and bottom-of-list drops, where only one neighboring card exists.
- Add clearer active-drag cursor styling while the pointer is holding/dragging a workspace.
- Preserve dispatch 089 behavior: pointer-based reorder, append-to-end support, click suppression, threshold activation, persistence, Move up/down fallback, inline rename/delete, portaled context menu, and scrolling.
- Update tests for the new insertion-slot feedback and active-drag cursor/visual state.
- Out of scope: changing storage schema, replacing the pointer drag algorithm wholesale unless necessary, block/row drag polish, or broad dock redesign.

## Related Spec Sections
- `agents/artifacts/089-workspace-pointer-drag-reorder-review.md` — current pointer drag behavior, tests, and feedback implementation.
- `src/components/layout/LeftDock.tsx` — drag session state, drop target/end marker rendering, pointer event handling.
- `src/components/workspace/WorkspaceCard.tsx` — card visual state and pointer interaction surface.
- `src/stores/documentStore.ts` — `reorderWorkspaces(source, target|null)` semantics.
- `src/tests/e2e/ux-fixes.spec.ts` — E2E coverage for pointer drag and workspace menu behavior.
- `src/tests/unit/contextMenuDismissal.test.tsx`, `src/tests/unit/workspaceCard.test.tsx` — unit coverage for drag state/feedback.

## Current Behavior Baseline
- Pointer drag reorder works and passed review in dispatch 089.
- Insert-before feedback currently uses target-card highlighting/top-edge indicator (`drop-indicator`).
- Append-to-end feedback uses an end marker (`drop-indicator-end`).
- User preference: insertion feedback should be a slot between cards; neighboring cards should visually make room; top/bottom should behave similarly with one adjacent card.

## Constraints
- Do not reintroduce native HTML5 drag/drop.
- Keep the implementation targeted and compatible with Tauri/WebView.
- Avoid brittle animation tests; test stable class/test-id/state markers and visible order outcomes.
- Preserve accessibility fallback via Move up / Move down.
- Keep scroll behavior reliable in a long workspace list.

## Acceptance Criteria
- [ ] During pointer drag, the prospective drop destination is shown as an insertion slot between workspace cards rather than relying mainly on target-card highlight.
- [ ] Adjacent cards visibly nudge/make room around the insertion slot; top and bottom insertion positions have clear adapted slot visuals.
- [ ] The active drag cursor/visual state is clearly different while holding/dragging a workspace.
- [ ] Releasing over the indicated slot reorders the workspace correctly, including insert-before and append-to-end cases.
- [ ] Dispatch 088/089 behaviors remain intact: scrolling, portaled context menu, inline rename/delete, color/stripe, Move up/down, persistence.
- [ ] Unit and/or E2E tests verify insertion-slot feedback state and continued pointer reorder behavior.
- [ ] Required verification passes: `npm run test:build`, targeted workspace tests, and `npx playwright test src/tests/e2e/ux-fixes.spec.ts --project=chromium`.
