# Plan: Expand Unit Coverage for Domain Helpers

## Overview

Audit identified specific gaps in pure-function coverage across `src/domain/` and clipboard helpers. This dispatch adds focused unit tests for two entirely untested modules (`formattingToCellStyle`, `resolveSelectedFormattingTarget`) and tightens edge-case coverage in alerts, sorting comparators, column/row helpers, block templates, and clipboard normalization. All new tests are pure (no React render, no Tauri) and run under `node --test`.

## Prerequisites

- None. The existing suite passes; new test files only add coverage.

## Audit Summary

The existing 20 unit test files cover most domain logic. The audit found:

| Status | Module |
|--------|--------|
| ✅ Well covered | `applyFormattingPatch`, `mergeFormatting`, `appDefaultsToFormatting`, `resolveCellFormatting`, `resolveRowStyle`, `formattingToBorderStyle`, `evaluateRow` (core), `evaluateWorkspace` (core), `sortRowsByColumn`, `applyCheckboxRules`, `createColumn`/`createRow` (happy paths), `reorderRows`, `documentSelectors`, `serializeRowsForClipboard`, `deserializeRowsFromClipboardJson` (core), `mapClipboardRowsToBlock` (core), `storage` schemas (broad) |
| ❌ Untested | `formattingToCellStyle.ts`, `selectedFormattingTarget.ts` |
| ⚠️ Edge-case gaps | `evaluateRow` calendar validity (leap year + month=00/13), `compareCellValues` (Intl.Collator numeric/case behavior), `changeColumnType` cross-type conversions, `createColumn` (date/time/numbered label and alertsEnabled defaults), `blockTemplates` (options + `getBlockTemplateLabel`), `rowClipboardTypes` normalization (edges order, fontSize bounds, borderWidth bounds), `deserializeRows` (duplicate column ids, non-finite order, missing-vs-null `cells`), `mapClipboardRows` (id-mismatch type fallback into shape) |

## Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Create | `src/tests/unit/formattingToCellStyle.test.ts` | Cover all branches of `formattingToCellStyle` |
| Create | `src/tests/unit/selectedFormattingTarget.test.ts` | Cover all selection kinds and missing-target paths of `resolveSelectedFormattingTarget` |
| Modify | `src/tests/unit/alertEvaluation.test.ts` | Add leap-year, calendar-invalid month, mixed date+time earliest-wins, and workspace tie-breaking tests |
| Modify | `src/tests/unit/blockRowSorting.test.ts` | Add Intl.Collator numeric, case, diacritics; null/undefined sort param; empty rows |
| Modify | `src/tests/unit/columnHelpers.test.ts` | Add `getDefaultColumnLabel` for date/time/numbered, alertsEnabled default, and `changeColumnType` cross-type conversions |
| Modify | `src/tests/unit/blockTemplates.test.ts` | Add option overrides (title/blockId/order) and `getBlockTemplateLabel` cases |
| Modify | `src/tests/unit/rowClipboard.test.ts` | Add edges normalization order, fontSize/borderWidth bounds, duplicate column id, non-finite order, missing vs null `cells`, id-mismatch type fallback into shape mapping |

## Implementation Steps

> **Conventions reminder for Dev**: Use `node:test` + `node:assert/strict` (matches existing files). Each new `test(...)` block exercises one concept. Reuse the small `column()`/`row()`/`block()` factory helpers already established in each test file. New files should adopt the same idiom.

### Step 1: Create `formattingToCellStyle.test.ts`

- File: `src/tests/unit/formattingToCellStyle.test.ts`
- Source under test: `src/domain/formatting/formattingToCellStyle.ts`
- Cover the following cases (one `test(...)` each):
  1. `fontFamily` is passed through unchanged.
  2. `fontSize` is rendered as `${n}px` (e.g., `14` → `"14px"`).
  3. `fontSize === undefined` yields `undefined` (no `"undefinedpx"` string).
  4. `bold: true` → `fontWeight: 700`; `bold: false` → `fontWeight: undefined`.
  5. `italic: true` → `fontStyle: "italic"`; `italic: false` → `undefined`.
  6. `underline: true` → `textDecoration: "underline"`; `underline: false` → `undefined`.
  7. `textColor` → `color`, `backgroundColor` → `backgroundColor`.
  8. Empty `{}` input → object with all CSS keys present but values `undefined` (matching the current implementation).

- **Verify**: `npm run test` shows new `describe("formattingToCellStyle")` block passing.

### Step 2: Create `selectedFormattingTarget.test.ts`

- File: `src/tests/unit/selectedFormattingTarget.test.ts`
- Source under test: `src/domain/formatting/selectedFormattingTarget.ts`
- Build local factory helpers for `AppDefaults`, `WorkspaceDocument`, `WorkspaceIndexEntry`, `Block`, `ColumnDefinition`, `Row`, `PersistedCell` (model after the helpers in `alertEvaluation.test.ts`).
- Cover the following cases:
  1. `selection.kind === "none"` returns `null`.
  2. `workspaceDocument === null` returns `null` (any non-`none` selection).
  3. Block not found in document → `null`.
  4. `selection.kind === "block"` returns `{ kind: "block", direct: block.format, effective: <merged with appDefaults> }`.
  5. `selection.kind === "column"`, column found → `{ kind: "column", direct: column.format, effective: <appDefaults + block + column> }`.
  6. `selection.kind === "column"`, column missing → `null`.
  7. `selection.kind === "column"`, column hidden (`visible: false`) → `null` (mirrors `getVisibleColumnsInDisplayOrder` filtering).
  8. `selection.kind === "row"`, row found → `{ kind: "row", direct: row.format, effective: <resolveRowStyle> }`.
  9. `selection.kind === "row"`, row missing → `null`.
  10. `selection.kind === "cell"`, both found and cell has `format` → `{ kind: "cell", direct: cell.format, effective: full chain }`.
  11. `selection.kind === "cell"`, both found but `row.cells[column.id]` undefined → `{ kind: "cell", direct: {}, effective: <appDefaults + block + column + row> }`.
  12. `selection.kind === "cell"`, column missing → `null`.
  13. `selection.kind === "cell"`, row missing → `null`.

- **Verify**: `npm run test` passes new file; each block, column, row, and cell case asserts both `direct` and `effective` payloads.

### Step 3: Extend `alertEvaluation.test.ts`

- File: `src/tests/unit/alertEvaluation.test.ts`
- Add a new `describe("evaluateRow — calendar and time boundaries", ...)` block (or append to existing edge-cases block) with cases:
  1. Leap-year valid: `due = "2024-02-29"` with `now = 2024-03-01 09:00` → `hasAlert: true`.
  2. Non-leap-year Feb 29: `due = "2025-02-29"` → `hasAlert: false` (rejected by calendar-validity roundtrip).
  3. Month `13`: `due = "2025-13-01"` → `hasAlert: false`.
  4. Month `00`: `due = "2025-00-15"` → `hasAlert: false`.
  5. Day `00`: `due = "2025-06-00"` → `hasAlert: false`.
  6. Time exactly `23:59:59` and `now` one second later → `hasAlert: true`.
  7. Time `00:00` with `now` at `00:01` same local day → `hasAlert: true`.
  8. Mixed date and time alert-enabled columns in **one row**: date column has past due (earlier `dueAt`) and time column has past due (later `dueAt`) — `evaluateRow` returns the earlier `dueAt` with the corresponding `columnId`.
- Add to `describe("evaluateWorkspace", ...)`:
  9. Two rows with **exactly equal** `dueAt` — the first row encountered (block iteration order, then row iteration order) wins as `primary`.
  10. Primary alert lives in the **second** block (not the first) — assert `blockId` matches the later block.

- **Verify**: existing tests still pass; new cases added under existing or new `describe` block.

### Step 4: Extend `blockRowSorting.test.ts`

- File: `src/tests/unit/blockRowSorting.test.ts`
- Add cases (new `test(...)` blocks inside the existing `describe`):
  1. Intl.Collator numeric ordering: text values `["2", "10", "1"]` sort to `["1", "2", "10"]` (verifies `numeric: true`).
  2. Case-insensitive ordering: `["b", "A", "C"]` sorts to `["A", "b", "C"]` (verifies `sensitivity: "base"`).
  3. Diacritic-insensitive equality stability: `["café", "cafe"]` sort to display-order stability (both compare equal, stable).
  4. `sortRowsByColumn` with `sort = null` returns rows in display order with `order` reindexed `[0, 1, ...]`.
  5. `sortRowsByColumn` with empty `rows` array → `[]`.
  6. `sortRowsByColumn` with a sort column that exists but `isSortableColumn` returns false (e.g., `numbered`) → returns display order reindexed (already partly covered; add explicit assertion that `order` is reindexed even though id order matches input order).

- **Verify**: `npm run test` passes; new behavior assertions are explicit about reindexing.

### Step 5: Extend `columnHelpers.test.ts`

- File: `src/tests/unit/columnHelpers.test.ts`
- Add cases:
  1. `createColumn("date")` → `label === "Date"`, `settings.alertsEnabled === false`, `width === 220`.
  2. `createColumn("time")` → `label === "Time"`, `settings.alertsEnabled === false`, `width === 220`.
  3. `createColumn("numbered")` → `label === ""`, `width === 44`, `settings` is empty object.
  4. `changeColumnType` text→date when cell value is `"2026-05-11"` → preserved (already covered); but ALSO add: text→date when cell value is `boolean true` (e.g., legacy import) → result is `{value: null, format: {}}`.
  5. `changeColumnType` checkbox→text when value is `true` → cell becomes `{value: "true", format: {}}`; when value is `false` → `{value: "false", format: {}}`.
  6. `changeColumnType` text→checkbox: `"hello"` → `true`; `""` → `false`; `"false"` (literal string) → `true` (because `Boolean("false")` is `true` — this is intentional documented behavior).
  7. `changeColumnType` dropdown→text when value is `"Done"` → preserved as `"Done"`; when value is `null` → `""`.
  8. `changeColumnType` text→bullet → value becomes `null` regardless of source string.

- **Verify**: column conversions match the contract in `changeColumnType.ts`; tests document the `Boolean("false")` quirk.

### Step 6: Extend `blockTemplates.test.ts`

- File: `src/tests/unit/blockTemplates.test.ts`
- Add cases:
  1. `createBlockTemplate("basic_checklist", "ws_1", { title: "Custom" })` → `result.title === "Custom"`.
  2. `createBlockTemplate("basic_checklist", "ws_1", { blockId: "block_explicit" })` → `result.id === "block_explicit"`.
  3. `createBlockTemplate("basic_checklist", "ws_1", { order: 5 })` → `result.order === 5`.
  4. `createBlockTemplate("bulleted_list", "ws_1")` → block has correct default border: `borderWidth: 1`, `borderColor: "#374151"`, `edges: ["top", "right", "bottom", "left"]`, `sort: null`, `collapsed: false`.
  5. `getBlockTemplateLabel("basic_checklist") === "Checklist"`.
  6. `getBlockTemplateLabel("bulleted_list") === "Bullet List"`.
  7. `getBlockTemplateLabel("numbered_list") === "Numbered List"`.
  8. Template row's text-column cell is `{value: "", format: {}}` (not `{value: null}`).

- **Verify**: tests document the visual contract for new blocks.

### Step 7: Extend `rowClipboard.test.ts`

- File: `src/tests/unit/rowClipboard.test.ts`
- Add cases (new `test(...)` blocks inside the existing `describe`):
  1. **Edges canonical order**: deserialize a row whose cell `format.edges` is `["left", "top"]` (out of canonical order) → output `edges` is `["top", "left"]` (the implementation iterates `["top", "right", "bottom", "left"]` and `.filter(...)` preserves that order).
  2. **fontSize bounds**: `fontSize: 0` → dropped; `fontSize: -3` → dropped; `fontSize: NaN` → dropped; `fontSize: 14.5` → kept.
  3. **borderWidth bounds**: `borderWidth: -1` → dropped (already partially covered in existing test); `borderWidth: 0` → kept (matches `>= 0` check); `borderWidth: 2.5` → kept.
  4. **Duplicate source column ids**: `deserializeRowsFromClipboardJson` payload with `source.columns` containing two entries with the same `id` returns `{ ok: false, reason: "invalid-payload" }`.
  5. **Non-finite column order**: source column with `order: NaN` (or `Infinity`) → `{ ok: false, reason: "invalid-payload" }`.
  6. **Row `cells: null`**: row object where `cells === null` → `{ ok: false, reason: "invalid-payload" }`. (Row with `cells` omitted is allowed and yields an empty cell map.)
  7. **Map id-mismatch falls back to shape**: payload with source column id `"src_done"` (type `checkbox`) and target column id `"tgt_done"` (same type, same shape length) — `buildColumnIdMapping` returns null (id missing) and `buildShapeMapping` succeeds → `strategy === "by-shape"`.
  8. **Map by-column-id rejects when types differ**: source column with `{id: "x", type: "text"}` and target with `{id: "x", type: "date"}` — `buildColumnIdMapping` returns null; if shape lengths/types don't match, result is `incompatible-target`.

- **Verify**: all clipboard helper tests pass; assertions about edges order and fontSize precision are explicit.

### Step 8: Run full verification

- Run: `npm run test`
- Run: `npm run lint`
- Both must pass. Investigate and fix any new test that fails. If a test reveals a real bug in domain logic, **stop and route a `dev-to-main.md` message with `State = needs-main-fix`** — do not silently patch domain logic during this dispatch (scope is test-only).

## Data / Storage Changes

None. This dispatch is test-only.

## UI Specifications

None. This dispatch is test-only.

## Acceptance Criteria

- [ ] New file `src/tests/unit/formattingToCellStyle.test.ts` exists with the 8 cases from Step 1.
- [ ] New file `src/tests/unit/selectedFormattingTarget.test.ts` exists with the 13 cases from Step 2.
- [ ] `alertEvaluation.test.ts` gains the 10 new cases from Step 3.
- [ ] `blockRowSorting.test.ts` gains the 6 new cases from Step 4.
- [ ] `columnHelpers.test.ts` gains the 8 new cases from Step 5.
- [ ] `blockTemplates.test.ts` gains the 8 new cases from Step 6.
- [ ] `rowClipboard.test.ts` gains the 8 new cases from Step 7.
- [ ] All new tests are pure (no React render, no Tauri).
- [ ] `npm run test` passes (no regressions, all new tests green).
- [ ] `npm run lint` passes.

## Estimated Complexity

- **Medium** (test-only, ~60 new test cases across 2 new + 5 modified files).
- 7 files touched.
- No architectural decisions; no source changes outside test files (unless a real bug surfaces, in which case escalate to Main).

## Notes for Dev

- Do **not** modify any file under `src/domain/` or `src/services/` during this dispatch. Tests describe current behavior; they do not change it.
- If any new test fails because of a discovered bug, append a `dev-to-main` message with `State = needs-main-fix` and describe the bug + the failing assertion. Do not silently change domain code.
- For deterministic time-based tests (Step 3), construct local `Date` objects with explicit year/month/day/hour/minute/second arguments and pass them as the `now` parameter to `evaluateRow` / `evaluateWorkspace`. Avoid `Date.now()` or wall-clock dependencies.
- The `getBlockTemplateLabel` and template-options cases (Step 6) verify a small but user-facing contract — block creation defaults that surface in the Add Block menu.
