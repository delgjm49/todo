# Message 001 — Main → Plan — 2026-05-17

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/workflows/dispatch-channel-protocol.md
- agents/artifacts/028-claude-all-roles-smoke-dispatch.md

## Task
Run the Plan role for Dispatch 028, an artifact-only Phase 4 live interactive smoke validating Claude Code as the Plan, Dev, and Review worker binary end-to-end on this dispatch.

This is a happy-path route (`Main → Plan → Dev → Review → Main`). No forced loop. No product code, tests, UI, storage, or Tauri configuration may be touched in this dispatch.

Concretely:

1. Create `agents/artifacts/028-claude-all-roles-smoke-plan.md` describing the planned Dev and Review work for this smoke (single short doc; no product impact).
2. Create exactly one next channel message file:

   ```text
   agents/channels/028-claude-all-roles-smoke/messages/002-plan-to-dev.md
   ```

3. In that message, route Dev to:
   - Create `agents/artifacts/028-claude-all-roles-smoke-complete.md` summarizing the artifact-only smoke completion.
   - Append a Dev session entry to `docs/SESSIONS.md`.
   - Avoid all product code changes.
   - Route to Review via `003-dev-to-review.md` with `State = ready-for-review`.

## Close Requirements
- Create exactly one next channel message file: `002-plan-to-dev.md`.
- Do not edit existing files under `agents/channels/028-claude-all-roles-smoke/messages/`.
- Do not commit; Main handles git operations.
- Do not modify product code, tests, UI, storage, or Tauri configuration.
