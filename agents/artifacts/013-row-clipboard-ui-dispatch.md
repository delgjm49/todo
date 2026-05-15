# Dispatch: Row Clipboard UI (Cut / Copy / Paste)

## What
Wire the TICKET-049 internal row clipboard serialization helpers into real cut, copy, and paste UI flows. Add a row-level context menu with Cut / Copy / Paste actions, clipboard state management in the UI store, and `documentStore` actions for the three operations — all backed by the existing pure domain clipboard helpers.

## Why
TICKET-049 added the serialization layer (pure helpers for encoding/decoding row payloads), but they have no consumer yet. This ticket connects them to real user interactions so rows can be cut, copied, and pasted within and across blocks. The existing row add/insert/delete UI (TICKET-035) and drag reorder (TICKET-036) provide the row-level interaction patterns and mutation APIs this work builds on.

## Scope
- Row-level context menu (right-click on a row) with Cut, Copy, Paste actions
- `uiStore` clipboard state: a single `InternalRowClipboardPayload | null` plus a `clipboardOperation: "cut" | "copy" | null` field
- `documentStore` actions: `cutRows`, `copyRows`, `pasteRows` — each routing through the TICKET-049 domain helpers
  - `cutRows`: serialize selected rows → store in uiStore clipboard → delete the source rows from the block
  - `copyRows`: serialize selected rows → store in uiStore clipboard (source rows untouched)
  - `pasteRows`: deserialize clipboard payload → map into target block → insert mapped rows above/below the target row (or at end of block if no target row)
- Paste insertion: above the right-clicked row when available; end-of-block fallback when right-clicking an empty area or header
- Context menu: disable Cut/Copy when no rows are selected (or selection is not a row in the right-clicked block); disable Paste when clipboard is empty or the target block is incompatible
- Targeted unit tests for store clipboard actions and UI context menu behavior
- Fresh unique row IDs for all pasted rows (already handled by TICKET-049's `mapPastedRows`)

## Explicitly OUT of Scope
- Plain text system clipboard (TICKET-051)
- Keyboard shortcuts / hotkey layer (TICKET-052)
- Copy/paste across app restarts (clipboard is in-memory only — ephemeral UI store state)
- Copy/paste formatting-only (source formatting is preserved through the TICKET-049 payload, which is in scope)
- Block-level clipboard (only rows, not whole blocks)
- Multiple-selection clipboard (single contiguous selection only for v1)
- Any schema/storage changes

## Related Spec Sections
- `docs/TODO_APP_IMPLEMENTATION_BACKLOG.md` TICKET-050
- `docs/TODO_APP_TECH_SPEC.md` §Clipboard
- `docs/TODO_APP_UI_SPEC.md` §Row Interactions

## Constraints
- Must use the existing TICKET-049 domain helpers (`serializeRowsForClipboard`, `deserializeRowsFromClipboardJson`, `mapClipboardRowsToBlock`) — no new serialization logic
- Must use existing `insertRowInBlock` and `deleteRowFromBlock` store actions for row insertion/deletion
- Must follow the existing context menu pattern established by `BlockContextMenu` and `ColumnContextMenu`
- Clipboard state lives in `uiStore` (ephemeral, not persisted)

## Acceptance Criteria
- [ ] Right-clicking a row opens a row context menu with Cut, Copy, and Paste actions
- [ ] Cut: selected rows are serialized, stored in clipboard state, and removed from the source block in one undoable transaction
- [ ] Copy: selected rows are serialized and stored in clipboard state without modifying source rows
- [ ] Paste: clipboard rows are deserialized, mapped to the target block, and inserted above the right-clicked target row
- [ ] Paste at end of block when no row target exists
- [ ] Cut/Copy are disabled when no valid row selection exists for the right-clicked block
- [ ] Paste is disabled when clipboard is empty or target block is incompatible
- [ ] All three operations are undoable (wrapped in `formatting` history transactions)
- [ ] Pasted rows receive fresh unique IDs
- [ ] Row formatting (text, fill, border) is preserved through cut/copy/paste
- [ ] Unit tests cover cut, copy, paste store actions and context menu rendering states
