# Dispatch: Phase 2 Interactive Pane Smoke

## What
Run a tiny artifact-only smoke test for dispatch-auto Phase 2 interactive Pi worker panes using the simple route `Main → Plan → Dev → Review → Main`.

## Why
The workflow is validating visible interactive cmux worker panes before broader rollout. This dispatch should prove that Plan, Dev, and Review can run in visible Pi panes while preserving the existing channel protocol and append-only safety.

## Scope
- In scope: create a minimal plan artifact under `agents/artifacts/`.
- In scope: create a disposable Dev marker artifact under `agents/artifacts/` proving Dev ran in the interactive chain.
- In scope: create complete and review artifacts under `agents/artifacts/`.
- In scope: update this dispatch channel and `docs/SESSIONS.md` per workflow rules.
- Out of scope: app source, app tests, package/Tauri config, product docs, storage/schema changes, orchestration config changes, cmux/Pi extension changes, forced re-review loops, and commits by workers.

## Related Spec Sections
- agents/workflows/dispatch-channel-protocol.md
- agents/ARTIFACTS.md
- agents/CLOSING.md
- agents/orchestration.json

## Constraints
- Keep all created worker artifacts disposable and located under `agents/artifacts/`.
- Do not modify app/source/product documentation files. `docs/SESSIONS.md` updates are allowed because the workflow requires them.
- Use only lightweight artifact verification such as checking expected files/content and `git diff --check`.
- Preserve the simple route: `Main → Plan → Dev → Review → Main`.
- Do not intentionally force a Review → Dev loop.
- Workers must not edit dispatch-auto code, orchestration config, external scripts, app code, app tests, package files, or product docs as part of this smoke test.

## Acceptance Criteria
- [ ] Plan writes `agents/artifacts/015-phase2-interactive-pane-smoke-plan.md` with a tiny artifact-only implementation plan.
- [ ] Dev writes `agents/artifacts/015-phase2-interactive-pane-smoke-marker.md` with the exact line `phase2-interactive-smoke: dev-complete` and a short disposable-marker note.
- [ ] Dev writes `agents/artifacts/015-phase2-interactive-pane-smoke-complete.md` with lightweight verification results.
- [ ] Review writes `agents/artifacts/015-phase2-interactive-pane-smoke-review.md` and returns `State = review-pass` if the marker/artifacts are correct.
- [ ] The channel audit trail follows `Main → Plan → Dev → Review → Main` unless dispatch-auto failure recovery requires an explicitly documented Main re-route.
- [ ] No app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, or external script changes are made by workers.
