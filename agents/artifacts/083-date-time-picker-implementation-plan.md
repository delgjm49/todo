# Plan: Date/Time Picker Implementation

## Overview
Implement a narrow date/time picker enhancement for row date and time cells. The visible text inputs remain the canonical editors and storage remains `string | null`, while compact native picker buttons assist selection and DateCell validation is aligned to strict calendar-valid `YYYY-MM-DD` semantics.

## Verified Current-State Facts
- `agents/channels/083-date-time-picker-implementation/messages/001-main-to-plan.md` addresses Plan with `State = ready-for-plan` and requires this plan artifact plus exactly one `002` handoff message.
- `agents/artifacts/083-date-time-picker-implementation-dispatch.md` scopes dispatch 083 to compact native picker affordances, strict DateCell validation, unchanged commit/cancel/null semantics, unchanged `string | null` persistence, and targeted tests.
- `agents/artifacts/082-richer-date-time-picker-planning-complete.md` recommends keeping visible text inputs as the primary editors, adding adjacent calendar/clock buttons that call native `showPicker()`, writing picker selections into draft only, and preserving storage/schema behavior. Its Review artifact (`agents/artifacts/082-richer-date-time-picker-planning-review.md`) passed that recommendation.
- `src/components/cell/DateCell.tsx` currently renders one visible `type="text"` input with `data-testid="date-cell-input"`, local `draft` state, `onBlur`/Enter commit, Escape reset, trim-to-null clearing, and danger styling for invalid drafts. Its current `isValidDateString` uses `new Date(value)`, so it accepts lenient JavaScript-parseable strings rather than strict `YYYY-MM-DD`.
- `src/components/cell/TimeCell.tsx` currently mirrors DateCell's draft/commit/reset/clear behavior with one visible `type="text"` input and `data-testid="time-cell-input"`. Its validation is already strict `HH:MM` via `/^([01]\d|2[0-3]):([0-5]\d)$/`.
- `src/components/cell/CellRenderer.tsx` passes date/time cells to `DateCell`/`TimeCell` as `string | null`, converting non-string values to `null`.
- `src/components/row/RowView.tsx` wires `onCommitDate` and `onCommitTime` to `useDocumentStore().updateDateCellValue` and `updateTimeCellValue` without additional parsing.
- `src/stores/documentStore.ts` implements `updateDateCellValue` and `updateTimeCellValue` as `string | null` updates on matching date/time columns, commits a `"typing"` snapshot, and queues alert re-evaluation after successful commits.
- `src/services/storage/storageSchemas.ts` defaults date/time/dropdown cells to `{ value: null, format: {} }`, normalizes date/time/dropdown values to strings or `null`, and `normalizePersistedCell` preserves date/time values only as `string | null`.
- `src/domain/rows/createRow.ts` creates default date/time cells with `{ value: null, format: {} }`; `src/types/row.ts` defines date/time-compatible payloads through `NullableTextCellPayload` (`value: string | null`).
- `src/domain/sorting/compareValues.ts` treats dates as non-empty only when they match strict `YYYY-MM-DD` and round-trip as valid UTC calendar dates; invalid/null dates sort as empty. It accepts times as `HH:MM` or `HH:MM:SS` with range checks.
- `src/domain/alerts/evaluateRow.ts` parses dates with the same strict `YYYY-MM-DD` plus calendar-validity requirement and parses times as `HH:MM` or `HH:MM:SS`; invalid/null values produce no alert.
- `src/domain/search/searchDocuments.ts` includes date/time among searchable string cell types and performs raw case-insensitive substring matching, with no date/time parsing.
- `src/domain/clipboard/rowClipboardTypes.ts` accepts date/time cells as `string | null` in `normalizeCellForColumnType`, so picker-normalized strings remain clipboard-compatible.
- `src/tests/unit/rowEditing.test.tsx` uses JSDOM, React `act`, `fireEvent`, and MainPane rendering to cover date/time visible input rendering, blur commits, and invalid danger styling. Its DOM global installer currently sets `HTMLElement`, but not `HTMLInputElement` globally; tests can patch `dom.window.HTMLInputElement.prototype.showPicker` and implementation should feature-detect through `window.HTMLInputElement`.
- `src/tests/integration/rowCellEditing.integration.test.ts` already verifies date, time, and dropdown store edits persist across reload and clear back to `null` through the storage service.
- `package.json` verification scripts are `npm run test`, `npm run lint`, `npm run build`, and `npm run test:e2e`.

## Prerequisites
- No dependency installation is required. Use native browser/Tauri capabilities only.
- Dev must not edit existing dispatch channel message files. After implementation, Dev should create the complete artifact and the next Dev → Review message.

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Create | `src/components/cell/date-time-validation.ts` | Shared component-level helpers for strict date validation and current `HH:MM` time validation. |
| Modify | `src/components/cell/DateCell.tsx` | Add strict date validation, hidden native date picker input, compact calendar button, Ctrl/Alt+Down opener, picker change-to-draft behavior, and graceful `showPicker` fallback. |
| Modify | `src/components/cell/TimeCell.tsx` | Add hidden native time picker input, compact clock button, Ctrl/Alt+Down opener, picker change-to-draft behavior, and graceful `showPicker` fallback while retaining `HH:MM` validation. |
| Modify | `src/tests/unit/rowEditing.test.tsx` | Add targeted UI tests for picker button rendering/opening, picker selection updating draft without immediate commit, Enter/blur commit, Escape reset, graceful fallback without `showPicker`, and strict date invalid styling. |
| Modify | `src/tests/integration/rowCellEditing.integration.test.ts` | Add or extend storage-persistence coverage for picker-normalized date/time strings and clear-to-null compatibility. |
| Optional | `src/tests/unit/blockRowSorting.test.ts` | If useful, add explicit coverage that picker-normalized `YYYY-MM-DD` and `HH:MM` sort as expected. Existing coverage already substantially verifies this. |
| Optional | `src/tests/unit/alertEvaluation.test.ts` | If useful, add explicit coverage that picker-normalized date/time values trigger due alerts. Existing coverage already substantially verifies this. |

## Implementation Steps

### Step 1: Add validation helpers
- Create `src/components/cell/date-time-validation.ts`.
- Export `isValidDateString(value: string): boolean` that:
  - returns `true` for empty or whitespace-only strings;
  - requires trimmed non-empty values to match `/^(\d{4})-(\d{2})-(\d{2})$/`;
  - uses `Date.UTC(year, month - 1, day)` plus UTC round-trip checks to reject impossible calendar dates such as `2026-02-30` and non-leap `2026-02-29`.
- Export `isValidTimeString(value: string): boolean` preserving the current `HH:MM`-only behavior and returning `true` for empty/whitespace strings.
- Keep this helper component-scoped for this slice; do not refactor sorting or alerts unless Dev finds a low-risk reason during implementation.
- **Verify**: Helper behavior can be asserted through updated `rowEditing.test.tsx` UI styling tests; no schema/domain imports are required.

### Step 2: Implement shared picker mechanics in DateCell
- In `src/components/cell/DateCell.tsx`, import `useRef` in addition to current React hooks and use the new `isValidDateString` helper.
- Keep the existing visible text input as `type="text"`, `data-testid="date-cell-input"`, same placeholder, draft state, `onInput`/`onChange`, blur commit, Enter commit, Escape reset, and trim-to-null commit behavior.
- Add refs for the visible text input and hidden/native picker input.
- Feature-detect picker support during render using the active browser window, for example: `typeof window !== "undefined" && typeof window.HTMLInputElement !== "undefined" && "showPicker" in window.HTMLInputElement.prototype`. Prefer `window.HTMLInputElement` over a global `HTMLInputElement` so JSDOM tests do not require another global shim.
- When supported, render a compact adjacent button with:
  - `type="button"`;
  - `aria-label="Open date picker"`;
  - `title="Open date picker"`;
  - `data-testid="date-cell-picker-button"`;
  - minimal Tailwind styling compatible with the current cell height (`shrink-0`, small padding, muted text, hover/focus states).
- Also render a native picker input with:
  - `type="date"`;
  - `data-testid="date-cell-picker-input"`;
  - `tabIndex={-1}` and `aria-hidden="true"`;
  - visually hidden/offscreen or transparent 1px styling, but not disabled/read-only and not necessarily `display: none`, so `showPicker()` remains eligible in Chromium;
  - `value` set to the trimmed draft only when it is strict-valid, otherwise `""`.
- Use a wrapper such as `<div className="flex w-full items-center gap-1">` so the text input remains the primary space consumer (`flex-1 min-w-0`) and the button is compact. Avoid row-height changes.
- Implement `openPicker()` to:
  - no-op if the picker ref is missing or `showPicker` is unavailable;
  - call `picker.showPicker()` inside the click/key user gesture;
  - catch errors such as unsupported/invalid state and fall back to focusing the visible text input without committing.
- Prevent picker-button clicks from blurring and prematurely committing the visible input by handling `onMouseDown={(event) => event.preventDefault()}` and stopping propagation where appropriate.
- On native picker `change`, set the visible draft to `event.currentTarget.value` when non-empty. Do not call `onCommit` from the picker change handler.
- After opening or after picker change, keep/refocus the visible text input where practical so normal Enter/Escape/blur behavior remains anchored in the canonical editor.
- Extend `onKeyDown` so `Ctrl+ArrowDown` or `Alt+ArrowDown` on the visible text input calls `openPicker()` when supported, with `preventDefault()`.
- **Verify**: Text typing still updates draft; Enter/blur still commit; Escape still resets to the last committed value; selecting a date via the hidden picker changes only the visible draft until Enter/blur.

### Step 3: Implement equivalent picker mechanics in TimeCell
- In `src/components/cell/TimeCell.tsx`, import `useRef` and `isValidTimeString` from the new helper.
- Keep the existing visible text input as `type="text"`, `data-testid="time-cell-input"`, placeholder `HH:MM`, draft state, `onInput`/`onChange`, blur commit, Enter commit, Escape reset, trim-to-null commit behavior, and `HH:MM`-only validation.
- Add the same support detection, button, hidden picker input, `openPicker()`, button `onMouseDown` blur prevention, picker `change` handler, focus handling, and Ctrl/Alt+Down shortcut as DateCell, adjusted for time:
  - button `aria-label`/`title`: `Open time picker`;
  - button `data-testid`: `time-cell-picker-button`;
  - picker input `type="time"`, `data-testid="time-cell-picker-input"`;
  - hidden picker `value` set to trimmed draft only when it is `HH:MM` valid, otherwise `""`;
  - selection writes the native value (`HH:MM`) into draft without committing.
- Keep seconds-level input (`HH:MM:SS`) out of scope. This means typed seconds may still be accepted by sorting/alerts but danger-styled by TimeCell; document this in the complete artifact as an intentionally preserved dispatch-083 scope boundary.
- **Verify**: Time picker selection changes visible draft to `HH:MM` and commit/reset/clear behavior remains unchanged.

### Step 4: Add targeted unit/UI tests
- Update `src/tests/unit/rowEditing.test.tsx` using existing MainPane/JSDOM patterns.
- Add a small test helper if helpful to build an extended block with date/time columns; avoid broad rewrites of existing tests.
- For picker-supported tests, before rendering set a stub on `dom.window.HTMLInputElement.prototype.showPicker` and restore/remove it after the test if needed. The stub can record `this.dataset.testid` or increment a counter. Because implementation should use `window.HTMLInputElement`, patching `dom.window` is sufficient.
- Add or extend tests to cover:
  1. **Date picker button opens native picker**: with `showPicker` stubbed, the date button exists; clicking it calls `showPicker` on the hidden date input.
  2. **Date picker selection updates draft but does not immediately commit**: fire a `change` on `date-cell-picker-input` with `2026-06-06`; assert `date-cell-input.value === "2026-06-06"` while the store cell remains `null`; then blur or press Enter and assert the store value becomes `"2026-06-06"`.
  3. **Time picker selection updates draft and commits only through existing paths**: same as date with `time-cell-picker-input`, `15:45`, and store commit after blur/Enter.
  4. **Escape after picker selection resets without commit**: start from a known committed value or `null`, change the hidden picker value, assert draft changed, press Escape on the visible input, and assert draft reset plus store unchanged.
  5. **Graceful fallback**: without `showPicker` on `dom.window.HTMLInputElement.prototype`, render date/time cells and assert picker buttons are absent while `date-cell-input`/`time-cell-input` still render and typed blur commits still work.
  6. **Strict date validation**: assert lenient strings such as `Jun 1 2026` or `06/01/2026` and impossible dates such as `2026-02-30` add danger styling; assert valid leap/calendar dates such as `2024-02-29` do not.
  7. **Invalid persisted strings remain visible/editable**: initialize a date cell with a persisted invalid string, render, assert the visible input contains that raw string and is danger-styled rather than hidden or coerced.
- Keep existing invalid time styling coverage and existing date/time text-edit commit tests passing.
- **Verify**: Run the targeted test file during development (for example through the project test runner if it supports file selection, otherwise `npm run test`) and include final command results in the complete artifact.

### Step 5: Add or extend integration/storage tests
- Update `src/tests/integration/rowCellEditing.integration.test.ts` to make the storage contract explicit for normalized picker outputs.
- It is acceptable for this integration test to call `updateDateCellValue(..., "2026-06-06")` and `updateTimeCellValue(..., "15:45")` directly because the integration harness tests store/storage persistence, while unit UI tests prove those values can originate from picker selection.
- Assert after `flushAutosave()` and reload that:
  - date remains `"2026-06-06"`;
  - time remains `"15:45"`;
  - clearing each to `null` persists as `null` after another reload.
- Do not introduce schema version changes or migration expectations.
- **Verify**: Integration test passes with the full test suite.

### Step 6: Preserve data, alert, sorting, search, and clipboard compatibility
- Do not change `src/stores/documentStore.ts`, `src/services/storage/storageSchemas.ts`, `src/domain/sorting/compareValues.ts`, `src/domain/alerts/evaluateRow.ts`, `src/domain/search/searchDocuments.ts`, `src/domain/clipboard/rowClipboardTypes.ts`, or `src/types/row.ts` unless implementation reveals a concrete issue. Current reconnaissance shows these already accept the dispatch-083 contract.
- If Dev chooses optional sorting/alert tests, keep them additive and focused on picker-normalized strings; do not change domain parsing behavior.
- **Verify**: Full `npm run test` covers existing compatibility tests plus the new targeted tests.

### Step 7: Complete artifact and handoff requirements for Dev
- Create `agents/artifacts/083-date-time-picker-implementation-complete.md` after implementation.
- In the complete artifact, include:
  - summary of picker affordances and strict date validation;
  - exact files changed;
  - any deviations from this plan;
  - note that storage/schema remains unchanged;
  - note that TimeCell remains `HH:MM`-only and seconds support remains out of scope;
  - verification results using the `agents/CLOSING.md` command-reporting format.
- Create exactly one next channel message: `agents/channels/083-date-time-picker-implementation/messages/003-dev-to-review.md` with `State = ready-for-review`.
- Append a concise session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git after Review passes.

## Data / Storage / Schema Changes
None. Date and time cells must continue to persist through `NullableTextCellPayload` as `string | null`. Picker-selected values are normalized strings (`YYYY-MM-DD` for date, `HH:MM` for time) that existing sorting, alerts, search, clipboard, autosave, undo/redo, and storage code already accept.

## UI Specifications
- Date and time cells remain visible text inputs and retain their existing placeholders (`YYYY-MM-DD`, `HH:MM`).
- When native picker support is detected, each cell shows a compact adjacent button:
  - date: calendar affordance, `aria-label="Open date picker"`, `data-testid="date-cell-picker-button"`;
  - time: clock affordance, `aria-label="Open time picker"`, `data-testid="time-cell-picker-button"`.
- Use simple text glyphs/icons or existing CSS only; do not add icon dependencies.
- Hidden native picker inputs are implementation details and should not replace or obscure the visible text input.
- Interactions:
  - typing edits the visible draft as before;
  - picker button or Ctrl/Alt+Down opens native picker when available;
  - picker selection writes normalized draft only;
  - Enter or blur commits;
  - Escape resets to the last committed value and does not commit;
  - empty or whitespace-only draft commits `null`;
  - if `showPicker()` is unavailable, no picker button is shown and text editing remains fully functional.
- Styling:
  - invalid non-empty date drafts are danger-styled only unless strict `YYYY-MM-DD` plus calendar validity passes;
  - invalid non-empty time drafts remain danger-styled unless `HH:MM` range validation passes;
  - the new button must be compact enough to avoid row-height or broad layout changes.

## Assumptions / Hypotheses
- Hypothesis to confirm during implementation: Chromium/Tauri will allow `showPicker()` on an offscreen/visually hidden but enabled native date/time input when called from a button click or keydown user gesture. If Chromium rejects a particular hiding technique, adjust the hidden input styling to remain eligible while still keeping the visible text input canonical.
- Assumption: JSDOM lacks native `showPicker()` by default, so tests should explicitly patch `dom.window.HTMLInputElement.prototype.showPicker` for supported-picker scenarios and leave it absent for fallback scenarios.

## Acceptance Criteria
- [ ] DateCell keeps a visible text input and exposes a compact calendar affordance only when native `showPicker()` support is available.
- [ ] TimeCell keeps a visible text input and exposes a compact clock affordance only when native `showPicker()` support is available.
- [ ] Clicking the picker button or pressing Ctrl/Alt+Down calls native `showPicker()` when supported and gracefully no-ops/falls back when unavailable.
- [ ] Picker selection writes normalized draft text (`YYYY-MM-DD` or `HH:MM`) without immediately updating the store/persisted value.
- [ ] Blur/Enter commit, Escape reset, and empty/whitespace-to-`null` behavior continue to work for typed and picker-selected drafts.
- [ ] DateCell validation is strict `YYYY-MM-DD` plus calendar-validity; lenient JavaScript date strings and impossible dates are danger-styled.
- [ ] Existing invalid persisted date strings remain visible/editable and are not coerced or hidden.
- [ ] TimeCell validation remains `HH:MM`-only for this slice; the seconds gap with sorting/alerts is documented in the complete artifact.
- [ ] No storage schema, migration, or persisted payload contract change is introduced.
- [ ] Targeted unit/UI tests cover date/time picker selection, no-immediate-commit semantics, strict date validation, Escape/reset behavior, and graceful fallback.
- [ ] Integration/storage tests cover picker-normalized strings and clear-to-null persistence compatibility.
- [ ] Dev reports verification using the project format for at least: targeted tests, `npm run test`, `npm run lint`, `npm run build`, and `npm run test:e2e` when Playwright browsers are available (or a clear environment blocker if unavailable).

## Estimated Complexity
- Medium.
- Expected product/test file count: 5 required files, plus up to 2 optional test files if Dev adds explicit sorting/alert coverage.
