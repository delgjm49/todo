# Dispatch: Date/Time Picker Implementation

## What
Implement the narrow date/time picker slice recommended by dispatch 082. Date and time cells should keep their existing visible text inputs as the canonical editors while gaining compact native picker affordances that write normalized draft values and preserve the existing persisted `string | null` storage contract.

## Why
Dispatch 082 completed a grounded planning/audit pass and identified a low-risk usability improvement: add picker assistance without hiding or migrating existing raw date/time strings. It also found a DateCell validation mismatch where `new Date()` accepts values that sorting and alerts treat as empty; this implementation should align DateCell validation with the strict `YYYY-MM-DD` contract already used by alerts/sorting.

## Scope
- Implement the dispatch 082 recommendation for date/time cells:
  - keep the visible text input as the primary/canonical editor;
  - add a compact calendar affordance for date cells and clock affordance for time cells;
  - use native picker behavior via `HTMLInputElement.showPicker()` when available;
  - gracefully degrade when `showPicker()` is unavailable so text editing still works.
- Picker-selected values update the visible draft as normalized strings:
  - date: `YYYY-MM-DD`;
  - time: `HH:MM`.
- Preserve current commit/cancel semantics:
  - blur/Enter commits;
  - Escape resets to the last committed value and does not commit;
  - empty/whitespace draft commits `null`;
  - typed editing remains available.
- Tighten DateCell validation to strict calendar-valid `YYYY-MM-DD`, matching sorting and alert evaluation semantics.
- Keep TimeCell validation `HH:MM` for this first slice; document the existing seconds gap rather than expanding scope.
- Preserve compatibility with storage, autosave/history, alerts, sorting, search, clipboard, and existing tests.
- Add targeted tests for picker behavior and strict date validation.

**Out of scope:**
- Storage schema/version changes or migrations.
- Replacing visible text inputs with native-only date/time inputs.
- Recurring dates, natural-language parsing, timezone scheduling changes, seconds-level time picker UX, closed-app notifications, or calendar integrations.
- Broad layout/theming changes beyond fitting the small picker affordance.

## Related Spec Sections
- `agents/artifacts/082-richer-date-time-picker-planning-complete.md` — authoritative implementation recommendation
- `agents/artifacts/082-richer-date-time-picker-planning-review.md` — Review PASS of the recommendation
- Likely files/tests:
  - `src/components/cell/DateCell.tsx`
  - `src/components/cell/TimeCell.tsx`
  - optional helper: `src/components/cell/date-time-validation.ts`
  - `src/tests/unit/rowEditing.test.tsx`
  - `src/tests/integration/rowCellEditing.integration.test.ts`
  - optional compatibility tests in `blockRowSorting`, `alertEvaluation`, `searchDocuments`, and `rowClipboard`

## Constraints
- Route through Plan first. Plan should use dispatch 082 complete/review artifacts as the primary scope source and verify current code before prescribing implementation details.
- Do not change the persisted cell contract: date/time values remain `string | null` in `NullableTextCellPayload`.
- Do not add a dependency unless Plan proves native/in-repo controls cannot satisfy this narrow slice.
- Avoid duplicate commits from picker selection plus blur; picker selection should update draft, and existing commit paths should commit.
- Main handles final close/commit/push; queue mode is pre-authorized for auto-close and auto-advance after Review passes.

## Acceptance Criteria
- [ ] DateCell exposes a compact calendar affordance when native picker support is available, while text editing still works when unavailable.
- [ ] TimeCell exposes a compact clock affordance when native picker support is available, while text editing still works when unavailable.
- [ ] Picker selection writes a normalized draft (`YYYY-MM-DD` or `HH:MM`) without immediately changing the persisted/store value until blur/Enter commit.
- [ ] Blur/Enter commit, Escape reset, and empty-draft-to-`null` behavior continue to work.
- [ ] DateCell validation is strict `YYYY-MM-DD` with calendar validity; invalid persisted strings remain visible/editable with danger styling.
- [ ] No storage schema migration or persisted contract change is introduced.
- [ ] Targeted tests cover picker selection, graceful fallback if practical, commit/cancel/clear behavior, strict date validation, and persistence compatibility.
- [ ] Standard verification passes: `npm run test`, `npm run lint`, and `npm run build`; run `npm run test:e2e` when Playwright browsers are available.
