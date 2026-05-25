# Message 001 — Main → Plan — 2026-05-25

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/artifacts/035-alert-navigation-highlight-dispatch.md

## Task
Create the implementation plan for this dispatch. Write the plan to `agents/artifacts/035-alert-navigation-highlight-plan.md`.

## Context
This is the final ticket in the alerts epic (053–056). The previous tickets built:
- TICKET-053: `evaluateRow.ts` + `evaluateWorkspace.ts` — pure domain evaluation
- TICKET-054: `useAlertScheduler.ts` — periodic evaluation + store updates
- TICKET-055: `AlertBadge` in `WorkspaceCard.tsx` — polished dock indicator

What is missing: when a user clicks a workspace with alerts, the app should navigate to the alert target, scroll it into view, and flash it. Currently, selecting a workspace only opens it — the user must manually find the alerted row.

Existing infrastructure:
- `WorkspaceAlertSummary.blockId` / `.rowId` / `.columnId` — primary alert target IDs
- `documentStore` — `activeWorkspaceId`, workspace documents
- `uiStore` — `selection` state (block/row/column selection)
- `WorkspaceCard` — workspace selection on click
- No scroll infrastructure exists yet

## Close Requirements
- Create exactly one next message file in this channel's `messages/` directory.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git.
