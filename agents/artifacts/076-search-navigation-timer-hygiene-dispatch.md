# Dispatch: Search navigation timer hygiene

## What
Address the single non-blocking hygiene note from dispatch 075: the new non-DOM fake-rAF test in `searchNavigation.test.ts` leaves a real 300ms timer overlap under the current non-isolated runner. Remove/control that timer overlap with the smallest safe test-side or helper-side adjustment, without introducing jsdom/Testing Library or changing Search MVP behavior.

## Why
Dispatch 075 passed with notes and verified the overlap is deterministic, but cleaning it up will keep the test suite less timing-sensitive and prevent future confusion around leaked timers in search navigation tests.

## Scope
- Inspect `src/tests/unit/searchNavigation.test.ts` and `src/hooks/useSearchNavigation.ts`.
- Prefer a small non-DOM test-side fix, e.g. passing a controlled `timeoutHandles` array and clearing pending handles at test end, using a fake timer helper for that test, or selecting a result shape that avoids scheduling the real row-flash timer while still proving stale rAF cancellation.
- If a tiny helper/API adjustment is cleaner, keep it internal and behavior-preserving.
- Preserve existing search navigation behavior and coverage.

**Out of scope:**
- DOM/jsdom/Testing Library harness work.
- SearchPanel component testing.
- Search UX or feature changes.
- Broad timer framework introduction.

## Related Spec Sections
- agents/artifacts/075-search-test-hardening-review.md (N1 note)
- src/tests/unit/searchNavigation.test.ts
- src/hooks/useSearchNavigation.ts

## Constraints
- Keep this a micro-dispatch.
- Do not weaken or remove the rAF cancellation assertion.
- Do not add product-visible behavior changes.
- Main handles commit/push after Review passes.

## Acceptance Criteria
- [ ] The search navigation rAF cancellation test no longer leaves an intentional real 300ms timer overlap after the test body.
- [ ] Existing search navigation assertions remain meaningful, including stale rAF cancellation and second-result selection.
- [ ] No DOM/jsdom/Testing Library harness is introduced.
- [ ] `npm run test`, `npm run lint`, and `npm run build` pass.
