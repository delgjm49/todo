# Message 001 — Main → Plan — 2026-05-25

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/artifacts/065-manual-qa-release-blockers-dispatch.md

## Task
Create the implementation plan for this dispatch. Write the plan to `agents/artifacts/065-manual-qa-release-blockers-plan.md`.

## Context
This is the final P1 ticket before MVP Core is complete. All major features have been implemented through prior dispatches:
- TICKET-001 to TICKET-037: Bootstrap, types, storage, state, shell, workspaces, blocks, rows, columns, cells
- TICKET-039 to TICKET-045: Selection, formatting, inspector, checkbox automation
- TICKET-047 to TICKET-056: Sorting, clipboard, hotkeys, alerts
- TICKET-057: Theme mode switching
- TICKET-063: Autosave dirty-state UX
- TICKET-064: Packaging assets (already complete)

What is missing: a systematic QA pass to verify stability and fix any critical blockers.

The Plan agent should create a structured QA checklist that the Dev agent can execute. The checklist should cover each major feature area with specific verifiable steps (e.g., "verify workspace deletion does not leave orphaned blocks", "verify undo after a save correctly restores dirty state").

## Close Requirements
- Create exactly one next message file in this channel's `messages/` directory.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git.
