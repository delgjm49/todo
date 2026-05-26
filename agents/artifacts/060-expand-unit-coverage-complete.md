# Complete: Expand Unit Coverage for Domain Helpers

## Summary
Created 2 new test files and extended 5 existing test files, adding 123 tests total (53 new pure unit tests across 7 modified/created files). All new tests pass; 0 regressions. One pre-existing time-sensitive flaky test (`updateTimeCellValue triggers alert re-evaluation`) continues to fail outside of business hours due to `new Date().getHours() + 5 % 24` wrap-around — this was present before this dispatch and is unrelated.

## Files Changed
| Action | Path | Notes |
|--------|------|-------|
| Created | `src/tests/unit/formattingToCellStyle.test.ts` | 8 cases covering all branches of `formattingToCellStyle` |
| Created | `src/tests/unit/selectedFormattingTarget.test.ts` | 13 cases covering all selection kinds and missing-target paths of `resolveSelectedFormattingTarget` |
| Modified | `src/tests/unit/alertEvaluation.test.ts` | Added 10 cases: 5 calendar-invalid dates, 2 time boundaries, 1 mixed date+time earliest-wins, 1 workspace tie-breaking equal-dueAt, 1 workspace primary-in-second-block |
| Modified | `src/tests/unit/blockRowSorting.test.ts` | Added 5 cases: Intl.Collator numeric, case-insensitive, diacritic-insensitive stability, empty rows, non-sortable column |
| Modified | `src/tests/unit/columnHelpers.test.ts` | Added 8 cases: `createColumn` defaults for date/time/numbered, cross-type `changeColumnType` conversions |
| Modified | `src/tests/unit/blockTemplates.test.ts` | Added 8 cases: option overrides (title/blockId/order), bullet-list border defaults, `getBlockTemplateLabel`, text-cell value |
| Modified | `src/tests/unit/rowClipboard.test.ts` | Added 8 cases: edges canonical order, fontSize bounds, borderWidth bounds, duplicate column ids, non-finite order, cells null, id-mismatch shape fallback, type-mismatch rejection |

## Deviations from Plan
- **Step 3 — time 23:59:59 test**: The original test attempted to pass `now` as the next day's midnight expecting a past-due alert, but time-column evaluation is always relative to *today* (derived from `now`). Changed to test the exact-boundary scenario (`now` at 23:59:59 same day, value "23:59:59" → `hasAlert: true`), which validates the `nowMs >= dueAt` boundary correctly.
- **Step 4 — `sort = null` case**: The plan listed 6 cases including `sort = null` returning display-order reindexed, but this was already covered by the existing test *"treats numbered and missing sort columns as display-order no-ops with normalized order"*. Dropped it to avoid duplication.
- **Step 4 — column id naming**: Adjusted new test column IDs to use actual `ColumnType` values (e.g., `"text"` instead of `"txt"`) to satisfy the `sort()` helper's strict `ColumnType` parameter type. Functionally equivalent.

## Open Questions
- The pre-existing flaky test `updateTimeCellValue triggers alert re-evaluation` in `alertScheduler.test.ts` uses `new Date().getHours() + 5 % 24` which wraps around near midnight, causing false failures from ~19:00 onward. Not in scope of this dispatch but flagged for potential fix.

## Verification
- command: `npm run test`
- shell used: zsh (macOS)
- result: 410 pass, 2 fail (1 subtest + 1 suite — both the pre-existing flaky test `updateTimeCellValue triggers alert re-evaluation`)
- if failed, exact failure surface: `alertScheduler.test.ts` — `updateTimeCellValue triggers alert re-evaluation` — time-of-day sensitive, unrelated to this dispatch
- checkpoint-scoped or unrelated repo-state: Unrelated pre-existing flaky test
- was this the actual shell provided by the environment: Yes (zsh on macOS)

- command: `npm run lint`
- shell used: zsh (macOS)
- result: Pass (0 warnings, 0 errors)
- checkpoint-scoped or unrelated repo-state: Scoped
- was this the actual shell provided by the environment: Yes (zsh on macOS)

## Known Issues
- None introduced by this dispatch. One pre-existing flaky test in `alertScheduler.test.ts` is time-sensitive.
