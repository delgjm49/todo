# Dispatch: TICKET-045 Checkbox Automation Behavior

## What
Implement checkbox automation rules for checklist-style blocks: checked rows can render as completed/struck through, and checked rows can move to the bottom when the owning checkbox column setting enables it.

## Why
Checkbox columns already exist, can be toggled, and expose settings for `strikeoutRowWhenChecked` and `moveCheckedRowsToBottom`. This dispatch makes those MVP behavior toggles real without waiting for richer type-specific inspector settings.

## Scope
- Add focused domain helper(s) for determining whether a row is completed by a checked checkbox column and for applying checkbox-driven row ordering.
- Update checkbox toggle behavior so `moveCheckedRowsToBottom` reorders rows when enabled for the toggled checkbox column.
- Update row/cell rendering so `strikeoutRowWhenChecked` visually marks completed rows without making rows too faint to read.
- Preserve manual row order as much as possible while grouping unchecked rows before checked rows when auto-move is enabled.
- Add focused unit coverage for checked-row detection, auto-move ordering, and store toggle behavior.
- Add or update component tests only if the visual strikeout/row state can be verified cheaply.

## Out of Scope
- Sorting UI or general sort comparators (`TICKET-047`).
- Alert suppression for completed rows.
- Richer inspector/type-specific settings UI (`TICKET-046`) beyond existing checkbox settings controls.
- New persisted schema fields; use existing column settings and row order/cell values.
- Clipboard, hotkeys, packaging, or broad row rendering refactors.

## Related Spec Sections
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md` — `TICKET-045: Implement checkbox automation behavior`
- `docs/TODO_APP_UI_SPEC.md` — Row states / completed row behavior, Checkbox cell behavior
- `docs/TODO_APP_TECH_SPEC.md` — Sorting/testing notes mentioning checkbox rules

## Constraints
- Keep the implementation local and behavior-focused.
- Prefer pure domain helpers under `src/domain/` for row completion/order logic.
- Do not introduce runtime dependencies.
- Do not change storage schema shape.
- Keep history/autosave behavior consistent with existing `toggleCheckboxCellValue` mutations.
- Avoid making completed rows inaccessible; text should remain readable.

## Acceptance Criteria
- [ ] Rows with a checked value in a checkbox column whose `strikeoutRowWhenChecked` setting is enabled render as completed/struck through.
- [ ] Toggling a checkbox whose column has `moveCheckedRowsToBottom` enabled moves checked rows after unchecked rows in that block.
- [ ] Toggling back to unchecked returns the row to the unchecked group without corrupting row ids or cell payloads.
- [ ] If checkbox settings are disabled, existing toggle behavior remains unchanged except for the boolean cell value.
- [ ] Multiple checkbox columns are handled predictably using the toggled column for auto-move and enabled checkbox columns for completed-row rendering.
- [ ] Unit tests cover pure helper behavior and document store toggle/order behavior.
- [ ] Existing verification remains green: typecheck, unit tests, build, and lint.
