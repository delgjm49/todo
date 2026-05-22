# Dispatch 029 — Windows Subprocess Smoke

Date: 2026-05-22
Type: artifact-only dispatch-auto smoke

## Objective

Verify that this Windows repo can run the Phase 3 dispatch-auto route in subprocess mode from Main through Plan, Dev, Review, and back to Main.

Required route:

```text
Main → Plan → Dev → Review → Main
```

## Worker configuration

This dispatch expects the local machine override to be set for subprocess execution:

- `agents/orchestration.local.json`
- `workerMode`: `subprocess`

Do not modify orchestration files as part of this dispatch.

## Artifact-only scope

No product implementation files may change. Workers may only create or update:

- `agents/artifacts/029-windows-subprocess-smoke-plan.md`
- `agents/artifacts/029-windows-subprocess-smoke-complete.md`
- `agents/artifacts/029-windows-subprocess-smoke-review.md`
- channel message files under `agents/channels/029-windows-subprocess-smoke/messages/`
- `docs/SESSIONS.md` append-only session entries

Do not edit application source, tests, Tauri config, UI code, storage code, package files, or product docs.

## Success criteria

- Dispatch-auto advances the channel through Plan, Dev, and Review in subprocess mode.
- Message files are created in order:
  - `001-main-to-plan.md`
  - `002-plan-to-dev.md`
  - `003-dev-to-review.md`
  - `004-review-to-main.md`
- Final message is Review → Main with `State = review-pass`.
- Plan, Dev, and Review each create the minimal artifact requested for their role.
- Changed files remain docs/artifacts/channel-only, with no product code changes.

## Out of scope

- Product behavior changes.
- Test suite execution.
- Orchestration config changes.
- Forced-loop or retry behavior.
