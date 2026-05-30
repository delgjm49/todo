# Review: Playwright smoke flow

## Plan Reviewed
- `agents/artifacts/069-playwright-smoke-flow-plan.md`

## Complete Reviewed
- `agents/artifacts/069-playwright-smoke-flow-complete.md`

## Summary
Dev replaced the skipped e2e placeholder with an enabled Chromium/Vite-renderer smoke and reported `npm run test:e2e` as blocked **only** by a missing local Playwright Chromium binary (classified "environment-only"). To verify the interaction path (per the review protocol's Test Risk rule that input/editing tests must actually pass, not just be statically inspected), Review installed the Chromium binary (`npx playwright install chromium`) and ran the smoke. The smoke **fails on a real assertion**, not the binary. The environment blocker was masking an implementation defect.

## Findings

### Correctness
- ❌ The smoke fails at `src/tests/e2e/smoke.spec.ts:37`. Assertion `getByText("Blocks").locator("..").getByText("0")` times out — "element(s) not found". The freshly-reset starter `Home` workspace does **not** show zero blocks; it shows **1**.
- ❌ Root cause is a wrong assumption inherited from Plan Step 2 ("after reset … the canvas shows zero blocks"). The starter Home document seeds one block: `createStarterWorkspaceDocument()` → `createStarterBlock("basic_checklist", "Today")` (`src/services/storage/bootstrapData.ts:62-67`). The Playwright ARIA snapshot at failure confirms `Blocks: "1"` with a "Today" / "Checklist" block already present on Home.
- ⚠️ The locator `getByText("Blocks")` is ambiguous: "Blocks" matches both the descriptive paragraph at `MainPane.tsx:108` ("Blocks can now be renamed inline, collapsed, …") and the count label at `MainPane.tsx:113`. Two elements resolve, so `.locator("..")` yields two parents. The count assertions (lines 37 and 51) only happen to work when the target digit appears under exactly one parent — fragile and not the intended single target.

### Completeness
- ✅ The skip placeholder is removed; one enabled test exists.
- ✅ The renderer/Tauri boundary is documented (file comment + plan).
- ✅ Storage reset clears only `todo-app::` keys and does not run on the persistence reload (correctly avoids `addInitScript(localStorage.clear)`).
- ❌ Acceptance criterion "`npm run test:e2e` passes locally, or the complete artifact reports the exact environment-only/repo-state blocker" is not met: the blocker is **not** environment-only. With the binary present the test fails on app behavior.

### Quality
- ✅ Helpers (`waitForAppReady`, `resetTodoStorage`, `waitForSaved`) are reasonable and readable.
- ⚠️ Selector robustness: the count assertions should target a stable, single element (e.g. a narrow `data-testid` on the count value in `MainPane.tsx`, or an exact-scoped locator within the count card) rather than `getByText("Blocks").locator("..")`.
- ⚠️ `waitForSaved` depends on observing a transient `Unsaved changes` state before `Saved`. If autosave settles between Playwright polls this can flake. Validate it holds when running the full test to green; if flaky, wait only for the terminal `Saved` state after the final mutation.

### Data Integrity
- ✅ No schema/JSON shape changes. Test isolates state via the `todo-app::` prefix and relies on the existing autosave path. No data-loss risk introduced.

## Issues Found
1. **[Severity: High]** Initial-state assertion assumes Home has 0 blocks; it seeds 1.
   - File: `src/tests/e2e/smoke.spec.ts:37`
   - Problem: `getByText("Blocks").locator("..").getByText("0")` fails because the starter Home workspace renders `Blocks: 1` (seeded "Today" checklist block from `bootstrapData.ts`).
   - Fix: Assert the actual seeded initial state (Home shows 1 block / a "Today" checklist block), or remove the strict initial block-count check, so the assertion reflects real app behavior. Do not change app seeding to satisfy the test.

2. **[Severity: Medium]** Ambiguous / fragile block-count selector.
   - File: `src/tests/e2e/smoke.spec.ts:37` and `:51`
   - Problem: `getByText("Blocks")` matches both the descriptive paragraph (`MainPane.tsx:108`) and the count label (`MainPane.tsx:113`), so the count assertion targets two parents and passes only by coincidence of which digits appear where.
   - Fix: Target the count value with a single stable locator. Preferred: add a minimal non-visual `data-testid` (e.g. `data-testid="workspace-block-count"`) to the count value `div` at `MainPane.tsx:114` and assert on it; or scope to the count card and use an exact text match. Keep it non-visual per the dispatch's "minimal, stable test hooks only" constraint.

3. **[Severity: Low — validate when green]** `waitForSaved` transient-state dependency.
   - File: `src/tests/e2e/smoke.spec.ts:28-31`
   - Problem: Requires `Unsaved changes` to be observed before `Saved`; a fast autosave could settle between polls and flake.
   - Fix: Confirm reliability once the test runs to green; if flaky, wait only for the terminal `Saved` state.

### Notes for Dev (avoid ping-pong)
The downstream flow after the initial-state check looks consistent with the app and should pass once issues 1–2 are fixed:
- A newly created workspace via `+ Workspace` starts **empty** (`createDefaultWorkspaceState` → `createWorkspaceDocument`, no seeded block), so the empty-state `Add Checklist` button correctly appears, and the post-add count is 1.
- The new checklist block's title is `"Checklist"` (template default, `blockTemplates.ts:19`), so `getByRole("button", { name: "Checklist" })` (line 44) and the `Task` column header (line 45) are correct.
- Default new-workspace title is `Workspace 2`, matching lines 40-41 and 70.

After fixing, **run `npm run test:e2e` to green locally** before handing back — the Chromium binary is now installed in this environment's cache (`~/Library/Caches/ms-playwright/chromium_headless_shell-1217`), so the binary blocker no longer applies here.

## Verification
- command: `npm run test:e2e`
- shell used: zsh (Bash tool) on macOS
- result: FAILED — after installing the Chromium binary, the test fails on a real assertion at `smoke.spec.ts:37`: `getByText('Blocks').locator('..').getByText('0')` → "element(s) not found" (Home seeds 1 block, not 0). Before the install it failed with the missing-binary error Dev reported.
- if failed, exact failure surface: `Error: expect(locator).toBeVisible() failed … Locator: getByText('Blocks').locator('..').getByText('0') … Error: element(s) not found` at `src/tests/e2e/smoke.spec.ts:37`. ARIA snapshot at failure shows `Blocks: "1"` and a seeded "Today" Checklist block on Home.
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped — this is an implementation defect in the dispatch's test, not unrelated repo state. The earlier missing-binary error was environment-only but masked this failure.
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

## Verdict
**FAIL — Return to Dev**

The enabled smoke does not pass: it fails on a real assertion because the starter Home workspace seeds one block while the test asserts zero. Dev's "environment-only" classification was incorrect — the missing browser binary was masking this defect. Fix issues 1 and 2 (and validate 3), then run `npm run test:e2e` to green locally and return to Review. Do not weaken or change app seeding to satisfy the test.

## Next Steps
Routed back to Dev via the dispatch channel with `State = needs-dev-fix`. Work is not complete until Review returns `State = review-pass`.

---

## Re-Review — 2026-05-30 (after Dev fixes, message 005)

Dev addressed all three findings. Re-verified by inspection and by rerunning the full required suite (Chromium binary present).

### Fix verification
1. **(High) Initial-state count** — ✅ Fixed. `smoke.spec.ts:42-44` now asserts the real seeded Home state: `Home` workspace button, the seeded `Today` block button, and `workspace-block-count` = `1`. No app seeding was changed.
2. **(Medium) Ambiguous count selector** — ✅ Fixed. A minimal non-visual `data-testid="workspace-block-count"` was added to the count value (`MainPane.tsx:114`), and the test asserts on `getByTestId("workspace-block-count")` at lines 44 and 58. The diff is a single additive attribute — no behavior or styling change (`git diff`: 1 insertion, 1 deletion). Consistent with the dispatch's "minimal, stable test hooks only" constraint.
3. **(Low) `waitForSaved` flake** — ✅ Improved. The helper (`smoke.spec.ts:28-37`) no longer depends on observing the transient `Unsaved changes` state; it waits for `Saved` and then `page.waitForFunction` until both task strings are actually present in a `todo-app::` localStorage value before reload. This is a more reliable persistence gate than the original transient-state check.

### Re-Verification
- command: `npm run test:e2e`
- shell used: zsh (Bash tool) on macOS
- result: passed — `1 passed (1.8s)`, `✓ creates checklist rows and persists them after reload (827ms)`
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

### Re-Review Verdict
**PASS** — All required fixes resolved; the smoke runs to green and the full required suite passes. Ready for Main to close.

Note for Main: the smoke requires Playwright Chromium binaries (`npx playwright install chromium`) to run; CI/clean environments without the binary will see the missing-binary error rather than a code failure. Not a blocker for closing this dispatch, but worth ensuring the e2e environment provisions browsers.
