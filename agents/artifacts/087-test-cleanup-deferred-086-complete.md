# Complete: Test cleanup for deferred 086 items

## Summary
Added three deferred test assertions from dispatch 086: an integration test verifying the checkbox-toggle + hideCompletedRows filter round-trip, explicit template default assertions for `hideCompletedRows`, and a UI rendering test confirming completed rows are hidden when `hideCompletedRows: true` with empty-state guidance.

## Files Changed
| Action | Path | Notes |
|--------|------|-------|
| Modified | `src/tests/integration/rowCellEditing.integration.test.ts` | Added `filterCompletedRows` import and `checkbox toggle hides and reveals completed rows when hideCompletedRows is enabled` test |
| Modified | `src/tests/unit/blockTemplates.test.ts` | Added `hideCompletedRows: false` assertions for all three template types in the existing default-columns test |
| Modified | `src/tests/unit/rowEditing.test.tsx` | Added `completed rows are hidden when hideCompletedRows is true, with empty-state guidance` UI rendering test |

## Deviations from Plan
None. All three test additions follow the plan exactly as specified.

## Open Questions
None. The deferred ledger (`agents/DEFERRED.md`) remains untouched per protocol — Main will mark the three `[open]` 086 entries as `[done]` after Review returns `review-pass`.

## Verification

- command: `npm run test`
- shell used: zsh (macOS)
- result: All 536 tests passed, 0 failed
- if failed, exact failure surface: N/A — all tests green
- checkpoint-scoped or unrelated repo-state: All three new tests ran as part of the suite:
  1. `row and cell editing integration > checkbox toggle hides and reveals completed rows when hideCompletedRows is enabled` — PASS
  2. `block templates > creates checklist, bullet, and numbered block payloads with valid default columns` — PASS (includes new hideCompletedRows assertions)
  3. `row editing ui > completed rows are hidden when hideCompletedRows is true, with empty-state guidance` — PASS
- was this the actual shell provided by the environment: Yes (zsh on macOS)

## Known Issues
None.
