# Implementation Plan: TICKET-043 Border Formatting Controls

## Scope

Implement inspector-driven border formatting controls for the current block, column, row, or cell selection. The work should cover:

- Border width
- Border color
- Top/right/bottom/left edge controls
- Sparse override mutation through `documentStore`
- Immediate rendering on visible grid cells through the existing formatting resolution path
- Unit coverage for patch/style/store behavior

Out of scope: save/reload persistence QA for `TICKET-044`, checkbox automation, sorting, clipboard, alerts, settings defaults UI, column resize, packaging, and unrelated text/fill control changes.

## Current Baseline

Relevant existing implementation from `TICKET-042`:

- `src/types/formatting.ts` already defines `borderColor?: string`, `borderWidth?: number`, and `edges?: BorderEdge[]` on all formatting layers.
- `applyFormattingPatch` already supports sparse set/reset behavior for any `FormattingLayer` key, including border keys.
- `resolveCellFormatting`, `resolveRowStyle`, and `resolveSelectedFormattingTarget` already resolve effective formatting through app defaults → block → column → row → cell.
- `documentStore.updateSelectedTextFormatting` already patches block/column/row/cell formatting with history/autosave integration, but its name is text-specific.
- `RowView` already resolves effective cell formatting and applies `formattingToCellStyle` on the cell wrapper.
- `TextFormattingControls` already implements the inspector control pattern to reuse for border controls.

## Implementation Steps

### 1. Extend domain style conversion for borders

Update or add a focused helper under `src/domain/formatting/`:

- Option A: extend `formattingToCellStyle(formatting)` to include border styles.
- Option B (preferred for clarity): add `formattingToBorderStyle(formatting)` and compose it with `formattingToCellStyle` in `RowView`.

Recommended border style behavior:

- Only emit custom border CSS when there is enough effective border intent to avoid accidentally removing the app's base grid affordance.
- Use `formatting.edges` as the enabled edge set.
- If `edges` is present:
  - set `borderStyle: "solid"`
  - set `borderColor` from `formatting.borderColor`
  - set each edge width to `formatting.borderWidth ?? 1` when enabled
  - set disabled edge widths to `0`
- If `edges` is absent:
  - do not emit edge-specific border widths; let existing Tailwind border classes preserve the current neutral grid.
- Preserve selected/focus visuals. The selected cell ring should continue to render because it uses ring classes; avoid replacing selection classes.

Add unit tests for style conversion, covering:

- all edges enabled
- a single edge enabled
- multiple edges enabled
- missing `edges` returns no edge-width overrides
- color/width are reflected when edges exist

### 2. Add a border formatting mutation action

Avoid duplicating the large block/column/row/cell patch logic.

Recommended refactor in `src/stores/documentStore.ts`:

1. Extract the body of `updateSelectedTextFormatting` into a private helper function, for example:
   - `applySelectedFormattingPatchToSnapshot(state, selection, patch): AppDocumentSnapshot | null`, or
   - `updateSelectedFormatting(selection, patch, options)` as the canonical store action.
2. Keep `updateSelectedTextFormatting` for existing text controls/tests as a wrapper or alias.
3. Add `updateSelectedBorderFormatting(selection, patch, options)` that calls the same shared implementation.

Behavior requirements:

- Return `false` for `selection.kind === "none"`.
- Return `false` for stale/missing workspace, block, column, row, or cell targets.
- Commit with history transaction kind `"formatting"`.
- Do not mutate unrelated formatting targets.
- Store sparse overrides only.
- Use `applyFormattingPatch` for set/reset.
- Continue omitting empty cell `format` objects (`undefined` when empty).
- For block/column/row `format`, keeping `{}` is acceptable because existing types require the object, but do not add unrelated default keys.

### 3. Implement `BorderFormattingControls`

Create `src/components/layout/BorderFormattingControls.tsx` following the `TextFormattingControls` pattern.

Inputs:

- `selection: Selection`

Store reads:

- `workspaceIndex`
- `workspacesById`
- `activeWorkspaceId`
- `settings`
- `updateSelectedBorderFormatting`

Target resolution:

- Use `resolveSelectedFormattingTarget(selection, activeWorkspace, workspaceDocument, settings.defaults)`.
- If no target exists, render a small guarded no-target message: `Select a block, column, row, or cell to format borders.`
- Do not expose mutation controls for no-selection or stale/missing targets.

Controls:

- **Border width**
  - Number input, suggested min `0`, max `8`, step `1`.
  - Display direct value when set, otherwise effective inherited value, falling back to `settings.defaults.blockBorderWidth` or `1`.
  - On change, patch `{ borderWidth: number }`.
  - Reset button when `"borderWidth" in direct`, patch `{ borderWidth: undefined }`.

- **Border color**
  - Color input.
  - Display direct value when set, otherwise effective inherited value, falling back to `settings.defaults.blockBorderColor`.
  - On change, patch `{ borderColor: value }`.
  - Reset button when `"borderColor" in direct`, patch `{ borderColor: undefined }`.

- **Edges**
  - Render four compact toggle buttons: Top, Right, Bottom, Left.
  - Display state from `direct.edges` when present; otherwise from `effective.edges ?? []`.
  - On first edge edit when `direct.edges` is absent, initialize from the effective edge set, then toggle the clicked edge. This preserves the user's visible inherited state while creating an explicit sparse override.
  - Patch `{ edges: nextEdges }`, using a stable canonical order: `top`, `right`, `bottom`, `left`.
  - Provide an `Edges reset` button when `"edges" in direct`, patch `{ edges: undefined }` to return the full edge set to inherited/unset.

Important model note:

- The existing contract stores edges as one `edges?: BorderEdge[]` property, not as four independent sparse properties. Therefore inheritance/reset is exact at the `edges` property level. The UI can toggle individual edges, but reset-to-inherited should reset the edge set as a group unless Dev intentionally changes the existing type contract, which is not recommended for this dispatch.

### 4. Integrate controls into the inspector

Update `src/components/layout/InspectorShell.tsx`:

- Import `BorderFormattingControls`.
- Render it after `TextFormattingControls` and before workspace-only style cards.
- Leave the existing target summary and workspace style controls intact.

### 5. Render effective borders in the grid

Update `src/components/row/RowView.tsx`:

- Continue resolving `effectiveFormat` with `resolveCellFormatting`.
- Combine text/fill style and border style on the cell wrapper, for example:
  - `style={{ ...formattingToCellStyle(effectiveFormat), ...formattingToBorderStyle(effectiveFormat) }}`
- Keep existing `border`, `bg-panel`, selected ring, and row selection classes unless the new style helper intentionally overrides border edge widths.
- Do not move border logic into typed cell components; the wrapper is the correct level because all cell types support border treatment.

Optional but useful:

- If block-level border formatting should visibly affect the block shell as well as descendant cells, defer shell-specific rendering unless already trivial. The acceptance criteria focuses on editor/grid border rendering through effective cell formatting.

### 6. Tests

Add or update unit tests:

#### `src/tests/unit/formattingPatch.test.ts`

Add border patch cases:

- sets `borderWidth`
- sets `borderColor`
- sets `edges`
- resets `borderWidth`
- resets `borderColor`
- resets `edges`
- does not mutate an input `edges` array if the helper or control helper normalizes it

#### Style conversion test file

If no style conversion tests exist, create `src/tests/unit/formattingToCellStyle.test.ts` or `formattingToBorderStyle.test.ts`.

Cover the edge rendering cases listed in Step 1.

#### `src/tests/unit/documentStore.test.ts`

Add border store tests parallel to the existing text formatting tests:

- Applies block border formatting and resets one property.
- Applies column border formatting without altering other columns.
- Applies row border formatting without altering row order or cell values.
- Applies cell border formatting without changing the cell value.
- Resets cell border formatting back to `undefined` when all direct formatting keys are removed.
- Returns false for none selection.
- Returns false for stale selection.

These tests should assert history integration where appropriate (`canUndo === true` after a successful mutation) and verify unrelated targets remain unchanged.

## Acceptance Mapping

- Inspector controls for block/column/row/cell: `BorderFormattingControls` using `resolveSelectedFormattingTarget`.
- No no-selection/stale mutation UI: guarded target resolution returns the no-target message.
- Width set/reset: `borderWidth` control patches number/`undefined`.
- Color set/reset: `borderColor` control patches color/`undefined`.
- Edge toggles/reset: individual buttons patch canonical `edges`; reset button clears `edges` to inherited/unset.
- Sparse overrides: `applyFormattingPatch` plus empty cell format cleanup.
- Immediate rendering: `RowView` applies border style from resolved effective formatting.
- Formatting history transactions: shared store patch action commits with `"formatting"`.
- Text/fill behavior preserved: keep `updateSelectedTextFormatting` public contract and existing tests passing.

## Verification Required for Dev

Run and report:

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run lint`
