# Dispatch: Phase 2 Interactive Pane Reuse Loop Zen

## What
Run a tiny artifact-only dispatch that intentionally forces one `Review → Dev` loop to validate Phase 2 interactive pane reuse, on a fresh forced-loop attempt.

## Why
Previous forced-loop attempts (`016`, `017`) exercised the pane-reuse path but with continuity constraints. This 018 "zen" dispatch starts fresh with no plan artifact dependencies, using the same minimal marker protocol to cleanly validate that dispatch-auto reuses the already-running Dev pane/session for the second Dev turn in a same-dispatch loop.

## Scope
- In scope: create a minimal plan artifact under `agents/artifacts/`.
- In scope: create and update a disposable Dev marker artifact under `agents/artifacts/`.
- In scope: create complete and review artifacts under `agents/artifacts/`.
- In scope: intentionally force exactly one Review → Dev loop.
- In scope: update this dispatch channel and `docs/SESSIONS.md` per workflow rules.
- Out of scope: app source, app tests, package/Tauri config, product docs, storage/schema changes, orchestration config changes, cmux/Pi extension changes, and commits by workers.

## Required Route

```text
Main → Plan → Dev → Review → Dev → Review → Main
```

## Required Loop Semantics

1. First Dev pass writes `agents/artifacts/018-phase2-interactive-pane-reuse-loop-zen-marker.md` with exact line:

   ```text
   phase2-reuse-loop-zen-state: first-pass
   ```

2. First Review pass must intentionally return to Dev with `State = needs-dev-fix`, even if everything else is correct. It should instruct Dev to update the marker to:

   ```text
   phase2-reuse-loop-zen-state: second-pass
   ```

3. Second Dev pass updates the marker to the second-pass line and writes/creates `agents/artifacts/018-phase2-interactive-pane-reuse-loop-zen-complete.md` with lightweight verification results.

4. Second Review pass verifies the marker now contains the second-pass line and returns `State = review-pass` to Main.

## Related Spec Sections
- agents/workflows/dispatch-channel-protocol.md
- agents/ARTIFACTS.md
- agents/CLOSING.md
- agents/orchestration.json

## Constraints
- Keep all created worker artifacts disposable and located under `agents/artifacts/`.
- Do not modify app/source/product documentation files. `docs/SESSIONS.md` updates are allowed because the workflow requires them.
- Use only lightweight artifact verification such as checking expected files/content and `git diff --check`.
- Preserve the required route exactly.
- Workers must not edit dispatch-auto code, orchestration config, external scripts, app code, app tests, package/Tauri config, or product docs as part of this smoke test.

## Acceptance Criteria
- [ ] Plan writes `agents/artifacts/018-phase2-interactive-pane-reuse-loop-zen-plan.md` with a tiny artifact-only implementation plan that explicitly requires the forced Review → Dev loop.
- [ ] First Dev writes marker with exact line `phase2-reuse-loop-zen-state: first-pass`.
- [ ] First Review writes/updates `agents/artifacts/018-phase2-interactive-pane-reuse-loop-zen-review.md` and returns `State = needs-dev-fix` to Dev.
- [ ] Second Dev updates marker to exact line `phase2-reuse-loop-zen-state: second-pass` and writes/creates `agents/artifacts/018-phase2-interactive-pane-reuse-loop-zen-complete.md`.
- [ ] Second Review returns `State = review-pass` to Main.
- [ ] The channel audit trail follows `Main → Plan → Dev → Review → Dev → Review → Main`.
- [ ] No app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, or external script changes are made by workers.
