# Implementation Complete: TICKET-043 Border Formatting Controls

## What Changed

- Added `src/domain/formatting/formattingToBorderStyle.ts` to convert resolved border formatting into inline CSS border properties.
- Added `src/components/layout/BorderFormattingControls.tsx` with inspector controls for border width, border color, and top/right/bottom/left edge toggles.
- Integrated `BorderFormattingControls` into `InspectorShell.tsx` after `TextFormattingControls`.
- Updated `RowView.tsx` to compose border styles with text/fill styles on cell wrappers for immediate grid rendering.
- Refactored `documentStore.ts` to extract `applySelectedFormattingPatch` as a shared helper; added `updateSelectedBorderFormatting` action that delegates to the same implementation used by `updateSelectedTextFormatting`.

## Behavior

- Border formatting controls are shown for block, column, row, and cell selections.
- No-selection and stale/missing targets show a guarded message with no mutation UI.
- Width and color each support set/reset to inherited.
- Edge toggles initialize from the effective edge set on first edit when no direct override exists, preserving inherited state while creating an explicit sparse override.
- Edge reset clears the entire `edges` property to `undefined`, reverting to inherited.
- Mutations flow through `documentStore` as sparse formatting overrides with `"formatting"` history transactions.
- Effective border formatting renders immediately via the existing `resolveCellFormatting` → `formattingToBorderStyle` path.

## Tests Added / Updated

- `src/tests/unit/formattingToBorderStyle.test.ts`: 7 tests covering absent edges, all edges, single edge, multiple edges, defaults, and empty edge array.
- `src/tests/unit/formattingPatch.test.ts`: 6 additional tests for border width, color, and edge set/reset, plus input array immutability.
- `src/tests/unit/documentStore.test.ts`: 6 additional tests for block/column/row/cell border formatting, reset behavior, cell format cleanup, none-selection guard, and stale-selection guard.

## Verification

- `npm run typecheck` — pass
- `npm run test` — 127/127 pass
- `npm run build` — pass
- `npm run lint` — pass
