# Dispatch 025 — Wrong Filename Smoke

Date: 2026-05-17
Type: artifact-only dispatch-auto Phase 3 structural failure/retry smoke

## Objective

Validate that Phase 3 spool dispatch detects a worker-created next message whose filename is structurally parseable but not one of the turn contract's allowed next filenames.

The first Plan attempt must intentionally create the wrong next message filename. Main will then quarantine the bad message and discard the failed Plan session before retrying with a fresh Plan session.

## Route Under Test

Failure route:

```text
Main → Plan(writes unexpected 002-plan-to-review.md) → dispatch-auto stop
```

Recovery route after manual quarantine and fresh retry:

```text
Main → fresh Plan retry → Dev → Review → Main
```

Expected final valid channel messages after recovery:

```text
agents/channels/025-wrong-filename-smoke/messages/001-main-to-plan.md
agents/channels/025-wrong-filename-smoke/messages/002-plan-to-dev.md
agents/channels/025-wrong-filename-smoke/messages/003-dev-to-review.md
agents/channels/025-wrong-filename-smoke/messages/004-review-to-main.md
```

Expected quarantined evidence after Main repair:

```text
agents/artifacts/025-wrong-filename-smoke-rejected-002-plan-to-review.md
```

## Failure Injection

Plan must check for this marker:

```text
agents/artifacts/025-wrong-filename-smoke-first-attempt-marker.md
```

- If the marker is missing, Plan must create the marker and then create exactly one intentionally wrong next message file: `agents/channels/025-wrong-filename-smoke/messages/002-plan-to-review.md`.
- If the marker exists, Plan must proceed normally and create `agents/channels/025-wrong-filename-smoke/messages/002-plan-to-dev.md`.

This tests dispatch-auto's turn-contract validation. For a Plan turn, the allowed next filenames are `002-plan-to-dev.md` or `002-plan-to-main.md`; `002-plan-to-review.md` should be rejected.

## Artifact-only Work

No product implementation files should be changed. Workers may create/update only test artifacts and session documentation required by the dispatch workflow.
