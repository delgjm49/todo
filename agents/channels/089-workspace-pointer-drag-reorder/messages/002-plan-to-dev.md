# Message 002 — Plan → Dev — 2026-06-08

## From
Plan

## To
Dev

## State
ready-for-dev

## Read
- agents/artifacts/089-workspace-pointer-drag-reorder-dispatch.md
- agents/artifacts/089-workspace-pointer-drag-reorder-plan.md
- agents/artifacts/088-workspace-scroll-reorder-regression-review.md
- src/components/layout/LeftDock.tsx
- src/components/workspace/WorkspaceCard.tsx
- src/stores/documentStore.ts
- src/stores/uiStore.ts
- src/tests/e2e/ux-fixes.spec.ts
- src/tests/unit/contextMenuDismissal.test.tsx
- src/tests/unit/workspaceCard.test.tsx
- src/tests/unit/documentStore.test.ts
- src/tests/integration/workspaceLifecycle.integration.test.ts

## Task
Implement the plan artifact. Treat `agents/artifacts/089-workspace-pointer-drag-reorder-plan.md` as authoritative if this message is incomplete. Preserve dispatch 088 behavior and avoid native HTML5 workspace drag/drop.

## Close Requirements
- Write `agents/artifacts/089-workspace-pointer-drag-reorder-complete.md`.
- Create exactly one next message file in this channel's messages directory: Dev → Review with `State = ready-for-review`, or Dev → Main with an allowed triage state if blocked.
- Append a concise entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git operations.
