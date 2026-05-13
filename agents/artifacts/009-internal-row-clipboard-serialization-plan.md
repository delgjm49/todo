# Plan: TICKET-049 Internal Row Clipboard Serialization

## Overview
Implement pure domain helpers for app-owned row clipboard payloads under `src/domain/clipboard/`. The work should define a versioned internal JSON contract, safely deserialize unknown clipboard text without throwing, and map valid row payloads into compatible target blocks with fresh row ids, preserved row/cell formatting, and default cells where source cells are absent or unusable. Keep this ticket domain-only: no OS clipboard service, UI menus/hotkeys, store paste actions, history integration, insertion positioning, alerts, or storage schema changes.

## Prerequisites
- Existing row/column/block types are the source of truth for payload values and formatting.
- Use `createCellForColumn()` for target default cells and `createId("row")` as the default row id generator.
- Use display-order semantics already established by row helpers: selected source rows are serialized in `getRowsInDisplayOrder(block.rows)` order.

## Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Create | `src/domain/clipboard/rowClipboardTypes.ts` | Shared constants, payload/result types, reason enums, and small runtime type helpers. |
| Create | `src/domain/clipboard/serializeRows.ts` | Build and JSON-stringify internal row clipboard payloads from a block and selected row ids. |
| Create | `src/domain/clipboard/deserializeRows.ts` | Non-throwing parse/validation/normalization for unknown internal row clipboard JSON. |
| Create | `src/domain/clipboard/mapPastedRows.ts` | Map a valid internal payload to fresh rows for a compatible target block. |
| Create | `src/domain/clipboard/index.ts` | Barrel export for clipboard domain helpers. |
| Create | `src/tests/unit/rowClipboard.test.ts` | Targeted node:test unit coverage for serialization, deserialization, mapping, formatting, defaults, ids, order, and immutability. |
| Optional | `src/domain/clipboard/.gitkeep` | Remove only if the new files make it unnecessary. |

## Implementation Steps

### Step 1: Define the internal payload contract
- In `rowClipboardTypes.ts`, define an app-specific marker and version, for example:
  - `INTERNAL_ROW_CLIPBOARD_MARKER = "todo-app.internal-row-clipboard"`
  - `INTERNAL_ROW_CLIPBOARD_VERSION = 1`
- Define payload types similar to:
  - `InternalRowClipboardColumn = { id: ColumnId; type: ColumnType; order: number }`
  - `InternalRowClipboardRow = { sourceRowId: RowId; order: number; format: RowFormatting; cells: Partial<Record<ColumnId, PersistedCell>> }`
  - `InternalRowClipboardPayload = { marker; version; source: { blockId: BlockId; blockType: BlockType; columns: InternalRowClipboardColumn[] }; rows: InternalRowClipboardRow[] }`
- Define explicit result unions:
  - serialize result: success with `{ payload, json }`, failure with a reason such as `"no-rows"`.
  - deserialize result: success with `{ payload }`, failure with reasons such as `"invalid-json"`, `"invalid-marker"`, `"unsupported-version"`, `"invalid-payload"`.
  - map result: success with `{ rows, strategy }`, failure with reasons such as `"empty-payload"`, `"incompatible-target"`.
- Add small local runtime guards/normalizers for plain objects, column types, cell payloads, and formatting layers. Keep them dependency-free.
- **Verify**: Types compile under strict TypeScript and do not introduce any persisted schema types.

### Step 2: Implement row serialization
- In `serializeRows.ts`, export a pure helper such as `serializeRowsForClipboard(block: Block, selectedRowIds: RowId[]): SerializeInternalRowsResult`.
- Sort source columns by `column.order` with stable input-order fallback. Include all block columns, not only visible columns, so same-block payloads do not silently drop hidden/structural cells.
- Sort source rows with `getRowsInDisplayOrder(block.rows)`, then filter by a `Set` of selected ids so caller order cannot change clipboard order.
- For each serialized row:
  - preserve `sourceRowId`, display-order `order`, and a structured clone of `row.format`.
  - include cells only for source columns and only when the payload value is valid for that source column type; omit missing/unusable cells so paste can fill defaults.
  - preserve valid `cell.format` via structured clone/normalization.
- Return failure for no matched rows rather than throwing.
- Return compact JSON via `JSON.stringify(payload)` along with the typed payload.
- **Verify**: Unit tests can assert selected rows are serialized in display order, row/cell formatting is present, source row ids remain source-only metadata, and source block/rows are unmodified.

### Step 3: Implement non-throwing deserialization and validation
- In `deserializeRows.ts`, export `deserializeRowsFromClipboardJson(raw: string): DeserializeInternalRowsResult`.
- Catch `JSON.parse` errors and return `invalid-json`; never throw for malformed input.
- Reject non-objects, wrong marker, unsupported version, missing/invalid source metadata, invalid columns array, duplicate source column ids, and non-array rows.
- Normalize rows conservatively:
  - require a string `sourceRowId` and numeric/order-compatible row order.
  - require row `cells` to be a plain object if present.
  - for each known source column, keep the cell only if its value matches the column type (`text` string, `checkbox` boolean, `bullet`/`numbered` null, `date`/`time`/`dropdown` string or null).
  - omit invalid cell formats/properties rather than accepting arbitrary values.
  - allow missing/invalid individual cells to be omitted so mapping can create target defaults.
- Sort/retain rows in payload order as normalized from the clipboard; serialization should already have used display order.
- **Verify**: Tests cover invalid JSON, non-app JSON, unsupported version, malformed top-level payload rejection, and invalid cell normalization without thrown exceptions.

### Step 4: Implement conservative target-block mapping
- In `mapPastedRows.ts`, export a pure helper such as:
  - `mapClipboardRowsToBlock(payload: InternalRowClipboardPayload, targetBlock: Block, options?: { generateRowId?: () => RowId; startOrder?: number }): MapClipboardRowsResult`.
- Determine source and target columns in stable order by `order`.
- Choose one conservative mapping strategy:
  1. `by-column-id`: valid when every source column can be found in the target by the same id and same type. Target-only extra columns are allowed and should receive default cells.
  2. `by-shape`: valid when target/source ordered column counts match exactly and every ordered column type matches; map source column at index `i` to target column at index `i`.
  3. Otherwise return `incompatible-target` with no rows.
- For each output row:
  - generate a fresh id via `options.generateRowId ?? (() => createId("row"))`.
  - set `order` to `(options.startOrder ?? 0) + index`.
  - preserve valid row formatting.
  - create every target cell. Use a cloned compatible source cell when a mapping exists and the source cell is valid for the target column type; otherwise use `createCellForColumn(targetColumn)`.
- Do not mutate the payload, target block, or source cell objects. Use `structuredClone` where needed.
- **Verify**: Unit tests cover same-block/id mapping, shape mapping across different column ids, incompatible rejection, fresh ids, default target-cell filling, formatting preservation, output row order, and immutability.

### Step 5: Export helpers and add tests
- Add `src/domain/clipboard/index.ts` exports for the public helpers/types that later UI/store tickets will consume.
- Add `src/tests/unit/rowClipboard.test.ts` using the existing `node:test` + `node:assert/strict` style.
- Suggested test cases:
  1. serializes selected rows in display order, not caller id order.
  2. serialized payload contains marker/version/source columns and preserves row/cell formats.
  3. malformed/non-app/unsupported JSON deserialization returns failure and does not throw.
  4. same-block or same-id mapping creates fresh ids and copies compatible values/formats.
  5. compatible cross-block shape mapping maps values by column position when ids differ.
  6. incompatible target block returns a failure/no-op result.
  7. missing or invalid source cells produce default target cells.
  8. source block, payload, and target block remain unchanged after serialization/mapping.
- **Verify**: Targeted test file passes in addition to the full project verification below.

## Data / Storage Changes
None. Clipboard payloads are transient app-owned JSON strings and must not alter workspace persistence schemas or migration logic.

## UI Specifications
None for this ticket. Do not add context menus, hotkeys, OS clipboard integration, selected-row UI behavior, alerts, insertion-position UX, or store mutations. Later tickets will consume these pure helpers.

## Acceptance Criteria
- [ ] Internal row clipboard payloads can be serialized from selected source rows in display order.
- [ ] Serialized payloads preserve row formatting and compatible cell values/formats without reusing source row ids for pasted rows.
- [ ] Unknown/malformed JSON payloads are rejected safely without throwing.
- [ ] Mapping into the same block or a target block with matching column ids/types produces fresh rows with fresh ids and copied compatible cells.
- [ ] Mapping into a cross-block target with matching column type sequence produces fresh rows mapped by display-order shape.
- [ ] Mapping into an incompatible target block returns a clear failure/no-op result without mutation.
- [ ] Missing or invalid compatible cells are filled with default cells for the target column type.
- [ ] Unit tests cover serialization, deserialization failure, same-block/id mapping, cross-block compatible mapping, incompatible mapping, id regeneration, display-order preservation, formatting preservation, and immutability.
- [ ] Existing verification remains green: `npm run typecheck`, `npm run test`, `npm run build`, and `npm run lint`.

## Estimated Complexity
- Medium.
- Estimated file count: 5 new domain files plus 1 unit test file.
