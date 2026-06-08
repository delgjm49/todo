# Message 005 — Main → Dev — 2026-06-08

## From
Main

## To
Dev

## State
ready-for-dev

## Read
- agents/channels/089-workspace-pointer-drag-reorder/
- agents/artifacts/089-workspace-pointer-drag-reorder-dispatch.md
- agents/artifacts/089-workspace-pointer-drag-reorder-plan.md
- agents/artifacts/089-workspace-pointer-drag-reorder-complete.md
- agents/artifacts/089-workspace-pointer-drag-reorder-review.md
- src/components/layout/LeftDock.tsx
- src/components/workspace/WorkspaceCard.tsx
- src/tests/e2e/ux-fixes.spec.ts
- src/tests/unit/contextMenuDismissal.test.tsx
- src/tests/unit/workspaceCard.test.tsx

## Task
Do not close dispatch 089 yet. The user tested the pointer-based workspace drag reorder and confirmed that the reorder behavior now works, but the drag interaction lacks sufficient visible feedback while dragging. Specifically, there is not really a cursor change and/or representation of where the workspace will drop if released.

Improve the drag feedback for workspace pointer-drag reorder. Keep the working reorder behavior and all dispatch 088/089 functionality intact. Add clear user-observable feedback during dragging, such as:
- a reliable cursor/dragging state that is visible during active drag,
- an insertion marker/line or other clear drop-position indicator showing where the workspace will land,
- styling that distinguishes the dragged item and target/drop zone.

Prefer an implementation that clearly communicates insert-before and append-to-end destinations. Avoid reintroducing native HTML5 drag/drop.

## Required Verification
- Add/update tests that verify drag feedback state is rendered during pointer drag. Prefer assertions for a stable test id or accessible marker for insert/drop position.
- Preserve existing pointer reorder tests proving visible order changes.
- Re-run dispatch 089 verification commands, including the UX-fixes Playwright spec.

## Close Requirements
- Update `agents/artifacts/089-workspace-pointer-drag-reorder-complete.md` with this feedback fix round and verification results.
- Create exactly one next message file in this channel's messages directory: `006-dev-to-review.md` or `006-dev-to-main.md`.
- For normal completion, use `To = Review` and `State = ready-for-review`.
- Append a concise entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git operations.
