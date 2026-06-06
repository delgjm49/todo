# Plan: Richer Date/Time Picker Planning

## Overview
This dispatch is a planning/audit handoff, not product implementation. Dev should produce a reviewed complete artifact that recommends a narrow dispatch 083 date/time picker UX, confirms storage-contract preservation, and identifies concrete implementation files, tests, risks, and acceptance criteria.

The preliminary recommended implementation slice to validate is: keep date/time cell values as editable text drafts for compatibility, add a lightweight picker affordance for valid date/time selection, and normalize picker-selected values to the existing `string | null` contract without schema migration.

## Verified Current-State Facts
- `src/components/cell/DateCell.tsx` currently renders a `type="text"` input with `data-testid="date-cell-input"`, local `draft` state synced from `value`, commit on blur or Enter, Escape reset to the last committed value, trim-to-`null` clearing, and visual invalid styling. Its validation uses `new Date(value)`, which is more permissive than the strict date parsing used elsewhere.
- `src/components/cell/TimeCell.tsx` currently renders a `type="text"` input with `data-testid="time-cell-input"`, the same commit/reset/clear pattern, and `HH:MM` regex validation only.
- `src/components/cell/CellRenderer.tsx` passes date/time cells as `string | null` into `DateCell`/`TimeCell`; non-string cell values are treated as `null` for these renderers.
- `src/components/row/RowView.tsx` wires date/time commits directly to `useDocumentStore().updateDateCellValue` and `updateTimeCellValue` for the active workspace/block/row/column.
- `src/stores/documentStore.ts` `updateDateCellValue` and `updateTimeCellValue` only update matching `date`/`time` columns, write the provided `string | null`, commit a `typing` snapshot, schedule autosave through `commitSnapshot`, and queue immediate alert re-evaluation for the workspace.
- `src/types/row.ts`, `src/types/column.ts`, `src/domain/rows/createRow.ts`, and `src/services/storage/storageSchemas.ts` define date/time cells as nullable text payloads: default `value: null`, persisted `value` accepted as `string | null`, and invalid non-string persisted values coerced to `null`. Date/time column settings currently only include `alertsEnabled`.
- `src/domain/sorting/compareValues.ts` sorts date cells only when values match strict calendar-valid `YYYY-MM-DD`; invalid, empty, null, or missing dates sort as empty. It sorts time cells when values match `HH:MM` or `HH:MM:SS` with valid ranges; invalid/empty values sort as empty.
- `src/domain/alerts/evaluateRow.ts` evaluates alert-enabled date columns only for strict `YYYY-MM-DD` values, due at 09:00 local time, and time columns for `HH:MM` or optional seconds due on the current local day. Invalid/null/missing values do not alert, and checked checkbox cells suppress alerts.
- `src/domain/search/searchDocuments.ts` includes non-empty raw string date/time values in search results; it does not parse or normalize them.
- `src/domain/clipboard/rowClipboardTypes.ts` accepts date/time cells as `string | null` in the same nullable text path as dropdown cells; clipboard mapping preserves compatible values and fills target defaults.
- `src/tests/unit/rowEditing.test.tsx` already verifies date/time inputs render, commit on input+blur, and show danger styling for invalid date/time drafts. The tests query existing `date-cell-input` and `time-cell-input` test ids.
- `src/tests/integration/rowCellEditing.integration.test.ts` verifies date/time/dropdown cell values persist across reload and clear back to `null`.
- `src/tests/unit/blockRowSorting.test.ts`, `src/tests/unit/alertEvaluation.test.ts`, `src/tests/unit/searchDocuments.test.ts`, and `src/tests/unit/rowClipboard.test.ts` cover current sorting, alert, search, and clipboard interactions with date/time values.
- `package.json` has no date-picker/date-formatting dependency; adding one would be a new dependency decision. A native or small in-repo control is lower risk for the narrow dispatch 083 slice.

## Prerequisites
- Dev must not implement product code in dispatch 082. Source/test files should be read for audit only.
- Dev must write the planning/audit result to `agents/artifacts/082-richer-date-time-picker-planning-complete.md` and hand off to Review.
- If Dev finds that the current source contradicts any verified fact above in a scope-affecting way, route to Main rather than guessing.

## Files to Create/Modify

### Dispatch 082 files
| Action | Path | Description |
|--------|------|-------------|
| Create | `agents/artifacts/082-richer-date-time-picker-planning-complete.md` | Dev's planning/audit complete artifact with recommendation for dispatch 083. |
| Append | `docs/SESSIONS_PENDING.md` | Dev session entry at close. |
| Create | `agents/channels/082-richer-date-time-picker-planning/messages/003-dev-to-review.md` | Dev handoff to Review with `State = ready-for-review`. |

### Likely dispatch 083 implementation files to evaluate and recommend
| Action | Path | Description |
|--------|------|-------------|
| Modify | `src/components/cell/DateCell.tsx` | Add the selected date-picker UX while preserving text fallback, commit/cancel/clear semantics, and `string | null` output. |
| Modify | `src/components/cell/TimeCell.tsx` | Add the selected time-picker UX while preserving text fallback, commit/cancel/clear semantics, and `string | null` output. |
| Create or Modify | `src/components/cell/date-time-validation.ts` | Optional shared strict date/time validation/normalization helpers if Dev recommends centralizing behavior. |
| Modify | `src/tests/unit/rowEditing.test.tsx` | Component coverage for open/pick/commit/cancel/clear/invalid/focus behavior. |
| Modify | `src/tests/integration/rowCellEditing.integration.test.ts` | Persist/reload coverage for picker-selected date/time values and clearing. |
| Modify | `src/tests/unit/blockRowSorting.test.ts` | Add or confirm compatibility coverage for picker-normalized date/time values. |
| Modify | `src/tests/unit/alertEvaluation.test.ts` | Add or confirm compatibility coverage for picker-normalized date/time values. |
| Modify | `src/tests/unit/searchDocuments.test.ts` | Add or confirm date/time values selected through picker remain searchable as raw strings. |
| Modify | `src/tests/unit/rowClipboard.test.ts` | Add or confirm clipboard round-trip preserves picker-selected date/time strings. |

## Implementation Steps

### Step 1: Reconfirm the current date/time edit contract
- Re-read the current source and tests listed in `messages/001-main-to-plan.md`, prioritizing the date/time cell components, store actions, storage schema, sorting, alerts, search, clipboard, and current row-editing tests.
- Document the currently observed open/edit/commit/cancel/clear/invalid behavior in the complete artifact.
- **Verify**: The complete artifact cites the exact files/functions/tests read and does not rely only on this plan summary.

### Step 2: Define the dispatch 083 UX recommendation
- Define a narrow UX with these required interaction decisions:
  - how the picker opens from a cell;
  - how users can still type or inspect the raw string value;
  - what happens on picker selection;
  - Enter commit behavior;
  - Escape cancel/reset behavior;
  - blur behavior;
  - clearing to `null`;
  - invalid string display and recovery;
  - keyboard and mouse focus handling.
- Recommended direction to validate: retain the existing text input as the canonical visible editor, add a small adjacent picker button/input affordance for valid selection, and write selected dates as `YYYY-MM-DD` and selected times as `HH:MM`. This avoids losing display/edit access to already persisted invalid strings that native `type="date"` or `type="time"` inputs may not render.
- If Dev instead recommends replacing the visible inputs with native `type="date"`/`type="time"`, the complete artifact must explicitly address how invalid-but-persisted strings remain visible/recoverable.
- **Verify**: The recommendation covers open, edit, commit, cancel, clear, invalid-value, keyboard, mouse, blur, and focus behavior.

### Step 3: Preserve the storage and domain contracts
- State explicitly that dispatch 083 should keep persisted date/time cell values as `string | null`; no schema version change or migration should be needed.
- Define the exact normalized strings produced by picker actions. Recommendation: date picker writes `YYYY-MM-DD`; time picker writes `HH:MM` for the first slice.
- Identify any existing inconsistency Dev thinks dispatch 083 should address, especially:
  - DateCell's lenient `new Date(value)` validation vs strict sorting/alert date parsing;
  - TimeCell's `HH:MM` validation vs sorting/alerts accepting optional seconds.
- Keep any validation alignment narrow and UI-local unless Dev can justify a shared helper without schema impact.
- **Verify**: The complete artifact states that alerts, sorting, search, clipboard, autosave, undo/redo/history, and storage continue to receive `string | null` values.

### Step 4: Specify dispatch 083 files, tests, and verification gates
- Produce a concrete file list for dispatch 083, distinguishing required modifications from optional helper extraction.
- Specify targeted tests for:
  - DateCell and TimeCell picker selection commits;
  - typed edits still commit on blur/Enter;
  - Escape resets without committing;
  - clear action commits `null`;
  - invalid existing strings remain visible and styled/recoverable;
  - picker-normalized values remain compatible with persistence, sorting, alerts, search, and clipboard.
- Include standard verification commands for the future implementation dispatch:
  - `npm run test`
  - `npm run lint`
  - `npm run build`
  - `npm run test:e2e` when Playwright browsers are available.
- **Verify**: The complete artifact has acceptance criteria that a future Plan/Dev/Review cycle can execute without needing to rediscover basic scope.

### Step 5: Record risks and non-goals
- Include risks around native picker browser behavior, invalid persisted strings, focus/blur double-commit, timezone/date parsing, and alert semantics.
- Keep out of scope: recurring dates, natural-language parsing, timezone scheduling changes, closed-app notifications, calendar integrations, storage migrations, and broader alert expansion.
- **Verify**: The complete artifact marks each risk with a mitigation or deferral recommendation.

## Data / Storage / Schema Changes
None for dispatch 082.

For dispatch 083, the recommended outcome is also no schema change: date/time cells continue to persist `string | null` values in the existing nullable text payload shape. Picker-selected values should be formatted to strings that existing sorting and alert logic already understands (`YYYY-MM-DD` for dates and `HH:MM` for times). Clearing remains `null`.

## UI Specifications
Dispatch 082 should not change UI. Dev should define the future dispatch 083 UI in the complete artifact.

Preliminary UI recommendation for Dev to validate:
- Keep a visible text field in date/time cells so users can see and repair any existing invalid string.
- Add a compact picker affordance inside the cell, such as a small calendar/clock button or integrated native picker control, without changing row height or the broader grid layout.
- Picker selection updates the draft and commits the normalized string deliberately; avoid duplicate commits from selection plus blur.
- Empty draft or explicit clear commits `null`.
- Invalid non-empty drafts remain visible with danger styling and are not silently coerced during typing.
- Escape resets the draft and closes/dismisses any picker affordance without committing.
- Focus should remain predictable: opening the picker should not select the row unexpectedly beyond current cell selection, and closing should leave the user in or near the edited cell.

## Assumptions / Hypotheses
- Hypothesis: Chromium/Tauri on Windows supports enough native date/time picker behavior to use a small native affordance if paired with the existing text fallback. Dev should verify browser behavior conceptually from current platform constraints before recommending exact implementation details.
- Assumption: No new dependency is needed for dispatch 083; if Dev recommends a dependency, it must explain why native/in-repo controls are insufficient for the narrow slice.
- Assumption: Seconds-level time input can remain out of scope for dispatch 083 because current `TimeCell` validation and placeholder are `HH:MM`, even though sorting/alerts tolerate `HH:MM:SS`.

## Acceptance Criteria
- [ ] Dev produces `agents/artifacts/082-richer-date-time-picker-planning-complete.md` with a grounded audit and recommended dispatch 083 scope.
- [ ] The complete artifact defines picker open/edit, commit, cancel/Escape, blur, clear, invalid-value, focus, keyboard, and mouse behavior.
- [ ] The complete artifact preserves the existing persisted date/time `string | null` contract and states whether any schema migration is needed. Expected answer: none.
- [ ] The complete artifact identifies likely implementation files, test files, risks, mitigations, and acceptance criteria for dispatch 083.
- [ ] No product source or product test implementation is performed in dispatch 082.
- [ ] The handoff to Review is via exactly one `003-dev-to-review.md` message using `State = ready-for-review`.

## Estimated Complexity
- Dispatch 082 planning/audit: Small/Medium; expected artifact/session/channel-file changes only.
- Future dispatch 083 implementation: Medium; likely 2 cell components plus 4-6 test files, with optional shared validation helper.
