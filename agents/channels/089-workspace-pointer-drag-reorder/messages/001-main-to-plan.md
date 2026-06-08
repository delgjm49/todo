# Message 001 — Main → Plan — 2026-06-08

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/artifacts/089-workspace-pointer-drag-reorder-dispatch.md
- agents/artifacts/088-workspace-scroll-reorder-regression-review.md
- src/components/layout/LeftDock.tsx
- src/components/workspace/WorkspaceCard.tsx
- src/stores/documentStore.ts
- src/tests/e2e/ux-fixes.spec.ts
- src/tests/unit/contextMenuDismissal.test.tsx
- src/tests/unit/workspaceCard.test.tsx
- src/tests/unit/documentStore.test.ts
- src/tests/integration/workspaceLifecycle.integration.test.ts

## Task
Create the implementation plan for dispatch 089. Ground the plan in current post-088 files and avoid native HTML5 drag/drop. The goal is reliable pointer-based workspace drag reorder in Tauri/WebView while preserving dispatch 088's working scroll, context menu, inline rename/delete, and Move up/down fallback. Write `agents/artifacts/089-workspace-pointer-drag-reorder-plan.md`.

## Close Requirements
- Create exactly one next message file in this channel's messages directory: `002-plan-to-dev.md` or `002-plan-to-main.md`.
- Append a concise entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git operations.
