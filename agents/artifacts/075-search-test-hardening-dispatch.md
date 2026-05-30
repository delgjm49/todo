# Dispatch: Search test hardening

## What
Add a small follow-up hardening pass for Search MVP based on the independent audit notes. Strengthen unit coverage for explicit excluded cell/marker types and deterministic ordering edge cases, and inspect/tighten search-navigation pending rAF/fallback timeout cleanup if a narrow safe improvement is warranted.

## Why
Dispatch 074 passed review and independent audit, but the audit identified optional test-hardening gaps: some exclusions and multi-block/multi-row ordering behavior are source-reviewed rather than directly tested, and `useSearchNavigation` timer cleanup may not cancel a pending requestAnimationFrame/fallback timeout. This dispatch should improve confidence without expanding scope into a full DOM SearchPanel test harness.

## Scope
- Add explicit unit tests in `src/tests/unit/searchDocuments.test.ts` or adjacent unit tests for:
  - checkbox boolean values are not searchable;
  - bullet/numbered marker string values are not searchable;
  - formatting/internal metadata remains unsearched if needed to keep the exclusion test clear;
  - deterministic order across multiple workspaces, blocks, rows, and columns.
- Inspect `src/hooks/useSearchNavigation.ts` for pending rAF/fallback timeout cleanup behavior.
- If a small safe cleanup is clear, implement it and add/adjust tests; otherwise document why no code change is needed.
- Keep the work non-DOM and avoid adding a Testing Library/jsdom harness.

**Out of scope:**
- Full DOM-rendered `SearchPanel` component tests.
- New UI test infrastructure.
- Search UX/feature changes, fuzzy search, ranking changes, persisted search state, or search result redesign.
- Product behavior changes unrelated to the audit notes.

## Related Spec Sections
- agents/artifacts/074-search-mvp-review.md
- agents/artifacts/074-search-mvp-complete.md
- src/domain/search/searchDocuments.ts
- src/tests/unit/searchDocuments.test.ts
- src/hooks/useSearchNavigation.ts
- src/tests/unit/searchNavigation.test.ts

## Constraints
- Keep this as a small test-hardening/code-cleanup follow-up.
- Do not weaken Search MVP behavior or existing tests.
- Do not add a jsdom/Testing Library harness.
- Main handles commit/push after Review passes.

## Acceptance Criteria
- [ ] Unit coverage explicitly verifies checkbox, bullet, and numbered marker values are excluded from search results.
- [ ] Unit coverage verifies deterministic ordering across multiple blocks and rows, not only workspace/column order.
- [ ] `useSearchNavigation` pending rAF/fallback cleanup is either tightened with tests or explicitly documented as safe/no-op for this dispatch.
- [ ] `npm run test`, `npm run lint`, and `npm run build` pass.
