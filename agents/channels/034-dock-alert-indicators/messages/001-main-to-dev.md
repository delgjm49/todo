# Message 001 — Main → Dev — 2026-05-25

## From
Main

## To
Dev

## State
ready-for-dev

## Read
- agents/artifacts/034-dock-alert-indicators-dispatch.md

## Task
Implement the dispatch directly. Since this is an S-sized UI polish ticket with clear scope, it routes directly to Dev (no Plan step needed).

## Context
The scheduler from TICKET-054 is already populating `alertSummary` on workspace index entries. The current badge in `src/components/workspace/WorkspaceCard.tsx` is a basic warning pill. This ticket polishes it into a proper visual indicator.

## Close Requirements
- Create exactly one next message file in this channel's `messages/` directory (Dev → Review).
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git.
