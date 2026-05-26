# Review: Integration tests for critical editing flows

## Plan Reviewed
- agents/artifacts/061-integration-tests-plan.md

## Complete Reviewed
- agents/artifacts/061-integration-tests-complete.md

## Findings

### Correctness
- ✅ All six integration test files exist under `src/tests/integration/` plus the shared
  `helpers/integrationHarness.ts`, matching the plan's file list verbatim.
- ✅ Tests drive real `useDocumentStore` / `useUiStore` / `useHistoryStore` against a real
  `StorageService` backed by `createMemoryStorageBackend()`. Each test does a real
  save → reload round-trip via a fresh `createStorageService(backend)` call rather than
  asserting on in-memory state.
- ✅ Test isolation: every file calls `resetAllStores()` in `beforeEach`, creates a fresh
  backend, then re-initializes the document store from it. Cross-test pollution is avoided.
- ✅ Helper module is minimal (~110 lines) and only contains primitives used by ≥2 files
  (`createRealStorageService`, `resetAllStores`, `flushAutosave`, `installDomGlobals`).
- ✅ Type assertions are minimal and justified: `as BlockType[]` for a literal array, one
  settings-union narrowing in the column-settings round-trip test (documented in Complete),
  and the standard JSDOM `as unknown as Window & typeof globalThis` cast also used in
  `rowEditing.test.tsx`.

### Completeness
- ✅ All 8 plan steps addressed.
- ✅ Acceptance criteria all met:
  - Workspace CRUD round-trip (create, rename, reorder, style, delete, dirty-state)
  - Block CRUD round-trip (each template, rename/collapse/reorder, cross-workspace move, delete, block format)
  - Row + cell CRUD round-trip (text, checkbox, date, time, dropdown)
  - Column CRUD round-trip (add, rename, move, change-type, delete + settings)
  - Format overrides round-trip and resolve correctly via `resolveCellFormatting`
  - Sort metadata + sorted row order persist across reload
  - Workspace alert summary round-trips
  - Partial-save failure leaves a loadable backend (no corruption)
  - Undo and redo each verified to persist across reload
  - `canUndo` / `canRedo` flags correct through commit / undo / redo cycles
  - History preserved across autosave failure; `retrySave` succeeds
  - Alert integration: dock badge renders, flash + selection fire on active alert, dedup
    smoke-tested across workspace switch
- ✅ Step 5 case 5 (partial-save failure) did not reveal a production bug — the partial-save
  case is correctly handled by the existing storage layer.

### Quality
- ✅ Tests follow the existing `node:test` pattern (`describe` / `test` / `beforeEach`)
  consistent with `documentStore.test.ts` and `rowEditing.test.tsx`.
- ✅ No `console.log` / debug statements.
- ✅ ESLint clean (zero errors, zero warnings).
- ✅ TypeScript compiles cleanly (`npm run test:build`).
- ✅ No production-code modifications; no `data-testid` additions needed (existing IDs
  were sufficient).
- ✅ The plan's "Vitest → `node:test`" wording deviation is correctly handled: Dev used
  `node:test` and documented it in the Complete artifact.

### Data Integrity
- ✅ The partial-save test (`saveLoadRoundtrip` case 5) intercepts `backend.rename` for the
  workspace-index temp-file rename path. After the failure, the test re-initializes from
  the same backend and confirms the workspace title is still the *pre-failure* value,
  proving no corruption.
- ✅ The autosave-failure test (`undoRedoFlows` case 5) intercepts `backend.writeText`,
  confirms history is preserved across the failure, restores the backend, and verifies
  `retrySave()` produces a clean `saveStatus === "saved"` plus a successful round-trip.

### Test Risk (React + jsdom)
- ✅ Only the alert integration file uses JSDOM and React rendering. The first test
  exercises `LeftDock` alone (no `useAlertNavigation`) to verify badge rendering. The
  second/third use the `AlertIntegrationHarness` wrapper that wires `useAlertNavigation`.
- ✅ Test 3 of the alert file was intentionally softened to a smoke test for dedup
  behavior because of timing variability in JSDOM (`useEffect` + `requestAnimationFrame` +
  `setTimeout(300)`). This deviation is documented in the Complete artifact and is
  acceptable because tighter dedup coverage already exists in `alertNavigation.test.tsx`.
- ✅ Repeated runs of the integration tests show stable 30/30 pass; no `attachEvent` or
  `act` warnings traced to the new tests.

## Issues Found

None — no required fixes.

## Verification

- command: `npm run lint`
- shell used: zsh
- result: Passed (exit 0, zero errors, zero warnings).
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: Checkpoint-scoped.
- was this the actual shell provided by the environment: Yes (Mac zsh).

---

- command: `npm run test`
- shell used: zsh
- result: 442 tests run, 440 pass, 2 fail. The 2 failing tests
  (`alertScheduler > updateTimeCellValue triggers alert re-evaluation` and
  `SaveStatusIndicator > renders nothing when saveStatus=loading`) are confirmed
  pre-existing: a clean `rm -rf .test-dist && npm run test` against `git stash -u`
  pre-dispatch state also failed both. All 30 new integration tests pass cleanly.
- if failed, exact failure surface: 2 pre-existing failures listed above.
- checkpoint-scoped or unrelated repo-state: The 2 failures are unrelated repo-state
  (pre-existing) and not introduced by this dispatch.
- was this the actual shell provided by the environment: Yes (Mac zsh).

---

- command: `node --test .test-dist/tests/integration/*.test.js` (integration-only)
- shell used: zsh
- result: Passed (30 tests, 30 pass, 0 fail). Re-ran 3× — consistent.
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: Checkpoint-scoped.
- was this the actual shell provided by the environment: Yes (Mac zsh).

## Verdict

**PASS**

All plan steps were completed, all acceptance criteria met, lint and tests pass for the
new work, and the two failing tests in the wider suite predate this dispatch. The
integration tests provide the multi-store, save→reload coverage that TICKET-061 set out
to add. No production code was modified.

## Next Steps

Hand off to Main to close the dispatch, consolidate `docs/SESSIONS_PENDING.md` into the
archive and living summary, then commit and push.
