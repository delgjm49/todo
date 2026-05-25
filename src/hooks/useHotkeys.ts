import { useEffect } from "react";
import { useDocumentStore } from "../stores/documentStore.js";
import { useUiStore } from "../stores/uiStore.js";

/**
 * Returns true when the currently focused element is an editable text input,
 * textarea, or contenteditable element. When focus is inside one of these,
 * most global shortcuts are suppressed so the native/cell-level handler wins.
 */
function isEditableElementFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tagName = el.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    (el as HTMLElement).isContentEditable === true
  );
}

/**
 * Centralized hotkey hook that registers a single `keydown` listener on
 * `document` to dispatch standard desktop shortcuts to existing store actions.
 *
 * The hook uses focus-based context routing: when an editable element
 * (input / textarea / contenteditable) has focus, most shortcuts are
 * suppressed so that cell-level `onKeyDown` handlers or native browser
 * behavior takes precedence.
 *
 * Shortcuts are only active when the listener fires on the document bubble
 * phase and `event.defaultPrevented` is false (meaning no cell-level handler
 * already consumed the event).
 */
export function useHotkeys(): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented) return;

      const ctrl = event.ctrlKey && !event.altKey && !event.metaKey;
      const editing = isEditableElementFocused();
      const selection = useUiStore.getState().selection;

      // --- Undo --- Ctrl+Z (not while editing) ---
      if (ctrl && event.key === "z" && !event.shiftKey && !editing) {
        event.preventDefault();
        useDocumentStore.getState().undo();
        return;
      }

      // --- Redo --- Ctrl+Y or Ctrl+Shift+Z (not while editing) ---
      if (
        (ctrl && event.key === "y" && !event.shiftKey) ||
        (ctrl && event.key === "z" && event.shiftKey)
      ) {
        if (!editing) {
          event.preventDefault();
          useDocumentStore.getState().redo();
        }
        return;
      }

      // --- Copy --- Ctrl+C (row selected, not editing) ---
      if (ctrl && event.key === "c" && !editing && selection.kind === "row") {
        event.preventDefault();
        useDocumentStore.getState().copyRows(
          selection.workspaceId,
          selection.blockId,
          [selection.rowId],
        );
        return;
      }

      // --- Cut --- Ctrl+X (row selected, not editing) ---
      if (ctrl && event.key === "x" && !editing && selection.kind === "row") {
        event.preventDefault();
        useDocumentStore.getState().cutRows(
          selection.workspaceId,
          selection.blockId,
          [selection.rowId],
        );
        return;
      }

      // --- Paste --- Ctrl+V (not editing, in a block context) ---
      if (ctrl && event.key === "v" && !editing) {
        if (
          selection.kind === "row" ||
          selection.kind === "block" ||
          selection.kind === "column"
        ) {
          event.preventDefault();
          const targetRowId =
            selection.kind === "row" ? selection.rowId : null;
          useDocumentStore.getState().pasteRows(
            selection.workspaceId,
            selection.blockId,
            targetRowId,
          );
        }
        return;
      }

      // --- Ctrl+A --- prevent browser select-all when in block context ---
      if (ctrl && event.key === "a" && !editing) {
        if (selection.kind !== "none") {
          event.preventDefault();
        }
        return;
      }

      // --- Delete --- remove selected row (not while editing) ---
      if (event.key === "Delete" && !editing && selection.kind === "row") {
        event.preventDefault();
        useDocumentStore.getState().deleteRowFromBlock(
          selection.workspaceId,
          selection.blockId,
          selection.rowId,
        );
        useUiStore.getState().clearSelection();
        return;
      }

      // --- Escape --- close menus → close inspector → clear selection ---
      if (event.key === "Escape") {
        // If focus is inside an editable element, let the cell-level handler
        // deal with it (those handlers call preventDefault).
        if (editing) return;

        const ui = useUiStore.getState();
        const hasMenu = !!(
          ui.workspaceMenu ||
          ui.blockMenu ||
          ui.columnMenu ||
          ui.rowMenu
        );

        if (hasMenu) {
          event.preventDefault();
          if (ui.workspaceMenu) ui.closeWorkspaceMenu();
          if (ui.blockMenu) ui.closeBlockMenu();
          if (ui.columnMenu) ui.closeColumnMenu();
          if (ui.rowMenu) ui.closeRowMenu();
          return;
        }

        if (ui.inspectorOpen) {
          event.preventDefault();
          ui.toggleInspector();
          return;
        }

        if (selection.kind !== "none") {
          event.preventDefault();
          ui.clearSelection();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
}
