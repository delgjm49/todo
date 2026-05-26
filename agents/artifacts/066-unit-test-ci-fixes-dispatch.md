# Dispatch: Unit Test CI Fixes

## What
Fix the two timing-sensitive JavaScript unit-test failures that are causing the `Tauri Windows CI` workflow to fail before the Rust/Tauri build step runs.

## Why
Recent pushes to `main` have consistently reddened the Windows CI workflow because the JS test step exits non-zero. The product build is not the blocker; these appear to be test-environment / React `act(...)` issues in two focused unit tests.

## Scope

### In scope
- Repair `src/tests/unit/saveStatusIndicator.test.tsx` failure:
  - Current symptom: assertion at/near line 85 sees `expected: true, actual: false`.
  - CI log includes: `An update to SaveStatusIndicator inside a test was not wrapped in act(...)`.
  - Likely fix: wrap the retry click / event dispatch and async flush in `act(...)`, or await the promise/state update the component is waiting on before asserting.
- Repair `src/tests/unit/textCellClipboard.test.tsx` failure:
  - Current symptom: `TypeError: Cannot read properties of null (read...NodeFromInstance...)`, thrown from `dispatchKeyDown` at/near line 55 and called at/near line 84.
  - Likely fix: ensure render has flushed, ensure the input is still mounted at dispatch time, and dispatch keyboard events inside `act(...)`.
- Keep changes test-only unless product code is truly required to make a valid test possible.
- If a test cannot be made reliable without broader changes, properly skip the narrow assertion with a written follow-up/TODO explaining why and what should replace it.

### Out of scope
- General test suite cleanup or refactor.
- Rust/Tauri build changes.
- Product behavior changes unrelated to making these tests valid.
- New coverage beyond these two failing files.

## Investigation Notes
- These failures have been consistent across roughly the last 10 Windows CI runs.
- Tests may pass intermittently on macOS; do not rely solely on a green local Mac run. Inspect the test code and make the React/JSDOM timing contract explicit.
- Last relevant touches:
  - `saveStatusIndicator.test.tsx`: commit `47a7db7` / TICKET-063 autosave dirty-state UX.
  - `textCellClipboard.test.tsx`: commit `4b15714` / plain text cell clipboard guard.
- Main inspected both files and found no structural design issue requiring Plan; this should be a focused Main → Dev → Review task.

## Verification Requirements
- Run the narrow JS tests for both files with the same `node --test` pipeline shape used by the project/CI where possible.
- Confirm both target files pass cleanly.
- Confirm these tests print no new React `act(...)` warnings.
- Run the relevant broader JS test command if practical.
- Run lint if practical.

## Acceptance Criteria
- [ ] `src/tests/unit/saveStatusIndicator.test.tsx` runs cleanly.
- [ ] `src/tests/unit/textCellClipboard.test.tsx` runs cleanly.
- [ ] No new `act(...)` warnings are printed by these tests.
- [ ] No product source changes unless explicitly justified in the Dev notes.
- [ ] Review confirms the fixes are narrow and CI-relevant.
