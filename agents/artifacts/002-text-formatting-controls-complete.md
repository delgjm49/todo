# Complete: Text Formatting Controls

## Dispatch
- Channel: `agents/channels/002-text-formatting-controls-channel.md`
- Dispatch: `agents/artifacts/002-text-formatting-controls-dispatch.md`
- Ticket: `TICKET-042: Implement text formatting controls`

## What Was Implemented

### New domain helpers
- `src/domain/formatting/applyFormattingPatch.ts` — pure helper for sparse formatting update/reset. Applies non-`undefined` values as overrides and removes keys set to `undefined`, restoring inherited behavior.
- `src/domain/formatting/formattingToCellStyle.ts` — converts a resolved `FormattingLayer` into `React.CSSProperties` for the cell wrapper (font family, size, weight, style, decoration, color, background).
- `src/domain/formatting/selectedFormattingTarget.ts` — resolves `direct` and `effective` formatting for the current selection using existing `resolveCellFormatting` / `resolveRowStyle` helpers.

### New UI components
- `src/components/layout/FieldCard.tsx` — extracted shared field wrapper from `InspectorShell.tsx`.
- `src/components/layout/TextFormattingControls.tsx` — inspector text formatting section with controls for:
  - Font family (compact select with local-safe options)
  - Font size (number input, 8–48)
  - Bold / Italic / Underline (toggle buttons)
  - Text color (color input)
  - Fill/background color (color input)
  - Each control has an explicit Reset button that dispatches `{ property: undefined }`.
  - Inherited values are shown in inputs when no direct override exists, with an "Inherited" label.

### Store changes
- `src/stores/documentStore.ts` — added `updateSelectedTextFormatting(selection, patch, options?)` action.
  - Supports `block`, `column`, `row`, and `cell` selections.
  - Returns `false` for `none`, stale ids, or no-op updates.
  - Uses `applyFormattingPatch` and `formatLayersEqual` to avoid no-op commits.
  - Cell formatting is set to `undefined` when empty to keep payloads sparse.
  - Commits through the existing snapshot/history path with `"formatting"` transaction kind.

### Grid rendering
- `src/components/row/RowView.tsx` — each visible cell wrapper now computes effective formatting via `resolveCellFormatting(settings.defaults, block.format, column.format, row.format, cell?.format)` and applies it via inline `style`. Existing selection ring/border Tailwind classes remain intact.

### Inspector integration
- `src/components/layout/InspectorShell.tsx` — imports `TextFormattingControls` and renders it between the Target summary card and the workspace appearance controls.

### Tests
- `src/tests/unit/formattingPatch.test.ts` — 10 tests covering set, overwrite, reset, multiple keys, empty result, and input immutability.
- `src/tests/unit/documentStore.test.ts` — 6 new tests covering:
  - Block formatting application and reset
  - Column formatting without altering other columns
  - Row formatting without altering row order or cells
  - Cell formatting without changing cell value, plus reset to `undefined`
  - `none` selection returns `false` and does not commit
  - Stale selection returns `false` and does not commit

## Verification Results

```
npm run typecheck   PASS
npm run test        PASS  (107/107)
npm run build       PASS
npm run lint        PASS
```

## Scope Confirmation
- Border controls were not added (remains `TICKET-043`).
- No dedicated formatting persistence/reload QA pass was added (remains `TICKET-044`).
- No checkbox automation, sorting, clipboard, alerts, settings defaults UI, or packaging work was performed.

## Files Changed
- New: `src/domain/formatting/applyFormattingPatch.ts`
- New: `src/domain/formatting/formattingToCellStyle.ts`
- New: `src/domain/formatting/selectedFormattingTarget.ts`
- New: `src/components/layout/FieldCard.tsx`
- New: `src/components/layout/TextFormattingControls.tsx`
- New: `src/tests/unit/formattingPatch.test.ts`
- Modified: `src/stores/documentStore.ts`
- Modified: `src/components/layout/InspectorShell.tsx`
- Modified: `src/components/row/RowView.tsx`
- Modified: `src/tests/unit/documentStore.test.ts`
