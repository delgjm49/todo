# Dispatch: Type-Specific Inspector Settings (TICKET-046)

## What

Implement inspector controls for column-type-specific settings. When the active selection resolves to a supported column, the inspector should expose settings for checkbox, dropdown, date, and time columns:

- Checkbox columns: `strikeoutRowWhenChecked` and `moveCheckedRowsToBottom` toggles
- Dropdown columns: options editor for the column's allowed values
- Date columns: `alertsEnabled` toggle
- Time columns: `alertsEnabled` toggle

## Why

`TICKET-046` was intentionally skipped while sorting and row clipboard work landed. Its dependencies are now in place: the inspector shell exists, column settings are persisted, column context menus already expose MVP-critical toggles, and checkbox/date/time/dropdown cells are rendered from column definitions. This ticket moves the richer type-specific settings presentation into the inspector where users expect column configuration to live.

## Scope

- Add a type-specific settings section to `InspectorShell`, likely as a focused child component such as `TypeSpecificColumnSettings`.
- Resolve the selected settings target from the current selection and document state:
  - Column selection resolves to that column.
  - Cell selection resolves to the owning column.
  - Block, row, none, stale, or unsupported selections show a quiet explanatory/no-controls state.
- Checkbox controls:
  - Toggle `strikeoutRowWhenChecked`.
  - Toggle `moveCheckedRowsToBottom`.
  - Use existing `documentStore.updateColumnSettings` and preserve existing checkbox automation behavior.
- Dropdown controls:
  - Display the current ordered options list.
  - Support adding, renaming, and removing options.
  - Trim input, prevent empty options, and prevent duplicate option labels.
  - Persist changes through `documentStore.updateColumnSettings` as a new `options` array.
- Date/time controls:
  - Toggle `alertsEnabled` for date and time columns.
  - Keep the existing column context menu alert toggles working as the MVP-critical fallback.
- Add targeted tests for target resolution, setting updates, dropdown option editing behavior, and inspector rendering/empty states.

## Explicitly OUT of Scope

- Alert evaluation or scheduling (`TICKET-053` / `TICKET-054`)
- Dock alert indicators or alert navigation (`TICKET-055` / `TICKET-056`)
- System settings screen work
- Schema/storage migrations beyond using the existing column settings shape
- Rewriting existing cell values when dropdown options are removed or renamed
- New column setting fields beyond the existing `ColumnSettings` contract
- New keyboard shortcuts or broad context menu redesign
- Multi-select or bulk column settings editing

## Related Spec Sections

- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md` TICKET-046
- `docs/TODO_APP_UI_SPEC.md` §Inspector → Type-specific settings
- `docs/TODO_APP_TECH_SPEC.md` §Column settings contract
- `docs/TODO_APP_PLAN.md` column type-specific settings examples

## Constraints

- Use the existing persisted `ColumnSettings` contract from `src/types/column.ts`.
- Route mutations through `documentStore.updateColumnSettings`; do not mutate document state directly.
- Preserve the existing `ColumnContextMenu` settings behavior for checkbox/date/time columns.
- Keep the controls local-first and synchronous; no external APIs.
- Keep dropdown option validation deterministic and simple (trimmed non-empty unique strings).
- Avoid broad inspector layout refactors unrelated to type-specific settings.

## Acceptance Criteria

- [ ] Inspector shows a type-specific settings section for supported column and cell selections.
- [ ] Checkbox column selections can toggle strikeout-on-check and move-checked-to-bottom from the inspector.
- [ ] Date and time column selections can toggle alerts-enabled from the inspector.
- [ ] Dropdown column selections can add, rename, and remove ordered options from the inspector.
- [ ] Dropdown option edits reject or avoid empty/duplicate labels.
- [ ] Dropdown cell controls receive updated option lists after inspector edits.
- [ ] Unsupported selections (none, block, row, stale target, text/bullet/numbered columns) do not crash and show a clear no-controls/guidance state.
- [ ] Setting changes are undoable through the existing document history transaction path.
- [ ] Existing column context menu settings toggles continue to work.
- [ ] Targeted tests cover supported settings updates, dropdown option validation, selection target resolution, and inspector rendering states.
