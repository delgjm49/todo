# Dispatch: Playwright e2e CI provisioning

## What
Add CI provisioning for the newly enabled Playwright smoke by installing the required Chromium browser binary and running `npm run test:e2e` in the existing Windows CI workflow. Keep the workflow change focused and diagnose any Windows-specific e2e startup or browser-install issues rather than weakening the smoke.

## Why
TICKET-062 added a passing local Playwright smoke, but Review noted that clean environments need Playwright Chromium installed. CI should enforce the smoke on push/PR so e2e regressions are caught automatically during release hardening.

## Scope
- Update `.github/workflows/tauri-windows.yml` to provision Playwright Chromium in CI.
- Add an e2e smoke step that runs `npm run test:e2e` after dependencies are installed and before/near the existing frontend/package gates.
- Preserve existing typecheck, unit test, lint, build, Tauri build, and artifact upload gates.
- Prefer standard Playwright provisioning commands, e.g. `npx playwright install chromium`, with any OS dependency command only if needed for Windows runners.
- Document expected local/CI behavior in the Dev complete artifact.

**Out of scope:**
- Changing the Playwright smoke behavior or weakening assertions.
- Adding broad e2e test coverage beyond running the existing smoke.
- Reworking packaging, icons, or unrelated Windows CI failures unless required to make the workflow run the new e2e step.
- Adding non-Windows CI jobs.

## Related Spec Sections
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md TICKET-062
- agents/artifacts/069-playwright-smoke-flow-review.md
- .github/workflows/tauri-windows.yml
- playwright.config.js
- src/tests/e2e/smoke.spec.ts

## Constraints
- Keep the change workflow-focused and minimal.
- Do not skip `npm run test:e2e` in CI.
- Do not edit product code unless a genuine Windows-only smoke failure is found and routed through Review.
- If a local macOS run cannot fully emulate GitHub Windows CI, Dev should still run available local verification and clearly state the boundary.
- Main handles commit/push after Review passes.

## Acceptance Criteria
- [ ] `.github/workflows/tauri-windows.yml` installs/provisions Playwright Chromium for clean CI runners.
- [ ] `.github/workflows/tauri-windows.yml` runs `npm run test:e2e` as a required CI step.
- [ ] Existing CI gates remain in place: typecheck, unit tests, lint, frontend build, Tauri build, artifact upload.
- [ ] Local verification includes at minimum `npm run test:e2e`, `npm run test:build`, and `npm run lint`.
- [ ] Review confirms the workflow will not silently pass without running the smoke.
