# Complete: TICKET-049 Internal Row Clipboard Serialization

## Summary
Implemented pure domain support for internal row clipboard payloads for `TICKET-049`.

- Added a versioned app-owned row clipboard payload contract with marker/version constants and explicit serialize/deserialize/map result unions.
- Added row serialization from source block display order, preserving source column metadata, row formatting, and valid compatible cell payloads/formats.
- Added non-throwing JSON deserialization and conservative payload normalization for marker/version/source/row/cell validation.
- Added target-block row mapping with fresh row ids, `by-column-id` same-id mapping, `by-shape` compatible cross-block mapping, target-only default cell filling, and immutable source/target behavior.
- Added focused unit tests covering serialization order, malformed deserialization, invalid cell normalization, same-id mapping, shape mapping, incompatible targets, fresh ids, defaults, formatting preservation, and immutability.

## Files Changed
- `src/domain/clipboard/rowClipboardTypes.ts`
- `src/domain/clipboard/serializeRows.ts`
- `src/domain/clipboard/deserializeRows.ts`
- `src/domain/clipboard/mapPastedRows.ts`
- `src/domain/clipboard/index.ts`
- `src/tests/unit/rowClipboard.test.ts`

## Implementation Notes
- `serializeRowsForClipboard(block, selectedRowIds)` filters selected rows after `getRowsInDisplayOrder(block.rows)`, so caller id order cannot alter clipboard order.
- Serialization includes all source block columns in stable `order` sequence, not only visible columns.
- Invalid or missing individual source cells are omitted from the payload; paste mapping fills the target cell via `createCellForColumn()`.
- `deserializeRowsFromClipboardJson(raw)` catches parse errors and returns explicit failure reasons for invalid JSON, non-app payloads, unsupported versions, or malformed payload structures.
- `mapClipboardRowsToBlock(payload, targetBlock, options?)` first attempts strict same-column-id/type mapping with target-only extras allowed, then exact compatible-shape mapping by ordered column type sequence.
- Pasted rows always receive generated row ids and sequential orders from `options.startOrder ?? 0`; source row ids remain metadata only.
- The implementation is domain-only and does not add OS clipboard APIs, UI/context menus, hotkeys, store mutations/history, insertion-position behavior, alerts, packaging, or storage schema changes.

## Verification Results

- command: `npm run typecheck`
- shell used: Bash via pi harness on macOS/zsh environment
- result: PASS
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
- was this the actual shell provided by the environment: yes

- command: `npm run test`
- shell used: Bash via pi harness on macOS/zsh environment
- result: PASS — 173/173 tests passed; existing React `act(...)` warnings were printed by pre-existing UI test patterns
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
- was this the actual shell provided by the environment: yes

- command: `npm run build`
- shell used: Bash via pi harness on macOS/zsh environment
- result: PASS
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
- was this the actual shell provided by the environment: yes

- command: `npm run lint`
- shell used: Bash via pi harness on macOS/zsh environment
- result: PASS
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped verification passed
- was this the actual shell provided by the environment: yes

## Acceptance Criteria Status
- [x] Internal row clipboard payloads can be serialized from selected source rows in display order.
- [x] Serialized payloads preserve row formatting and compatible cell values/formats without reusing source row ids for pasted rows.
- [x] Unknown/malformed JSON payloads are rejected safely without throwing.
- [x] Mapping into the same block or a target block with matching column ids/types produces fresh rows with fresh ids and copied compatible cells.
- [x] Mapping into a cross-block target with matching column type sequence produces fresh rows mapped by display-order shape.
- [x] Mapping into an incompatible target block returns a clear failure/no-op result without mutation.
- [x] Missing or invalid compatible cells are filled with default cells for the target column type.
- [x] Unit tests cover serialization, deserialization failure, same-block/id mapping, cross-block compatible mapping, incompatible mapping, id regeneration, display-order preservation, formatting preservation, and immutability.
- [x] Existing verification remains green: `npm run typecheck`, `npm run test`, `npm run build`, and `npm run lint`.
