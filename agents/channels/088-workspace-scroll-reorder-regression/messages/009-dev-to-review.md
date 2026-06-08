# Message 009 — Dev → Review — 2026-06-08

## From
Dev

## To
Review

## State
ready-for-review

## Read
- agents/channels/088-workspace-scroll-reorder-regression/messages/008-main-to-dev.md
- agents/artifacts/088-workspace-scroll-reorder-regression-plan.md
- agents/artifacts/088-workspace-scroll-reorder-regression-complete.md
- agents/artifacts/088-workspace-scroll-reorder-regression-review.md
- src/components/layout/LeftDock.tsx
- src/components/workspace/WorkspaceCard.tsx
- src/tests/e2e/ux-fixes.spec.ts
- src/tests/unit/contextMenuDismissal.test.tsx

## Task
Review the second follow-up fix round against the requirements in message 008. Verify that:
1. Workspace Rename works without `window.prompt` (inline input + Save).
2. Workspace Delete works without `window.confirm` (inline confirm "Delete"/"Keep").
3. No misleading drag affordance remains (WorkspaceCard no longer `draggable`, dock copy updated).
4. Prior fixes (scrolling, portal, move up/down) are preserved and still pass.
5. No out-of-scope working tree changes exist.

## Key Changes
- **LeftDock.tsx**: Inline rename input (ref-based, uncontrolled) replaces `window.prompt`. Inline delete confirmation with "Keep" / "Delete" replaces `window.confirm`. Dock description updated.
- **WorkspaceCard.tsx**: Removed `draggable` attribute, all HTML5 drag/drop event handlers, and related props (`dragging`, `dropTarget`). Component interface simplified.
- **contextMenuDismissal.test.tsx**: Rename test uses input fill + Save click. Delete test uses inline Delete button. Delete-cancel test uses Keep button. All `window.prompt`/`window.confirm` mocking removed.
- **workspaceCard.test.tsx**: Drag contract test removed. All unused drag props removed from every WorkspaceCard usage.
- **ux-fixes.spec.ts**: Rename E2E uses `fill()` on inline input + Save click. Delete E2E uses inline Delete button.

## Root Cause
- `window.prompt`/`window.confirm` are blocked or unreliable in Tauri WebView2. In-app UI replaces both.
- HTML5 drag/drop is unreliable in Tauri WebView2. `draggable` removed; context-menu move up/down is the supported reorder path.

## Verification Commands to Run
1. `npm run test:build`
2. `node --test .test-dist/tests/unit/contextMenuDismissal.test.js .test-dist/tests/unit/workspaceCard.test.js .test-dist/tests/unit/documentStore.test.js .test-dist/tests/integration/workspaceLifecycle.integration.test.js`
3. `npx playwright test src/tests/e2e/ux-fixes.spec.ts --project=chromium`

## Verification Baseline (from Dev)
All three commands pass: test:build exits cleanly, 73/73 targeted JS tests pass, 7/7 Playwright tests pass.

## Out-of-Scope Boundary
No changes to storage schema, documentStore, or AppShell. Block-level delete (`BlockContextMenu`) still uses `window.confirm` — this should be migrated in a future dispatch if `window.confirm` is systematically blocked in Tauri WebView2.
