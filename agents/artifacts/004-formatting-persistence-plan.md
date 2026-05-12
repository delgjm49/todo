# Implementation Plan: TICKET-044 Formatting Persistence

## Scope

Harden and verify persistence for sparse formatting overrides at every supported formatting target:

- Block `format`
- Column `format`
- Row `format`
- Cell `format`

The work should prove text/fill properties from `TICKET-042` and border properties from `TICKET-043` survive save/load cycles, invalid persisted formatting is safely normalized or dropped, and effective formatting after reload still resolves as app defaults → block → column → row → cell.

Out of scope: new formatting controls, new formatting properties, settings defaults UI, checkbox automation, sorting, clipboard, alerts, column resize, packaging, and broad Playwright/E2E expansion.

## Current Baseline

Relevant implementation already exists:

- Formatting types are defined in `src/types/formatting.ts` and are shared by block, column, row, and cell layers.
- `src/services/storage/storageSchemas.ts` already normalizes `format` payloads for blocks, columns, rows, and cells through `normalizeTextFormatting`, `normalizeBorderFormatting`, and `normalizeCellFormatting`.
- `coerceWorkspaceForSave()` and `validateWorkspaceFile()` are the canonical save/load coercion boundary for workspace JSON.
- `storageService.saveWorkspace()` and `storageService.saveAppData()` already coerce outgoing workspace payloads before writing JSON.
- `documentStore` already applies sparse formatting patches to block/column/row/cell targets and autosaves through the storage service.
- `resolveCellFormatting()` already implements the required precedence chain.
- Existing tests cover formatting mutation behavior, but they do not yet prove formatting survives storage round trips or invalid formatting coercion.

Important current schema notes for Dev to audit:

- Cell `format` is optional in TypeScript, but `normalizeCell()` currently emits `format: {}` when no valid formatting remains. That can remain the canonical persisted empty-cell shape for this ticket if applied consistently.
- Block, column, and row `format` are required objects in current runtime types, so empty `{}` is acceptable there.
- The dispatch does not require a file-shape migration; avoid schema-version changes unless absolutely necessary.

## Implementation Steps

### 1. Audit and harden formatting normalization

Update `src/services/storage/storageSchemas.ts` only where the current normalization is too permissive or inconsistent for formatting persistence.

Recommended behavior:

- Preserve valid sparse formatting keys exactly where safe:
  - `fontFamily`: string, preferably non-empty after trim.
  - `fontSize`: finite positive number. Prefer the same lower-bound intent as settings/default controls; at minimum reject `NaN`, `Infinity`, negative values, and zero if zero is not a supported UI value.
  - `bold`, `italic`, `underline`: booleans only.
  - `textColor`, `backgroundColor`, `borderColor`: valid CSS colors only, using existing `isCssColor()`.
  - `horizontalAlign`: only `left`, `center`, or `right`.
  - `borderWidth`: finite number, minimum `0`; reject `NaN`, `Infinity`, and negative values.
  - `edges`: only `top`, `right`, `bottom`, `left`; de-duplicate.
- Drop invalid keys instead of defaulting them to app defaults inside persisted override objects. Omitted keys mean inherit.
- Do not let one invalid formatting key discard valid sibling keys in the same object.
- Do not let invalid cell values corrupt valid `format` payloads on the same cell, or vice versa.
- Keep marker cell value normalization behavior unchanged: bullet/numbered values normalize to `null` while retaining valid formatting.
- Keep canonical empty formatting output consistent with current type contracts:
  - block/column/row `format: {}` is acceptable.
  - cell `format: {}` or omitted is acceptable as long as tests document the chosen behavior and resolution treats it as no override.

Likely low-risk code changes:

- Make `normalizeTextFormatting()` reject non-finite or unsupported `fontSize` values.
- Make `normalizeBorderFormatting()` reject non-finite or negative `borderWidth` values.
- Optionally canonicalize `edges` order to `top`, `right`, `bottom`, `left` after de-duplication so saved JSON is stable.
- Avoid broad refactors; keep the normalization helpers private unless exporting them is clearly useful for tests.

### 2. Add storage-schema tests for formatting coercion

Extend `src/tests/unit/storage.test.ts` with focused tests against `validateWorkspaceFile()` and/or `coerceWorkspaceForSave()`.

Add a test that builds a workspace containing all four target levels with valid formatting:

- block format: at least one text/fill key and one border key.
- column format: different text/fill and border keys.
- row format: different text/fill and border keys.
- cell format: different text/fill and border keys.

Assert `validateWorkspaceFile()` preserves the valid sparse override keys on every level.

Add a separate invalid-data normalization test:

- Put malformed formatting values beside valid values in the same block/column/row/cell objects.
- Examples:
  - `fontSize: "large"`, `fontSize: -1`, or `fontSize: Number.NaN` if passed directly as object data.
  - `bold: "true"`.
  - `textColor: "not-a-color"`.
  - `backgroundColor: 123`.
  - `borderWidth: -2` or `Number.NaN`.
  - `borderColor: "bad-color"`.
  - `edges: ["top", "diagonal", "top", "left"]`.
- Assert invalid values are dropped/normalized and valid sibling values remain intact.
- Assert invalid cell value coercion does not remove valid cell formatting.

### 3. Add storage-service round-trip tests

Extend `src/tests/unit/storage.test.ts` with a memory-storage save/load round-trip test.

Recommended flow:

1. Create a memory storage service.
2. Load bootstrap data.
3. Mutate the starter workspace in memory to include block, column, row, and cell formatting with text/fill and border keys.
4. Save through the real storage service boundary (`saveWorkspace()` or `saveAppData()`; prefer `saveAppData()` if testing the full application save path).
5. Load app data again from the same service/backend.
6. Assert the loaded workspace contains the same formatting overrides at all four levels.
7. Optionally parse the raw workspace JSON from the memory backend and assert the persisted file contains `schemaVersion` and the expected sparse `format` payloads.

Use deterministic ids from the starter data where possible to avoid brittle generated-id assertions.

### 4. Add document-store persistence integration coverage

Extend `src/tests/unit/documentStore.test.ts` with an integration-style test that exercises the real store mutation path, autosave, and reload.

Recommended flow:

1. Create a memory storage service.
2. Initialize `useDocumentStore` with it.
3. Locate the starter workspace, block, text column, and row.
4. Apply formatting through existing store actions:
   - `updateSelectedTextFormatting()` for one or more text/fill keys at block/column/row/cell levels.
   - `updateSelectedBorderFormatting()` for border keys at block/column/row/cell levels.
5. Let autosave complete using a short `autosaveDelayMs` and the existing `wait()` helper.
6. Re-initialize the store from the same service, or call `service.loadAppData()` directly after autosave.
7. Assert block, column, row, and cell formatting are restored.
8. Assert cell values and row/column structure are unchanged.

This test proves inspector/store-applied formatting uses the same persistence contract as manually constructed data.

### 5. Verify effective formatting precedence after reload

Add a dedicated test, preferably in `src/tests/unit/storage.test.ts` or `src/tests/unit/formattingHelpers.test.ts`, that combines persistence with `resolveCellFormatting()`.

Recommended flow:

1. Build and save/load a workspace with conflicting values across all layers, for example:
   - app defaults: `fontSize: 14`, `textColor: #000000`, `borderWidth: 1`.
   - block: `fontSize: 16`, `textColor: #111111`, `borderWidth: 2`.
   - column: `fontSize: 18`, `textColor: #222222`, `borderColor: #333333`.
   - row: `fontSize: 20`, `backgroundColor: #444444`, `edges: ["top"]`.
   - cell: `textColor: #555555`, `borderWidth: 4`, `edges: ["left", "bottom"]`.
2. Reload through storage validation/coercion.
3. Call `resolveCellFormatting()` with the reloaded block/column/row/cell formats.
4. Assert the result follows precedence:
   - cell wins over row/column/block/app for keys it defines.
   - row wins over column/block/app where cell does not define the key.
   - column wins over block/app where lower layers do not define the key.
   - block wins over app defaults where no lower layer overrides.
   - app defaults remain present for keys not overridden anywhere.

This directly maps to the ticket acceptance criterion for effective formatting after reload.

### 6. Keep rendering and inspector behavior unchanged

No UI changes should be required for this ticket unless a persistence defect is discovered that requires a small store/schema adjustment.

Dev should avoid changing:

- `TextFormattingControls`
- `BorderFormattingControls`
- `InspectorShell`
- `RowView`
- selection behavior

If a bug is found in store formatting persistence, fix it at the store/schema boundary and cover it with unit tests rather than expanding UI scope.

## Acceptance Mapping

- Block formatting persists: storage-schema and storage-service round-trip assertions on `block.format`.
- Column formatting persists: round-trip assertions on `column.format`.
- Row formatting persists: round-trip assertions on `row.format`.
- Cell formatting persists: round-trip assertions on `cell.format`.
- Text/fill properties survive: include font/text/fill keys in valid round-trip fixtures.
- Border properties survive: include border width/color/edges in valid round-trip fixtures.
- Invalid values are safe: malformed formatting test proves invalid keys are dropped/normalized while valid neighbors remain.
- Effective reload precedence: save/load plus `resolveCellFormatting()` test proves app → block → column → row → cell order.
- Existing inspector/rendering behavior continues: no UI changes expected; full verification commands catch regressions.

## Verification Required for Dev

Run and report:

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run lint`
