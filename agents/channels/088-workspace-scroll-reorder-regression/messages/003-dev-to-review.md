# Message 003 — Dev → Review — 2026-06-08

## From
Dev

## To
Review

## State
ready-for-review

## Read
- agents/artifacts/088-workspace-scroll-reorder-regression-dispatch.md
- agents/artifacts/088-workspace-scroll-reorder-regression-plan.md
- agents/artifacts/088-workspace-scroll-reorder-regression-complete.md

## Task
Review the implementation against the plan and completion artifact. Confirm all acceptance criteria are met, no out-of-scope working tree changes exist, and verification commands pass.

## Key Changes
- **LeftDock.tsx**: Added `min-h-0 max-h-screen overflow-hidden` to the aside, constraining the dock to the viewport.
- **MainPane.tsx**: Added `data-testid="main-canvas-scroll"`.
- **documentStore.ts**: `reorderWorkspaces()` now uses `insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex` matching `reorderBlocks()` semantics.
- **documentStore.test.ts**: Updated existing CRUD reorder test for new semantics; added dedicated upward (+ persistence) and downward (+ persistence) reorder tests.
- **workspaceLifecycle.integration.test.ts**: Added downward reorder persistence test.
- **ux-fixes.spec.ts**: Full refresh — dimension-based scroll assertions, stable selectors, `data-testid` targeting, filtered role selectors.

## Verification Commands to Run
1. `npm run test:build`
2. `node --test .test-dist/tests/unit/contextMenuDismissal.test.js .test-dist/tests/unit/documentStore.test.js .test-dist/tests/integration/workspaceLifecycle.integration.test.js`
3. `npx playwright test src/tests/e2e/ux-fixes.spec.ts --project=chromium`

## Verification Baseline (from Dev)
All three commands pass. See the completion artifact for detailed results.

## Out-of-Scope Boundary
No changes to storage schema, WorkspaceCard, AppShell, or block/row/column domains. Only the files listed in the plan were modified.
