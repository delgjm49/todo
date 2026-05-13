# Complete: TICKET-047 Block Row Sorting Domain Logic

## Summary
Implemented pure block row sorting domain logic under `src/domain/sorting/`.

- Added `compareCellValues` and `isSortableColumn` for v1 sortable column semantics.
- Added `sortRowsByColumn` for stable, current-display-order row sorting with normalized `order` values.
- Added focused unit coverage in `src/tests/unit/blockRowSorting.test.ts` for supported types, empty/null handling, no-op cases, stability, and payload preservation.

## Files Changed
- `src/domain/sorting/compareValues.ts`
- `src/domain/sorting/sortRows.ts`
- `src/tests/unit/blockRowSorting.test.ts`

## Implementation Notes
- Supported sortable columns: `text`, `checkbox`, `bullet`, `date`, `time`, and `dropdown`.
- `numbered` and missing columns are treated as no-op sort keys; returned rows still follow current display order and normalized `order: 0..n-1`.
- Text/dropdown values compare as trimmed strings through a locale-aware collator; null, missing, non-string, and empty values sort last in both directions.
- Checkbox values sort unchecked before checked ascending and checked before unchecked descending; missing/non-boolean values are treated as unchecked.
- Date values accept strict `YYYY-MM-DD` strings and reject invalid/impossible dates as empty.
- Time values accept strict `HH:mm` and `HH:mm:ss` strings and reject out-of-range values as empty.
- Bullet columns are accepted but compare all marker values equal, making sorting stable and effectively no-op.
- Sorting starts from `getRowsInDisplayOrder(rows)`, uses stable tie-breaking from that display order, and returns cloned/reindexed rows without mutating input rows, columns, cells, or payload contents.

## Verification Results

- command: `npm run typecheck`
- shell used: Bash via pi harness on macOS/zsh environment
- result: PASS
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
- was this the actual shell provided by the environment: yes

- command: `npm run test`
- shell used: Bash via pi harness on macOS/zsh environment
- result: PASS — 159/159 tests passed; existing React `act(...)` warnings were printed by pre-existing UI tests
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
- was this the actual shell provided by the environment: yes

- command: `npm run build`
- shell used: Bash via pi harness on macOS/zsh environment
- result: PASS
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
- was this the actual shell provided by the environment: yes

- command: `npm run lint`
- shell used: Bash via pi harness on macOS/zsh environment
- result: PASS
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
- was this the actual shell provided by the environment: yes

## Acceptance Criteria Status
- [x] Rows can be sorted ascending and descending by text, checkbox, bullet, date, time, and dropdown columns.
- [x] Numbered columns and missing columns are documented/tested no-ops.
- [x] Null, empty, missing, non-string text-like values, and invalid date/time values sort predictably, with empties last for text/date/time/dropdown in both directions.
- [x] Checkbox sorting places unchecked before checked ascending and reverses descending.
- [x] Sorting is stable for equal values and starts from current display order.
- [x] Sorted output preserves every row id and cell payload content while reindexing only `order` values.
- [x] Unit tests cover comparator and sort behavior across supported column types and edge cases.
- [x] Verification passed: typecheck, test, build, and lint.
