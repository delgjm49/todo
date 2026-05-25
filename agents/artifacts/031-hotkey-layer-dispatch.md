# Dispatch: Hotkey Layer

## What
Build a centralized hotkey layer that wires standard desktop keyboard shortcuts to the app's existing store actions and editing flows. The layer should be implemented as a dedicated hook or provider (per the tech spec) so shortcuts stay centralized and maintainable.

## Why
The app currently has no global shortcut system. Individual components (TextCell, DateCell, TimeCell, BlockCard title, TypeSpecificColumnSettings) each handle their own `onKeyDown` events for editing behaviors. This ticket creates a unified layer so users can trigger undo/redo, copy/cut/paste, select-all, delete, enter, and escape from the keyboard in appropriate contexts — a core desktop-app expectation that naturally follows the clipboard work in TICKET-049 through TICKET-051.

## Scope

### In scope
- Centralized hotkey hook/provider (`useHotkeys` or `HotkeyProvider`) that registers and dispatches shortcuts
- **Undo / Redo**: `Ctrl+Z` and `Ctrl+Y` (or `Ctrl+Shift+Z`) → `historyStore.undo()` / `historyStore.redo()`
- **Copy / Cut / Paste**: `Ctrl+C` / `Ctrl+X` / `Ctrl+V` → wire to existing row clipboard actions (`documentStore.copyRows`, `cutRows`, `pasteRows`) when rows are selected; fall back to native behavior when editing a text cell
- **Select all**: `Ctrl+A` → select all rows in the active block when focus is in a block context
- **Delete**: `Delete` key → delete selected row(s) when rows are selected
- **Enter**: confirm/commit action in applicable contexts (e.g., close a popover, confirm a rename)
- **Escape**: cancel/close action in applicable contexts (e.g., close inspector, cancel editing, close menus)
- Context-aware routing: shortcuts should behave differently when focus is inside an editable cell vs. on a block/card vs. on a global/app level
- Prevent shortcut conflicts with existing cell `onKeyDown` handlers (e.g., TextCell's Enter/Escape/clipboard guard should continue to work)
- Unit tests for the hotkey layer and context routing logic

### Out of scope
- Custom keybinding configuration or remapping UI
- Advanced keyboard navigation (arrow-key selection movement, tab between cells)
- Multi-select or range selection (not yet implemented)
- macOS-specific keybindings (`Cmd` vs `Ctrl`) — Windows-first for v1
- Global app-level shortcuts when the app does not have focus

## Related Spec Sections
- docs/TODO_APP_TECH_SPEC.md §Hotkeys (shortcuts list and `useHotkeys` hook/provider recommendation)
- docs/TODO_APP_IMPLEMENTATION_BACKLOG.md TICKET-052
- docs/TODO_APP_UI_SPEC.md §Keyboard interactions (if any)

## Constraints
- Use the existing store actions; do not recreate undo/redo, clipboard, or row deletion logic
- The centralized layer must not break existing cell editing keyboard behavior (TextCell, DateCell, TimeCell, BlockCard title editing, TypeSpecificColumnSettings option editing)
- Use `window`/`document` level event listeners with proper cleanup
- Consider focus-based context rather than route-based context for shortcut routing
- Follow existing patterns: hooks live in `src/hooks/`, providers in `src/providers/`
- Add tests alongside implementation (pure domain logic) or in `tests/unit/` (React integration)

## Acceptance Criteria
- [ ] A centralized `useHotkeys` hook or `HotkeyProvider` exists and is integrated into the app shell
- [ ] `Ctrl+Z` triggers undo and `Ctrl+Y` (or `Ctrl+Shift+Z`) triggers redo via `historyStore`
- [ ] `Ctrl+C` / `Ctrl+X` / `Ctrl+V` trigger row clipboard actions when row(s) are selected, without interfering with text-cell native clipboard when a text input has focus
- [ ] `Ctrl+A` selects all rows in the active block when focus is in a block context
- [ ] `Delete` removes selected row(s) when focus is in a block context
- [ ] `Escape` closes open popovers/menus/inspector and cancels active edits where applicable
- [ ] `Enter` confirms applicable actions (e.g., closes a popover, commits a rename) where it does not conflict with cell editing
- [ ] Existing cell editing keyboard behaviors (Enter to commit, Escape to revert, Ctrl+C/X/V/A in text inputs) continue to work unchanged
- [ ] Unit tests cover shortcut routing logic and at least one integration test per major shortcut family (undo/redo, clipboard, select-all/delete, escape/enter)
- [ ] `npm run test` passes (including new tests)
- [ ] `npm run lint` passes
