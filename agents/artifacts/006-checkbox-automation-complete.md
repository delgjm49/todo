# Complete: TICKET-045 Checkbox Automation Behavior

## Summary
Implemented checkbox automation behavior for completion rendering and optional move-checked-to-bottom ordering.

## Changes
- Added `src/domain/rows/applyCheckboxRules.ts` with pure helpers for:
  - detecting completion from strikeout-enabled checked checkbox columns
  - checking all enabled checkbox columns for completed-row rendering
  - grouping unchecked rows before checked rows for the toggled checkbox column when auto-move is enabled
- Updated `documentStore.toggleCheckboxCellValue` to apply checkbox auto-move after toggling while preserving existing guards, history kind, autosave flow, row ids, and cell payloads.
- Updated `RowView` to mark completed rows with `data-completed="true"` and apply restrained line-through decoration to cells without reducing opacity.
- Added `src/tests/unit/checkboxAutomation.test.ts` for helper behavior, grouping, stable relative order, payload preservation, and multi-checkbox semantics.
- Added focused document store coverage for disabled auto-move, enabled toggle/toggle-back ordering, and use of only the toggled checkbox column.
- Added row UI coverage for completed-row rendering markers/classes.

## Notes
- No storage schema changes were made.
- Sorting UI, alert suppression, richer inspector settings, and broad rendering refactors remain out of scope.
- Auto-move preserves current display-order stability within unchecked and checked groups; it does not track a pre-completion original row slot.

## Verification
- `npm run typecheck` — PASS
- `npm run test` — PASS (148/148 tests; existing React act warnings still print)
- `npm run build` — PASS
- `npm run lint` — PASS
