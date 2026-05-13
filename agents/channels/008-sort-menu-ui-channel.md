# Dispatch Channel: TICKET-048 Sort Menu UI

## Summary
- Dispatch: agents/artifacts/008-sort-menu-ui-dispatch.md
- Current status: ready-for-plan
- Created by: Main
- Created: 2026-05-13

## Message 1 — Main → Plan — 2026-05-13

### To
Plan

### State
ready-for-plan

### Read
- agents/artifacts/008-sort-menu-ui-dispatch.md
- agents/artifacts/007-block-row-sorting-domain-logic-dispatch.md
- agents/artifacts/007-block-row-sorting-domain-logic-complete.md
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md
- docs/TODO_APP_TECH_SPEC.md
- docs/TODO_APP_UI_SPEC.md
- src/types/block.ts
- src/types/column.ts
- src/types/row.ts
- src/domain/sorting/compareValues.ts
- src/domain/sorting/sortRows.ts
- src/domain/columns/createColumn.ts
- src/stores/documentStore.ts
- src/stores/uiStore.ts
- src/types/ui.ts
- src/components/block/BlockCard.tsx
- src/components/block/BlockContextMenu.tsx
- src/components/layout/MainPane.tsx
- src/tests/unit/blockRowSorting.test.ts
- src/tests/unit/documentStore.test.ts
- src/tests/unit/blockGridRender.test.tsx

### Task
Create the implementation plan for `TICKET-048` sort menu UI. Focus on routing block-level sort actions through the existing `TICKET-047` domain helpers, adding a small block header/menu sort UI, updating block sort metadata and row order with one history transaction, and adding focused store/UI tests. Keep comparator redesign, multi-column sorting, live automatic resorting, clipboard, shortcuts, alerts, packaging, and inspector type-specific settings out of scope. Write the plan to `agents/artifacts/008-sort-menu-ui-plan.md`.

### Close Requirements
- Append the next message to this channel for Dev.
- Update `docs/SESSIONS.md`.
- Do not commit; Main handles git.
