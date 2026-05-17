# Dispatch 027 — DeepSeek V4 Flash Forced Loop Smoke

Date: 2026-05-17
Type: artifact-only dispatch-auto Phase 3 live interactive smoke with one forced Review → Dev loop

## Objective

Validate that the Phase 3 spool interactive worker chain handles a Review → Dev loop end-to-end on the new local model override:

```text
openrouter/deepseek/deepseek-v4-flash
```

set for Plan, Dev, and Review in `agents/orchestration.local.json` (workerMode `interactive`).

Dispatch 026 already validated the happy path on this model. 027 validates the additional live behavior of a forced one-shot Review → Dev loop on the same model.

## Required Route

```text
Main → Plan → Dev → Review → Dev → Review → Main
```

## Expected Channel Message Files

```text
agents/channels/027-deepseek-v4-flash-loop-smoke/messages/001-main-to-plan.md
agents/channels/027-deepseek-v4-flash-loop-smoke/messages/002-plan-to-dev.md
agents/channels/027-deepseek-v4-flash-loop-smoke/messages/003-dev-to-review.md
agents/channels/027-deepseek-v4-flash-loop-smoke/messages/004-review-to-dev.md
agents/channels/027-deepseek-v4-flash-loop-smoke/messages/005-dev-to-review.md
agents/channels/027-deepseek-v4-flash-loop-smoke/messages/006-review-to-main.md
```

Final `State` in `006-review-to-main.md` must be `review-pass`.

## Forced Loop Semantics

Loop marker file:

```text
agents/artifacts/027-deepseek-v4-flash-loop-smoke-marker.md
```

1. **First Dev pass** (`002-plan-to-dev.md`): create the loop marker with the exact line:

   ```text
   loop-state: first-pass
   ```

   Do not create the complete artifact yet. Route to Review via `003-dev-to-review.md` with `State = ready-for-review`.

2. **First Review pass** (`003-dev-to-review.md`): regardless of marker contents, this pass must intentionally return `State = needs-dev-fix` to Dev via `004-review-to-dev.md`, instructing Dev to update the marker to:

   ```text
   loop-state: second-pass
   ```

   and to then create the complete artifact. Do not write a review artifact yet.

3. **Second Dev pass** (`004-review-to-dev.md`): update the marker to the exact line:

   ```text
   loop-state: second-pass
   ```

   Then create `agents/artifacts/027-deepseek-v4-flash-loop-smoke-complete.md` summarizing the artifact-only loop completion. Route to Review via `005-dev-to-review.md` with `State = ready-for-review`.

4. **Second Review pass** (`005-dev-to-review.md`): verify the marker file contains exactly the line `loop-state: second-pass` and that the complete artifact exists. Create `agents/artifacts/027-deepseek-v4-flash-loop-smoke-review.md`. Route to Main via `006-review-to-main.md` with `State = review-pass`.

## Artifact-only Work

No product implementation files may change. Workers may only create or update:

- Files under `agents/artifacts/027-deepseek-v4-flash-loop-smoke-*.md`
- Channel message files in this dispatch's `messages/` directory
- `docs/SESSIONS.md` (append-only per role/turn)

No edits to application source, Tauri config, tests, UI, storage layer, or product documentation. Workers must not commit.

## Success Criteria

- All four worker turns (Plan, Dev×2, Review×2) launch as interactive Pi sessions on `openrouter/deepseek/deepseek-v4-flash`; no GPT model is invoked.
- Each turn produces exactly one valid next-message file matching its allowed filename.
- The forced Review → Dev loop occurs exactly once (route is exactly `Main → Plan → Dev → Review → Dev → Review → Main`).
- Loop marker transitions cleanly from `first-pass` to `second-pass`.
- Final route reaches Main with `State = review-pass`.
- No product code is changed.

## Out of Scope

- Multi-loop or multi-failure recovery.
- Default-mode promotion of interactive workers (still gated on user decision).
- Claude Code interactive workers.
