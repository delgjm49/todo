# Dispatch: 087 — Test cleanup for deferred 086 items

## What
Add the three low-severity test assertions that were recommended in the 086-hide-completed-rows Review but intentionally deferred.

## Why
Completes the test coverage notes left open in agents/DEFERRED.md after dispatch 086 (PASS WITH NOTES). These are pure test additions with no behavior or schema changes.

## Scope
- Add one integration test covering checkbox toggle + hideCompletedRows filter visibility round-trip in `rowCellEditing.integration.test.ts`
- Add one unit assertion that `createBlockTemplate` defaults `hideCompletedRows: false` in `blockTemplates.test.ts`
- Add one rendering test that verifies completed rows are hidden when `hideCompletedRows: true` in `rowEditing.test.tsx`
- Update the three `[open]` entries in `agents/DEFERRED.md` to `[done]` after review-pass

**Explicitly out of scope**: any new production code, preference UI, or non-test changes.

## Related Spec Sections
- docs/TODO_APP_TECH_SPEC.md (existing hideCompletedRows derived filter and Block preference)
- agents/DEFERRED.md (source of the three open items)

## Constraints
- Keep changes minimal and test-only.
- Follow existing test patterns and harnesses already used in those files.
- No new dependencies.

## Acceptance Criteria
- [ ] Integration test added and passes: check strikeout-enabled checkbox hides row when preference=true, uncheck reveals it.
- [ ] Template test asserts `createBlockTemplate(...).hideCompletedRows === false`.
- [ ] Row rendering test mounts RowView (or equivalent) with hideCompletedRows=true and confirms completed row is absent from output.
- [ ] All three DEFERRED items marked [done].
- [ ] Full test suite (unit + integration) remains green.
- [ ] Review returns State=review-pass (or PASS WITH NOTES that are themselves deferred).