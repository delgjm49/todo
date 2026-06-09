# Plan: Workspace Drag Polish

## Overview
Polish the existing pointer-based workspace reorder UI so the prospective drop destination is shown as an insertion slot between cards, with adjacent cards visibly making room. Keep the dispatch 089 reorder algorithm and store semantics intact, while improving active/pressed drag cursor and card visuals and updating tests around stable state markers.

## Verified Current-State Facts
- `agents/channels/090-workspace-drag-polish/messages/001-main-to-plan.md` is addressed `To: Plan`, has `State: ready-for-plan`, and requires this plan at `agents/artifacts/090-workspace-drag-polish-plan.md` plus exactly one `002-plan-to-dev.md` or `002-plan-to-main.md` message.
- `agents/artifacts/090-workspace-drag-polish-dispatch.md` scopes the work to insertion-slot feedback, neighboring-card nudging, top/bottom slot adaptations, clearer active-drag cursor/visual state, and preservation of dispatch 088/089 behavior. It explicitly forbids native HTML5 drag/drop and storage schema changes.
- `agents/artifacts/089-workspace-pointer-drag-reorder-review.md` confirms the current baseline passed review: pointer events, 6px activation threshold, click suppression, append-to-end with `reorderWorkspaces(sourceId, null)`, portaled context menu, inline rename/delete, Move up/down, scrolling, and persistence all worked before this polish pass.
- `src/components/layout/LeftDock.tsx` currently owns workspace drag session state with `dragSessionRef`, `isDragging`, `dropAfterEndRef`, document-level `pointermove`/`pointerup`/`pointercancel` listeners, and midpoint-based target detection from `[data-testid="workspace-card"]` bounding boxes. It sets `setWorkspaceDragState(sourceId, foundTarget)` only after the 6px threshold, and commits by calling `reorderWorkspaces(sourceId, currentDropTarget)` or `reorderWorkspaces(sourceId, null)` for end drops.
- `src/components/layout/LeftDock.tsx` currently renders workspace cards in a `space-y-2` container and renders only the append marker as `data-testid="drop-indicator-end"` after the cards when `isDragging && !!draggingWorkspaceId && !dropTargetWorkspaceId`.
- `src/components/workspace/WorkspaceCard.tsx` currently renders target-card feedback inside the card: when `dropTarget` is true it applies accent border/ring/background classes and inserts an absolute top-edge `data-testid="drop-indicator"` line. The dragged card already receives `cursor-grabbing opacity-70 scale-[0.97] shadow-lg ring-2 ring-accent/50 select-none`.
- `src/stores/documentStore.ts` already supports `reorderWorkspaces(sourceWorkspaceId, targetWorkspaceId | null)`: null target appends to end, non-null target inserts before target after removing the source, order values are reindexed, and the snapshot is committed with history kind `"drag"`. No store or storage schema change is needed for this dispatch.
- `src/stores/uiStore.ts` stores only `draggingWorkspaceId` and `dropTargetWorkspaceId` for workspace drag UI; `setWorkspaceDragState(null)` clears both. This is sufficient for active slot rendering, so any pre-threshold “pressed” styling can be local state in `LeftDock` instead of a store/schema change.
- `src/tests/unit/contextMenuDismissal.test.tsx` has a `workspace pointer-drag reorder` suite that mocks `getBoundingClientRect()`, verifies insert-before and append-to-end reorder outcomes, asserts the current `drop-indicator` / `drop-indicator-end` markers, and confirms below-threshold movement shows no marker and does not reorder.
- `src/tests/e2e/ux-fixes.spec.ts` has pointer-drag E2E tests for insert-before and append-to-end that assert visible `drop-indicator` / `drop-indicator-end` markers and final visible workspace order.
- `src/tests/unit/workspaceCard.test.tsx` currently covers alert badge and light-mode rendering; in the current file it does not contain dedicated tests for drag/pressed/slot visual classes, so this dispatch should add targeted component-level assertions there.
- `package.json` exposes the required verification commands: `npm run test:build`, targeted compiled `node --test ...` runs after build, and Playwright via `npx playwright test ...`.

## Prerequisites
- None beyond the existing dispatch 089 implementation. Do not commit; Main handles git operations.

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Modify | `src/components/layout/LeftDock.tsx` | Replace card-embedded target marker rendering with insertion-slot rendering between cards/end of list; compute slot neighbors and active/pressed drag cursor state; preserve pointer reorder logic. |
| Modify | `src/components/workspace/WorkspaceCard.tsx` | De-emphasize/remove target-card highlight, add pressed/active drag and slot-neighbor nudge props/classes, and keep card selection/menu behavior intact. |
| Modify | `src/tests/unit/contextMenuDismissal.test.tsx` | Update pointer-drag unit tests to assert insertion-slot markers, top/bottom adaptations, neighbor nudge classes/state markers, below-threshold absence, and reorder outcomes. |
| Modify | `src/tests/unit/workspaceCard.test.tsx` | Add component tests for pressed/dragging cursor classes and slot-neighbor nudge classes without relying on animation timing. |
| Modify | `src/tests/e2e/ux-fixes.spec.ts` | Update E2E drag assertions to the new insertion slot marker/test-id and add stable active-drag cursor/visual assertions while preserving final order checks. |
| Create | `agents/artifacts/090-workspace-drag-polish-complete.md` | Dev completion artifact summarizing implementation, deviations, verification, and known issues. |

## Implementation Steps

### Step 1: Introduce explicit insertion-slot state and neighbor derivation in `LeftDock`
- Keep the existing pointer session algorithm, threshold, `dropAfterEndRef`, click suppression, and `reorderWorkspaces()` calls.
- Add local state for pre-threshold pointer hold, e.g. `pressedWorkspaceId: WorkspaceId | null`:
  - Set it in `handleCardPointerDown` when a primary pointer starts a potential drag.
  - Clear it on `pointerup`, `pointercancel`, and cleanup paths.
  - This supports “holding” cursor styling before `draggingWorkspaceId` is set after the 6px threshold.
- Derive an active drop slot only after the threshold has promoted to an active drag:
  - `before` slot when `isDragging && draggingWorkspaceId && dropTargetWorkspaceId`.
  - `end` slot when `isDragging && draggingWorkspaceId && !dropTargetWorkspaceId && dropAfterEndRef.current` / the existing `showEndOfListMarker` condition.
- Derive slot neighbors from `workspaceIndex.filter(entry => entry.id !== draggingWorkspaceId)` so the dragged source does not count as the card above/below the slot:
  - For `before target`: `nextNeighborId = dropTargetWorkspaceId`; `previousNeighborId` is the previous non-dragging entry before that target, if any.
  - For `end`: `previousNeighborId` is the last non-dragging entry; `nextNeighborId = null`.
  - Top-of-list is represented by no previous neighbor; bottom-of-list by no next neighbor.
- **Verify**: Existing reorder state transitions remain unchanged: below threshold `draggingWorkspaceId` stays null, insert-before sets a target id, and end-of-list keeps target null while `dropAfterEndRef` is true.

### Step 2: Render a reusable slot component between cards instead of inside target cards
- Replace the `space-y-2` workspace-card container with a layout that supports interleaved children predictably, e.g. `flex flex-col gap-2`.
- Add a small local `WorkspaceDropSlot` helper component in `LeftDock.tsx` (or a private component in the same file) with stable attributes:
  - `data-testid="workspace-drop-slot"`
  - `data-drop-position="before" | "end"`
  - `data-drop-edge="top" | "middle" | "bottom"` based on which neighbors exist
  - `data-target-workspace-id={targetId}` only for `before` slots
  - `aria-hidden="true"`
- Visual target: a thin but visible landing rectangle/slot, not a line on the target card. Suggested styling: `h-3 rounded-md border border-accent/60 bg-accent/10 shadow-sm shadow-accent/40 ring-1 ring-accent/30`, with a small inner accent line if desired. Keep it subtle and stable; do not use animation-dependent logic in tests.
- Render the slot immediately before the target card for insert-before drops, including before the first card for top-of-list. Render the same component after the final card for append-to-end drops.
- Remove the old in-card `drop-indicator` rendering from `WorkspaceCard`, or leave no visible target-card emphasis beyond a very subtle neighbor/nudge state. The slot should be the primary feedback.
- **Verify**: During active drag, exactly one `workspace-drop-slot` is visible for a valid target or end drop; no old `drop-indicator` is needed for normal insert-before feedback.

### Step 3: Add neighbor nudge and active cursor/visual props to `WorkspaceCard`
- Update `WorkspaceCard` props to support targeted polish without changing behavior, for example:
  - `pressed?: boolean` for pointer-held but not necessarily threshold-active state.
  - `slotNudge?: "up" | "down" | null` or equivalent for cards adjacent to the active slot.
  - Keep `dragging?: boolean`; make it the strongest visual state.
  - Remove `dropTarget` if no longer needed, or retain it only as a compatibility/internal prop without strong target-card highlighting. Prefer new slot-specific props for clarity.
- Suggested visual behavior:
  - Default inactive card: unchanged `cursor-grab` treatment.
  - Pressed or dragging card: `cursor-grabbing`; dragging keeps/strengthens lifted state (`opacity-70`, `scale-[0.97]`, `shadow-lg`, accent ring, `select-none`, `z-10`).
  - Slot neighbor above the slot: apply a small upward transform such as `-translate-y-1` plus `transition-transform`.
  - Slot neighbor below the slot: apply `translate-y-1` plus `transition-transform`.
  - Top slot: only the first/next card nudges down. Bottom slot: only the previous/last card nudges up. Middle slot: previous card nudges up and next card nudges down.
- Ensure transform classes compose correctly with `scale-[0.97]` on the dragged card. Do not assign nudge classes to the dragging source.
- **Verify**: Class assertions can detect `cursor-grabbing`, lifted active drag classes, and nudge direction classes without waiting for CSS animations.

### Step 4: Make cursor cleanup robust in `LeftDock`
- When promoting to active drag, continue disabling body text selection and also set a clear active cursor, e.g. `document.body.style.cursor = "grabbing"`.
- Restore `document.body.style.cursor`, `userSelect`, and `webkitUserSelect` on `pointerup`, `pointercancel`, and the effect cleanup path. If you preserve previous inline values, restore those; otherwise clear the values consistently.
- Keep `closeWorkspaceMenu()` on promotion and maintain click suppression after completed active drags.
- **Verify**: Cursor style is active during threshold-crossed drag and cleared after release/cancel; below-threshold pointer movement does not leave stale body styles.

### Step 5: Update unit coverage in `contextMenuDismissal.test.tsx`
- Update existing pointer-drag tests from old marker assertions to new slot assertions:
  - Insert-before: after active pointer move, assert a visible/present `workspace-drop-slot` with `data-drop-position="before"` and the expected `data-target-workspace-id`.
  - End-of-list: assert `workspace-drop-slot` with `data-drop-position="end"` and `data-drop-edge="bottom"`.
  - Below threshold: assert no `workspace-drop-slot` and no reorder.
- Add or adjust a middle-slot scenario (for example dragging `Home` before `Projects`) to assert both adjacent cards receive stable nudge state/classes. Use the existing mocked rects rather than animation timing.
- Add/keep top adaptation coverage (for example dragging `Work` above `Home`) to assert `data-drop-edge="top"` and only the next card is nudged.
- Preserve final state assertions for exact workspace id order and sequential `[0, 1, 2]` order values.
- **Verify**: The suite continues to validate reorder behavior and feedback state without relying on real layout animations.

### Step 6: Add component-level tests in `workspaceCard.test.tsx`
- Add tests rendering `WorkspaceCard` with the new props:
  - `pressed` applies `cursor-grabbing` without requiring active drag state.
  - `dragging` applies the lifted active-drag visual classes and remains selectable/menu-compatible in markup.
  - `slotNudge="up"` and `slotNudge="down"` apply the expected transform class/state marker.
  - If the old `dropTarget` prop/rendering is removed, no test should expect `drop-indicator` inside `WorkspaceCard`.
- Keep existing alert and theme tests unchanged.
- **Verify**: Component tests inspect stable class/state markers only; no timing/animation assertions.

### Step 7: Update Playwright E2E coverage in `ux-fixes.spec.ts`
- Replace `drop-indicator` / `drop-indicator-end` assertions with `workspace-drop-slot` assertions:
  - Insert-before drag: expect a visible `workspace-drop-slot` with the expected target id/position before mouse up.
  - Append-to-end drag: expect a visible `workspace-drop-slot` with `data-drop-position="end"` before mouse up.
- Add a stable active-drag cursor/visual assertion while the mouse is down after threshold crossing:
  - Assert the dragged card has a class containing `cursor-grabbing` or a stable data attribute if added.
  - Optionally assert `document.body.style.cursor` or computed cursor is `grabbing` after promotion.
- Keep final visible order assertions exactly as in the existing tests to confirm behavior remains functional.
- **Verify**: E2E tests do not assert pixel-perfect slot size or transition timing.

### Step 8: Write the complete artifact and run required verification
- Create `agents/artifacts/090-workspace-drag-polish-complete.md` with the standard complete artifact sections.
- Run and report:
  1. `npm run test:build`
  2. `node --test .test-dist/tests/unit/contextMenuDismissal.test.js .test-dist/tests/unit/workspaceCard.test.js .test-dist/tests/unit/documentStore.test.js .test-dist/tests/integration/workspaceLifecycle.integration.test.js`
  3. `npx playwright test src/tests/e2e/ux-fixes.spec.ts --project=chromium`
- If any verification fails, fix scoped failures before handoff or document unrelated repo-state failures exactly per the repo’s verification reporting rules.
- **Verify**: Dev creates exactly one next channel message to Review with `State: ready-for-review` and does not commit.

## Data / Storage / Schema Changes
None. This dispatch is UI feedback and test coverage only. Do not change JSON storage shapes, `WorkspaceIndexEntry`, or `reorderWorkspaces()` semantics unless implementation uncovers a blocker; if it does, route to Main before expanding scope.

## UI Specifications
- **Insertion slot**: One visible slot appears at the prospective landing position once the 6px threshold activates drag. It is a thin rounded accent rectangle/shadow, rendered as its own element between cards (or after the last card), not as a top-edge line inside the target card.
- **Top-of-list slot**: Slot renders before the first non-dragging workspace. The first/next card nudges downward; there is no previous-card nudge.
- **Middle slot**: Slot renders between the previous and next non-dragging cards. Previous neighbor nudges slightly upward; next neighbor nudges slightly downward.
- **Bottom/end slot**: Slot renders after the final non-dragging workspace. The previous/last card nudges upward; there is no next-card nudge.
- **Dragged/pressed card**: Pointer-held card should use `cursor-grabbing`; threshold-active dragged card should retain a lifted visual state with scale, opacity, shadow, accent ring, and text-selection suppression.
- **Drop target card**: Do not rely primarily on target-card highlight. If any target-adjacent styling remains, it should be subordinate to the explicit slot and nudge feedback.
- **Accessibility/fallback**: Preserve current keyboard/click behavior, right-click context menu, and Move up/down menu fallback. The slot can be `aria-hidden` because it is transient visual feedback for a pointer drag.

## Assumptions / Hypotheses
- The desired “neighboring cards nudge apart” can be satisfied with a combination of an inserted slot element that takes up vertical space and small transform classes on adjacent card wrappers. This should be confirmed visually during implementation.
- Adding body-level `cursor: grabbing` during active drag is safe in the Tauri/WebView target if cleanup is robust. If it causes side effects, retain card/list-level cursor feedback and document the deviation.

## Acceptance Criteria
- [ ] During pointer drag, insert-before and append-to-end destinations are shown as a standalone insertion slot between/around workspace cards, not primarily by target-card highlighting.
- [ ] Adjacent cards visibly make room around the slot, with clear top, middle, and bottom/end adaptations.
- [ ] Pointer-held and active-drag states have clearer cursor/visual feedback, including `cursor-grabbing` while holding/dragging and a lifted active card state.
- [ ] Releasing over the indicated slot reorders correctly for insert-before and append-to-end cases.
- [ ] Dispatch 088/089 behaviors remain intact: scrolling, portaled context menu, inline rename/delete, color/stripe controls, Move up/down fallback, click suppression, threshold activation, and persistence.
- [ ] No native HTML5 drag/drop is introduced.
- [ ] Unit and E2E tests verify insertion-slot feedback, active cursor/visual state, below-threshold no-op, and continued pointer reorder outcomes.
- [ ] Required verification commands pass or are reported with exact scoped failure details.

## Estimated Complexity
- Medium.
- Expected product/test file count: 5 modified source/test files plus 1 complete artifact.
