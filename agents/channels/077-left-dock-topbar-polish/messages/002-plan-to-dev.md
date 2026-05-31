# Message 002 — Plan → Dev — 2026-05-31

## From
Plan

## To
Dev

## State
ready-for-dev

## Read
- agents/artifacts/077-left-dock-topbar-polish-plan.md
- agents/artifacts/077-left-dock-topbar-polish-dispatch.md
- docs/TODO_APP_UI_SPEC.md
- docs/TODO_APP_TECH_SPEC.md

## Task
Implement the plan in `agents/artifacts/077-left-dock-topbar-polish-plan.md`. In summary:
- Fix the workspace drag reorder bug in `src/components/workspace/WorkspaceCard.tsx` by calling `e.preventDefault()` in the `onDragOver` and `onDrop` element handlers (the store-level reorder + debounced persistence already works once the drop fires).
- Make the left dock fixed-height with list-only scroll in `src/components/layout/LeftDock.tsx` (`min-h-0` on the nav, `shrink-0` on header/footer); keep Settings as the single bottom gear entry with `aria-label`/`title`.
- Simplify `src/components/layout/TopBar.tsx`: remove `+ Block`, remove the duplicate top-right Settings control, convert Undo/Redo to inline-SVG icon buttons with `aria-label` + `title` tooltips (preserve disabled states/actions).
- Refactor `src/components/search/SearchPanel.tsx` to an always-visible top-bar input that preserves all existing Search MVP matching/navigation/flash and click-outside/Escape behavior.
- Keep an add-block affordance available after blocks exist in `src/components/layout/MainPane.tsx` (reuse `<BlockTemplateMenu />` below the block list).
- Add a `reorderWorkspaces` reorder + persistence unit test to `src/tests/unit/documentStore.test.ts` (fake timers + mocked persistence).

Architectural decisions flagged in the plan (honor them): use inline SVG for icons (no new icon dependency), and do NOT add a DOM/component test harness — new automated coverage stays at the store/pure-logic level. Write the complete artifact at `agents/artifacts/077-left-dock-topbar-polish-complete.md` following `agents/ARTIFACTS.md`.

## Required Verification
- `npm run test`
- `npm run lint`
- `npm run build`
- `npm run test:e2e` when Playwright browsers are available; otherwise record it as skipped/unavailable rather than failing the dispatch.

Report each command with the actual shell used, pass/fail, and the exact failure surface if any.

## Close Requirements
- Create `agents/artifacts/077-left-dock-topbar-polish-complete.md`.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Create exactly one next message file in `agents/channels/077-left-dock-topbar-polish/messages/` addressed to Review (`003-dev-to-review.md`, `State = ready-for-review`), or to Main (`needs-main-fix` / `stalled` / `error`) if you cannot proceed safely.
- Do not commit; Main handles git after Review passes.
