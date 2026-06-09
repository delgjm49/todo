# Dispatch: 091 — GitHub Actions build failure hardening

## What
Fix the recurring GitHub Actions build failures that have appeared in recent Windows CI runs, focusing on deterministic tests and any still-ambiguous smoke-test selectors.

## Why
Recent `Tauri Windows CI` pushes have intermittently failed despite later green runs. The main recurring unit failure is time-of-day dependent on Windows runners; older e2e failures also showed ambiguous `Menu` locators. Hardening these now should prevent regressions from resurfacing as the workflow continues to run on every push.

## Evidence
- Latest green run: `27178178153` (`feat: close 090 workspace drag polish`).
- Recurring unit failure in failed runs `27073971424`, `27170535810`, `27174310267`:
  - `src/tests/unit/alertScheduler.test.ts`
  - `updateTimeCellValue triggers alert re-evaluation`
  - Assertion expected `alertSummary === null`, actual was a due summary for `columnId: 'when'`.
  - The test computes future time as current hour + 5 modulo 24, which can wrap past midnight and become earlier today on CI.
- Older e2e smoke failures in runs around dispatches 086/087:
  - `locator.click: Test timeout of 30000ms exceeded`
  - `getByText('Menu') resolved to 2 elements`

## Scope
- Make `src/tests/unit/alertScheduler.test.ts` deterministic for time-cell alert re-evaluation.
  - Avoid depending on the runner's current hour when asserting the initial time value is not alerting.
  - Preserve coverage that `updateTimeCellValue(...)` triggers queued alert re-evaluation after a committed edit.
- Audit current Playwright e2e smoke selectors for ambiguous `Menu` text locators.
  - Harden any remaining ambiguous locator using roles, accessible names, scoped locators, or test ids consistent with existing project style.
  - If the ambiguity has already been removed by later UI work, document that finding in the Dev handoff and do not churn tests unnecessarily.
- Keep changes narrowly focused on CI reliability; no product behavior changes unless a test exposes a real bug.

## Suggested Verification
- `npm test -- src/tests/unit/alertScheduler.test.ts`
- `npm run test:e2e`
- `npm run typecheck`
- `npm test`

## Constraints
- No new dependencies.
- Do not weaken the alert behavior assertions; make the setup deterministic instead.
- Prefer minimal selector fixes over broad e2e rewrites.
- Preserve local-first app behavior and existing storage/schema contracts.

## Acceptance Criteria
- [ ] The time-cell alert re-evaluation unit test no longer depends on current clock hour or midnight wraparound.
- [ ] Targeted alert scheduler test passes locally.
- [ ] Any remaining ambiguous Playwright `Menu` locator in the smoke flow is fixed, or Dev documents that none remains in current files.
- [ ] E2E smoke test passes locally or any environment limitation is clearly documented.
- [ ] Full relevant verification is run and reported.
- [ ] Review returns `State = review-pass`.
