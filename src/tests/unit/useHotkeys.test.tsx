import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useDocumentStore } from "../../stores/documentStore.js";
import { useHistoryStore } from "../../stores/historyStore.js";
import { useUiStore } from "../../stores/uiStore.js";
import {
  DEFAULT_SETTINGS,
  createDefaultWorkspaceIndex,
  createStarterWorkspaceDocument,
} from "../../services/storage/index.js";
import type { AppDocumentSnapshot } from "../../types/app.js";
import { useHotkeys } from "../../hooks/useHotkeys.js";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const initialDocumentState = useDocumentStore.getState();
const initialHistoryState = useHistoryStore.getState();
const initialUiState = useUiStore.getState();

let dom: JSDOM;
let root: Root | null = null;

function installDomGlobals(window: Window & typeof globalThis) {
  globalThis.window = window;
  globalThis.document = window.document;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: window.navigator,
  });
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.Node = window.Node;
  globalThis.Event = window.Event;
  globalThis.KeyboardEvent = window.KeyboardEvent;
  globalThis.MouseEvent = window.MouseEvent;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(Date.now()), 0);
  }
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = (handle: number) =>
      window.clearTimeout(handle);
  }
  globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window);
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
}

function mountHotkeys() {
  const container = document.getElementById("root");
  assert.ok(container);
  root = createRoot(container);
  act(() => {
    root?.render(<HotkeysHarness />);
  });
}

function unmountHotkeys() {
  act(() => {
    root?.unmount();
  });
  root = null;
}

/** Lightweight component that only exists to mount the useHotkeys hook. */
function HotkeysHarness() {
  useHotkeys();
  return null;
}

/** Dispatch a KeyboardEvent on document and return the event object. */
function docKeyDown(
  key: string,
  opts: { ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean } = {},
): KeyboardEvent {
  const event = new window.KeyboardEvent("keydown", {
    key,
    ctrlKey: opts.ctrlKey ?? false,
    shiftKey: opts.shiftKey ?? false,
    altKey: opts.altKey ?? false,
    metaKey: false,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  return event;
}

/** Create a focused <input> so `isEditableElementFocused()` returns true. */
function focusInput(doc: Document) {
  const input = doc.createElement("input");
  input.setAttribute("data-testid", "hotkey-test-input");
  doc.body.appendChild(input);
  input.focus();
  return input;
}

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

function createBaseSnapshot(): AppDocumentSnapshot {
  return {
    settings: structuredClone(DEFAULT_SETTINGS),
    workspaceIndex: structuredClone(createDefaultWorkspaceIndex()),
    workspacesById: {
      ws_home: structuredClone(createStarterWorkspaceDocument()),
    },
    activeWorkspaceId: "ws_home",
    loadedWorkspaceIds: ["ws_home"],
  };
}

function createModifiedSnapshot(index: number): AppDocumentSnapshot {
  const snapshot = createBaseSnapshot();
  snapshot.settings = {
    ...snapshot.settings,
    defaults: {
      ...snapshot.settings.defaults,
      fontSize: snapshot.settings.defaults.fontSize + index,
    },
  };
  return snapshot;
}

/** Reset all stores to their initial (empty) state. */
function resetStores() {
  useDocumentStore.setState(initialDocumentState);
  useHistoryStore.setState(initialHistoryState);
  useUiStore.setState(initialUiState);
}

function setupHistoryForUndoRedo() {
  const base = createBaseSnapshot();
  const first = createModifiedSnapshot(1);
  const second = createModifiedSnapshot(2);

  useHistoryStore.getState().initializeHistory(base);
  useHistoryStore.getState().commitSnapshot(first, "typing");
  useHistoryStore.getState().commitSnapshot(second, "typing");
  // past = [first], present = second, canUndo = true, canRedo = false

  // Sync document store canUndo/canRedo to match (undo/redo actions use docStore)
  useDocumentStore.setState({
    canUndo: useHistoryStore.getState().canUndo,
    canRedo: useHistoryStore.getState().canRedo,
  });
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe("useHotkeys", () => {
  beforeEach(() => {
    resetStores();
    dom = new JSDOM(
      '<!doctype html><html><body><div id="root"></div></body></html>',
      { url: "http://localhost/" },
    );
    installDomGlobals(dom.window as unknown as Window & typeof globalThis);
    mountHotkeys();
  });

  afterEach(() => {
    unmountHotkeys();
    resetStores();
  });

  /* ---------- Undo / Redo ---------- */

  test("Ctrl+Z triggers undo when not editing", () => {
    setupHistoryForUndoRedo();
    assert.equal(useHistoryStore.getState().canUndo, true);
    assert.equal(useHistoryStore.getState().present?.settings.defaults.fontSize, 16);

    docKeyDown("z", { ctrlKey: true });

    assert.equal(useHistoryStore.getState().present?.settings.defaults.fontSize, 15);
    assert.equal(useHistoryStore.getState().canRedo, true);
  });

  test("Ctrl+Y triggers redo after undo", () => {
    setupHistoryForUndoRedo();
    docKeyDown("z", { ctrlKey: true }); // undo first

    assert.equal(useHistoryStore.getState().present?.settings.defaults.fontSize, 15);

    docKeyDown("y", { ctrlKey: true });

    assert.equal(useHistoryStore.getState().present?.settings.defaults.fontSize, 16);
  });

  test("Ctrl+Shift+Z triggers redo after undo", () => {
    setupHistoryForUndoRedo();
    docKeyDown("z", { ctrlKey: true }); // undo

    assert.equal(useHistoryStore.getState().present?.settings.defaults.fontSize, 15);

    docKeyDown("z", { ctrlKey: true, shiftKey: true });

    assert.equal(useHistoryStore.getState().present?.settings.defaults.fontSize, 16);
  });

  test("Ctrl+Z is suppressed when editing an input", () => {
    setupHistoryForUndoRedo();
    const input = focusInput(dom.window.document);

    docKeyDown("z", { ctrlKey: true });

    // undo should NOT have been triggered — history stays at second snapshot
    assert.equal(useHistoryStore.getState().present?.settings.defaults.fontSize, 16);

    dom.window.document.body.removeChild(input);
  });

  /* ---------- Clipboard ---------- */

  test("Ctrl+C copies selected row when selection is row and not editing", () => {
    useUiStore.setState({
      selection: {
        kind: "row",
        workspaceId: "ws_home",
        blockId: "block_a",
        rowId: "row_1",
      },
    });

    // Spy on copyRows to verify it was called
    let copyCalled = false;
    const originalCopy = useDocumentStore.getState().copyRows;
    useDocumentStore.setState({
      copyRows: (...args: Parameters<typeof originalCopy>) => {
        copyCalled = true;
        assert.equal(args[0], "ws_home");
        assert.equal(args[1], "block_a");
        assert.deepEqual(args[2], ["row_1"]);
        return originalCopy(...args);
      },
    });

    docKeyDown("c", { ctrlKey: true });
    assert.equal(copyCalled, true);

    // Restore
    useDocumentStore.setState({ copyRows: originalCopy });
  });

  test("Ctrl+C is suppressed when editing an input even with row selected", () => {
    useUiStore.setState({
      selection: {
        kind: "row",
        workspaceId: "ws_home",
        blockId: "block_a",
        rowId: "row_1",
      },
    });

    const input = focusInput(dom.window.document);
    let copyCalled = false;
    const originalCopy = useDocumentStore.getState().copyRows;
    useDocumentStore.setState({
      copyRows: (...args: Parameters<typeof originalCopy>) => {
        copyCalled = true;
        return originalCopy(...args);
      },
    });

    docKeyDown("c", { ctrlKey: true });
    assert.equal(copyCalled, false);

    useDocumentStore.setState({ copyRows: originalCopy });
    dom.window.document.body.removeChild(input);
  });

  test("Ctrl+X cuts selected row", () => {
    useUiStore.setState({
      selection: {
        kind: "row",
        workspaceId: "ws_home",
        blockId: "block_a",
        rowId: "row_1",
      },
    });

    let cutCalled = false;
    const originalCut = useDocumentStore.getState().cutRows;
    useDocumentStore.setState({
      cutRows: (...args: Parameters<typeof originalCut>) => {
        cutCalled = true;
        assert.equal(args[0], "ws_home");
        assert.equal(args[1], "block_a");
        assert.deepEqual(args[2], ["row_1"]);
        return originalCut(...args);
      },
    });

    docKeyDown("x", { ctrlKey: true });
    assert.equal(cutCalled, true);

    useDocumentStore.setState({ cutRows: originalCut });
  });

  test("Ctrl+V pastes at selected row", () => {
    useUiStore.setState({
      selection: {
        kind: "row",
        workspaceId: "ws_home",
        blockId: "block_a",
        rowId: "row_1",
      },
    });

    let pasteCalled = false;
    const originalPaste = useDocumentStore.getState().pasteRows;
    useDocumentStore.setState({
      pasteRows: (...args: Parameters<typeof originalPaste>) => {
        pasteCalled = true;
        assert.equal(args[0], "ws_home");
        assert.equal(args[1], "block_a");
        assert.equal(args[2], "row_1"); // targetRowId = rowId when selection.kind === "row"
        return originalPaste(...args);
      },
    });

    docKeyDown("v", { ctrlKey: true });
    assert.equal(pasteCalled, true);

    useDocumentStore.setState({ pasteRows: originalPaste });
  });

  test("Ctrl+V pastes at end of block when selection is block", () => {
    useUiStore.setState({
      selection: {
        kind: "block",
        workspaceId: "ws_home",
        blockId: "block_a",
      },
    });

    let pasteCalled = false;
    const originalPaste = useDocumentStore.getState().pasteRows;
    useDocumentStore.setState({
      pasteRows: (...args: Parameters<typeof originalPaste>) => {
        pasteCalled = true;
        assert.equal(args[0], "ws_home");
        assert.equal(args[1], "block_a");
        assert.equal(args[2], null); // null targetRowId when kind !== "row"
        return originalPaste(...args);
      },
    });

    docKeyDown("v", { ctrlKey: true });
    assert.equal(pasteCalled, true);

    useDocumentStore.setState({ pasteRows: originalPaste });
  });

  /* ---------- Delete ---------- */

  test("Delete removes selected row when not editing", () => {
    useUiStore.setState({
      selection: {
        kind: "row",
        workspaceId: "ws_home",
        blockId: "block_a",
        rowId: "row_1",
      },
    });

    let deleteCalled = false;
    const originalDelete = useDocumentStore.getState().deleteRowFromBlock;
    useDocumentStore.setState({
      deleteRowFromBlock: (...args: Parameters<typeof originalDelete>) => {
        deleteCalled = true;
        assert.equal(args[0], "ws_home");
        assert.equal(args[1], "block_a");
        assert.equal(args[2], "row_1");
        return originalDelete(...args);
      },
    });

    docKeyDown("Delete");
    assert.equal(deleteCalled, true);

    useDocumentStore.setState({ deleteRowFromBlock: originalDelete });
  });

  test("Delete is suppressed when editing an input", () => {
    useUiStore.setState({
      selection: {
        kind: "row",
        workspaceId: "ws_home",
        blockId: "block_a",
        rowId: "row_1",
      },
    });

    const input = focusInput(dom.window.document);
    let deleteCalled = false;
    const originalDelete = useDocumentStore.getState().deleteRowFromBlock;
    useDocumentStore.setState({
      deleteRowFromBlock: (...args: Parameters<typeof originalDelete>) => {
        deleteCalled = true;
        return originalDelete(...args);
      },
    });

    docKeyDown("Delete");
    assert.equal(deleteCalled, false);

    useDocumentStore.setState({ deleteRowFromBlock: originalDelete });
    dom.window.document.body.removeChild(input);
  });

  /* ---------- Escape ---------- */

  test("Escape closes open menus before inspector", () => {
    useUiStore.setState({
      blockMenu: {
        workspaceId: "ws_home",
        blockId: "block_a",
        x: 100,
        y: 200,
      },
      inspectorOpen: true,
    });

    docKeyDown("Escape");

    assert.equal(useUiStore.getState().blockMenu, null);
    // Inspector should still be open because menu was closed first
    assert.equal(useUiStore.getState().inspectorOpen, true);
  });

  test("Escape closes inspector when no menus are open", () => {
    useUiStore.setState({
      inspectorOpen: true,
      workspaceMenu: null,
      blockMenu: null,
      columnMenu: null,
      rowMenu: null,
    });

    docKeyDown("Escape");

    assert.equal(useUiStore.getState().inspectorOpen, false);
  });

  test("Escape clears selection when no menus or inspector are open", () => {
    useUiStore.setState({
      inspectorOpen: false,
      workspaceMenu: null,
      blockMenu: null,
      columnMenu: null,
      rowMenu: null,
      selection: {
        kind: "row",
        workspaceId: "ws_home",
        blockId: "block_a",
        rowId: "row_1",
      },
    });

    docKeyDown("Escape");

    assert.deepEqual(useUiStore.getState().selection, { kind: "none" });
  });

  test("Escape is no-op when editing an input", () => {
    useUiStore.setState({
      inspectorOpen: true,
      selection: {
        kind: "row",
        workspaceId: "ws_home",
        blockId: "block_a",
        rowId: "row_1",
      },
    });

    const input = focusInput(dom.window.document);

    docKeyDown("Escape");

    // Nothing should have been closed since focus is in an editable element
    assert.equal(useUiStore.getState().inspectorOpen, true);
    assert.equal(useUiStore.getState().selection.kind, "row");

    dom.window.document.body.removeChild(input);
  });

  /* ---------- Ctrl+A ---------- */

  test("Ctrl+A prevents default when selection is not none", () => {
    useUiStore.setState({
      selection: {
        kind: "block",
        workspaceId: "ws_home",
        blockId: "block_a",
      },
    });

    const event = docKeyDown("a", { ctrlKey: true });

    assert.equal(event.defaultPrevented, true);
  });

  test("Ctrl+A does not prevent default when selection is none", () => {
    useUiStore.setState({ selection: { kind: "none" } });

    const event = docKeyDown("a", { ctrlKey: true });

    assert.equal(event.defaultPrevented, false);
  });

  /* ---------- Shortcut suppression when editing ---------- */

  test("all shortcuts suppressed when editing an input", () => {
    setupHistoryForUndoRedo();
    const input = focusInput(dom.window.document);

    // Try each shortcut — none should change state
    docKeyDown("z", { ctrlKey: true });
    assert.equal(useHistoryStore.getState().present?.settings.defaults.fontSize, 16);

    docKeyDown("y", { ctrlKey: true });
    assert.equal(useHistoryStore.getState().present?.settings.defaults.fontSize, 16);

    docKeyDown("Escape");
    assert.equal(useHistoryStore.getState().present?.settings.defaults.fontSize, 16);

    dom.window.document.body.removeChild(input);
  });

  /* ---------- defaultPrevented skip ---------- */

  test("handler skips when event.defaultPrevented is already true", () => {
    setupHistoryForUndoRedo();
    useUiStore.setState({
      selection: {
        kind: "row",
        workspaceId: "ws_home",
        blockId: "block_a",
        rowId: "row_1",
      },
    });

    // Dispatch an event that is already marked prevented
    const event = new window.KeyboardEvent("keydown", {
      key: "z",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, "defaultPrevented", { value: true });
    document.dispatchEvent(event);

    // undo should NOT be triggered
    assert.equal(useHistoryStore.getState().present?.settings.defaults.fontSize, 16);
  });

  /* ---------- Cleanup ---------- */

  test("listener is removed on unmount and no longer processes events", () => {
    setupHistoryForUndoRedo();
    unmountHotkeys();

    docKeyDown("z", { ctrlKey: true });

    // undo should NOT have been triggered
    assert.equal(useHistoryStore.getState().present?.settings.defaults.fontSize, 16);
  });
});
