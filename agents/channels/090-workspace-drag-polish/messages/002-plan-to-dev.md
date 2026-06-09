# Message 002 — Plan → Dev — 2026-06-08

## From
Plan

## To
Dev

## State
ready-for-dev

## Read
- agents/artifacts/090-workspace-drag-polish-plan.md
- agents/artifacts/090-workspace-drag-polish-dispatch.md
- src/components/layout/LeftDock.tsx
- src/components/workspace/WorkspaceCard.tsx
- src/tests/unit/contextMenuDismissal.test.tsx
- src/tests/unit/workspaceCard.test.tsx
- src/tests/e2e/ux-fixes.spec.ts

## Task
Implement the plan artifact. Treat `agents/artifacts/090-workspace-drag-polish-plan.md` as authoritative if this short message omits detail. Preserve the existing pointer-based reorder behavior and avoid native HTML5 drag/drop.

## Close Requirements
- Create `agents/artifacts/090-workspace-drag-polish-complete.md`.
- Run/report the verification commands listed in the plan artifact.
- Append a concise entry to `docs/SESSIONS_PENDING.md`.
- Create exactly one next message file in this channel's messages directory: Dev → Review with `State = ready-for-review`, or Dev → Main with an allowed blocked/error state if implementation cannot proceed safely.
- Do not commit; Main handles git operations.
