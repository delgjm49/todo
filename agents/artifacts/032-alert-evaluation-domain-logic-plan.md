# Plan: Alert Evaluation Domain Logic

## Overview
Build pure domain functions under `src/domain/alerts/` that evaluate date/time cells against a given `now` timestamp and produce per-row alert state and per-workspace alert summaries. These functions will be consumed by the alert scheduler (TICKET-054) and the dock badge UI (already wired to read `WorkspaceAlertSummary`).

## Prerequisites
- None. All supporting types (`DateColumnSettings`, `TimeColumnSettings`, `WorkspaceAlertSummary`, `WorkspaceDocument`, `Block`, `Row`, `CellMap`, `ColumnDefinition`) already exist.

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Create | `src/domain/alerts/evaluateRow.ts` | Row-level alert evaluation: determines if a single row has any active (due/overdue) alerts |
| Create | `src/domain/alerts/evaluateWorkspace.ts` | Workspace-level summary builder: iterates blocks/rows and produces `WorkspaceAlertSummary` |
| Create | `src/domain/alerts/index.ts` | Barrel export |
| Delete | `src/domain/alerts/.gitkeep` | No longer needed once real files exist |
| Create | `src/tests/unit/alertEvaluation.test.ts` | Unit tests covering all evaluation rules |

## Implementation Steps

### Step 1: Create `src/domain/alerts/evaluateRow.ts`

Export these functions:

```ts
export interface RowAlertResult {
  hasAlert: boolean;
  /** Earliest due timestamp among all alert-enabled columns in this row (undefined if no alert) */
  dueAt?: number;
  /** Column that produced the earliest due alert */
  columnId?: ColumnId;
}

export function evaluateRow(
  row: Row,
  columns: ColumnDefinition[],
  now: Date
): RowAlertResult;
```

**Logic:**

1. If the row has any checkbox cell with `value === true`, return `{ hasAlert: false }` (checkbox suppression).
2. Iterate `columns`. For each column where `type === "date"` or `type === "time"` AND `settings.alertsEnabled === true`:
   a. Read `row.cells[column.id]`. If the cell is missing or its `value` is not a non-empty string, skip.
   b. Parse the value:
      - **Date column** (`YYYY-MM-DD`): validate with the same regex+calendar check used in `compareValues.ts`. Compute the due timestamp as `new Date(year, month - 1, day, 9, 0, 0, 0).getTime()` (09:00 local time on that date).
      - **Time column** (`HH:MM`): validate hours 0-23, minutes 0-59. Compute the due timestamp as today (from `now`) at the given HH:MM local time: `new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0).getTime()`.
   c. If `now.getTime() >= dueTimestamp`, this column has an active alert. Track it.
3. Return the earliest (most overdue) active alert among all columns, or `{ hasAlert: false }` if none.

- **Verify**: Import the function and call it with a row that has a past date — expect `hasAlert: true`.

### Step 2: Create `src/domain/alerts/evaluateWorkspace.ts`

Export:

```ts
export function evaluateWorkspace(
  document: WorkspaceDocument,
  now: Date
): WorkspaceAlertSummary;
```

**Logic:**

1. Initialize `count = 0`, and track the "primary alert" (earliest `dueAt`).
2. For each block in `document.blocks`:
   a. Filter `block.columns` to those with `type === "date" | "time"` and `settings.alertsEnabled === true`. If none, skip this block.
   b. For each row in `block.rows`, call `evaluateRow(row, block.columns, now)`.
   c. If `hasAlert`, increment `count` and update the primary alert if `dueAt` is earlier than the current primary.
3. Return `{ count }` if count is 0 (no optional fields needed).
4. If count > 0, return `{ count, blockId: primary.blockId, rowId: primary.rowId, columnId: primary.columnId }`.

- **Verify**: Build a minimal `WorkspaceDocument` with one block, one date column (alerts enabled), and one row with a past date — expect `count: 1`.

### Step 3: Create `src/domain/alerts/index.ts`

Barrel file:

```ts
export { evaluateRow } from "./evaluateRow.js";
export type { RowAlertResult } from "./evaluateRow.js";
export { evaluateWorkspace } from "./evaluateWorkspace.js";
```

### Step 4: Remove `.gitkeep`

Delete `src/domain/alerts/.gitkeep`.

### Step 5: Create `src/tests/unit/alertEvaluation.test.ts`

Follow the pattern in `src/tests/unit/blockRowSorting.test.ts` — use `node:test` + `node:assert/strict`. Write helper factory functions for rows, columns, and minimal workspace documents.

**Required test cases:**

1. **Date past due** — date cell `"2025-01-01"` with `now` = 2025-01-02 09:00 → `hasAlert: true`
2. **Date not yet due (same day before 09:00)** — date cell `"2025-06-15"` with `now` = 2025-06-15 08:59 → `hasAlert: false`
3. **Date exactly at due time** — date cell `"2025-06-15"` with `now` = 2025-06-15 09:00 → `hasAlert: true`
4. **Time past due** — time cell `"14:30"` with `now` = same day 14:31 → `hasAlert: true`
5. **Time not yet due** — time cell `"14:30"` with `now` = same day 14:29 → `hasAlert: false`
6. **Time exactly at due time** — time cell `"14:30"` with `now` = same day 14:30 → `hasAlert: true`
7. **Invalid date value** (e.g. `"not-a-date"`) → `hasAlert: false`
8. **Invalid time value** (e.g. `"25:00"`) → `hasAlert: false`
9. **Null cell value** → `hasAlert: false`
10. **Missing cell** (column has no entry in `row.cells`) → `hasAlert: false`
11. **Checkbox suppression** — row with past-due date but also a checked checkbox → `hasAlert: false`
12. **Checkbox not checked does not suppress** — row with past-due date and unchecked checkbox → `hasAlert: true`
13. **Column alertsEnabled: false** — past-due date but column has `alertsEnabled: false` → `hasAlert: false`
14. **Empty workspace** — workspace with no blocks → `count: 0`
15. **Workspace with no alert-enabled columns** → `count: 0`
16. **Workspace with multiple alerts** — returns correct `count` and primary (earliest due) alert identifiers
17. **Mixed column types** — workspace with text, checkbox, and date columns; only date triggers alerts

- **Verify**: `npm run test` passes.

### Step 6: Run verification

- `npm run lint` — must pass
- `npm run test` — must pass (including new test file)

## Data / Storage Changes
None. This ticket creates read-only evaluation functions. The existing `WorkspaceAlertSummary` type and persistence already exist.

## UI Specifications
None. This is pure domain logic with no UI changes.

## Acceptance Criteria
- [ ] `evaluateRow` correctly identifies active alerts for date columns (due at 09:00 local on the date)
- [ ] `evaluateRow` correctly identifies active alerts for time columns (due at HH:MM local today)
- [ ] Invalid or null date/time values never produce alerts
- [ ] Rows with any checked checkbox cell have alerts suppressed
- [ ] `evaluateWorkspace` returns a `WorkspaceAlertSummary` with correct `count` and primary alert identifiers
- [ ] Unit tests cover all specified cases and pass
- [ ] `npm run test` passes
- [ ] `npm run lint` passes

## Estimated Complexity
- Small
- 4 files created, 1 deleted
