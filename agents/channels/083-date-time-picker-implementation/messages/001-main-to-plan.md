# Message 001 — Main → Plan — 2026-06-06

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/artifacts/083-date-time-picker-implementation-dispatch.md
- agents/artifacts/082-richer-date-time-picker-planning-complete.md
- agents/artifacts/082-richer-date-time-picker-planning-review.md
- src/components/cell/DateCell.tsx
- src/components/cell/TimeCell.tsx
- src/components/row/RowView.tsx
- src/stores/documentStore.ts
- src/services/storage/storageSchemas.ts
- src/domain/sorting/compareValues.ts
- src/domain/alerts/evaluateRow.ts
- src/tests/unit/rowEditing.test.tsx
- src/tests/integration/rowCellEditing.integration.test.ts

## Task
Create the implementation plan for dispatch 083. Use dispatch 082's reviewed recommendation as the authoritative scope, then verify current source/test state from disk before writing the plan. The implementation should keep visible text inputs, add compact native picker affordances with graceful fallback, preserve `string | null` storage, tighten DateCell validation to strict `YYYY-MM-DD`, and add targeted tests. Write the plan to `agents/artifacts/083-date-time-picker-implementation-plan.md`, then append exactly one next message to this channel addressed to Dev unless Main triage is required.

## Required Verification Planning
The plan should require Dev to report commands using the project verification format. At minimum require:
- Targeted tests covering DateCell/TimeCell picker selection and strict date validation.
- `npm run test`
- `npm run lint`
- `npm run build`
- `npm run test:e2e` when Playwright browsers are available, or a clear environment blocker if unavailable.

## Close Requirements
- Create `agents/artifacts/083-date-time-picker-implementation-plan.md`.
- Create exactly one next message file in `agents/channels/083-date-time-picker-implementation/messages/`, addressed to Dev unless Main triage is required.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git operations after Review passes.
