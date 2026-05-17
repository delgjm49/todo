# Dispatch 026 — DeepSeek V4 Flash Interactive Smoke

Date: 2026-05-17
Type: artifact-only dispatch-auto Phase 3 live interactive smoke

## Objective

Validate that the Phase 3 spool interactive worker chain works end-to-end with the new local model override:

```text
openrouter/deepseek/deepseek-v4-flash
```

set for Plan, Dev, and Review in `agents/orchestration.local.json` (workerMode `interactive`).

This is the first soak of the OpenRouter DeepSeek V4 Flash interactive workers since the model override was changed at the start of session 2026-05-17. GPT-family models are unavailable (usage exhausted), so all three roles must successfully run as DeepSeek V4 Flash.

## Route Under Test

Happy-path artifact-only route:

```text
Main → Plan → Dev → Review → Main
```

Expected final message files:

```text
agents/channels/026-deepseek-v4-flash-smoke/messages/001-main-to-plan.md
agents/channels/026-deepseek-v4-flash-smoke/messages/002-plan-to-dev.md
agents/channels/026-deepseek-v4-flash-smoke/messages/003-dev-to-review.md
agents/channels/026-deepseek-v4-flash-smoke/messages/004-review-to-main.md
```

Final `State` in `004-review-to-main.md` should be `review-pass`.

## Artifact-only Work

No product implementation files may change. Workers may only create or update:

- Files under `agents/artifacts/026-deepseek-v4-flash-smoke-*.md`
- Channel message files in this dispatch's `messages/` directory
- `docs/SESSIONS.md` (append-only per role)

No edits to application source, Tauri config, tests, UI, storage layer, or product documentation.

## Success Criteria

- All three worker roles (Plan, Dev, Review) launch as interactive Pi sessions on `openrouter/deepseek/deepseek-v4-flash` without invoking any GPT model.
- Each role produces exactly one valid next-message file matching its allowed filename.
- Final route reaches Main with `State = review-pass`.
- No product code is changed.
- dispatch-auto reports a clean terminal state.

## Out of Scope

- Review→Dev loop validation (deterministic harness already covers this; reserve for follow-up live smoke if this passes).
- Product-bearing changes.
- Default-mode promotion of interactive workers (still gated on user decision).
