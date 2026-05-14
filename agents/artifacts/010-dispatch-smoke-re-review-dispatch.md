# Dispatch: Dispatch Smoke Re-Review Loop

## What
Create a deliberately tiny meta-workflow smoke-test change that exercises the full dispatch automation loop, including a forced first Review → Dev return and a subsequent Dev → Review re-review. The implementation should avoid app source changes and only create/update disposable smoke-test artifacts plus normal workflow bookkeeping.

## Why
The dispatch automation scripts live outside this repo and are being set up separately. This repo needs a small, observable dispatch that proves the Main → Plan → Dev → Review → Dev → Review → Main route works, especially the mandatory re-review path after a required fix.

## Scope
- Create a disposable smoke-test marker artifact at `agents/artifacts/010-dispatch-smoke-re-review-marker.md`.
- Have the initial Dev pass write the marker with `review-loop-state: first-review-required`.
- Force the first Review pass to return to Dev with `State = needs-dev-fix`, even if the marker and complete artifact otherwise look correct.
- Have the Dev fix pass update the marker to `review-loop-state: re-review-ready` and note the forced loop was exercised in the complete artifact.
- Have the second Review pass verify the marker update and return `State = review-pass` to Main.
- Update the dispatch channel and `docs/SESSIONS.md` at each worker handoff so the channel audit trail shows `Main → Plan → Dev → Review → Dev → Review → Main`.

## Out of Scope
- Do not modify app source files under `src/`.
- Do not modify tests, package scripts, lockfiles, Tauri config, or user-facing product docs.
- Do not add dependencies or run product feature work.
- Do not commit; Main handles git operations after explicit user approval.
- Do not delete the smoke-test artifacts during the worker cycle; cleanup can happen later after Main/user confirm the workflow test succeeded.

## Related Spec Sections
- `agents/workflows/dispatch-channel-protocol.md` — mandatory re-review rule and Review FAIL → Dev routing.
- `agents/ARTIFACTS.md` — dispatch, plan, complete, review, and channel artifact formats.
- `agents/CLOSING.md` — session log and verification reporting expectations.
- External meta-workflow context: dispatch automation scripts are being set up outside this repo.

## Constraints
- This is intentionally meta-workflow smoke-test work, not product work.
- Keep all fake work obvious and disposable by using the `010-dispatch-smoke-re-review-*` artifact prefix.
- The first review must fail/return to Dev by design. Treat that return as a successful exercise of the dispatch loop, not a product quality failure.
- The Dev fix should be minimal: update the marker state and complete artifact fix notes only.
- Verification should be lightweight and appropriate for artifact-only changes, such as checking the expected marker file exists and running `git diff --check`. Full product verification is not required unless a worker unexpectedly changes app source/test/config files.

## Acceptance Criteria
- [ ] The channel shows a complete forced re-review path: `Main → Plan → Dev → Review → Dev → Review → Main`.
- [ ] The first Review message routes to Dev with `State = needs-dev-fix` and includes the required FAIL → Dev close block.
- [ ] The Dev fix pass updates `agents/artifacts/010-dispatch-smoke-re-review-marker.md` from `review-loop-state: first-review-required` to `review-loop-state: re-review-ready`.
- [ ] The second Review verifies the marker update and returns `State = review-pass`.
- [ ] No app source/test/package/Tauri files are modified.
- [ ] `docs/SESSIONS.md` notes the smoke-test dispatch and worker handoffs.
- [ ] The review artifact records that this was a successful meta-workflow smoke test of the forced re-review route.
