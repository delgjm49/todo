# Dispatch: Search MVP

## What
Implement the first post-MVP feature slice: a read-only global search MVP. Add a top-bar search affordance/panel, search across already-loaded local document state, show contextual grouped results, and let users select a result to navigate to the relevant workspace and visibly highlight the target when practical.

## Why
Full planned v1 and release-readiness validation are complete, and dispatch 073 recommended Search MVP as the best first post-MVP feature. Search adds broad user value for larger local workspaces while fitting the current eager in-memory architecture and avoiding storage/schema risk.

## Scope
- Add pure search domain helpers/types for searching `documentStore` state.
- Search case-insensitively across:
  - workspace titles;
  - block titles;
  - text cell values;
  - date cell values/display strings;
  - time cell values/display strings;
  - dropdown selected values.
- Return stable, contextual results with workspace/block/row/cell identifiers and display snippets.
- Add a top-bar search button or compact trigger that opens a panel/popover.
- Show blank-query guidance, no-results state, grouped/labeled results, and result count/capping as needed.
- On result selection, switch to the target workspace and highlight or scroll to the matched block/row/cell using existing navigation/highlight patterns where practical.
- Add unit/component/integration coverage for search matching, panel behavior, and result selection.

**Out of scope:**
- Fuzzy search or ranked search beyond stable document order.
- Persisted search history, saved filters, or search index storage.
- Search/replace.
- Archive/completed filtering.
- Import/export work.
- Searching formatting values, internal IDs, checkbox booleans, bullet/numbered marker values, backup files, or hidden metadata.
- Large redesign of the top bar or a standalone search route.

## Related Spec Sections
- agents/artifacts/073-post-mvp-backlog-planning-plan.md
- docs/TODO_APP_TECH_SPEC.md (state/storage architecture)
- docs/TODO_APP_UI_SPEC.md (shell/top bar and interaction patterns)
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md Post-MVP Backlog Seeds
- Existing navigation/highlight code: alert navigation and highlight patterns

## Constraints
- Search must be read-only: no document mutation, no persistence writes, no dirty-state/autosave trigger.
- No schema or storage migration.
- Keep the first slice mouse-first; full keyboard result navigation can be deferred, but Escape/close behavior should be sane.
- Prefer existing styling and panel/menu patterns.
- Keep result ordering deterministic: workspace order → block order → row order → column order.
- Cap displayed results or otherwise avoid unbounded noisy UI.
- Main handles commit/push after Review passes.

## Acceptance Criteria
- [ ] User can open a search panel from the top bar.
- [ ] Blank query shows guidance and does not produce noisy results.
- [ ] Queries match workspace titles, block titles, text cells, date cells, time cells, and dropdown values case-insensitively.
- [ ] Results are grouped or labeled clearly enough to identify workspace/block context.
- [ ] Selecting a result navigates to the correct workspace and visibly highlights the target block/row/cell when practical.
- [ ] Search does not persist data, mutate documents, mark the document dirty, or trigger autosave.
- [ ] Unit tests cover pure search matching, supported cell types, blank queries, case-insensitivity, and result ordering.
- [ ] Component/integration tests cover panel rendering, no-results/blank states, and result selection behavior.
- [ ] Standard verification passes: `npm run test`, `npm run lint`, `npm run build`, and `npm run test:e2e` when Playwright browsers are available.
