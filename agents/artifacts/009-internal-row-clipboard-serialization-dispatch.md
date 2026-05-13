# Dispatch: TICKET-049 Internal Row Clipboard Serialization

## What
Implement pure domain support for serializing selected rows into an app-owned clipboard payload and mapping that payload back into rows for a compatible target block. This should establish the internal row clipboard contract that later UI flows can use without yet wiring OS clipboard, context menus, hotkeys, or paste commands.

## Why
`TICKET-048` completed sorting UI, leaving row clipboard support as the next `EPIC-09` desktop-efficiency feature. `TICKET-049` should make row copy/paste behavior safe and testable at the data layer before `TICKET-050` adds cut/copy/paste UI flows.

## Scope
- Create focused pure helpers under `src/domain/clipboard/` for internal row clipboard payloads.
- Define a small versioned JSON payload shape with an app-specific marker so malformed or non-app payloads can be rejected safely.
- Serialize rows from a source block in current display order, including row formatting and cell payload/format data needed to preserve structure.
- Include enough source column metadata to decide whether a payload can be pasted into a target block.
- Deserialize/validate unknown JSON input into a typed internal payload without throwing for malformed data.
- Map a valid internal row payload into a target block for:
  - same-block or same-column-id pastes where compatible cells can be copied by column id,
  - cross-block compatible-shape pastes where the target column type sequence matches the source payload.
- Generate fresh row ids for mapped rows and avoid mutating source rows, source payloads, or target blocks.
- Preserve compatible row formatting and cell formatting/value payloads where valid for the target column type.
- Fill target cells with default cells when a compatible source cell is missing or unusable.
- Add targeted unit tests for serialization, malformed deserialization, same-block mapping, compatible cross-block mapping, incompatible target rejection, fresh ids, display-order preservation, and source immutability.

## Out of Scope
- OS clipboard read/write APIs, Tauri clipboard integration, or plain-text clipboard fallbacks.
- Context menu, block menu, row menu, keyboard shortcut, selected-row, cut, copy, or paste UI flows.
- Store actions that mutate documents with pasted rows, history transactions, or insertion-position behavior.
- Text-cell plain text clipboard behavior (`TICKET-051`).
- Hotkeys (`TICKET-052`), alerts, packaging, autosave, column resize, inspector type-specific settings, or sorting changes.
- Storage schema changes; internal clipboard payloads are transient and should not alter persisted workspace files.

## Related Spec Sections
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md` — `TICKET-049: Implement clipboard serialization for internal rows`
- `docs/TODO_APP_TECH_SPEC.md` — project structure `domain/clipboard/`, Copy/Paste Design
- `docs/TODO_APP_UI_SPEC.md` — standard desktop shortcut expectations, later consumed by UI tickets
- `src/types/block.ts`
- `src/types/column.ts`
- `src/types/row.ts`
- `src/domain/rows/createRow.ts`
- `src/domain/rows/reorderRows.ts`

## Constraints
- Keep the implementation pure and deterministic apart from injectable/default row id generation.
- Do not introduce runtime dependencies.
- Do not mutate source rows, columns, payloads, or target blocks.
- Use existing type definitions for blocks, columns, rows, cells, and formatting.
- Prefer non-throwing parse/map APIs that return explicit success/failure results so later UI can show safe disabled/error states.
- Keep compatibility rules conservative: reject incompatible target blocks rather than silently dropping user data in surprising ways.
- Do not change existing row editing, sorting, checkbox automation, formatting, storage, or UI behavior.

## Acceptance Criteria
- [ ] Internal row clipboard payloads can be serialized from selected source rows in display order.
- [ ] Serialized payloads preserve row formatting and compatible cell values/formats without retaining source row ids for pasted rows.
- [ ] Unknown/malformed JSON payloads are rejected safely without throwing.
- [ ] Mapping into the same block or a target block with matching column ids/types produces fresh rows with fresh ids and copied compatible cells.
- [ ] Mapping into a cross-block target with matching column type sequence produces fresh rows mapped by display-order shape.
- [ ] Mapping into an incompatible target block returns a clear failure/no-op result without mutation.
- [ ] Missing or invalid compatible cells are filled with default cells for the target column type.
- [ ] Unit tests cover serialization, deserialization failure, same-block mapping, cross-block compatible mapping, incompatible mapping, id regeneration, display-order preservation, formatting preservation, and immutability.
- [ ] Existing verification remains green: typecheck, unit tests, build, and lint.
