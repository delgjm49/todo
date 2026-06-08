# Message 001 — Main → Plan — 2026-06-08

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/artifacts/088-workspace-scroll-reorder-regression-dispatch.md
- agents/OBSERVATIONS.md
- src/components/layout/LeftDock.tsx
- src/components/layout/AppShell.tsx
- src/components/layout/MainPane.tsx
- src/stores/documentStore.ts
- src/tests/e2e/ux-fixes.spec.ts

## Task
Create the implementation plan for dispatch 088. Ground the plan in current files and tests, then write `agents/artifacts/088-workspace-scroll-reorder-regression-plan.md`. Focus scope on the left dock scroll regression, workspace reorder semantics/coverage, and stale UX-fixes Playwright coverage; preserve context-menu delete/rename and main canvas scrolling behavior.

## Close Requirements
- Create exactly one next message file in this channel's messages directory: `002-plan-to-dev.md` or `002-plan-to-main.md`.
- Append a concise entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git operations.
