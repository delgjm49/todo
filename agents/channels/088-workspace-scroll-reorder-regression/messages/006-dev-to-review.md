# Message 006 — Dev → Review — 2026-06-08

## From
Dev

## To
Review

## State
ready-for-review

## Read
- agents/channels/088-workspace-scroll-reorder-regression/messages/005-main-to-dev.md
- agents/artifacts/088-workspace-scroll-reorder-regression-dispatch.md
- agents/artifacts/088-workspace-scroll-reorder-regression-plan.md
- agents/artifacts/088-workspace-scroll-reorder-regression-complete.md
- agents/artifacts/088-workspace-scroll-reorder-regression-review.md
- src/components/layout/LeftDock.tsx
- src/components/shared/MenuPopover.tsx

## Task
Review the follow-up fix round against the requirements in message 005. Verify that:
1. The workspace context menu is no longer clipped/behind the main pane (portal approach).
2. Workspace delete and rename work through the visible overlay.
3. Workspace reorder works reliably via move-up/move-down context menu items.
4. Prior scrolling fixes are preserved and still pass.
5. No out-of-scope working tree changes exist.

## Key Changes
- **LeftDock.tsx**: Workspace context menu is now portaled to `document.body` via `createPortal` so it escapes the aside's `backdrop-blur` stacking context and `overflow-hidden`. Added "Move up" / "Move down" buttons with disabled state at boundary positions. MenuButton now supports a `disabled` prop.
- **contextMenuDismissal.test.tsx**: 4 new unit tests — move up reorder, move down reorder, move-up disabled at first, move-down disabled at last.
- **ux-fixes.spec.ts**: 2 new E2E tests — workspace context-menu move up, workspace context-menu move down.

## Root Cause
- `backdrop-blur` on the aside creates a CSS stacking context. MenuPopover's `position: fixed` and `z-50` only apply within that context, causing the menu to paint behind the main pane sibling. Portal resolves this.
- HTML5 drag/drop is unreliable in Tauri/WebView2 within the scroll container. Move up/down menu buttons provide a reliable fallback.

## Verification Commands to Run
1. `npm run test:build`
2. `node --test .test-dist/tests/unit/contextMenuDismissal.test.js .test-dist/tests/unit/documentStore.test.js .test-dist/tests/integration/workspaceLifecycle.integration.test.js`
3. `npx playwright test src/tests/e2e/ux-fixes.spec.ts --project=chromium`

## Verification Baseline (from Dev)
All three commands pass: test:build exits cleanly, 56/56 targeted JS tests pass, 7/7 Playwright tests pass.

## Out-of-Scope Boundary
No changes to storage schema, MainPane, documentStore reorder logic, or AppShell. Only LeftDock and test files were modified. The `react-dom` import (`createPortal`) is already available as a React 18 peer dependency; no new npm packages needed.

## Open Question
HTML5 drag/drop may still be unreliable. Move up/down buttons are a reliable alternative. If drag/drop is still desired as the primary UX, consider a pointer-event-based implementation in a future dispatch.
