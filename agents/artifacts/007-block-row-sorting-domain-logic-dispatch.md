# Dispatch: TICKET-047 Block Row Sorting Domain Logic

## What
Implement the pure domain logic for sorting rows within a block by a selected column and direction.

## Why
The app already tracks row order and has a `BlockSort` type, but the sorting behavior is not implemented yet. This dispatch creates the domain foundation needed before adding sort menu UI in `TICKET-048`.

## Scope
- Add pure sorting helper(s) under `src/domain/sorting/` for comparing row cell values and returning sorted/reindexed rows.
- Support all meaningful v1 sortable column types: text, checkbox, bullet, date, time, and dropdown.
- Treat numbered columns as non-sortable/no-op because they are derived marker columns.
- Implement predictable null/empty handling, with null/empty values last for date/time/dropdown/text-like values.
- Preserve stable row identity and cell payloads; sorting may only change row `order` values.
- Preserve stable ordering among rows whose compared values are equal.
- Add targeted unit tests for comparator behavior, null/empty handling, unsupported/missing columns, descending order, stability, and row identity/payload preservation.

## Out of Scope
- Sort menu UI, block header wiring, or user-triggered sort commands (`TICKET-048`).
- Broad `documentStore` integration unless Plan determines a very small store action is necessary for history-ready domain coverage.
- Storage schema changes; `BlockSort` already exists.
- Clipboard, shortcuts, alerts, packaging, or formatting changes.
- Reworking row drag/reorder helpers beyond using existing display-order conventions where helpful.

## Related Spec Sections
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md` — `TICKET-047: Implement block row sorting domain logic`
- `docs/TODO_APP_TECH_SPEC.md` — Domain/model sorting module; `sortBlockRows()` representative action; Sorting Design
- `docs/TODO_APP_UI_SPEC.md` — Block header sort affordance and future sort menu context

## Constraints
- Keep the implementation framework-agnostic and deterministic.
- Do not introduce runtime dependencies.
- Do not mutate input rows, columns, or cell payload objects.
- Prefer small exported helpers with clear names so `TICKET-048` can wire UI/store behavior without rediscovering sort semantics.
- If invalid date/time strings are encountered, handle them like empty/null values instead of throwing.

## Acceptance Criteria
- [ ] Rows can be sorted ascending and descending by text, checkbox, bullet, date, time, and dropdown columns.
- [ ] Numbered columns are rejected or treated as no-op in a documented, tested way.
- [ ] Null, empty, missing, and invalid values sort predictably, with empty date/time/dropdown/text-like values last.
- [ ] Checkbox sorting places unchecked before checked by default in ascending order and reverses in descending order.
- [ ] Sorting is stable for equal values and starts from current display order.
- [ ] Sorted output preserves every row id and cell payload while reindexing `order` values only.
- [ ] Unit tests cover helper behavior across supported column types and edge cases.
- [ ] Existing verification remains green: typecheck, unit tests, build, and lint.
