# Dispatch: Left dock and top-bar polish

## What
Polish the primary navigation surfaces from live QA: make the left dock behave like a stable fixed-height navigation rail with only the workspace list scrolling, move Settings to a fixed bottom gear entry, simplify the top bar, and keep block creation affordances available in the workspace canvas. Repair the left-dock workspace drag reorder flow in the same pass and verify it persists.

## Why
Live QA surfaced several navigation and creation affordance issues that make the app feel unfinished: Settings appears in the wrong place, the top bar has redundant controls, block template buttons disappear too aggressively, and workspace drag reorder starts but does not complete. These fixes are tightly coupled around the shell/dock/top-bar experience and should be resolved together for a cohesive polish pass.

## Scope
- Make the left dock fixed-height within the app viewport so the dock itself does not become the primary scroller.
- Make only the workspace list region scroll when needed.
- Keep Settings fixed at the bottom of the left navigation, represented with a gear icon and accessible label/tooltip as appropriate.
- Remove the top-right Settings control.
- Remove the universal top-bar `+ Block` control.
- Keep add-block template buttons available inside the workspace canvas even after blocks exist.
- Replace the Search button/trigger with an always-visible top-bar search input/bar that preserves existing Search MVP behavior.
- Replace Undo/Redo text buttons with icon buttons and hover tooltips, preserving disabled states and existing actions.
- Fix left-dock workspace drag/drop reorder so a completed drag actually reorders workspaces.
- Verify workspace reorder persistence after reload/storage round-trip.

**Out of scope:**
- Viewport clamping for block/workspace/column popover menus.
- Sortable column-header click behavior and header-row cleanup.
- Light-mode default color/formatting semantics.
- Richer inline text formatting for checklist/list text.
- New search result capabilities beyond preserving the existing Search MVP behavior in an always-visible input/bar.

## Related Spec Sections
- docs/TODO_APP_UI_SPEC.md
- docs/TODO_APP_TECH_SPEC.md
- agents/artifacts/074-search-mvp-dispatch.md
- agents/artifacts/074-search-mvp-complete.md
- Existing shell, dock, top-bar, search, and workspace ordering code under `src/`

## Constraints
- Follow existing React/TypeScript/Tailwind patterns and component naming conventions.
- Keep storage local JSON only; do not introduce external APIs or new persistence backends.
- Preserve keyboard and accessibility basics for navigation, search, Settings, Undo, Redo, and drag/drop where existing patterns support them.
- Prefer targeted UI/store fixes over broad shell rewrites.
- Treat workspace reorder persistence as part of the required fix, not a visual-only change.
- Main handles commit/push after Review passes.

## Acceptance Criteria
- [ ] The left dock remains fixed-height inside the app viewport and only the workspace list scrolls when there are many workspaces.
- [ ] Settings is fixed at the bottom of the left nav with a gear icon and no duplicate top-right Settings control remains.
- [ ] The universal top-bar `+ Block` control is removed.
- [ ] Workspace-canvas add-block template buttons remain available after blocks already exist.
- [ ] Search is available as an always-visible top-bar input/bar while preserving existing Search MVP navigation/highlight behavior.
- [ ] Undo and Redo are icon buttons with hover tooltips, preserve disabled states, and invoke the existing actions.
- [ ] Dragging workspaces in the left dock reorders them reliably.
- [ ] Reordered workspaces persist after reload/storage round-trip.
- [ ] Relevant unit/integration/e2e coverage is added or updated for reorder persistence and changed shell/search affordances where practical.
- [ ] `npm run test`, `npm run lint`, and `npm run build` pass.
