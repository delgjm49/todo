# Message 001 — Main → Plan — 2026-05-17

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/workflows/dispatch-channel-protocol.md
- agents/artifacts/025-wrong-filename-smoke-dispatch.md

## Task
Run the Plan role for Dispatch 025, an artifact-only Phase 3 wrong-filename structural failure/retry smoke.

This test intentionally has different first-attempt and retry behavior. Before doing anything else, check whether this marker exists:

```text
agents/artifacts/025-wrong-filename-smoke-first-attempt-marker.md
```

### If the marker does not exist

Simulate a structurally invalid Plan handoff:

1. Create `agents/artifacts/025-wrong-filename-smoke-first-attempt-marker.md` with a short note saying the first Plan attempt intentionally wrote an unexpected next filename.
2. Create exactly one new channel message with this intentionally wrong filename:

```text
agents/channels/025-wrong-filename-smoke/messages/002-plan-to-review.md
```

3. In that message use `From = Plan`, `To = Review`, and `State = ready-for-review`. Keep it short and clearly mark it as intentional invalid smoke output.
4. Do not create `002-plan-to-dev.md`.
5. Do not create or update the plan artifact yet.
6. Stop immediately with a short chat response saying the wrong-filename message was intentionally written.

This deliberately violates the dispatch-auto turn contract. For this turn, allowed next filenames are `002-plan-to-dev.md` or `002-plan-to-main.md`, so `002-plan-to-review.md` should be rejected.

### If the marker exists

Treat this as a fresh-session retry after Main has quarantined the rejected wrong-filename message. Continue normally from durable repo state:

1. Create `agents/artifacts/025-wrong-filename-smoke-plan.md` documenting the artifact-only Dev/Review steps.
2. Create exactly one next channel message:

```text
agents/channels/025-wrong-filename-smoke/messages/002-plan-to-dev.md
```

3. In that message, route Dev to perform artifact-only smoke completion work. Dev should create/update `agents/artifacts/025-wrong-filename-smoke-complete.md`, avoid product code changes, and then route to Review.

## Close Requirements
- First attempt only: create the marker and exactly one intentionally wrong next channel message, `002-plan-to-review.md`.
- Retry attempt only: create exactly one correct next channel message, `002-plan-to-dev.md`.
- Do not edit existing files under `agents/channels/025-wrong-filename-smoke/messages/`.
- Do not commit; Main handles git operations.
