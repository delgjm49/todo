# Dispatch Channel: Border Formatting Controls

## Summary
- Dispatch: agents/artifacts/003-border-formatting-controls-dispatch.md
- Current status: ready-for-plan
- Created by: Main
- Created: 2026-05-12

## Message 1 — Main → Plan — 2026-05-12

### To
Plan

### State
ready-for-plan

### Read
- agents/artifacts/003-border-formatting-controls-dispatch.md
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md
- docs/TODO_APP_UI_SPEC.md
- docs/TODO_APP_TECH_SPEC.md
- docs/TODO_APP_PLAN.md
- docs/SESSIONS.md
- src/types/formatting.ts
- src/domain/formatting/applyFormattingPatch.ts
- src/domain/formatting/formattingToCellStyle.ts
- src/domain/formatting/mergeFormatting.ts
- src/domain/formatting/resolveCellFormatting.ts
- src/domain/formatting/resolveRowStyle.ts
- src/domain/formatting/selectedFormattingTarget.ts
- src/components/layout/InspectorShell.tsx
- src/components/layout/TextFormattingControls.tsx
- src/components/layout/FieldCard.tsx
- src/components/row/RowView.tsx
- src/components/cell/CellRenderer.tsx
- src/stores/documentStore.ts
- src/tests/unit/formattingPatch.test.ts
- src/tests/unit/documentStore.test.ts

### Task
Create a detailed implementation plan for `TICKET-043`: inspector-driven border formatting controls. Write the plan to `agents/artifacts/003-border-formatting-controls-plan.md`.

The plan should define how to add controls for border width, border color, and top/right/bottom/left edge toggles; how border formatting mutations should flow through `documentStore` and focused domain helpers as sparse overrides; how each property can be reset to inherited/unset; and how the grid/editor surface should use existing formatting resolution helpers to render effective borders immediately.

Keep the work strictly scoped to border formatting controls and border rendering. Do not plan the dedicated save/reload formatting persistence checkpoint (`TICKET-044`), checkbox automation, sorting, clipboard, alerts, settings defaults UI, column resize, or packaging work.

### Close Requirements
- Write `agents/artifacts/003-border-formatting-controls-plan.md`.
- Append the next message to this channel for Dev with `State = ready-for-dev`.
- Update `docs/SESSIONS.md` with a Plan session entry.
- Do not commit; Main handles git operations.
