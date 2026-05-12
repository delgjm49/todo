# Dispatch Channel: Formatting Persistence

## Summary
- Dispatch: agents/artifacts/004-formatting-persistence-dispatch.md
- Current status: ready-for-plan
- Created by: Main
- Created: 2026-05-12

## Message 1 — Main → Plan — 2026-05-12

### To
Plan

### State
ready-for-plan

### Read
- agents/artifacts/004-formatting-persistence-dispatch.md
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md
- docs/TODO_APP_UI_SPEC.md
- docs/TODO_APP_TECH_SPEC.md
- docs/TODO_APP_PLAN.md
- docs/SESSIONS.md
- src/types/formatting.ts
- src/types/block.ts
- src/types/column.ts
- src/types/row.ts
- src/types/workspace.ts
- src/services/storage/storageSchemas.ts
- src/services/storage/storageService.ts
- src/services/storage/bootstrapData.ts
- src/domain/formatting/mergeFormatting.ts
- src/domain/formatting/resolveCellFormatting.ts
- src/domain/formatting/resolveRowStyle.ts
- src/domain/formatting/applyFormattingPatch.ts
- src/domain/formatting/formattingToCellStyle.ts
- src/domain/formatting/formattingToBorderStyle.ts
- src/stores/documentStore.ts
- src/tests/unit/storage.test.ts
- src/tests/unit/documentStore.test.ts
- src/tests/unit/formattingHelpers.test.ts
- src/tests/unit/formattingPatch.test.ts
- src/tests/unit/formattingToBorderStyle.test.ts

### Task
Create a detailed implementation plan for `TICKET-044`: row/cell/column/block formatting persistence. Write the plan to `agents/artifacts/004-formatting-persistence-plan.md`.

The plan should define how to audit and harden the storage schema/coercion path for sparse formatting overrides; how to prove block, column, row, and cell formatting survives save/load cycles; how invalid formatting values should be normalized or dropped without corrupting valid nearby values; and how to verify that effective formatting after reload still follows app defaults → block → column → row → cell precedence.

Keep the work strictly scoped to formatting persistence and reload verification/hardening. Do not plan new formatting controls, new formatting properties, settings defaults UI, checkbox automation, sorting, clipboard, alerts, column resize, packaging, or broad Playwright E2E expansion.

### Close Requirements
- Write `agents/artifacts/004-formatting-persistence-plan.md`.
- Append the next message to this channel for Dev with `State = ready-for-dev`.
- Update `docs/SESSIONS.md` with a Plan session entry.
- Do not commit; Main handles git operations.
