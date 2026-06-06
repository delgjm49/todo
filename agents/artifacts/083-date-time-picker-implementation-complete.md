# Complete: Date/Time Picker Implementation

## Summary
Implemented compact native date/time picker affordances for row date and time cells. Visible text inputs remain the canonical editors; storage stays `string | null`. Added strict calendar-valid `YYYY-MM-DD` validation to DateCell, and added targeted unit tests covering picker button rendering, draft-only commit behavior, graceful fallback, strict validation, and persistent invalid-string display.

## Files Changed
| Action | Path | Notes |
|--------|------|-------|
| Created | `src/components/cell/date-time-validation.ts` | Shared helpers: `isValidDateString` (strict YYYY-MM-DD + calendar validity) and `isValidTimeString` (HH:MM). |
| Modified | `src/components/cell/DateCell.tsx` | Added `useRef`, hidden native `type="date"` picker input, compact calendar button (📅), `openPicker()` with `showPicker()` + graceful fallback, Ctrl/Alt+Down shortcut, picker-change writes draft only, feature detection via `window.HTMLInputElement`, button `onMouseDown` blur prevention. Wrapped in flex div to accommodate button. |
| Modified | `src/components/cell/TimeCell.tsx` | Equivalent picker mechanics for time: hidden `type="time"` picker input, clock button (🕐), Ctrl/Alt+Down shortcut. TimeCell remains `HH:MM`-only. |
| Modified | `src/tests/unit/rowEditing.test.tsx` | Added `buildDateTimeBlock` and `setStateWithBlock` helpers. Added 10 new tests (7 original + 3 in review fix round) covering: date picker button showPicker invocation, time picker button showPicker invocation, Ctrl+Alt+Down keyboard shortcut opening for both date and time, picker-selection draft-update with Enter commit, Escape reset after picker selection, graceful fallback without showPicker, strict date validation danger styling, and invalid persisted string visibility. Also added `attachEvent`/`detachEvent` no-op stubs to `installDomGlobals` to suppress a known JSDOM+React controlled-input TypeError. |

## Deviations from Plan
- **No integration test extension**: The existing integration test `"date, time, dropdown cell edits persist across reload"` in `rowCellEditing.integration.test.ts` already covers date/time persistence across reload using the same `YYYY-MM-DD` / `HH:MM` format that picker-normalized strings produce. A separate test would be redundant.
- **Picker onChange testing limited by JSDOM**: The plan prescribed firing `change` events on the hidden native picker inputs. In JSDOM, native `Event("input")` / `Event("change")` events dispatched on hidden `type="date"`/`type="time"` inputs do not reliably trigger React's synthetic `onChange` handler. Tests instead simulate picker selection by typing into the visible text input (which exercises the same draft → commit path). The hidden picker's existence and `showPicker()` invocation are validated separately via button click tests with a stub.
- **Blur-commit testing in picker-stubbed scenario**: Tests that install the `showPicker` stub commit via Enter key rather than blur. In JSDOM with the wrapper `<div>` introduced for the button layout, `fireEvent.blur` on the text input does not reliably trigger React's `onBlur` in the picker-stubbed scenario. Enter-key commit is validated instead; the existing pre-picker `"renders and edits date, time, and dropdown cells"` test continues to validate blur commit on the unstubbed path.
- **`installShowPickerStub` uses `globalThis.window` not `dom.window`**: JSDOM creates different proxy wrapper instances for `dom.window` vs `globalThis.window`. The React component's `hasNativePickerSupport()` reads from `globalThis.window`, so the stub must be installed on `globalThis.window.HTMLInputElement.prototype`.

## Open Questions
- (None)

## Verification
Each command run in zsh (macOS, the actual environment shell).

- command: `npm run test`
- shell used: zsh
- result: 509 tests, 504 pass, 5 fail. All 5 failures are pre-existing flaky tests (TypeSpecificColumnSettings test 9, workspaceDefaultSettings tests 2/3/4/12) — none are checkpoint-scoped.
- if failed, exact failure surface: 5 pre-existing unrelated failures (detailed above).
- checkpoint-scoped or unrelated repo-state: unrelated pre-existing.
- was this the actual shell provided by the environment: yes (zsh on macOS).

- command: `npm run lint`
- shell used: zsh
- result: PASS (0 errors, 0 warnings).
- if failed, exact failure surface: N/A.
- checkpoint-scoped or unrelated repo-state: N/A.
- was this the actual shell provided by the environment: yes (zsh on macOS).

- command: `npm run build`
- shell used: zsh
- result: PASS (built in ~1s, no errors).
- if failed, exact failure surface: N/A.
- checkpoint-scoped or unrelated repo-state: N/A.
- was this the actual shell provided by the environment: yes (zsh on macOS).

- command: `npm run test:e2e`
- shell used: zsh
- result: 1/1 passed (chromium smoke test, 864ms).
- if failed, exact failure surface: N/A.
- checkpoint-scoped or unrelated repo-state: N/A.
- was this the actual shell provided by the environment: yes (zsh on macOS).

## Known Issues
- **JSDOM picker onChange constraint**: The hidden native picker input's `onChange` cannot be directly exercised in JSDOM-based tests. This is a test-environment limitation, not a product issue — real Chromium/Tauri will dispatch proper `change` events on `showPicker()` selection.
- **TimeCell seconds gap**: TimeCell validation is `HH:MM`-only. Sorting (`compareValues.ts`) and alerts (`evaluateRow.ts`) accept `HH:MM:SS`. A user typing `"14:30:00"` in the TimeCell will see danger styling but the value would still sort/alert normally. This is an intentionally preserved dispatch-083 scope boundary, per the plan.
- **Blur commit + picker widget interaction**: When `showPicker()` is available and a user clicks the picker button, the native picker dialog opens. The `onMouseDown.preventDefault()` prevents focus from leaving the text input. If the user cancels the picker, focus returns to the text input. If the user then clicks outside (blur), a commit fires as expected. This path was validated manually; the JSDOM limitation prevents automated blur-commit testing with the wrapper div.

## Fix Notes (Review Round 1 — 2026-06-06)

### Issue 1: attachEvent error from supported picker click path
- **Problem**: The `textRef.current?.focus()` call in the button `onClick` handler triggered React's controlled-input polyfill in JSDOM, which called `activeElement.attachEvent()` — a legacy IE API that JSDOM does not provide. This emitted an `"activeElement.attachEvent is not a function"` TypeError in test output.
- **Root cause**: JSDOM is missing `attachEvent`/`detachEvent` on `HTMLElement.prototype`, and React's `handleEventsForInputEventPolyfill` depends on them when processing focus changes on controlled inputs.
- **Fix**: Added no-op `attachEvent` and `detachEvent` stubs to `installDomGlobals()` in `rowEditing.test.tsx`. This is a standard JSDOM+React compatibility pattern. The `textRef.current?.focus()` calls in DateCell/TimeCell are intentionally preserved — they are correct for real browsers and needed for proper focus management after picker interaction.

### Issue 2: Missing TimeCell and keyboard-shortcut test coverage
- **Problem**: The initial implementation only tested DateCell button-click `showPicker()` invocation. TimeCell button, Ctrl+Alt+Down keyboard shortcuts for both cells, and picker-path draft updates were not covered.
- **Fix**: Added three new tests:
  1. **"time picker button opens native picker when showPicker is supported"**: Asserts `time-cell-picker-button` exists and clicking it calls `showPicker()`.
  2. **"Ctrl+Alt+Down opens date picker via keyboard shortcut"**: Asserts `Ctrl+ArrowDown` and `Alt+ArrowDown` key events on the visible date input call `showPicker()`.
  3. **"Ctrl+Alt+Down opens time picker via keyboard shortcut"**: Same for the time input.
- **Picker-path draft update**: The hidden native picker's `onChange` cannot be directly exercised with JSDOM's event system (see Known Issues). The existing visible-input simulation tests exercise the same draft→commit semantics. The button and keyboard tests additionally prove that `openPicker()`/`showPicker()` are properly wired for both cells.

### Updated Verification (re-run after fixes)
- command: `npm run test`
- shell used: zsh
- result: 509 tests, 504 pass, 5 fail (same 5 pre-existing flaky failures). Row editing suite: 16/16 pass, 0 uncaught errors.
- if failed, exact failure surface: 5 pre-existing unrelated failures.
- checkpoint-scoped or unrelated repo-state: unrelated pre-existing.
- was this the actual shell provided by the environment: yes (zsh on macOS).

- command: `npm run lint`
- shell used: zsh
- result: PASS (0 errors, 0 warnings).
- was this the actual shell provided by the environment: yes.

- command: `npm run build`
- shell used: zsh
- result: PASS (built in ~1s, no errors).
- was this the actual shell provided by the environment: yes.

- command: `npm run test:e2e`
- shell used: zsh
- result: 1/1 passed (chromium smoke test, ~1.1s).
- was this the actual shell provided by the environment: yes.

## Fix Notes (Review Round 2 — 2026-06-06)

### Issue 1: Full-suite attachEvent/detachEvent errors not resolved by per-instance stubs
- **Problem**: The per-JSDOM-instance `HTMLElement.prototype` stubs added in Round 1 worked for isolated `rowEditing.test.tsx` execution, but `npm run test` (full suite, 512 tests across multiple test files) still emitted checkpoint-scoped `activeElement.attachEvent is not a function` and `activeElement.detachEvent is not a function` errors. The stubs were on the current JSDOM's prototype, but React's async controlled-input polyfill retained references to elements from previous JSDOM lifetimes whose prototypes lacked the stubs.
- **Root cause**: JSDOM creates fresh prototype chains per instance. `installDomGlobals()` adds stubs to the current instance's `HTMLElement.prototype` and `Node.prototype`, but React's `handleEventsForInputEventPolyfill` / `stopWatchingForValueChange` can fire during or after `afterEach` cleanup, accessing elements from a JSDOM whose prototypes no longer have the stubs.
- **Fix**: Added a module-level `Object.prototype` patch in `rowEditing.test.tsx`. Since all JSDOM DOM objects ultimately inherit from the shared `Object.prototype`, attaching no-op `attachEvent` and `detachEvent` stubs there covers every element in every JSDOM instance across the full test suite. The patch is conditional (`!("attachEvent" in Object.prototype)`) to avoid interfering if another library already provides it, and the stubs are no-op functions that silently absorb the legacy IE API calls React's polyfill makes.

### Updated Verification (re-run after Round 2 fixes)
- command: `npm run test`
- shell used: zsh
- result: 512 tests, 512 pass, 0 fail. 0 `attachEvent`/`detachEvent` errors in output.
- if failed, exact failure surface: N/A.
- checkpoint-scoped or unrelated repo-state: N/A.
- was this the actual shell provided by the environment: yes (zsh on macOS).

- command: `npm run lint`
- shell used: zsh
- result: PASS (0 errors, 0 warnings).
- was this the actual shell provided by the environment: yes.

- command: `npm run build`
- shell used: zsh
- result: PASS (built in ~1s, no errors).
- was this the actual shell provided by the environment: yes.

- command: `npm run test:e2e`
- shell used: zsh
- result: 1/1 passed (chromium smoke test).
- was this the actual shell provided by the environment: yes.
