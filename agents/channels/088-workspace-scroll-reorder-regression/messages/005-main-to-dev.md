# Message 005 — Main → Dev — 2026-06-08

## From
Main

## To
Dev

## State
ready-for-dev

## Read
- agents/channels/088-workspace-scroll-reorder-regression/
- agents/artifacts/088-workspace-scroll-reorder-regression-dispatch.md
- agents/artifacts/088-workspace-scroll-reorder-regression-plan.md
- agents/artifacts/088-workspace-scroll-reorder-regression-complete.md
- agents/artifacts/088-workspace-scroll-reorder-regression-review.md
- src/components/layout/LeftDock.tsx
- src/components/shared/MenuPopover.tsx
- src/components/workspace/WorkspaceCard.tsx
- src/stores/documentStore.ts
- src/tests/e2e/ux-fixes.spec.ts

## Task
Do not close dispatch 088 yet. User-tested Tauri behavior after Review PASS found blocking remaining issues: workspace dock and main canvas scrolling now work, but workspace delete and workspace reorganization still do not work in the app. The user also observed that the workspace right-click context menu falls behind the main workspace/block area; the menu must remain visually and interactively above the main app area.

Investigate and fix these user-reported regressions. Treat the context-menu layering as a likely root cause for delete not working if current evidence supports that, but verify rather than assume. Pay special attention to `LeftDock` now using `overflow-hidden` and `backdrop-blur` while `MenuPopover` is rendered inside the dock; a portal or other robust overlay strategy may be needed so the workspace menu is not clipped or stacked behind the main pane. For workspace reorganization, verify the full UI drag/drop path in the app/E2E context, not only store-level reorder semantics; if HTML5 drag/drop is unreliable in Tauri/WebView or within the scroll container, implement a robust in-scope fix and cover it.

Preserve the scrolling fixes that the user confirmed are working.

## Required Verification
- Update/add tests that would fail for the workspace menu appearing behind/clipped by the main pane and that confirm context-menu delete works through the visible overlay.
- Update/add tests that verify workspace UI reordering actually changes visible workspace order, not just store order.
- Re-run the prior required commands from dispatch 088, including the UX-fixes Playwright spec.

## Close Requirements
- Update `agents/artifacts/088-workspace-scroll-reorder-regression-complete.md` with a new fix section and verification results.
- Create exactly one next message file in this channel's messages directory: `006-dev-to-review.md` or `006-dev-to-main.md`.
- For normal completion, use `To = Review` and `State = ready-for-review`.
- Append a concise entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git operations.
