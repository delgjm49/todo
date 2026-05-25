# Message 002 — Plan → Dev — 2026-05-25

## From
Plan

## To
Dev

## State
ready-for-dev

## Read
- agents/artifacts/031-hotkey-layer-dispatch.md
- agents/artifacts/031-hotkey-layer-plan.md

## Task
Implement the hotkey layer plan. Create `src/hooks/useHotkeys.ts`, mount it in `AppShell`, and write unit tests at `src/tests/unit/useHotkeys.test.ts`. Write the complete artifact to `agents/artifacts/031-hotkey-layer-complete.md`.

## Close Requirements
- Create exactly one next message file in this channel's `messages/` directory.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git.
