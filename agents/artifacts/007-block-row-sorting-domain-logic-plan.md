# Plan: TICKET-047 Block Row Sorting Domain Logic

## Overview
Implement the framework-agnostic row sorting foundation for blocks. The work should add pure comparator/sort helpers under `src/domain/sorting/`, use the app's current row display-order convention before sorting, and preserve every row id and cell payload while only normalizing `order` values in returned rows.

This dispatch is intentionally domain-only. Do not wire sort menus, block header actions, or `documentStore` mutations in this ticket; `TICKET-048` can consume the helpers when UI/store behavior is added.

## Prerequisites
- Existing row ordering helpers are available in `src/domain/rows/reorderRows.ts`.
- Existing persisted contracts are authoritative:
  - `BlockSort` in `src/types/block.ts`
  - `ColumnDefinition` / `ColumnType` in `src/types/column.ts`
  - `Row` / `PersistedCell` in `src/types/row.ts`

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Create | `src/domain/sorting/compareValues.ts` | Normalize and compare cell values by owning column type. |
| Create | `src/domain/sorting/sortRows.ts` | Sort/reindex rows by `BlockSort` using current display order and stable tie-breaking. |
| Create | `src/tests/unit/blockRowSorting.test.ts` | Targeted unit tests for comparator semantics, no-op behavior, stability, null handling, and payload preservation. |
| Reference only | `src/domain/rows/reorderRows.ts` | Use `getRowsInDisplayOrder`; do not rework row drag/reorder helpers. |
| Reference only | `src/stores/documentStore.ts` | No store action should be added in this dispatch unless Dev finds a blocker and documents it. |

## Implementation Steps

### Step 1: Add comparator helpers
- File: `src/domain/sorting/compareValues.ts`
- Use type-only imports from `BlockSort`, `ColumnDefinition`, `ColumnType`, `PersistedCell`, and `Row` as needed.
- Suggested exports:
  ```ts
  export type SortDirection = BlockSort["direction"];

  export function isSortableColumn(column: ColumnDefinition | undefined): column is ColumnDefinition;

  export function compareCellValues(
    left: PersistedCell | undefined,
    right: PersistedCell | undefined,
    column: ColumnDefinition,
    direction: SortDirection
  ): number;
  ```
- `isSortableColumn` should return `false` for missing columns and `numbered` columns. It should return `true` for `text`, `checkbox`, `bullet`, `date`, `time`, and `dropdown`.
- Implement deterministic normalization by column type:
  - `text`: compare trimmed string values with a locale-aware collator; `null`, missing, non-string, and `""` are empty.
  - `dropdown`: compare actual persisted string values with the same string comparator; do not validate against `settings.options`; `null`, missing, non-string, and `""` are empty.
  - `checkbox`: unchecked before checked in ascending order; checked before unchecked in descending order. Missing/non-boolean values should be treated as unchecked instead of empty.
  - `date`: parse valid date strings into numeric timestamps; `null`, missing, empty, and invalid strings are empty.
  - `time`: parse valid `HH:mm` or `HH:mm:ss` local-time strings into seconds from midnight; `null`, missing, empty, and invalid strings are empty.
  - `bullet`: marker-only in v1. Treat bullet values as equal so sorting by a bullet column is stable and effectively no-op, but still accepted as a supported sortable type.
- For text-like/date/time/dropdown values, empty values must sort last in both ascending and descending directions. Direction only reverses comparisons between two non-empty values.
- Comparators must never throw for malformed cell payloads.
- **Verify**: Helper tests can call `compareCellValues` directly for representative values and edge cases.

### Step 2: Add row sorting helper
- File: `src/domain/sorting/sortRows.ts`
- Import `getRowsInDisplayOrder` from `src/domain/rows/reorderRows.ts`.
- Suggested export:
  ```ts
  export function sortRowsByColumn(
    rows: Row[],
    columns: ColumnDefinition[],
    sort: BlockSort | null | undefined
  ): Row[];
  ```
- Behavior:
  1. Start with `getRowsInDisplayOrder(rows)` so sorting is based on current display order, not array insertion order.
  2. If `sort` is null/undefined, the column is missing, or the column is not sortable (`numbered`), return the current display order with normalized `order` values.
  3. Stable-sort by the selected column with `compareCellValues`.
  4. If two compared values are equal, preserve their current display-order relationship.
  5. Return cloned rows reindexed to `order: 0..n-1`.
- Do not mutate the input `rows`, `columns`, `row.cells`, or cell payload objects.
- Do not rewrite row ids, column ids, cell values, formats, or row formats.
- Do not update `Block.sort`; persistence of active sort metadata belongs to later UI/store wiring.
- **Verify**: Tests should assert sorted ids, normalized orders, unchanged input rows, and deep-equal cell payloads for each row id.

### Step 3: Add focused unit tests
- File: `src/tests/unit/blockRowSorting.test.ts`
- Follow the existing `node:test` + `node:assert/strict` style used by current unit tests.
- Use small local fixture helpers for `ColumnDefinition` and `Row`; avoid requiring storage or React.
- Cover at least:
  - Text ascending and descending sort.
  - Text equal-value stability using current display order, with input array order intentionally different from `order` values.
  - Null, missing, empty-string, and invalid values sorting last for text/date/time/dropdown in both directions.
  - Checkbox ascending places unchecked before checked; descending reverses that order.
  - Date sorting by valid dates and treating invalid dates as empty.
  - Time sorting by valid times and treating invalid times as empty.
  - Dropdown string sorting without checking options.
  - Bullet column sorting is accepted but stable/no-op because marker payloads are all equal.
  - Numbered and missing columns are documented no-ops that preserve current display order while normalizing `order`.
  - Row ids and representative cell payloads are preserved; input rows are not mutated.
- Keep assertions deterministic with simple ASCII strings and ISO-style dates such as `2026-05-09`.
- **Verify**: `npm run test -- blockRowSorting` is not currently a project script; Dev should run the full `npm run test` instead.

## Data / Storage Changes
None.

- No schema changes.
- No migrations.
- No changes to persisted row, column, block, or workspace shapes.
- Do not add or persist new `BlockSort` fields; the existing type is sufficient.

## UI Specifications
None for this dispatch.

- Do not add sort menu UI.
- Do not change `BlockHeader`, `BlockCard`, context menus, keyboard shortcuts, alerts, clipboard behavior, or formatting behavior.
- `TICKET-048` will wire user-triggered sorting to these domain helpers.

## Acceptance Criteria
- [ ] `sortRowsByColumn` sorts ascending and descending by `text`, `checkbox`, `bullet`, `date`, `time`, and `dropdown` columns.
- [ ] `numbered` columns and missing columns are handled as documented no-ops.
- [ ] Empty text/date/time/dropdown values, missing cells, and invalid date/time strings sort last in both directions.
- [ ] Checkbox ascending sorts unchecked before checked; descending sorts checked before unchecked.
- [ ] Sorting is stable for equal values and starts from current display order.
- [ ] Returned rows preserve every row id and cell payload, and only row `order` values change.
- [ ] Inputs are not mutated.
- [ ] Unit tests cover helper behavior and edge cases without React/store dependencies.
- [ ] Verification passes: `npm run typecheck`, `npm run test`, `npm run build`, and `npm run lint`.

## Estimated Complexity
- Medium.
- Expected file count: 3 new files, with no required modifications to stores or UI components.
