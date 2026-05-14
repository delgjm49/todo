# Dispatch: Dispatch-Auto Failure Retry Smoke

## What
Run a tiny artifact-only smoke test for the dispatch-auto process using the simple happy-path route `Main → Plan → Dev → Review → Main`. This dispatch exists to help observe dispatch-auto failure/retry behavior while keeping worker work deliberately minimal and disposable.

## Why
The project workflow is actively refining dispatch automation. A small, non-product dispatch provides a safe target for testing auto-orchestration, interruption, and retry handling without touching app source files, package files, or product documentation.

## Scope
- In scope: create a minimal plan artifact under `agents/artifacts/`.
- In scope: create a disposable Dev marker artifact under `agents/artifacts/` proving Dev ran.
- In scope: create a complete artifact and review artifact under `agents/artifacts/`.
- In scope: update the dispatch channel and `docs/SESSIONS.md` per workflow rules.
- Out of scope: app source, app tests, package/Tauri config, product docs, backlog/spec/UI docs, storage/schema changes, orchestration config changes, forced re-review loops, and commits by workers.

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
- Workers must not edit dispatch-auto code, orchestration config, or external scripts as part of this smoke test.

## Acceptance Criteria
- [ ] Plan writes `agents/artifacts/012-dispatch-auto-failure-retry-smoke-plan.md` with a tiny artifact-only implementation plan.
- [ ] Dev writes `agents/artifacts/012-dispatch-auto-failure-retry-smoke-marker.md` with `smoke-state: dev-complete` and a short note that this is disposable.
- [ ] Dev writes `agents/artifacts/012-dispatch-auto-failure-retry-smoke-complete.md` with lightweight verification results.
- [ ] Review writes `agents/artifacts/012-dispatch-auto-failure-retry-smoke-review.md` and returns `State = review-pass` if the marker/artifacts are correct.
- [ ] The channel audit trail follows `Main → Plan → Dev → Review → Main` unless dispatch-auto failure/retry recovery requires an explicitly documented Main re-route.
- [ ] No app source, app tests, package/Tauri config, product docs, or orchestration config changes are made by workers.
