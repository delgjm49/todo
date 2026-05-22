# Message 001 — Main → Plan — 2026-05-22

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/workflows/dispatch-channel-protocol.md
- agents/artifacts/029-windows-subprocess-smoke-dispatch.md

## Task
Run the Plan role for Dispatch 029, a tiny artifact-only Windows subprocess smoke for dispatch-auto.

This dispatch must remain docs/artifacts/channel-only. Do not modify product code, tests, package files, Tauri config, UI, storage, or orchestration config.

Concretely:

1. Create `agents/artifacts/029-windows-subprocess-smoke-plan.md` with a short plan for Dev and Review.
2. Create exactly one next channel message file:

   ```text
   agents/channels/029-windows-subprocess-smoke/messages/002-plan-to-dev.md
   ```

3. In that message, route Dev to:
   - Create `agents/artifacts/029-windows-subprocess-smoke-complete.md` with a minimal completion note.
   - Append a Dev session entry to `docs/SESSIONS.md`.
   - Avoid all product/orchestration changes.
   - Route to Review via `003-dev-to-review.md` with `State = ready-for-review`.

## Close Requirements
- Create exactly one next channel message file: `002-plan-to-dev.md`.
- Do not edit existing files under `agents/channels/029-windows-subprocess-smoke/messages/`.
- Update `docs/SESSIONS.md` with a Plan session entry.
- Do not commit; Main handles git operations.
- Do not modify product code, tests, package files, Tauri config, UI, storage, or orchestration config.
