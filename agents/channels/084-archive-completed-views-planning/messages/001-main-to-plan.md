# Message 001 — Main → Plan — 2026-06-06

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/artifacts/084-archive-completed-views-planning-dispatch.md
- agents/artifacts/073-post-mvp-backlog-planning-plan.md
- docs/SESSIONS.md
- src/domain/rows/applyCheckboxRules.ts
- src/components/row/RowView.tsx
- src/components/cell/CheckboxCell.tsx
- src/components/block/ColumnContextMenu.tsx
- src/components/layout/TypeSpecificColumnSettings.tsx
- src/stores/documentStore.ts
- src/services/storage/storageSchemas.ts
- src/types/row.ts
- src/types/block.ts
- src/types/column.ts
- src/domain/search/searchDocuments.ts
- src/domain/sorting/compareValues.ts
- src/domain/alerts/evaluateRow.ts
- src/domain/clipboard/rowClipboardTypes.ts
- src/tests/unit/checkboxAutomation.test.ts
- src/tests/unit/rowEditing.test.tsx
- src/tests/unit/documentStore.test.ts
- src/tests/integration/rowCellEditing.integration.test.ts
- src/tests/integration/saveLoadRoundtrip.integration.test.ts

## Task
Create the implementation-planning artifact for this audit/planning dispatch. Ground it in current source/test behavior before recommending or rejecting a first archive/completed-view implementation slice. Distinguish checkbox-derived completed state from explicit archive state, identify storage/schema implications and risks, and define future files/tests/acceptance criteria. Write the plan to `agents/artifacts/084-archive-completed-views-planning-plan.md`, then append exactly one next message to this channel addressed to Dev unless Main triage is required.

## Required Planning Output
The plan should direct Dev to produce a planning/audit complete artifact, not product implementation. It should require Dev to address semantics, storage/schema risk, alert/sort/search/clipboard/undo/autosave impacts, and future implementation acceptance criteria.

## Close Requirements
- Create `agents/artifacts/084-archive-completed-views-planning-plan.md`.
- Create exactly one next message file in `agents/channels/084-archive-completed-views-planning/messages/`, addressed to Dev unless Main triage is required.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git operations after Review passes.
