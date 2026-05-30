# Complete: Search MVP

## Summary
Implemented a read-only global search MVP. The top bar now exposes a Search panel that searches already-loaded in-memory workspace/block/cell data, displays contextual grouped/capped results, and navigates selected results to the target workspace/block/row/cell with row flash support.

Review fix round: added an executing non-DOM search navigation invariant test that drives result navigation and asserts selection/navigation update while `dirty` remains `false` and no save/retry-save path is invoked.

## Files Changed
- `src/domain/search/searchTypes.ts` — added framework-free search contracts and capped result metadata.
- `src/domain/search/searchDocuments.ts` — added pure case-insensitive in-memory document search across workspace titles, block titles, and text/date/time/dropdown cells.
- `src/domain/search/index.ts` — added search barrel exports.
- `src/components/search/SearchPanel.tsx` — added local-query search popover with blank guidance, no-results state, grouped results, result counts, Escape close, and result selection.
- `src/components/search/SearchResultItem.tsx` — added presentational contextual result rows.
- `src/hooks/useSearchNavigation.ts` — added transient result navigation/scroll/selection/flash helper and exported the same navigation path as `navigateToSearchResult` for non-DOM invariant testing.
- `src/components/layout/TopBar.tsx` — wired the Search trigger/panel into the top bar without persisted state.
- `src/stores/uiStore.ts` — added non-persisted `searchFlashRowId` and setter.
- `src/components/row/RowView.tsx` — reused `animate-alertFlash` for search-target row flashes.
- `src/tests/unit/searchDocuments.test.ts` — added search domain coverage for blank query, matching scopes, exclusions, order, and capping.
- `src/tests/unit/searchNavigation.test.ts` — added review-requested executing invariant coverage for result selection, no dirty state, and no save/retry-save call.
- `src/tests/unit/uiStore.test.ts` — added search flash state coverage.

## Deviation Notes
- A dedicated DOM-rendered `SearchPanel.test.tsx` is still not present. A first attempt exposed a shared JSDOM/React input polyfill interaction that polluted later existing tests after compilation. Review explicitly allowed avoiding a new harness; the added `searchNavigation.test.ts` covers the required result-selection/read-only invariant without JSDOM.
- The optional Playwright smoke extension was not added; existing smoke was run unchanged.

## Open Questions
- None.

## Verification
- command: `npm run test`
  - shell used: bash via Pi on macOS
  - result: passed — 449 tests, 63 suites, 0 failures
  - if failed, exact failure surface: n/a
  - checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
  - was this the actual shell provided by the environment: yes
- command: `npm run lint`
  - shell used: bash via Pi on macOS
  - result: passed after rerun
  - if failed, exact failure surface: a parallel run with Playwright still failed with `ENOENT: no such file or directory, scandir '/Users/joe/Developer/todo/test-results'`; rerunning after `mkdir -p test-results` passed
  - checkpoint-scoped or unrelated repo-state: environment/repo transient directory race with Playwright `test-results`, not search implementation code
  - was this the actual shell provided by the environment: yes
- command: `npm run build`
  - shell used: bash via Pi on macOS
  - result: passed; Vite built 118 modules
  - if failed, exact failure surface: n/a
  - checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
  - was this the actual shell provided by the environment: yes
- command: `npm run test:e2e`
  - shell used: bash via Pi on macOS
  - result: passed; Playwright Chromium smoke test 1/1 passed
  - if failed, exact failure surface: n/a
  - checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
  - was this the actual shell provided by the environment: yes

## Known Issues
- Dedicated DOM-rendered SearchPanel component coverage remains deferred; the review-requested executing read-only/result-selection invariant is now covered by `src/tests/unit/searchNavigation.test.ts`.
