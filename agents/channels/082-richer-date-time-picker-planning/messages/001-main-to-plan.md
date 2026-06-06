# Message 001 — Main → Plan — 2026-06-06

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/artifacts/082-richer-date-time-picker-planning-dispatch.md
- agents/artifacts/073-post-mvp-backlog-planning-plan.md
- docs/SESSIONS.md
- src/components/cell/DateCell.tsx
- src/components/cell/TimeCell.tsx
- src/stores/documentStore.ts
- src/services/storage/storageSchemas.ts
- src/domain/sorting/compareValues.ts
- src/domain/alerts/
- src/domain/search/
- src/domain/clipboard/rowClipboardTypes.ts
- src/tests/

## Task
Create the planning artifact for this audit/planning dispatch. Ground the plan in current source and test behavior before recommending a narrow date/time picker implementation slice for dispatch 083. Write the plan to `agents/artifacts/082-richer-date-time-picker-planning-plan.md`, then append exactly one next message to this channel addressed to Dev unless Main triage is required.

## Required Planning Output
The plan should direct Dev to produce a planning/audit complete artifact, not product implementation. It should require Dev to define the recommended picker UX, storage-contract preservation, likely implementation files, tests, risks, and acceptance criteria for dispatch 083.

## Close Requirements
- Create `agents/artifacts/082-richer-date-time-picker-planning-plan.md`.
- Create exactly one next message file in `agents/channels/082-richer-date-time-picker-planning/messages/`, addressed to Dev unless Main triage is required.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git operations after Review passes.
