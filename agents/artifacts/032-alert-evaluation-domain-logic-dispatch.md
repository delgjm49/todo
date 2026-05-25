# Dispatch: Alert Evaluation Domain Logic

## What
Build pure domain helpers that evaluate date/time cells for alert state and compute per-workspace alert summaries. This is the foundation of the alerts epic — the data model (`alertsEnabled` toggle on columns, `WorkspaceAlertSummary` type, dock badge UI) already exists, but no evaluation logic does.

## Why
The alerts epic (TICKET-053 through TICKET-056) is the next major feature area after hotkeys. The UI already has:
- `alertsEnabled` toggles in `ColumnContextMenu` and `TypeSpecificColumnSettings` for date/time columns
- `WorkspaceAlertSummary` type and `alertSummary` field on `WorkspaceIndexEntry`
- `WorkspaceCard` renders `alertSummary.count` as a badge

What is missing is the code that actually looks at a row's date/time cell values, compares them against current time, and produces the summary. This ticket creates that evaluation layer as pure functions so TICKET-054 (scheduler) and TICKET-055 (dock indicators) can wire into it.

## Scope

### In scope
- **Alert evaluation functions**: given a row's cells and its block's column definitions, determine if the row has any active alerts
- **Due-time semantics** (per tech spec):
  - Date-only cells become due at `09:00` local time on the saved date
  - Time-only cells are treated as alerts for the current local day at the saved time
  - Date and time columns are **not** auto-paired in v1
  - Invalid date/time values never trigger alerts
  - Overdue items remain active until edited or the row is completed
- **Checkbox suppression**: if a row contains a checked checkbox cell (`CheckboxCellPayload.value === true`), alerts for that row are suppressed
- **Workspace alert summary builder**: compute `WorkspaceAlertSummary` from a workspace document + current time
- **Unit tests** covering all evaluation rules and edge cases (invalid values, null values, different times of day, completed rows, mixed column types)

### Out of scope
- Alert scheduler / polling (TICKET-054)
- Dock indicator rendering updates (TICKET-055 — the `WorkspaceCard` already reads `alertSummary`; this ticket provides the data)
- Alert navigation and flash highlight (TICKET-056)
- Flash animation deduplication across repeated evaluations
- macOS notification center or closed-app alerts
- Recurring / repeating alerts

## Related Spec Sections
- docs/TODO_APP_TECH_SPEC.md §Alert Scheduler Design (due-time semantics)
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md TICKET-053

## Data Model Context
- Date cell values: `NullableTextCellPayload.value` stores a `YYYY-MM-DD` string or `null`
- Time cell values: `NullableTextCellPayload.value` stores an `HH:MM` string or `null`
- Column settings for date/time: `{ alertsEnabled: boolean }` (see `DateColumnSettings` / `TimeColumnSettings` in `src/types/column.ts`)
- `WorkspaceAlertSummary`: `{ count: number; note?: string; blockId?: string; rowId?: string; columnId?: string }`
- A row is "completed" for alert suppression if **any** checkbox cell in that row has `value: true`

## Constraints
- **Pure domain logic only** — no React components, no hooks, no UI state mutations
- Place domain helpers in an appropriate location under `src/domain/` (follow existing patterns like `src/domain/sorting/`, `src/domain/formatting/`)
- Functions should accept explicit `now: Date` parameter (or similar) so tests can control time deterministically
- Follow existing test patterns: `node:test` + `assert`, in `tests/unit/` or alongside domain code
- Add or update unit tests as part of this ticket
- `npm run test` must pass
- `npm run lint` must pass

## Acceptance Criteria
- [ ] Domain functions exist that can evaluate a single row for active alerts given its cells and column definitions
- [ ] Date-only due semantics are correct: a date becomes due at 09:00 local time on that date
- [ ] Time-only due semantics are correct: a time is due at that time on the current local day
- [ ] Invalid or `null` date/time values never produce alerts
- [ ] Rows with any checked checkbox cell have their alerts suppressed
- [ ] A workspace-level alert summary can be computed from a `WorkspaceDocument` + column definitions + current time
- [ ] The computed `WorkspaceAlertSummary` correctly sets `count` and optionally `blockId`/`rowId`/`columnId` for the most urgent/primary alert
- [ ] Unit tests cover: valid date past due, valid date not yet due, valid time past due, valid time not yet due, invalid values, null values, checkbox suppression, empty workspace, workspace with no alert-enabled columns
- [ ] `npm run test` passes (including new tests)
- [ ] `npm run lint` passes
