# Complete: Richer Date/Time Picker Planning

## Summary
This is a planning/audit dispatch, not product implementation. Dev conducted a thorough audit of the current date/time cell editing components, storage contracts, sorting, alerts, search, clipboard, and tests. No product source was changed. This artifact recommends a narrow dispatch 083 implementation slice that adds a compact native picker affordance alongside the existing text inputs while preserving the `string | null` storage contract, avoiding schema migration, and drawing concrete boundaries around scope, risks, and verification gates.

## Files Changed
| Action | Path | Notes |
|--------|------|-------|
| Create | `agents/artifacts/082-richer-date-time-picker-planning-complete.md` | This planning/audit complete artifact. |
| (none — no product source modified) | — | Dispatch 082 is audit-only per plan. |

## Deviations from Plan
None. The plan's steps were followed in order; all verified facts from the plan confirmed accurate. No product code was changed.

## Verified Current-State Facts (Reconfirmed from Disk)

All facts listed in the plan's `## Verified Current-State Facts` section were re-read from current disk state and confirmed:

- **DateCell** (`src/components/cell/DateCell.tsx`): `type="text"` input, `data-testid="date-cell-input"`, local `draft` state, commit on blur/Enter, Escape reset, trim-to-null clearing, danger styling for invalid drafts. Validation uses lenient `new Date(value)` check — accepts any JS-parseable date string (e.g., "Jun 1 2026", "06/01/2026"), not only `YYYY-MM-DD`.
- **TimeCell** (`src/components/cell/TimeCell.tsx`): `type="text"` input, `data-testid="time-cell-input"`, same commit/reset/clear/escape pattern. Validation uses strict `HH:MM` regex only (`/^([01]\d|2[0-3]):([0-5]\d)$/`).
- **CellRenderer** (`src/components/cell/CellRenderer.tsx`): Coerces date/time cell values to `string | null`; non-string values become `null`. A dead-code `<span>` fallback exists for non-string values in unknown column types (unreachable for date/time).
- **RowView** (`src/components/row/RowView.tsx`): Wires date/time commit callbacks to `useDocumentStore().updateDateCellValue` and `updateTimeCellValue`.
- **documentStore** (`src/stores/documentStore.ts`): `updateDateCellValue` and `updateTimeCellValue` update the matching date/time cell value (`string | null`), commit a `"typing"` snapshot, and queue alert re-evaluation for the workspace via `queueMicrotask`.
- **storageSchemas** (`src/services/storage/storageSchemas.ts`): Date/time cells use `NullableTextCellPayload` (`value: string | null`). `normalizeCellValue` coerces non-string non-null values to `null`. Default cell value is `null`.
- **createRow** (`src/domain/rows/createRow.ts`): Date/time cells default to `{ value: null, format: {} }`.
- **Types** (`src/types/column.ts`, `src/types/row.ts`): `DateColumnSettings` and `TimeColumnSettings` contain only `alertsEnabled: boolean`. Both use `NullableTextCellPayload` (shared with dropdown).
- **Sorting** (`src/domain/sorting/compareValues.ts`): Dates sorted only when matching strict `YYYY-MM-DD` with calendar-validity check; invalid/empty sort as empty. Times sorted for `HH:MM` or `HH:MM:SS` with range validation; invalid sort as empty.
- **Alerts** (`src/domain/alerts/evaluateRow.ts`): Dates due at 09:00 local time, strict `YYYY-MM-DD` + calendar validity. Times due on current local day, `HH:MM` or `HH:MM:SS` + range validation. Invalid/null → no alert. Checkbox suppression works.
- **Search** (`src/domain/search/searchDocuments.ts`): Date/time included in searchable types; searches raw string value case-insensitively via substring match. No parsing.
- **Clipboard** (`src/domain/clipboard/rowClipboardTypes.ts`): `normalizeCellForColumnType` accepts date/time cells as `string | null`. Internal payload carries `PersistedCell` (which is `NullableTextCellPayload` for date/time).
- **Tests** all confirmed: `rowEditing.test.tsx` (date/time input rendering, commit, danger styling), `rowCellEditing.integration.test.ts` (persist/reload date/time values), `blockRowSorting.test.ts` (date/time sort with edge cases), `alertEvaluation.test.ts` (comprehensive alert evaluation), `searchDocuments.test.ts` (date/time string searching), `rowClipboard.test.ts` (clipboard date handling).

### Inconsistency Identified

| Area | DateCell validation | TimeCell validation | Sorting + Alerts expectation |
|------|-------------------|---------------------|------------------------------|
| **Dates** | Lenient: `new Date(value)` accepts "Jun 1 2026", "06/01/2026" | N/A | Strict: `YYYY-MM-DD` only (invalid → empty/no-alert) |
| **Times** | N/A | Strict: `HH:MM` only | Accepts `HH:MM` or `HH:MM:SS` |

Users can type a lenient date like "Jun 1 2026" into DateCell, see it as valid (no danger styling), and commit it — but sorting and alerts will treat it as empty. This inconsistency pre-dates dispatch 082 and is a UX hazard that dispatch 083 should address by using strict validation in DateCell matching the sorting/alert contract.

---

## Dispatch 083 Implementation Recommendation

### Core Strategy
**Retain the existing text `<input>` as the primary visible editor and add a compact native picker affordance as a complement.** Do NOT replace the text input with native `type="date"` or `type="time"` inputs.

Rationale:
- The text input preserves visibility/edit access to all persisted strings, including currently-invalid ones.
- Native `type="date"`/`type="time"` inputs in Chromium/Tauri render empty for non-standard values, hiding user data.
- The existing commit/cancel/clear/Escape/blur semantics are battle-tested and should remain the control flow.

### Picker UX Definition (Dispatch 083 Scope)

#### 1. Opening the picker
- A small icon button (calendar for dates, clock for times) is placed adjacent to the text input inside the cell.
- Clicking/tapping the icon opens a native date/time picker via Chromium's `HTMLInputElement.showPicker()` on a hidden `<input type="date">` or `<input type="time">` element.
- Keyboard: `Ctrl+Down` or `Alt+Down` when focused on the date/time text input opens the picker (standard platform convention). The picker can also be opened via the icon button.

#### 2. Picker selection behavior
- When the user selects a value from the native picker, the normalized string is written into the **draft** (visible text input): `YYYY-MM-DD` for dates, `HH:MM` for times.
- The draft is **not auto-committed**. The user must still commit via Enter or blur, consistent with current behavior and preventing duplicate commits.
- The picker closes after selection (native behavior).

#### 3. Commit behavior (unchanged from current)
- **Blur**: Commits the current draft (normalized string from picker, or any typed value). If draft differs from last committed value, `onCommit(draft)` fires.
- **Enter**: Commits and keeps focus in the cell.
- **Escape**: Resets draft to last committed `value`, closes any open picker, does not commit.

#### 4. Cancel / Escape behavior
- **Escape** resets the draft to the last committed value and dismisses the picker (if open). No commit occurs.

#### 5. Clearing to null
- **Empty or whitespace-only draft + blur/Enter** commits `null` (same as current — the `trimmed || null` logic).

#### 6. Invalid values
- During typing, if the draft value does not match the strict validation format (`YYYY-MM-DD` for dates, `HH:MM` for times), danger styling is applied (same as current).
- Invalid drafts can still be committed — they will be stored as the raw string and become visible/sortable as empty. This preserves backward compatibility with any existing invalid data.
- Picker selection guarantees a valid-format string, so picker-chosen values never produce danger styling.

#### 7. Keyboard behavior
| Key | Action |
|-----|--------|
| `Enter` | Commit draft |
| `Escape` | Reset draft to committed value; close picker |
| `Tab` | Blur → commit, move to next cell |
| `Ctrl+Down` / `Alt+Down` | Open native picker |
| Any text key | Edit text draft (as current) |

#### 8. Mouse behavior
- Click on text input: Edit text draft (as current).
- Click on calendar/clock icon: Open native picker.
- Click outside cell (blur): Commit draft.
- Right-click: Context menu (as current).

#### 9. Focus handling
- Opening the picker does not change the row selection or cell selection state.
- Closing the picker returns focus to the text input within the same cell.
- No unexpected row re-selection or scroll jumps.

### Inconsistency Fix for Dispatch 083

The **DateCell validation** should be tightened to match the strict `YYYY-MM-DD` parsing used by sorting and alerts. The current lenient `new Date(value)` check allows committing values that sorting and alerts will treat as empty — this is a silent data-quality trap.

Recommendation for dispatch 083:
- Replace `isValidDateString` in DateCell with a strict check: `YYYY-MM-DD` regex + calendar validity (leap years, month ranges).
- Use the same logic already in `compareValues.ts` `normalizeDateValue` and `evaluateRow.ts` `parseDateDueTime`.
- This means "Jun 1 2026" will show danger styling in the editor, prompting the user to use the picker or type the correct format.
- Already-persisted invalid strings remain visible and editable (they just show danger styling).

TimeCell validation is already strict `HH:MM`; optionally extend to also accept `HH:MM:SS` for harmony with sorting/alerts (which already accept seconds), or keep `HH:MM`-only for now and note the gap. Recommendation: keep `HH:MM`-only for the first slice to match the current TimeCell placeholder and scope; seconds acceptance can be a separate follow-up if needed.

### Storage Contract Preservation

**No schema migration is required.** Dispatch 083 will continue to persist date/time cells as `string | null` via `NullableTextCellPayload`. Picker-selected values are formatted as `YYYY-MM-DD` (dates) and `HH:MM` (times) — strings that existing sorting and alert logic already understand.

All downstream consumers receive the same `string | null` contract:
- **Alerts**: `evaluateRow` already parses `YYYY-MM-DD` strictly → picker values produce correct alerts.
- **Sorting**: `compareValues` already parses `YYYY-MM-DD` and `HH:MM` strictly → picker values sort correctly.
- **Search**: `searchDocuments` does substring matching on raw strings → picker values are searchable as-is.
- **Clipboard**: `normalizeCellForColumnType` accepts `string | null` → picker values survive round-trip.
- **Autosave/Undo/Redo/History**: All work through `commitSnapshot` with the same value contract → no change.

---

## Dispatch 083 File List

### Required modifications
| Action | Path | Description |
|--------|------|-------------|
| Modify | `src/components/cell/DateCell.tsx` | Add calendar icon button, hidden `<input type="date">` for `showPicker()`, tighten validation to strict `YYYY-MM-DD`, wire picker selection to draft. |
| Modify | `src/components/cell/TimeCell.tsx` | Add clock icon button, hidden `<input type="time">` for `showPicker()`, wire picker selection to draft. |
| Modify | `src/tests/unit/rowEditing.test.tsx` | Add tests: picker opens on icon click, selection writes normalized draft, commit after picker selection, Escape resets after picker use, danger styling on strict invalid dates, existing invalid strings still visible. |
| Modify | `src/tests/integration/rowCellEditing.integration.test.ts` | Add tests: picker-selected date/time values persist across reload, picker-selected values survive clear-then-reload. |

### Optional modifications
| Action | Path | Description |
|--------|------|-------------|
| Create | `src/components/cell/date-time-validation.ts` | Optional shared strict validation helper if Dev extracts the `YYYY-MM-DD` + calendar-validity logic common to DateCell, sorting, and alerts. Keeps validation DRY but is not strictly required for the narrow slice. |
| Modify | `src/tests/unit/blockRowSorting.test.ts` | Optional: add explicit coverage that picker-normalized `YYYY-MM-DD` and `HH:MM` sort correctly (already mostly covered, but making it explicit is low-risk). |
| Modify | `src/tests/unit/alertEvaluation.test.ts` | Optional: add explicit coverage that picker-normalized values trigger alerts (already covered, but extending the edge-case table is low-risk). |
| Modify | `src/tests/unit/searchDocuments.test.ts` | Optional: confirm picker-selected values are searchable (already covered by existing substring tests). |
| Modify | `src/tests/unit/rowClipboard.test.ts` | Optional: confirm clipboard round-trip preserves picker-selected dates (already covered). |

### No changes needed
| Path | Reason |
|------|--------|
| `src/stores/documentStore.ts` | `updateDateCellValue`/`updateTimeCellValue` already accept `string \| null` — no change. |
| `src/services/storage/storageSchemas.ts` | `NullableTextCellPayload` contract unchanged. |
| `src/domain/sorting/compareValues.ts` | Already handles `YYYY-MM-DD` and `HH:MM` correctly. |
| `src/domain/alerts/evaluateRow.ts` | Already handles `YYYY-MM-DD` and `HH:MM` correctly. |
| `src/domain/search/searchDocuments.ts` | Raw string search unchanged. |
| `src/domain/clipboard/rowClipboardTypes.ts` | `string \| null` contract unchanged. |
| `src/components/row/RowView.tsx` | Commit wiring unchanged. |
| `src/components/cell/CellRenderer.tsx` | Value pass-through unchanged. |

---

## Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| **`showPicker()` not available**: `HTMLInputElement.showPicker()` is Chromium 99+; Tauri v2 on Windows uses current Chromium. On older Tauri builds or non-Chromium backends, the picker would silently fail. | Medium | Feature-detect `showPicker` before rendering the icon button; if unavailable, render only the text input (graceful degradation). |
| **Native picker locale formatting**: Native `<input type="date">` may display dates in locale format (e.g., MM/DD/YYYY in US) but the picker's `.value` property always returns `YYYY-MM-DD`. Users may see a mismatch between the picker display and the text input. | Low | The text input always shows `YYYY-MM-DD` / `HH:MM` format; the picker is only a selection aid. Brief inline helper text or placeholder clarifies expected format. |
| **Focus/blur double-commit**: If picker close triggers blur on the text input before the selection `change` event fires, the old draft could be committed instead of the picker value. | Medium | Update the draft state on the picker's `change` event synchronously before the native picker closes. Test the event order in Chromium. |
| **Validation inconsistency**: Tightening DateCell validation to `YYYY-MM-DD` will cause previously-valid-but-lenient values (e.g., "Jun 1 2026") to display danger styling on next edit. | Low | The value is still stored and visible; danger styling merely signals it doesn't match the canonical format. This is a deliberate improvement, not data loss. |
| **Time seconds gap**: TimeCell validates `HH:MM` only but sorting/alerts accept `HH:MM:SS`. A user could type `14:30:15` (valid per alerts/sorting) but see danger styling. | Low | For the narrow dispatch 083 slice, keep `HH:MM` validation. Document the gap. Future slice can unify. |
| **Picker button increases cell width**: Adding an icon button to the cell may require adjusting the min-width or layout. | Low | Use a compact icon (16-18px) with minimal padding; keep the existing text input as the primary space consumer. CSS `gap` should suffice. |
| **Row height change**: If the icon button increases the effective cell height, the grid row height may change. | Low | Size the icon to match the existing text input line-height (~20px); use `flex items-center`. |

---

## Acceptance Criteria for Dispatch 083

- [ ] DateCell has a calendar icon button that opens a native date picker via `showPicker()`.
- [ ] TimeCell has a clock icon button that opens a native time picker via `showPicker()`.
- [ ] Picker selection writes normalized string (`YYYY-MM-DD` / `HH:MM`) into the text input draft without auto-committing.
- [ ] Commit (blur/Enter) after picker selection works as current.
- [ ] Escape resets draft to last committed value and dismisses any open picker.
- [ ] Clear (empty draft + commit) writes `null`.
- [ ] DateCell validation is tightened to strict `YYYY-MM-DD` with calendar validity.
- [ ] TimeCell validation remains `HH:MM`-only (seconds gap documented).
- [ ] Existing invalid persisted strings remain visible and editable (danger-styled).
- [ ] Picker gracefully degrades if `showPicker()` is unavailable (icon hidden, text input works as before).
- [ ] No schema migration; persistence contract unchanged.
- [ ] `npm run test` passes (all existing + new picker tests).
- [ ] `npm run lint` passes.
- [ ] `npm run build` succeeds.
- [ ] `npm run test:e2e` passes (when Playwright browsers available).

---

## Non-Goals (Explicitly Out of Scope for 083)

- Recurring dates, natural-language date parsing, date math.
- Timezone scheduling or UTC offset storage.
- Closed-app notifications or reminder system expansion.
- Calendar integrations (Google, Outlook, iCal).
- Seconds-level time input (defer; `HH:MM` only for first slice).
- Styling/theming overhaul unrelated to picker usability.
- Any schema version change or data migration.
- Changing row height or grid layout.
- Expanding alert evaluation logic or due-time semantics.

---

## Open Questions
None. All scope and boundary decisions documented above.

## Known Issues
None. This dispatch is audit-only; no product work performed.

## Verification

Verification is limited to confirming no product source was changed and that this audit/planning artifact is consistent with current disk state.

- command: `npm run lint`
- shell used: zsh (macOS)
- result: lint passed with no errors
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: N/A
- was this the actual shell provided by the environment: yes

- command: `npm run test`
- shell used: zsh (macOS)
- result: all tests passed (84 tests, 0 failures)
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: N/A
- was this the actual shell provided by the environment: yes

(Note: `npm run build` and `npm run test:e2e` are not required for this audit-only dispatch; they remain for the dispatch 083 implementation cycle.)
