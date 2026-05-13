# Implementation Plan: TICKET-045 Checkbox Automation Behavior

## Goal
Make the existing checkbox column settings operational: checked rows can be detected as completed for rendering, and toggling a checkbox column with `moveCheckedRowsToBottom` enabled can regroup rows so unchecked rows display before checked rows while preserving stable row identities and cell payloads.

## Scope
- Add pure domain helpers for checkbox-driven row completion and ordering.
- Integrate `moveCheckedRowsToBottom` into `documentStore.toggleCheckboxCellValue` for the toggled checkbox column only.
- Integrate `strikeoutRowWhenChecked` into row rendering so completed rows are visibly struck through but remain readable.
- Add focused unit coverage for helper behavior and store toggle/reorder behavior.
- Add/update a component test only if it is cheap and stable to verify completed row rendering.

## Out of Scope
- Sorting UI, sort menus, or general comparators (`TICKET-047`).
- Alert suppression for completed rows (`TICKET-053`).
- Richer inspector/type-specific settings UI (`TICKET-046`) beyond existing context-menu settings.
- Persisted schema changes or new column settings fields.
- Broad row/cell rendering refactors, drag/drop changes, clipboard, hotkeys, or packaging.

## Proposed Files
- Create `src/domain/rows/applyCheckboxRules.ts`.
- Create `src/tests/unit/checkboxAutomation.test.ts`.
- Update `src/stores/documentStore.ts`.
- Update `src/components/row/RowView.tsx`.
- Update `src/tests/unit/documentStore.test.ts`.
- Optionally update `src/tests/unit/rowEditing.test.tsx` if rendering verification is straightforward.

## Domain Helper API Shape
Implement a pure helper module under `src/domain/rows/applyCheckboxRules.ts` using type-only imports from `Block`, `ColumnDefinition`, and `Row`.

Suggested exports:

```ts
export function isCheckboxColumnCompleted(column: ColumnDefinition, row: Row): boolean;

export function isRowCompletedByCheckbox(columns: ColumnDefinition[], row: Row): boolean;

export function applyCheckboxAutoMove(
  rows: Row[],
  columns: ColumnDefinition[],
  toggledColumnId: ColumnId
): Row[];
```

Expected semantics:
- `isCheckboxColumnCompleted` returns true only when:
  - `column.type === "checkbox"`,
  - `column.settings.strikeoutRowWhenChecked === true`, and
  - `row.cells[column.id]?.value === true`.
- `isRowCompletedByCheckbox` returns true when any enabled checkbox column completes the row. This makes multiple checkbox columns predictable for rendering.
- `applyCheckboxAutoMove` reorders only when the toggled column exists, is a checkbox column, and has `moveCheckedRowsToBottom === true`.
- Auto-move should use the toggled checkbox column only for grouping: rows with `true` in that column go after rows without `true` in that column.
- Preserve relative order within unchecked and checked groups using current display order (`getRowsInDisplayOrder`) and then reindex orders to `[0..n]`.
- Never rewrite row ids, column ids, or cell payloads.
- Return cloned/reindexed rows consistently with existing row helper style.

If implementation naming differs, keep the same behavior and document it in the complete artifact.

## Store Integration
Update `toggleCheckboxCellValue` in `src/stores/documentStore.ts`:
1. Keep existing guards: initialized settings, workspace/block/row found, target column exists and is `checkbox`, and target cell has a boolean value.
2. Toggle only the target row's target checkbox cell value.
3. After the toggle, call the auto-move helper with the updated rows, block columns, and the toggled `columnId`.
4. Pass the result to `replaceBlockRows` so persisted order is normalized.
5. Preserve existing history/autosave behavior and return values.
6. Keep the transaction kind as-is unless Dev has a strong reason to use a different existing kind; do not introduce a new history kind.

Important edge cases to cover:
- Setting disabled: order remains unchanged except the toggled boolean.
- Setting enabled and row toggled true: row moves into the checked group at the bottom, preserving checked-group relative order.
- Setting enabled and row toggled false: row returns to the unchecked group before checked rows, preserving unchecked-group relative order.
- Multiple checkbox columns: auto-move uses only the toggled column; completed rendering can be true if any strikeout-enabled checkbox column is checked.

## Row Rendering
Update `RowView.tsx`:
- Import `isRowCompletedByCheckbox`.
- Compute completion per row from `block.columns` and the current row.
- Apply a modest completed state to the row and/or cell wrapper, for example:
  - `line-through` for text-bearing content via an inherited class on the row container,
  - `decoration-textMuted` / `decoration-1` or similar restrained treatment,
  - optional `opacity-80`/`text-textMuted` only if readability stays good.
- Avoid making the whole row too faint; do not obscure checkboxes or focus/selection states.
- Add a test-friendly marker such as `data-completed={completed ? "true" : undefined}` or a stable class only if useful for component coverage.

## Tests

### New helper tests: `checkboxAutomation.test.ts`
Cover at least:
- `isRowCompletedByCheckbox` returns false for no checkbox columns, unchecked checkbox cells, and checked checkbox columns with `strikeoutRowWhenChecked` disabled.
- `isRowCompletedByCheckbox` returns true for a checked checkbox column with `strikeoutRowWhenChecked` enabled.
- Multiple checkbox columns: any strikeout-enabled checked column completes the row.
- `applyCheckboxAutoMove` leaves order unchanged when the toggled column is missing, not checkbox, or has `moveCheckedRowsToBottom` disabled.
- `applyCheckboxAutoMove` groups unchecked before checked for the toggled checkbox column.
- Relative order within unchecked and checked groups is preserved and orders are reindexed.
- Row ids and representative cell payloads remain intact.

### Store tests: `documentStore.test.ts`
Add focused cases, using existing memory storage patterns:
- Toggling a checkbox with `moveCheckedRowsToBottom` disabled changes only the boolean and preserves order.
- Enabling `moveCheckedRowsToBottom` for the checkbox column then toggling a row to checked moves it after unchecked rows.
- Toggling that row back to unchecked returns it to the unchecked group and keeps valid orders/cell values.
- If a second checkbox column exists, toggling one column only applies auto-move rules for that toggled column.

### Optional component test: `rowEditing.test.tsx`
If stable and cheap, add a row rendering test that sets `strikeoutRowWhenChecked: true`, renders a checked row, and verifies the completed marker/class. Do not over-invest in style assertions if they become brittle.

## Implementation Steps
1. Create `applyCheckboxRules.ts` with pure helpers and no store/React imports.
2. Add `checkboxAutomation.test.ts` fixtures with small columns/rows and helper assertions.
3. Update `toggleCheckboxCellValue` to apply auto-move after toggling the target boolean.
4. Update `RowView.tsx` to apply completed row rendering based on enabled strikeout checkbox columns.
5. Add store coverage for disabled/enabled auto-move and toggle-back behavior.
6. Add optional component coverage only if the completed rendering marker/class can be asserted cleanly.
7. Run full verification.

## Acceptance Checks for Dev
- Checked rows in strikeout-enabled checkbox columns render as completed/struck through and remain readable.
- Toggling a checkbox with `moveCheckedRowsToBottom` enabled moves checked rows after unchecked rows in that block.
- Toggling back to unchecked returns the row to the unchecked group without corrupting row ids or cell payloads.
- Disabled checkbox settings preserve existing toggle behavior except for the boolean value.
- Multiple checkbox columns are predictable: rendering checks all strikeout-enabled checkbox columns, auto-move uses the toggled column.
- Tests cover pure helper behavior and document store toggle/order behavior.
- Run and report:
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
  - `npm run lint`
