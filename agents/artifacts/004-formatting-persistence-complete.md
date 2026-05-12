# Implementation Complete: TICKET-044 Formatting Persistence

## Summary

Hardened the storage schema/coercion path for sparse formatting overrides and added comprehensive tests proving block, column, row, and cell formatting survive save/load cycles. Invalid formatting values are safely normalized or dropped without corrupting valid sibling values. Effective formatting after reload continues to follow app defaults → block → column → row → cell precedence.

## Changed Files

### Schema Hardening
- `src/services/storage/storageSchemas.ts`
  - `normalizeTextFormatting`: now requires `fontFamily` to be non-empty after trim, and `fontSize` to be finite and positive (> 0).
  - `normalizeBorderFormatting`: now requires `borderWidth` to be finite and non-negative (>= 0).
  - `toEdges`: deduplicates and canonicalizes edge order to `top`, `right`, `bottom`, `left` for stable persisted JSON.

### Tests Added/Extended
- `src/tests/unit/storage.test.ts`
  - Added `describe("formatting coercion")` with 2 tests:
    - Preserves valid sparse formatting at block, column, row, and cell levels (text/fill + border properties).
    - Normalizes malformed formatting values without corrupting valid siblings (rejects bad fontSize, borderWidth, colors, edges, etc. while keeping valid neighbors).
  - Added `describe("formatting persistence round-trip")` with 3 tests:
    - Save/load round-trip preserves formatting overrides at all levels via `saveWorkspace` / `loadAppData`.
    - Persisted JSON contains canonical sparse formatting shapes (empty objects where appropriate).
    - Effective formatting after reload follows app defaults → block → column → row → cell precedence, verified with `resolveCellFormatting`.
- `src/tests/unit/documentStore.test.ts`
  - Added integration test: `persists formatting across store re-initialization after autosave`.
    - Applies text and border formatting through real store actions at block, column, row, and cell levels.
    - Waits for autosave, then re-initializes the store from the same memory service.
    - Asserts all formatting is restored and cell values/structure remain unchanged.

## Tests

- Total unit tests: 133 (up from 127)
- New tests: 6
  - 2 in `storage.test.ts` (formatting coercion)
  - 3 in `storage.test.ts` (formatting persistence round-trip)
  - 1 in `documentStore.test.ts` (store integration)

## Verification Results

- `npm run typecheck`: pass
- `npm run test`: 133/133 pass
- `npm run build`: pass
- `npm run lint`: pass

## Acceptance Criteria Mapping

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Block-level formatting persists | ✅ | Round-trip test asserts block.format keys |
| Column-level formatting persists | ✅ | Round-trip test asserts column.format keys |
| Row-level formatting persists | ✅ | Round-trip test asserts row.format keys |
| Cell-level formatting persists | ✅ | Round-trip test asserts cell.format keys |
| Text/fill properties survive | ✅ | Valid coercion test includes fontSize, bold, textColor, backgroundColor |
| Border properties survive | ✅ | Valid coercion test includes borderWidth, borderColor, edges |
| Invalid values normalized safely | ✅ | Malformed formatting test proves invalid keys dropped, valid siblings intact |
| Effective reload precedence correct | ✅ | Precedence test uses conflicting values across all layers + resolveCellFormatting |
| Inspector/ rendering unchanged | ✅ | No UI changes made; existing tests still pass |
