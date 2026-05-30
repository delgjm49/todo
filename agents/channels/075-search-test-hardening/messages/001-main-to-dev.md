# Message 001 — Main → Dev — 2026-05-30

## From
Main

## To
Dev

## State
ready-for-dev

## Read
- agents/artifacts/075-search-test-hardening-dispatch.md
- agents/artifacts/074-search-mvp-review.md
- agents/artifacts/074-search-mvp-complete.md
- src/domain/search/searchDocuments.ts
- src/tests/unit/searchDocuments.test.ts
- src/hooks/useSearchNavigation.ts
- src/tests/unit/searchNavigation.test.ts

## Task
Implement the small Search MVP hardening follow-up described in the dispatch. Focus on explicit non-DOM unit coverage for excluded marker/cell types and multi-block/multi-row ordering, plus a narrow review of search-navigation pending rAF/fallback cleanup. Write Dev notes to `agents/artifacts/075-search-test-hardening-complete.md`, then append exactly one next message to this channel addressed to Review.

## Required Verification
Report commands using the project verification format:
- `npm run test`
- `npm run lint`
- `npm run build`

## Close Requirements
- Create `agents/artifacts/075-search-test-hardening-complete.md`.
- Create exactly one next message file in `agents/channels/075-search-test-hardening/messages/`, addressed to Review unless Main triage is required.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git after Review passes.
