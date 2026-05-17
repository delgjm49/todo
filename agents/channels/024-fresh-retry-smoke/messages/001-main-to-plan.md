# Message 001 — Main → Plan — 2026-05-17

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/workflows/dispatch-channel-protocol.md
- agents/artifacts/024-fresh-retry-smoke-dispatch.md

## Task
Run the Plan role for Dispatch 024, an artifact-only Phase 3 fresh-session retry smoke.

This test intentionally has different first-attempt and retry behavior. Before doing anything else, check whether this marker exists:

```text
agents/artifacts/024-fresh-retry-smoke-first-attempt-marker.md
```

### If the marker does not exist

Simulate an unsalvageable Plan worker/session failure:

1. Create `agents/artifacts/024-fresh-retry-smoke-first-attempt-marker.md` with a short note saying the first Plan attempt intentionally stopped before writing the next spool message.
2. Do not create any `messages/002-*` file.
3. Do not create or update the plan artifact yet.
4. Stop immediately with a short chat response saying the intentional failure marker was created and no next message was written.

This deliberately violates the normal dispatch close requirement so Main can validate that dispatch-auto stops on a missing expected next message.

### If the marker exists

Treat this as a fresh-session retry. Continue normally from durable repo state:

1. Create `agents/artifacts/024-fresh-retry-smoke-plan.md` documenting the artifact-only Dev/Review steps.
2. Create exactly one next channel message:

```text
agents/channels/024-fresh-retry-smoke/messages/002-plan-to-dev.md
```

3. In that message, route Dev to perform artifact-only smoke completion work. Dev should create/update `agents/artifacts/024-fresh-retry-smoke-complete.md`, avoid product code changes, and then route to Review.

## Close Requirements
- First attempt only: create the marker and no next channel message.
- Retry attempt only: create exactly one next channel message, `002-plan-to-dev.md`.
- Do not edit existing files under `agents/channels/024-fresh-retry-smoke/messages/`.
- Do not commit; Main handles git operations.
