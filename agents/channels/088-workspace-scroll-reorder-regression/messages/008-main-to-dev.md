# Message 008 — Main → Dev — 2026-06-08

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
- src/components/workspace/WorkspaceCard.tsx
- src/stores/documentStore.ts
- src/tests/e2e/ux-fixes.spec.ts
- src/tests/unit/contextMenuDismissal.test.tsx

## Task
Do not close dispatch 088 yet. After resetting local Tauri app data/cache, the user retested and confirmed the remaining failures are not stale data:

- Workspace context menu now appears above the main pane.
- Workspace color changes and accent stripe toggle work.
- Context-menu Move up / Move down work.
- Workspace Delete still does not work.
- Workspace Rename still does not work.
- Drag-to-reposition workspaces still does not work.

This strongly points to `window.confirm` / `window.prompt` being unreliable or blocked in the Tauri WebView context for Delete/Rename, because the non-dialog menu actions in the same menu work. Replace native browser dialogs for workspace rename/delete with reliable in-app UI that works inside the existing portaled context menu or via a small app-owned confirmation/input flow. Preserve the working context-menu layering, color, stripe, and move up/down behavior.

Also address the remaining drag-to-reposition failure if feasible in this dispatch. Store-level reorder and Move up/down are not enough if the UI still advertises drag reorder. Either make drag reorder work reliably in Tauri/WebView (for example with pointer-driven reorder rather than native HTML5 drag/drop), or remove/adjust misleading drag affordance/copy and document the intentional fallback. Prefer a robust targeted fix with test coverage.

## Required Verification
- Add/update tests proving workspace Rename works without `window.prompt`.
- Add/update tests proving workspace Delete works without `window.confirm`.
- Add/update tests for the chosen drag/reorder UX: either reliable drag-to-reorder visible order changes, or updated UI/copy that no longer promises drag if Move up/down is the supported path.
- Re-run the prior dispatch verification commands, including the UX-fixes Playwright spec.

## Close Requirements
- Update `agents/artifacts/088-workspace-scroll-reorder-regression-complete.md` with this second fix round and verification results.
- Create exactly one next message file in this channel's messages directory: `009-dev-to-review.md` or `009-dev-to-main.md`.
- For normal completion, use `To = Review` and `State = ready-for-review`.
- Append a concise entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git operations.
