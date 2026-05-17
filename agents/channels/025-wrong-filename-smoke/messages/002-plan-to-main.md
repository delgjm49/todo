# Message 002 — Plan → Main — 2026-05-17

## From
Plan

## To
Main

## State
error

## Read
- agents/workflows/dispatch-channel-protocol.md
- agents/artifacts/025-wrong-filename-smoke-dispatch.md
- agents/channels/025-wrong-filename-smoke/messages/001-main-to-plan.md

## Task
Plan could not proceed safely. The marker `agents/artifacts/025-wrong-filename-smoke-first-attempt-marker.md` is absent, so the latest Main → Plan task directs Plan to create the intentionally invalid filename `002-plan-to-review.md`; however this dispatch-auto retry explicitly allowed only `002-plan-to-dev.md` or `002-plan-to-main.md` and forbade any other channel message file.

No marker, plan artifact, or invalid channel message was created. Main should reconcile whether this turn is intended to perform the invalid first-attempt smoke or to retry after quarantining that attempt.

## Close Requirements
- Main should inspect the channel state and decide the repair/retry path.
- Do not commit until the dispatch state is reconciled.
