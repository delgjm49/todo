# Dispatch Channel: TICKET-047 Block Row Sorting Domain Logic

## Summary
- Dispatch: agents/artifacts/007-block-row-sorting-domain-logic-dispatch.md
- Current status: ready-for-plan
- Created by: Main
- Created: 2026-05-13

## Message 1 — Main → Plan — 2026-05-13

### To
Plan

### State
ready-for-plan

### Read
- agents/artifacts/007-block-row-sorting-domain-logic-dispatch.md
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md
- docs/TODO_APP_TECH_SPEC.md
- docs/TODO_APP_UI_SPEC.md
- src/types/block.ts
- src/types/column.ts
- src/types/row.ts
- src/domain/rows/reorderRows.ts
- src/domain/rows/applyCheckboxRules.ts
- src/domain/sorting/.gitkeep
- src/stores/historyStore.ts
- src/stores/documentStore.ts
- src/tests/unit/rowHelpers.test.ts
- src/tests/unit/checkboxAutomation.test.ts
- src/tests/unit/documentStore.test.ts

### Task
Create the implementation plan for `TICKET-047` block row sorting domain logic. Focus on pure sorting/comparator helpers, stable current-display-order behavior, row identity/payload preservation, and targeted unit tests. Keep sort menu UI, broad store integration, clipboard, shortcuts, alerts, packaging, and formatting changes out of scope. Write the plan to `agents/artifacts/007-block-row-sorting-domain-logic-plan.md`.

### Close Requirements
- Append the next message to this channel for Dev.
- Update `docs/SESSIONS.md`.
- Do not commit; Main handles git.
