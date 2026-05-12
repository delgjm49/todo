# Review: TICKET-043 Border Formatting Controls

## Verdict
**PASS**

## Acceptance Criteria Checklist

- [x] Inspector shows border formatting controls for valid block, column, row, and cell selections.
- [x] No-selection and stale/missing-target states do not expose border mutation controls.
- [x] Border width can be set and reset to inherited/unset.
- [x] Border color can be set and reset to inherited/unset.
- [x] Top, right, bottom, and left border edges can be toggled individually and reset to inherited/unset.
- [x] Border formatting changes are stored as sparse overrides on the selected block/column/row/cell target.
- [x] Effective border formatting renders immediately in the editor surface according to the existing formatting precedence order.
- [x] Formatting mutations commit as formatting history transactions and do not mutate unrelated targets.
- [x] Existing text/fill formatting behavior continues to work.
- [x] Verification commands pass: `npm run typecheck`, `npm run test`, `npm run build`, and `npm run lint`.

## Scope Review

- Work is strictly scoped to border formatting controls and rendering. No save/reload persistence (TICKET-044), checkbox automation, sorting, clipboard, alerts, settings defaults UI, column resize, or packaging work was introduced.
- The refactor to share patch logic between text and border formatting through `applySelectedFormattingPatch` is clean and avoids duplication.

## Implementation Findings

### `formattingToBorderStyle.ts`
- Correctly returns empty object when `edges` is absent or undefined, preserving Tailwind grid borders.
- Sets `borderStyle: "solid"`, `borderColor`, and per-edge widths when edges are present.
- Defaults width to `1` and color to `"#000000"` when edges exist but properties are missing.
- 7 unit tests cover absent edges, all edges, single edge, multiple edges, defaults, and empty edge array.

### `BorderFormattingControls.tsx`
- Follows the established `TextFormattingControls` pattern with `FieldCard`, `ResetButton`, and `InheritedLabel`.
- Uses `resolveSelectedFormattingTarget` for target resolution; renders a guarded message when no target exists.
- Width input: min 0, max 8, step 1. Handles empty string as `undefined`.
- Color input: standard color picker.
- Edge toggles: four compact buttons (T, R, B, L). Initializes from effective edge set on first edit when no direct override exists, preserving inherited state while creating explicit sparse override.
- Reset buttons appear only when the corresponding key exists in `direct`.
- Edge reset clears the entire `edges` property to `undefined`, reverting to inherited.

### `InspectorShell.tsx`
- Integrates `BorderFormattingControls` after `TextFormattingControls` and before workspace style cards. Correct placement.

### `RowView.tsx`
- Composes `formattingToCellStyle` and `formattingToBorderStyle` on the cell wrapper inline style.
- Preserves existing Tailwind border classes (`border border-border/60`) and selected/focus ring classes. When `edges` is absent, inline style is `{}` so Tailwind classes remain effective.

### `documentStore.ts`
- Extracted `applySelectedFormattingPatch` as a shared helper inside the store closure.
- Both `updateSelectedTextFormatting` and `updateSelectedBorderFormatting` delegate to the same implementation.
- Returns `false` for `selection.kind === "none"`.
- Returns `false` for stale/missing workspace, block, column, row, or cell targets.
- Commits with history transaction kind `"formatting"`.
- Uses `formatLayersEqual` to avoid no-op commits.
- Cell format objects are cleaned to `undefined` when empty after patch application.

### Tests
- `formattingPatch.test.ts`: 6 additional border-specific tests (set width, set color, set edges, reset width, reset color, reset edges, input array immutability). All pass.
- `documentStore.test.ts`: 6 additional border store tests covering block/column/row/cell border formatting, reset behavior, cell format cleanup, none-selection guard, and stale-selection guard. All pass.

## Regression Check
- Existing text formatting tests (document store, patch helper) continue to pass.
- No changes to unrelated store actions, cell renderers, or storage service.

## Verification Results (Independent)
- `npm run typecheck` — pass
- `npm run test` — 127/127 pass
- `npm run build` — pass
- `npm run lint` — pass
