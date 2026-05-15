# Dispatch Channel: Row Clipboard UI (TICKET-050)

## Summary
- Dispatch: agents/artifacts/013-row-clipboard-ui-dispatch.md
- Current status: ready-for-plan
- Created by: Main
- Created: 2026-05-15

---

## Message 1 — Main → Plan — 2026-05-15

### To
Plan

### State
ready-for-plan

### Read
- agents/artifacts/013-row-clipboard-ui-dispatch.md
- src/domain/clipboard/ (TICKET-049 serialization helpers)
- src/stores/documentStore.ts (existing insertRowInBlock, deleteRowFromBlock)
- src/stores/uiStore.ts (selection state, existing drag state pattern)
- src/components/block/BlockContextMenu.tsx (context menu pattern)
- src/components/row/RowView.tsx (row rendering, right-click surface)

### Task
Create the implementation plan for TICKET-050 row clipboard UI flows. Write the plan to `agents/artifacts/013-row-clipboard-ui-plan.md`. The plan must wire the existing TICKET-049 domain clipboard helpers into uiStore clipboard state, documentStore cut/copy/paste actions, and a row-level context menu.

### Close Requirements
- Append the next message to this channel for Dev (`Plan → Dev`).
- Update `docs/SESSIONS.md`.
- Do not commit; Main handles git.
