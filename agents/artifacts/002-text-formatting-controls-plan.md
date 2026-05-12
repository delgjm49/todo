# Implementation Plan: Text Formatting Controls

## Dispatch
- Channel: `agents/channels/002-text-formatting-controls-channel.md`
- Dispatch: `agents/artifacts/002-text-formatting-controls-dispatch.md`
- Ticket: `TICKET-042: Implement text formatting controls`

## Objective
Add inspector-driven text/fill formatting controls for the active block, column, row, or cell selection. Formatting changes must update the in-memory document through `documentStore`, participate in history/autosave like other document mutations, and render immediately in the block grid through the existing formatting resolution helpers.

## In Scope
- Inspector text formatting section for supported selections: block, column, row, cell.
- Controls for:
  - font family
  - font size
  - bold
  - italic
  - underline
  - text color
  - fill/background color
- Explicit reset-to-inherited/unset behavior for each property.
- Sparse override updates on existing `format` fields:
  - `Block.format`
  - `ColumnDefinition.format`
  - `Row.format`
  - `PersistedCell.format`
- Immediate rendering of effective text/fill formatting in the grid via `resolveCellFormatting` / `resolveRowStyle`.
- Unit/UI tests covering formatting application for block, column, row, and cell targets.

## Out of Scope
- Border controls or border-specific UI (`TICKET-043`).
- Dedicated persistence/reload verification for formatting (`TICKET-044`), beyond keeping current JSON-compatible in-memory shapes and autosave paths intact.
- Inline partial rich text inside a cell.
- Settings defaults UI.
- Checkbox automation, sorting, clipboard, alerts, packaging.
- New selection model behavior.

## Current State Notes
- `InspectorShell.tsx` now renders the inspector and target summary from `buildInspectorTargetSummary`.
- Formatting types already exist in `src/types/formatting.ts`.
- Every block/column/row/cell shape already has a sparse `format` field or optional `format` field.
- Existing helpers already encode precedence:
  - `resolveCellFormatting(appDefaults, block.format, column.format, row.format, cell.format)`
  - `resolveRowStyle(appDefaults, block.format, row.format)`
- `RowView.tsx` currently renders cells with static Tailwind classes and does not apply resolved formatting.
- `documentStore.ts` currently has no block/column/row/cell formatting mutation actions.

## Implementation Steps

### 1. Add a formatting patch helper
Create a small pure helper so sparse update/reset logic is consistent and testable.

Recommended file:
- `src/domain/formatting/applyFormattingPatch.ts`

Suggested API:

```ts
import type { FormattingLayer } from "./mergeFormatting.js";

export type FormattingPatch = Partial<Record<keyof FormattingLayer, FormattingLayer[keyof FormattingLayer] | undefined>>;

export function applyFormattingPatch<T extends FormattingLayer>(
  current: T | undefined,
  patch: FormattingPatch
): T;
```

Behavior:
- Start from `current ?? {}`.
- For each patch entry:
  - non-`undefined` value sets/overwrites the direct override.
  - `undefined` deletes that direct override, restoring inherited behavior.
- Return a new object.
- Do not mutate inputs.
- Empty result should be `{}` for block/column/row format fields and can be omitted/left undefined for cell format if Dev chooses. Prefer setting cell `format` to `undefined` when empty to keep payload sparse.
- The dispatch only needs text/fill keys, but the helper can be generic over `FormattingLayer` because border fields already exist in the type. Do not add border UI.

### 2. Add documentStore formatting actions
Extend `DocumentStoreState` with focused actions. Prefer one generic action over many repeated methods:

```ts
updateSelectedTextFormatting(
  selection: Selection,
  patch: FormattingPatch,
  options?: DocumentMutationOptions
): boolean;
```

Alternative acceptable API:

```ts
updateBlockFormatting(workspaceId, blockId, patch, options?): boolean;
updateColumnFormatting(workspaceId, blockId, columnId, patch, options?): boolean;
updateRowFormatting(workspaceId, blockId, rowId, patch, options?): boolean;
updateCellFormatting(workspaceId, blockId, rowId, columnId, patch, options?): boolean;
```

Recommended implementation details:
- Use existing snapshot/`commitSnapshot(..., "formatting", options)` pattern.
- Use existing `updateBlockInWorkspace` helper to keep mutation style consistent.
- Validate the target exists and return `false` for `selection.kind === "none"`, stale ids, or no real change.
- Apply sparse patch to the appropriate direct format object only.
- For cell formatting, preserve the cell value and other fields; only update its `format`.
- Compare before/after format objects to avoid committing no-op updates.
- Do not alter selection state, row order, column order, cell value, or workspace styling.

### 3. Add inspector controls
Create a presentation component for the text formatting section.

Recommended file:
- `src/components/layout/TextFormattingControls.tsx`

Suggested responsibilities:
- Render only for `selection.kind` of `block`, `column`, `row`, or `cell` and when the target resolves.
- Hide or disable for `none`/missing target states with a short message such as `Select a block, column, row, or cell to format text.`
- Show controls:
  - Font family: compact `<select>` with safe local options (`Segoe UI`, `Arial`, `Calibri`, `Consolas`, `Georgia`) plus a reset button.
  - Font size: number input with reasonable min/max (for example 8–48) plus reset.
  - Bold/Italic/Underline: toggle buttons that set booleans plus reset buttons or tri-state behavior.
  - Text color: color input plus reset.
  - Fill/background color: color input plus reset.
- Use compact desktop styling consistent with existing `FieldCard` sections.
- Each property needs explicit unset behavior; simplest approach is a small `Reset` button next to each control that dispatches `{ property: undefined }`.
- Use direct override values for control values where possible; if direct value is absent, show the effective inherited value as the current input value and label it as inherited (for example `Inherited`). This avoids blank color/number inputs while preserving reset semantics.

Integration in `InspectorShell.tsx`:
- Resolve the active block/column/row/cell (either inside the controls component or via helper props).
- Place the text formatting section after Target summary and before workspace appearance controls.
- Keep the existing workspace appearance controls rendering.
- Keep no-selection state from exposing mutation controls.

### 4. Add a selected target formatting helper (optional but recommended)
To keep `InspectorShell.tsx` thin, add a pure resolver for the selected target’s direct/effective formatting.

Recommended file:
- `src/domain/formatting/selectedFormattingTarget.ts` or `src/components/layout/selectedFormattingTarget.ts`

Suggested output:

```ts
export type SelectedFormattingTarget = {
  kind: "block" | "column" | "row" | "cell";
  direct: FormattingLayer;
  effective: FormattingLayer;
};
```

Behavior:
- Return `null` for no selection or stale ids.
- For block: effective can be `resolveCellFormatting(defaults, block.format, {}, {}, undefined)` or app defaults merged with block format. Use an explicit helper if cleaner.
- For column: use app defaults + block + column.
- For row: use `resolveRowStyle(defaults, block.format, row.format)`.
- For cell: use `resolveCellFormatting(defaults, block.format, column.format, row.format, cell.format)`.
- Do not duplicate precedence in React component branches; centralize it in the helper and call existing formatting helpers.

### 5. Render effective formatting in the grid
Update `RowView.tsx` so each visible cell uses resolved formatting.

Implementation guidance:
- Read `settings` from `documentStore`; if missing, fall back to current static classes.
- For each row/cell, compute:
  - row effective style with `resolveRowStyle(settings.defaults, block.format, row.format)` if needed for row-level background inheritance.
  - cell effective style with `resolveCellFormatting(settings.defaults, block.format, column.format, row.format, row.cells[column.id]?.format)`.
- Convert formatting to React CSS properties in a small helper, for example:

```ts
function formattingToCellStyle(formatting: FormattingLayer): React.CSSProperties {
  return {
    fontFamily: formatting.fontFamily,
    fontSize: formatting.fontSize,
    fontWeight: formatting.bold ? 700 : undefined,
    fontStyle: formatting.italic ? "italic" : undefined,
    textDecoration: formatting.underline ? "underline" : undefined,
    color: formatting.textColor,
    backgroundColor: formatting.backgroundColor,
  };
}
```

- Apply style to the cell wrapper so all cell renderer types inherit text styling and background/fill is visible.
- Do not render border styles in this dispatch, even though border fields exist in `FormattingLayer`.
- Preserve existing selected-cell classes/rings. Inline `backgroundColor` can override `bg-panel`; selection ring/border should still communicate active selection.
- Text-bearing cells (`text`, `date`, `time`, `dropdown`) should fully reflect text properties. Checkbox/bullet/numbered cells may primarily reflect color/fill; this is acceptable per spec.

### 6. Test plan

#### Pure helper tests
Add/update tests such as:
- `src/tests/unit/formattingPatch.test.ts`

Cover:
- setting a property creates a sparse override.
- resetting with `undefined` removes the property.
- multiple keys update together.
- input object is not mutated.
- empty reset result is `{}`.

#### documentStore tests
Add cases to `src/tests/unit/documentStore.test.ts` or a focused new file:
- Block formatting action sets `block.format.bold` or `fontSize`.
- Column formatting action sets selected column `format.textColor` without altering other columns.
- Row formatting action sets selected row `format.backgroundColor` without altering row order/cells.
- Cell formatting action sets `cell.format.italic` or `textColor` without changing `cell.value`.
- Reset action removes a direct override and keeps the target object otherwise valid.
- No-selection/stale selection returns `false` and does not commit.

Use memory storage and low autosave delay where consistent with existing document store tests. Also assert `useHistoryStore.getState().canUndo` if practical, because formatting should be undoable.

#### Rendering/UI tests
Add a focused render test if practical, likely using existing JSDOM patterns:
- Seed document state with a selected target and render `InspectorShell`; verify the text formatting section appears for block/column/row/cell and not for no-selection.
- Trigger a control change/click and assert the store format changed.
- Render `MainPane`/`RowView` with a known formatting override and assert the target cell wrapper has inline style values (`fontWeight`, `fontStyle`, `color`, `backgroundColor`, etc.).

At minimum, Dev must cover store formatting application for block/column/row/cell and one visible/effective formatting behavior. More UI coverage is encouraged if it stays stable.

## Acceptance Checklist for Dev
- [ ] Inspector shows text formatting controls for block, column, row, and cell selections.
- [ ] No-selection/missing-target state does not expose mutation controls.
- [ ] Font family, font size, bold, italic, underline, text color, and background/fill color can be set.
- [ ] Every property can be reset/unset to inherit.
- [ ] Formatting mutations flow through `documentStore` and commit as `"formatting"` history transactions.
- [ ] Sparse overrides are preserved; resets delete direct keys rather than storing fake inherited values.
- [ ] Grid rendering reflects effective formatting immediately via existing resolution helpers.
- [ ] Border UI/rendering is not added.
- [ ] Existing selection/menu/drag/editing behavior remains intact.

## Verification Required for Dev
Run and report all commands using the required verification format from `agents/CLOSING.md`:
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run lint`

Use the actual shell available in the environment.

## Expected Files Changed
Likely:
- `src/domain/formatting/applyFormattingPatch.ts` (new)
- `src/stores/documentStore.ts`
- `src/components/layout/InspectorShell.tsx`
- `src/components/layout/TextFormattingControls.tsx` (new)
- optional selected formatting helper under `src/domain/formatting/` or `src/components/layout/`
- `src/components/row/RowView.tsx`
- tests under `src/tests/unit/`
- `agents/artifacts/002-text-formatting-controls-complete.md` (new, by Dev)
- `docs/SESSIONS.md`
- `agents/channels/002-text-formatting-controls-channel.md`

## Dev Close Requirements
- Create `agents/artifacts/002-text-formatting-controls-complete.md` with implementation notes and verification results.
- Update `docs/SESSIONS.md` with a Dev session entry.
- Append the next `Dev → Review` message to `agents/channels/002-text-formatting-controls-channel.md` with `State = ready-for-review`.
- Do not commit; Main handles git operations.
