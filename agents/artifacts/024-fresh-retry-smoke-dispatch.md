# Dispatch 024 — Fresh Retry Smoke

Date: 2026-05-17
Type: artifact-only dispatch-auto Phase 3 recovery smoke

## Objective

Validate that Phase 3 spool dispatch can recover when the first worker session is treated as unsalvageable.

The first Plan attempt must intentionally fail to create the next spool message. A later retry must start from durable repo state and continue with a fresh Plan session.

## Route Under Test

Expected final route after recovery:

```text
Main → Plan(fails/no next message) → Plan(retry) → Dev → Review → Main
```

Expected final message files after successful retry:

```text
agents/channels/024-fresh-retry-smoke/messages/001-main-to-plan.md
agents/channels/024-fresh-retry-smoke/messages/002-plan-to-dev.md
agents/channels/024-fresh-retry-smoke/messages/003-dev-to-review.md
agents/channels/024-fresh-retry-smoke/messages/004-review-to-main.md
```

## Failure Injection

Plan must check for this marker:

```text
agents/artifacts/024-fresh-retry-smoke-first-attempt-marker.md
```

- If the marker is missing, Plan must create the marker and then stop without creating any `messages/002-*` file.
- If the marker exists, Plan must proceed normally and create `002-plan-to-dev.md`.

This proves recovery does not require the original Plan conversation/session.

## Artifact-only Work

No product implementation files should be changed. Workers may create/update only test artifacts and session documentation required by the dispatch workflow.
