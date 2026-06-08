# Dispatch: Workspace Scroll/Reorder Regression

## What
Fix the currently reproducible workspace dock scrolling regression and harden workspace drag/drop reorder behavior and coverage. Refresh the stale UX-fixes Playwright spec so it verifies the real user-facing behavior with current accessible names/selectors.

## Why
Live app testing still showed several issues originally captured in `agents/OBSERVATIONS.md`: workspace dock scrolling, workspace context menu actions, workspace drag/drop reorder persistence, and main canvas scrolling. Main triage on 2026-06-08 confirmed the current checkout includes dispatch 085, but found a real left-dock layout regression, likely directional ambiguity in workspace reorder insertion, and stale e2e assertions that do not reliably guard these flows.

## Scope
- Fix the left workspace dock so a long workspace list is constrained by the viewport and scrolls inside the dock instead of expanding the dock beyond the app viewport.
- Review and, if needed, fix `reorderWorkspaces(...)` so dragging a workspace before/after another workspace has stable, intuitive order changes in both upward and downward directions.
- Keep workspace context-menu delete/rename working; only change this area if current code/test evidence shows a real regression.
- Keep main canvas scrolling working and refresh its e2e coverage to use current accessible names/selectors.
- Update `src/tests/e2e/ux-fixes.spec.ts` so it asserts real scrollability via dimensions (`scrollHeight > clientHeight`) and avoids stale ambiguous selectors.
- Add or update targeted unit/integration coverage if workspace reorder semantics change.
- Out of scope: broad UI redesign, new drag handles, storage schema changes, packaging/signing work, or unrelated observation cleanup.

## Related Spec Sections
- `agents/OBSERVATIONS.md` — workspace context menu, workspace list scrolling, block content/main area scrolling, workspace/row drag observations.
- `src/components/layout/LeftDock.tsx` — workspace dock rendering, context menu, drag/drop hooks.
- `src/components/layout/AppShell.tsx` — root grid and viewport containment.
- `src/components/layout/MainPane.tsx` — main canvas scroll container.
- `src/stores/documentStore.ts` — `deleteWorkspace(...)`, `renameWorkspace(...)`, `reorderWorkspaces(...)`.
- `src/tests/e2e/ux-fixes.spec.ts` — current stale e2e coverage for these UX fixes.
- `src/tests/unit/contextMenuDismissal.test.tsx`, `src/tests/unit/documentStore.test.ts`, `src/tests/integration/workspaceLifecycle.integration.test.ts` — existing targeted coverage.

## Current-State Facts from Main Triage
- Current `main` includes `1cf8f53 dispatch: close 085-core-ux-fixes` and later dispatches; working tree was clean before this dispatch was framed.
- `npm run tauri:dev` maps to `npm exec tauri -- dev`; Tauri dev runs Vite via `beforeDevCommand: npm run dev`.
- Targeted tests passed: `npm run test:build && node --test .test-dist/tests/unit/contextMenuDismissal.test.js .test-dist/tests/unit/documentStore.test.js .test-dist/tests/integration/workspaceLifecycle.integration.test.js`.
- Existing Playwright UX spec currently has stale failures: `npx playwright test src/tests/e2e/ux-fixes.spec.ts --project=chromium` passed 3/5 and failed 2/5 due stale/ambiguous selectors, not necessarily product behavior.
- Browser triage found real left dock sizing evidence after many workspaces: viewport height 720, `main` height 720 but scrollHeight 2310, `aside` height 2310, and workspace list `clientHeight === scrollHeight === 1930`, so the list was not constrained to scroll.
- Browser triage found main pane scrolling evidence works with many blocks: `section` clientHeight 664, scrollHeight 2630, overflowY `auto`.
- Browser triage confirmed workspace delete through the context menu works in the Playwright browser runtime with confirm accepted.

## Constraints
- Preserve local-first JSON storage behavior; no schema migration should be needed.
- Follow existing React/Zustand/Tailwind patterns and naming conventions.
- Prefer small, targeted fixes.
- Do not weaken tests to merely match current implementation; assertions should reflect user-observable scroll/reorder/delete behavior.
- Use the actual shell available in the environment when running verification.

## Acceptance Criteria
- [ ] With many workspaces, the left workspace list has `scrollHeight > clientHeight`, scrolls inside the dock, and the root app/dock do not expand beyond the viewport.
- [ ] Workspace context menu rename and delete still work through UI tests or targeted unit coverage.
- [ ] Dragging/reordering workspaces produces the expected final order in both upward and downward movement cases and persists through store/reload coverage where applicable.
- [ ] The main canvas scroll e2e check uses current accessible names/selectors and verifies real scrollability when content overflows.
- [ ] `src/tests/e2e/ux-fixes.spec.ts` passes locally for Chromium.
- [ ] Relevant targeted JS tests pass, including context menu, document store workspace reorder/delete, and workspace lifecycle coverage.
- [ ] No unrelated source/test/doc changes are included.
