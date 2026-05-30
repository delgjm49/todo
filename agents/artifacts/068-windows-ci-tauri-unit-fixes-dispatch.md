# Dispatch: Windows CI Tauri Unit Fixes

## What
Close the loop on the two JavaScript unit-test failures that still keep the canonical Tauri Windows CI workflow red after dispatches 066 and 067. Fix only the Windows-CI-blocking failures currently visible in the latest run on commit `ac50ab6`.

## Why
Dispatches 066 and 067 passed the local full JS suite on macOS, but that was the wrong authoritative gate: the Tauri Windows CI workflow still fails on every push. These failures must not be deferred again as React/JSDOM noise; they are current CI blockers.

## Scope

### In scope
- Read the failed GitHub Actions logs before editing:
  - `gh run view 26473302347 --log-failed` — latest red run on `ac50ab6`
  - `gh run view 26468663874 --log-failed` — prior run on `574b109`
  - `gh run view 26461215837 --log-failed` — prior run on `3b647e1`
- Fix `src/tests/unit/textCellClipboard.test.tsx` so it no longer trips React 18/JSDOM `getNodeFromInstance` / `getTargetInstForInputEventPolyfill` on Windows CI.
  - Replace native `input.dispatchEvent(new KeyboardEvent(...))` usage with a React-aware simulation or an equivalent test structure that exercises the same behavior safely.
  - Remove the global `window.addEventListener("error", ...)` suppressor added in dispatch 066.
  - Do not replace this with another broad global error/warning suppressor.
- Diagnose the `src/tests/unit/alertScheduler.test.ts` failure at/near suite line 251 / TestContext line 307 (`expected: true, actual: false`).
  - Determine whether dispatch 067's `src/hooks/useAlertNavigation.ts` cleanup made the test assertion stale, or whether it introduced a real product behavior regression.
  - If the assertion is stale, update the test narrowly to match current intended cleanup/timing behavior.
  - If there is a real product regression, do not silently broaden into product work; route back to Main with the diagnosis.
- Keep changes narrowly focused on the two CI-blocking failures.

### Out of scope
- TICKET-062 / Playwright smoke flow.
- Remaining accepted warning noise from 066/067 that is not Windows-CI-blocking.
- Rust/Tauri build changes.
- Refactors of unrelated tests.
- Product behavior changes unless the alertScheduler diagnosis proves a regression and the work is explicitly rerouted.

## References
- `agents/artifacts/066-unit-test-ci-fixes-dispatch.md`
- `agents/artifacts/066-unit-test-ci-fixes-dev.md`
- `agents/artifacts/066-unit-test-ci-fixes-review.md`
- `agents/artifacts/067-test-warning-cleanup-dispatch.md`
- `agents/artifacts/067-test-warning-cleanup-dev.md`
- `agents/artifacts/067-test-warning-cleanup-review.md`
- Latest red run: `gh run 26473302347` (`ac50ab6`)
- Prior matching runs: `gh run 26468663874`, `gh run 26461215837`

## Constraints
- **The Tauri Windows CI workflow must be GREEN on the push that lands this dispatch. This is the authoritative acceptance gate; local macOS/Linux full-suite success is necessary but not sufficient.**
- Do not defer either current failure. If Dev or Review cannot resolve one, route back with a concrete blocker/diagnosis instead of marking the dispatch complete.
- Do not add broad/global error, warning, or console suppression.
- Avoid new `act(...)` warnings in the targeted files.
- Prefer test-side fixes unless diagnosis shows a real product regression.
- If `alertScheduler.test.ts` indicates a product regression from the 067 `useAlertNavigation` cleanup, route back to Main. Main may then decide whether this should be promoted to Plan before further product work.

## Verification Requirements
Dev must report each command using the project verification format:
- `gh run view 26473302347 --log-failed`
- `gh run view 26468663874 --log-failed`
- `gh run view 26461215837 --log-failed`
- Targeted unit tests for `src/tests/unit/textCellClipboard.test.tsx` and `src/tests/unit/alertScheduler.test.ts`
- Full JS suite via the project `node --test` pipeline
- `npm run lint`

Review must independently verify:
- The two targeted tests pass locally.
- Full JS suite passes locally.
- `npm run lint` passes.
- `textCellClipboard.test.tsx` no longer contains or depends on global error-event suppression.
- No new broad suppressors were introduced.
- Alert scheduler diagnosis is recorded in the Dev artifact and is credible.

Main closeout must commit, push, and verify the canonical Tauri Windows CI workflow is green on the resulting push before treating this dispatch as closed.

## Acceptance Criteria
- [ ] **The Tauri Windows CI workflow is GREEN on the push that lands this dispatch.**
- [ ] `src/tests/unit/textCellClipboard.test.tsx` no longer relies on global error-event suppression.
- [ ] The text-cell clipboard Windows CI `getNodeFromInstance` failure is fixed, not deferred.
- [ ] `src/tests/unit/alertScheduler.test.ts` passes against current intended behavior, or the dispatch routes back with a product-regression diagnosis.
- [ ] The alertScheduler failure is fixed or explicitly escalated; it is not deferred.
- [ ] No new `act(...)` warnings are introduced in the targeted files.
- [ ] Lint is clean.
