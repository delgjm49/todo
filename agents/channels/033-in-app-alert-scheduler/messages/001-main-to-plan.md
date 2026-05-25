# Message 001 — Main → Plan — 2026-05-25

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/artifacts/033-in-app-alert-scheduler-dispatch.md

## Task
Create the implementation plan for this dispatch. Write the plan to `agents/artifacts/033-in-app-alert-scheduler-plan.md`.

## Context
TICKET-053 created the pure domain evaluation layer:
- `src/domain/alerts/evaluateRow.ts` — row-level alert detection
- `src/domain/alerts/evaluateWorkspace.ts` — computes `WorkspaceAlertSummary`
- `src/domain/alerts/index.ts` — barrel export

What is missing: nothing calls these functions automatically. The scheduler makes alerts "live" by running evaluation periodically and on relevant edits, then updating the workspace index entries in the store.

Existing UI that will automatically pick up the data once the scheduler runs:
- `src/components/workspace/WorkspaceCard.tsx` — already renders `entry.alertSummary?.count`
- `src/types/workspace.ts` — `WorkspaceAlertSummary` type already exists
- `src/services/storage/storageSchemas.ts` — already persists `alertSummary`

No store action currently exists for updating `alertSummary` on a `WorkspaceIndexEntry`. Plan should determine whether to add a dedicated action or use an existing generic update path.

## Close Requirements
- Create exactly one next message file in this channel's `messages/` directory.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git.
