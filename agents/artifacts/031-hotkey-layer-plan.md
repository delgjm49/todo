# Plan: Hotkey Layer

## Overview

Build a centralized `useHotkeys` hook that registers document-level keyboard event listeners to dispatch standard desktop shortcuts (undo/redo, clipboard, select-all, delete, escape, enter) to existing store actions. The hook uses focus-based context detection to distinguish "editing a cell" from "block/row selected" and either handles the shortcut or lets the native/component-level handler run. The hook is mounted once in `AppShell`.

## Prerequisites

- TICKET-012 (historyStore undo/redo) — complete
- TICKET-050 (row clipboard UI) — complete
- TICKET-051 (plain text clipboard) — complete
- Selection model (uiStore `Selection` discriminated union) — complete

## Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Create | `src/hooks/useHotkeys.ts` | Centralized hotkey hook — all shortcut routing logic |
| Modify | `src/components/layout/AppShell.tsx` | Mount `useHotkeys()` call |
| Create | `src/tests/unit/useHotkeys.test.ts` | Unit tests for the hotkey routing logic |

## Implementation Steps

### Step 1: Create the `useHotkeys` hook

- **File**: `src/hooks/useHotkeys.ts`
- Create a React hook that registers a single `keydown` listener on `document` in a `useEffect`.
- The hook reads current state from `useUiStore` and `useDocumentStore` via `.getState()` (not subscriptions — the listener is event-driven, not reactive).
- Implement a focus-context helper: `isEditableElementFocused()` that returns `true` when `document.activeElement` is an `<input>`, `<textarea>`, or `[contenteditable]`. When this returns `true`, most shortcuts should be suppressed (fall through to the native/component handler).

**Shortcut routing table:**

| Shortcut | Condition | Action |
|----------|-----------|--------|
| `Ctrl+Z` | Not editing a cell | `documentStore.undo()` |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Not editing a cell | `documentStore.redo()` |
| `Ctrl+C` | Not editing a cell AND selection is `row` | `documentStore.copyRows(sel.workspaceId, sel.blockId, [sel.rowId])` |
| `Ctrl+X` | Not editing a cell AND selection is `row` | `documentStore.cutRows(sel.workspaceId, sel.blockId, [sel.rowId])` |
| `Ctrl+V` | Not editing a cell AND selection includes `workspaceId`+`blockId` (row, block, or column) | `documentStore.pasteRows(sel.workspaceId, sel.blockId, sel.kind === "row" ? sel.rowId : null)` |
| `Ctrl+A` | Not editing a cell AND selection includes `blockId` | Select all rows — call `documentStore.copyRows` for all row IDs in the block? No — `Ctrl+A` = "select all" in UI sense. Since the app has single-row selection only (no multi-select yet), defer this to a no-op or a future multi-select ticket. **Decision: skip `Ctrl+A` implementation.** The dispatch lists it, but multi-select (TICKET-XXX) is explicitly out of scope and `Ctrl+A` without multi-select has no meaningful action. The hook should still prevent default when focus is in block context to avoid the browser selecting all page text. |
| `Delete` | Not editing a cell AND selection is `row` | `documentStore.deleteRowFromBlock(sel.workspaceId, sel.blockId, sel.rowId)` then `uiStore.clearSelection()` |
| `Escape` | Always (even when editing — but only for menu/inspector dismissal, not cell revert which cells handle themselves) | Close open menus: `closeWorkspaceMenu()`, `closeBlockMenu()`, `closeColumnMenu()`, `closeRowMenu()`. If inspector is open and no menu was open, `toggleInspector()`. If nothing to close, `clearSelection()`. Cells already handle their own Escape via `onKeyDown`, so when an editable element is focused, the cell handler runs first (it calls `preventDefault`). The document-level handler checks `event.defaultPrevented` and skips if already handled. |
| `Enter` | Not editing a cell AND selection is `row` or `cell` | No global Enter action defined in current UI (rows don't have a "confirm" action at block level). Skip — cells handle Enter themselves. If a popover/menu is open, Enter is handled by the menu component. |

**Key design decisions:**

1. **Event phase**: Use `addEventListener` on `document` with default (bubble) phase. Cell-level `onKeyDown` handlers fire first (on the input element). If they call `event.preventDefault()`, the document listener sees `event.defaultPrevented === true` and skips.
2. **Modifier detection**: Use `event.ctrlKey` only (Windows-first per spec). Do not check `event.metaKey`. This means `Cmd+Z` on Mac won't work, which is acceptable per the "macOS-specific keybindings are out of scope" constraint.
3. **No provider needed**: A hook mounted in `AppShell` is sufficient. No React context or provider component is required since all state is in Zustand stores (globally accessible via `getState()`).

**Implementation detail — the handler function:**

```typescript
function handleKeyDown(event: KeyboardEvent): void {
  if (event.defaultPrevented) return;

  const ctrl = event.ctrlKey && !event.altKey && !event.metaKey;
  const editing = isEditableElementFocused();
  const selection = useUiStore.getState().selection;
  const ui = useUiStore.getState();

  // Undo
  if (ctrl && event.key === "z" && !event.shiftKey && !editing) {
    event.preventDefault();
    useDocumentStore.getState().undo();
    return;
  }

  // Redo (Ctrl+Y or Ctrl+Shift+Z)
  if ((ctrl && event.key === "y" && !event.shiftKey) ||
      (ctrl && event.key === "z" && event.shiftKey)) {
    if (!editing) {
      event.preventDefault();
      useDocumentStore.getState().redo();
    }
    return;
  }

  // Copy
  if (ctrl && event.key === "c" && !editing && selection.kind === "row") {
    event.preventDefault();
    useDocumentStore.getState().copyRows(selection.workspaceId, selection.blockId, [selection.rowId]);
    return;
  }

  // Cut
  if (ctrl && event.key === "x" && !editing && selection.kind === "row") {
    event.preventDefault();
    useDocumentStore.getState().cutRows(selection.workspaceId, selection.blockId, [selection.rowId]);
    return;
  }

  // Paste
  if (ctrl && event.key === "v" && !editing) {
    if (selection.kind === "row" || selection.kind === "block" || selection.kind === "column") {
      event.preventDefault();
      const targetRowId = selection.kind === "row" ? selection.rowId : null;
      useDocumentStore.getState().pasteRows(selection.workspaceId, selection.blockId, targetRowId);
    }
    return;
  }

  // Ctrl+A — prevent browser select-all when in block context
  if (ctrl && event.key === "a" && !editing) {
    if (selection.kind !== "none") {
      event.preventDefault();
    }
    return;
  }

  // Delete
  if (event.key === "Delete" && !editing && selection.kind === "row") {
    event.preventDefault();
    useDocumentStore.getState().deleteRowFromBlock(selection.workspaceId, selection.blockId, selection.rowId);
    useUiStore.getState().clearSelection();
    return;
  }

  // Escape — close menus, inspector, or clear selection
  if (event.key === "Escape" && !event.defaultPrevented) {
    // Don't handle if an editable element already handled it
    if (editing) return;

    const hasMenu = !!(ui.workspaceMenu || ui.blockMenu || ui.columnMenu || ui.rowMenu);
    if (hasMenu) {
      event.preventDefault();
      if (ui.workspaceMenu) useUiStore.getState().closeWorkspaceMenu();
      if (ui.blockMenu) useUiStore.getState().closeBlockMenu();
      if (ui.columnMenu) useUiStore.getState().closeColumnMenu();
      if (ui.rowMenu) useUiStore.getState().closeRowMenu();
      return;
    }

    if (ui.inspectorOpen) {
      event.preventDefault();
      useUiStore.getState().toggleInspector();
      return;
    }

    if (selection.kind !== "none") {
      event.preventDefault();
      useUiStore.getState().clearSelection();
    }
  }
}
```

- **Verify**: Import the hook and confirm TypeScript compiles with `npx tsc --noEmit`.

### Step 2: Mount the hook in AppShell

- **File**: `src/components/layout/AppShell.tsx`
- Import `useHotkeys` from `../../hooks/useHotkeys.js`.
- Call `useHotkeys()` at the top of the `AppShell` component function body.
- The hook only runs on the main screen (AppShell); the settings page does not need hotkeys.
- **Verify**: The app still renders correctly with no console errors.

### Step 3: Write unit tests

- **File**: `src/tests/unit/useHotkeys.test.ts`
- Test the shortcut routing logic directly by:
  1. Setting up the Zustand stores with known state (using `useHistoryStore.setState()`, `useUiStore.setState()`, and `useDocumentStore.setState()` or equivalent).
  2. Dispatching `KeyboardEvent` on `document`.
  3. Asserting the expected store state changes.

**Test cases:**

| Test | Setup | Key event | Expected |
|------|-------|-----------|----------|
| Ctrl+Z triggers undo | Initialize history with 2 snapshots; present = snapshot 2 | `Ctrl+Z` | `present` reverts to snapshot 1, `canRedo` is true |
| Ctrl+Y triggers redo | After an undo | `Ctrl+Y` | `present` advances back |
| Ctrl+Shift+Z triggers redo | After an undo | `Ctrl+Shift+Z` | Same as Ctrl+Y |
| Ctrl+Z suppressed when editing | Focus an `<input>` element | `Ctrl+Z` | Store state unchanged |
| Ctrl+C copies selected row | selection = `{ kind: "row", ... }`, row exists in store | `Ctrl+C` | `clipboardPayload` is set, `clipboardOperation` = "copy" |
| Ctrl+X cuts selected row | selection = `{ kind: "row", ... }` | `Ctrl+X` | Row removed from block, clipboard set |
| Ctrl+V pastes at selected row | clipboard populated, selection = row | `Ctrl+V` | New row inserted at selected position |
| Ctrl+C suppressed when editing | Focus an `<input>`, selection = row | `Ctrl+C` | `clipboardPayload` unchanged |
| Delete removes selected row | selection = row | `Delete` | Row removed, selection cleared |
| Delete suppressed when editing | Focus an `<input>`, selection = row | `Delete` | Row still present |
| Escape closes open menus | blockMenu is set | `Escape` | blockMenu is null |
| Escape closes inspector when no menus | inspectorOpen = true, no menus | `Escape` | inspectorOpen = false |
| Escape clears selection when nothing else open | selection = row, no menus, inspector closed | `Escape` | selection = `{ kind: "none" }` |
| Escape is no-op when editing | Focus an `<input>` | `Escape` | No store changes (cell handles it) |
| Ctrl+A prevents default in block context | selection = block | `Ctrl+A` | `event.defaultPrevented` = true |
| Shortcuts do nothing on settings screen | The hook is not mounted (it lives in AppShell, not SettingsPage) | — | N/A (architectural guarantee) |

- Use `vi.spyOn` on store methods where direct state inspection is cleaner than checking side effects.
- For the "editing" tests, create a temporary `<input>` element, append it to `document.body`, focus it, dispatch the event, then clean up.
- **Verify**: `npm run test -- --run src/tests/unit/useHotkeys.test.ts` passes.

### Step 4: Final verification

- Run `npm run lint` and `npm run test` (full suite).
- Confirm no regressions in existing cell keyboard behavior tests (`textCellClipboard.test.tsx`, `rowEditing.test.tsx`).

## Data / Storage Changes

None. This feature wires existing store actions to keyboard events. No new persisted state.

## UI Specifications

No new visual components. The hook is invisible — it only adds keyboard event handling. No loading/empty/error states apply.

## Acceptance Criteria

- [ ] `src/hooks/useHotkeys.ts` exists and exports a `useHotkeys` hook
- [ ] `useHotkeys()` is called in `AppShell`
- [ ] `Ctrl+Z` triggers undo via `documentStore.undo()` when not editing a cell
- [ ] `Ctrl+Y` and `Ctrl+Shift+Z` trigger redo via `documentStore.redo()` when not editing a cell
- [ ] `Ctrl+C` / `Ctrl+X` / `Ctrl+V` trigger row clipboard actions when a row is selected and not editing a cell
- [ ] `Ctrl+A` prevents browser select-all when selection is in a block context (full "select all rows" deferred to multi-select ticket)
- [ ] `Delete` removes the selected row when not editing a cell
- [ ] `Escape` closes menus, then inspector, then clears selection (in priority order)
- [ ] All shortcuts are suppressed when focus is inside an editable element (input/textarea/contenteditable)
- [ ] Existing cell editing keyboard behaviors continue to work unchanged
- [ ] Unit tests cover all major shortcut families
- [ ] `npm run test` passes
- [ ] `npm run lint` passes

## Architectural Notes

- **Ctrl+A deferred**: The dispatch artifact lists `Ctrl+A → select all rows`, but the app has no multi-row selection model. The hook prevents browser select-all in block context but does not implement row multi-select. This is an intentional scope reduction; multi-select is a separate ticket.
- **No provider pattern**: A simple hook is used rather than a `HotkeyProvider` context. The tech spec permits either approach. A hook is simpler and sufficient since all state lives in Zustand stores (no React context needed for store access). If custom keybinding configuration is added later (out of scope for v1), migrating to a provider would be straightforward.
- **Enter not wired globally**: No global Enter handler is implemented. Cells handle their own Enter for commit, and menus handle Enter for selection. There is no block-level Enter action in the current UI.

## Estimated Complexity

- **Small-Medium**
- 3 files touched (1 new hook, 1 modified component, 1 new test file)
