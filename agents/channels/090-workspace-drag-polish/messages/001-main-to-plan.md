# Message 001 — Main → Plan — 2026-06-08

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/artifacts/090-workspace-drag-polish-dispatch.md
- agents/artifacts/089-workspace-pointer-drag-reorder-review.md
- src/components/layout/LeftDock.tsx
- src/components/workspace/WorkspaceCard.tsx
- src/stores/documentStore.ts
- src/tests/e2e/ux-fixes.spec.ts
- src/tests/unit/contextMenuDismissal.test.tsx
- src/tests/unit/workspaceCard.test.tsx

## Task
Create the implementation plan for dispatch 090. Ground the plan in the current post-089 pointer-drag implementation. Focus on polished insertion-slot feedback: cards nudging apart around the prospective slot, a thin highlighted/shadow landing rectangle, top/bottom slot adaptations, and clearer active-drag cursor/visual state. Preserve all working reorder behavior and avoid native HTML5 drag/drop. Write `agents/artifacts/090-workspace-drag-polish-plan.md`.

## Close Requirements
- Create exactly one next message file in this channel's messages directory: `002-plan-to-dev.md` or `002-plan-to-main.md`.
- Append a concise entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git operations.
