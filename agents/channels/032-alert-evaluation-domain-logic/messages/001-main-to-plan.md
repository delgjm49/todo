# Message 001 — Main → Plan — 2026-05-25

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/artifacts/032-alert-evaluation-domain-logic-dispatch.md

## Task
Create the implementation plan for this dispatch. Write the plan to `agents/artifacts/032-alert-evaluation-domain-logic-plan.md`.

## Context
The alerts epic UI scaffolding is already in place but no evaluation logic exists yet:
- `src/components/block/ColumnContextMenu.tsx` — already has "Enable alerts" toggle for date/time columns
- `src/components/layout/TypeSpecificColumnSettings.tsx` — already has `alertsEnabled` toggle
- `src/types/column.ts` — `DateColumnSettings` / `TimeColumnSettings` already have `alertsEnabled: boolean`
- `src/types/workspace.ts` — `WorkspaceAlertSummary` type already exists
- `src/components/workspace/WorkspaceCard.tsx` — already renders `entry.alertSummary?.count` badge
- `src/services/storage/storageSchemas.ts` — already persists `alertSummary` on workspace entries

What is missing: the actual functions that look at a workspace's rows, read date/time cell values, compare against current time, and produce the alert summary.

Date/time cell values are stored as `NullableTextCellPayload.value` (string or null) — `YYYY-MM-DD` for date columns, `HH:MM` for time columns.

Existing domain patterns to follow:
- `src/domain/sorting/` — comparators for typed columns
- `src/domain/formatting/` — formatting merge/resolution helpers
- `tests/unit/sortingComparators.test.ts` — domain test pattern

## Close Requirements
- Create exactly one next message file in this channel's `messages/` directory.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git.
