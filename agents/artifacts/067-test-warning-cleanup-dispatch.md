# Dispatch: Test Warning Cleanup

## What
Clean up the pre-existing React/JSDOM `act(...)` warnings and uncaught-error noise that still appear during the full JavaScript test suite, after the two CI-blocking unit-test failures were fixed in dispatch 066.

## Why
The full JS suite currently passes, but Review for dispatch 066 observed remaining warnings/errors in unrelated harnesses. These do not block CI today, but they indicate tests that may assert before React effects/state updates settle or dispatch events in a way that trips React 18 + JSDOM internals. That timing debt can become flaky, especially on Windows CI.

## Scope

### In scope
- Reproduce the full-suite warning/error output with the project test pipeline.
- Identify the exact test files and test cases producing remaining warnings/errors. Review 066 named likely areas:
  - `LeftDock`
  - `AlertIntegrationHarness`
  - `AlertNavigationHarness`
  - `SettingsPage`
  - indirect `SaveStatusIndicator` renders inside integration harnesses
- Fix the warning/error causes narrowly in tests/harnesses by making React timing explicit:
  - wrap renders, event dispatches, store updates, and unmounts in `act(...)` as needed
  - await async render/effect/microtask flushes where needed
  - ensure DOM nodes used for dispatch are still mounted
  - avoid broad error suppression unless a narrowly documented React/JSDOM limitation truly requires it
- Keep product source changes out of scope unless a test reveals a real product bug. If product changes are needed, stop and route back to Main with the justification rather than expanding scope silently.

### Out of scope
- Changing product behavior.
- Large test-suite refactors.
- Rewriting unrelated tests that are already clean.
- Playwright/E2E work.
- Rust/Tauri build changes.

## References
- `agents/artifacts/066-unit-test-ci-fixes-review.md`
- `agents/artifacts/066-unit-test-ci-fixes-dev.md`

## Verification Requirements
- Run `npm run test:build`.
- Run the full JS suite via the same `node --test` pipeline used by the project, e.g. `node --experimental-specifier-resolution=node scripts/run-tests.mjs` if still current.
- Confirm the full JS suite passes.
- Confirm the full JS suite no longer prints the targeted React `act(...)` warnings or uncaught React/JSDOM errors identified from dispatch 066.
- Run `npm run lint`.

## Acceptance Criteria
- [ ] Full JS suite passes.
- [ ] The remaining warnings/errors identified from dispatch 066 are eliminated or each has a narrow written deferral explaining why it cannot be fixed safely in this dispatch.
- [ ] No broad/global warning suppression is added.
- [ ] No product source changes unless explicitly justified and routed back for Main decision.
- [ ] Review verifies the warning output, not just pass/fail status.
