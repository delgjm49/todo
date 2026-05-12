# Dispatch Channel: Text Formatting Controls

## Summary
- Dispatch: agents/artifacts/002-text-formatting-controls-dispatch.md
- Current status: ready-for-plan
- Created by: Main
- Created: 2026-05-12

## Message 1 — Main → Plan — 2026-05-12

### To
Plan

### State
ready-for-plan

### Read
- agents/artifacts/002-text-formatting-controls-dispatch.md
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md
- docs/TODO_APP_UI_SPEC.md
- docs/TODO_APP_TECH_SPEC.md
- docs/TODO_APP_PLAN.md
- docs/SESSIONS.md
- src/components/layout/InspectorShell.tsx
- src/domain/formatting/resolveCellFormatting.ts
- src/domain/formatting/resolveRowStyle.ts
- src/stores/documentStore.ts
- src/types/formatting.ts
- src/components/row/RowView.tsx
- src/components/cell/CellRenderer.tsx

### Task
Create a detailed implementation plan for `TICKET-042`: inspector-driven text formatting controls. Write the plan to `agents/artifacts/002-text-formatting-controls-plan.md`.

The plan should define how to add controls for font family, font size, bold, italic, underline, text color, and fill/background color; how formatting mutations should flow through `documentStore` or focused domain helpers; and how the editor surface should use existing formatting resolution helpers to show changes immediately.

Keep the work strictly scoped to text/fill formatting controls. Do not plan border controls, the dedicated formatting persistence/reload checkpoint, checkbox automation, sorting, clipboard, alerts, settings defaults UI, or packaging.

### Close Requirements
- Write `agents/artifacts/002-text-formatting-controls-plan.md`.
- Append the next message to this channel for Dev with `State = ready-for-dev`.
- Update `docs/SESSIONS.md` with a Plan session entry.
- Do not commit; Main handles git operations.
