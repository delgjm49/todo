# Review: Playwright e2e CI provisioning

## Dispatch Reviewed
- `agents/artifacts/070-playwright-e2e-ci-provisioning-dispatch.md`

## Complete Reviewed
- `agents/artifacts/070-playwright-e2e-ci-provisioning-complete.md`

## Files Reviewed
- `.github/workflows/tauri-windows.yml`
- `playwright.config.js`
- `src/tests/e2e/smoke.spec.ts`
- `package.json` (to confirm `dev` / `test:e2e` script behavior on the runner)

## Summary
Dev added two steps to the existing Windows Tauri CI workflow: `Install Playwright Chromium` (`npx playwright install chromium`) and `E2E smoke tests` (`npm run test:e2e`), inserted after `npm ci` and before the existing `Typecheck` step. The change is purely additive — `git diff` shows the two new steps and nothing removed. All previously required gates remain in place.

## Findings

### Correctness
- ✅ Chromium is provisioned for clean runners via `npx playwright install chromium` (workflow line 32-33). No `--with-deps` is needed on `windows-latest` (that flag is Linux-specific), so this is the correct provisioning command for the target runner.
- ✅ `npm run test:e2e` runs as a workflow step (line 35-36) with no `continue-on-error` and no `|| true`. `test:e2e` → `playwright test`, which exits non-zero on any test failure, so a failing smoke fails the job.
- ✅ The smoke is browser/renderer-based: `playwright.config.js` `webServer.command` is `npm run dev` → `vite` (a plain Vite dev server, not `tauri dev`). On CI, `reuseExistingServer: !process.env.CI` is `false`, so Playwright starts a fresh Vite server and waits on `http://127.0.0.1:1420`. There is no desktop GUI to hang a headless Windows runner.

### Completeness — Acceptance Criteria
- ✅ `tauri-windows.yml` installs/provisions Playwright Chromium for clean runners.
- ✅ `tauri-windows.yml` runs `npm run test:e2e` as a required step.
- ✅ Existing gates intact and unchanged: `Typecheck` (39), `Unit tests` (42), `Lint` (45), `Build frontend` (48), `Build Tauri app` (51), `Upload Windows artifacts` (54-59).
- ✅ Local verification covers `npm run test:e2e`, `npm run test:build`, and `npm run lint` (rerun by Review below).
- ✅ Review confirms the workflow cannot silently pass without running the smoke — see "Won't silently pass" below.

### Won't Silently Pass
- No step uses `continue-on-error`, `if: always()` shortcuts, or `|| true`. GitHub Actions fails the job on the first non-zero step.
- `playwright test` returns a non-zero exit on assertion failure, on webServer startup timeout (120s), or on a missing browser binary — each surfaces as a loud step failure, not a pass.
- The 069 re-review confirmed the smoke runs to green only when assertions actually hold; there is no skip/`test.fixme` masking behavior in `smoke.spec.ts`.

### Quality
- ✅ Step naming is consistent with the existing workflow style ("Install dependencies", "E2E smoke tests", "Typecheck").
- ✅ Minimal, workflow-focused change as the dispatch required; no product code touched.
- ℹ️ (Non-blocking observation) The e2e step is placed before the cheaper static gates (typecheck/lint). Cheap static checks first would give faster failure feedback and avoid spinning up Vite + Chromium when a typecheck/lint error would fail the job anyway. The dispatch explicitly directed "before/near the existing frontend/package gates," so the current placement is in-scope and correct; reordering is a pure CI-latency micro-optimization, not a required fix.

### Data Integrity
- ✅ No data model, JSON storage, or app code changes. CI-only change.

## Issues Found
None requiring a fix.

## Verification
- command: `npm run test:e2e`
- shell used: zsh (Bash tool) on macOS
- result: passed — `1 passed (1.8s)`, `✓ creates checklist rows and persists them after reload (932ms)`
- if failed, exact failure surface: n/a
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
- was this the actual shell provided by the environment: yes

- command: `npm run test:build`
- shell used: zsh (Bash tool) on macOS
- result: passed
- if failed, exact failure surface: n/a
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
- was this the actual shell provided by the environment: yes

- command: `npm run lint`
- shell used: zsh (Bash tool) on macOS
- result: passed
- if failed, exact failure surface: n/a
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
- was this the actual shell provided by the environment: yes

- command: `git diff HEAD -- .github/workflows/tauri-windows.yml` + `python3` YAML parse
- shell used: zsh (Bash tool) on macOS
- result: passed — diff is two additive steps only; YAML parses as valid
- was this the actual shell provided by the environment: yes

### Verification Boundary
As Dev noted, macOS local verification proves the smoke and required commands pass in this environment but cannot fully prove `windows-latest` runner behavior (Chromium download + Vite startup on Windows). This is the expected and unavoidable boundary for a CI-only change; the first GitHub Actions run after Main pushes will confirm runner behavior. This boundary does not block the review — the workflow logic is correct and the dispatch anticipated it.

## Verdict
**PASS** — All acceptance criteria are met. Chromium is provisioned, `npm run test:e2e` is a required gate that cannot silently pass, and every existing CI gate is preserved. The change is minimal and additive. Ready for Main.

## Next Steps
Routed to Main via the dispatch channel with `State = review-pass`. Main may commit/push; the first Windows Actions run will validate runner-side Chromium provisioning and Vite startup.
