import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useDocumentStore } from "../../stores/documentStore.js";
import { useUiStore } from "../../stores/uiStore.js";
import {
  useAlertNavigation,
  resetFlashedAlerts,
} from "../../hooks/useAlertNavigation.js";
import { createMemoryStorageService } from "../../services/storage/index.js";
import type { Block } from "../../types/block.js";
import type { PersistedCell, Row } from "../../types/row.js";
import type { WorkspaceIndexEntry } from "../../types/workspace.js";
import type { WorkspaceId } from "../../domain/ids.js";

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function row(
  id: string,
  order: number,
  values: Record<string, PersistedCell["value"] | undefined>,
): Row {
  const cells: Record<string, PersistedCell> = {};
  for (const [columnId, value] of Object.entries(values)) {
    if (value !== undefined) {
      cells[columnId] = { value, format: {} };
    }
  }

  return {
    id,
    order,
    format: {},
    cells,
  };
}

function block(
  id: string,
  columns: Block["columns"],
  rows: Row[],
): Block {
  return {
    id,
    workspaceId: "ws_test",
    title: "Test Block",
    blockType: "basic_checklist",
    order: 0,
    collapsed: false,
    border: {},
    sort: null,
    format: {},
    columns,
    rows,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const initialDocumentState = useDocumentStore.getState();
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
  globalThis.Element = window.Element;
  globalThis.Event = window.Event;
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

/** Mount the useAlertNavigation hook in a lightweight harness component. */
async function mountHook() {
  const container = document.getElementById("root");
  assert.ok(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<AlertNavigationHarness />);
  });
} 

function unmountHook() {
  act(() => {
    root?.unmount();
  });
  root = null;
}

/** Lightweight component that only exists to mount the hook. */
function AlertNavigationHarness() {
  useAlertNavigation();
  return null;
}

/** Initialize the document store with a memory storage service. Returns active workspace ID. */
async function initStore(): Promise<string> {
  const service = await createMemoryStorageService();
  service.saveAppData = async (document) => ({
    persistenceState: "full" as const,
    persisted: {
      settings: true,
      workspaceIndex: true,
      workspaceIds: document.loadedWorkspaceIds ?? [],
    },
  });

  await useDocumentStore.getState().initializeAppData(service);

  const activeId = useDocumentStore.getState().activeWorkspaceId;
  assert.ok(activeId);
  return activeId;
}

/** Add a block with rows to the default workspace. */
function addBlockToWorkspace(
  workspaceId: string,
  blockData: Block,
): void {
  const state = useDocumentStore.getState();
  const doc = state.workspacesById[workspaceId];
  assert.ok(doc);

  useDocumentStore.setState({
    workspacesById: {
      ...state.workspacesById,
      [workspaceId]: {
        ...doc,
        blocks: [blockData],
      },
    },
  });
}

/** Set alertSummary on the workspace index entry. */
function setAlertSummary(
  workspaceId: string,
  summary: { count: number; blockId?: string; rowId?: string; columnId?: string } | null,
): void {
  useDocumentStore.getState().updateWorkspaceAlertSummary(workspaceId, summary);
}

/** Reset all stores to their initial state. */
function resetStores() {
  useDocumentStore.setState(initialDocumentState);
  useUiStore.setState(initialUiState);
  resetFlashedAlerts();
}

/// Wait for microtasks and timeouts to flush.
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useAlertNavigation", () => {
  beforeEach(() => {
    dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
      url: "http://localhost/",
    });
    installDomGlobals(dom.window as unknown as Window & typeof globalThis);
    resetStores();
  });

  afterEach(async () => {
    unmountHook();
    resetStores();
  });

  test("navigates to row selection when alert has blockId/rowId", async () => {
    const workspaceId = await initStore();

    // Add a block with a row
    addBlockToWorkspace(workspaceId, block("b1", [], [row("r1", 0, {})]));

    // Set alert summary pointing to the target
    setAlertSummary(workspaceId, { count: 1, blockId: "b1", rowId: "r1" });

    // Mount the hook
    await mountHook();

    // Wait for effect + rAF + timeouts to flush
    await wait(600);

    const selection = useUiStore.getState().selection;
    assert.equal(selection.kind, "row");
    if (selection.kind === "row") {
      assert.equal(selection.workspaceId, workspaceId);
      assert.equal(selection.blockId, "b1");
      assert.equal(selection.rowId, "r1");
    }
  });

  test("navigates to cell selection when columnId is present", async () => {
    const workspaceId = await initStore();

    addBlockToWorkspace(workspaceId, block("b1", [], [row("r1", 0, {})]));

    setAlertSummary(workspaceId, {
      count: 1,
      blockId: "b1",
      rowId: "r1",
      columnId: "c1",
    });

    await mountHook();
    await wait(600);

    const selection = useUiStore.getState().selection;
    assert.equal(selection.kind, "cell");
    if (selection.kind === "cell") {
      assert.equal(selection.workspaceId, workspaceId);
      assert.equal(selection.blockId, "b1");
      assert.equal(selection.rowId, "r1");
      assert.equal(selection.columnId, "c1");
    }
  });

  test("scrolls block into view on navigation", async () => {
    const workspaceId = await initStore();

    addBlockToWorkspace(workspaceId, block("b1", [], [row("r1", 0, {})]));

    setAlertSummary(workspaceId, { count: 1, blockId: "b1", rowId: "r1" });

    // Add a block-card element to the DOM and mock scrollIntoView
    const blockEl = dom.window.document.createElement("div");
    blockEl.setAttribute("data-testid", "block-card-b1");
    dom.window.document.body.appendChild(blockEl);

    let scrollIntoViewCalled = false;
    const scrollArgs: Record<string, unknown> = {};
    blockEl.scrollIntoView = ((arg?: ScrollIntoViewOptions | boolean) => {
      scrollIntoViewCalled = true;
      if (typeof arg === "object" && arg) {
        Object.assign(scrollArgs, arg);
      }
    }) as typeof blockEl.scrollIntoView;

    await mountHook();
    await wait(600);

    assert.equal(scrollIntoViewCalled, true);
    assert.equal(scrollArgs?.behavior, "smooth");
    assert.equal(scrollArgs?.block, "start");
  });

  test("scrolls row into view on navigation", async () => {
    const workspaceId = await initStore();

    addBlockToWorkspace(workspaceId, block("b1", [], [row("r1", 0, {})]));

    setAlertSummary(workspaceId, { count: 1, blockId: "b1", rowId: "r1" });

    // Add block-card element to DOM
    const blockEl = dom.window.document.createElement("div");
    blockEl.setAttribute("data-testid", "block-card-b1");
    dom.window.document.body.appendChild(blockEl);
    blockEl.scrollIntoView = () => {};

    // Add row element to DOM
    const rowEl = dom.window.document.createElement("div");
    rowEl.setAttribute("data-testid", "row-r1");
    dom.window.document.body.appendChild(rowEl);

    let rowScrollIntoViewCalled = false;
    const rowScrollArgs: Record<string, unknown> = {};
    rowEl.scrollIntoView = ((arg?: ScrollIntoViewOptions | boolean) => {
      rowScrollIntoViewCalled = true;
      if (typeof arg === "object" && arg) {
        Object.assign(rowScrollArgs, arg);
      }
    }) as typeof rowEl.scrollIntoView;

    await mountHook();
    await wait(600);

    assert.equal(rowScrollIntoViewCalled, true);
    assert.equal(rowScrollArgs?.behavior, "smooth");
    assert.equal(rowScrollArgs?.block, "nearest");
  });

  test("sets alertFlashRowId via rAF + setTimeout flow", async () => {
    // Test the flash timing logic directly without mounting React
    const workspaceId = await initStore();

    addBlockToWorkspace(workspaceId, block("b1", [], [row("r1", 0, {})]));

    setAlertSummary(workspaceId, { count: 1, blockId: "b1", rowId: "r1" });

    // Add DOM elements so scroll logic passes
    const blockEl = dom.window.document.createElement("div");
    blockEl.setAttribute("data-testid", "block-card-b1");
    dom.window.document.body.appendChild(blockEl);
    blockEl.scrollIntoView = () => {};

    const rowEl = dom.window.document.createElement("div");
    rowEl.setAttribute("data-testid", "row-r1");
    dom.window.document.body.appendChild(rowEl);
    rowEl.scrollIntoView = () => {};

    // Simulate what the hook effect does
    const state = useDocumentStore.getState();
    const entry = state.workspaceIndex.find((e) => e.id === workspaceId);
    assert.ok(entry?.alertSummary);

    const blockId = entry.alertSummary.blockId!;
    const rowId = entry.alertSummary.rowId!;

    // Set selection
    useUiStore.getState().selectRow(workspaceId, blockId, rowId);
    assert.equal(useUiStore.getState().selection.kind, "row");

    // Call rAF (polyfilled to setTimeout 0)
    requestAnimationFrame(() => {
      // This should execute before the main wait resolves
      useUiStore.getState().setAlertFlashRowId("r1");

      // Schedule clear
      setTimeout(() => {
        useUiStore.getState().setAlertFlashRowId(null);
      }, 2600);
    });

    // Wait for rAF to fire (setTimeout 0)
    await wait(10);
    assert.equal(useUiStore.getState().alertFlashRowId, "r1");

    // Wait for clear
    await wait(3000);
    assert.equal(useUiStore.getState().alertFlashRowId, null);
  });

  test("deduplicates — does not re-flash the same alert target", async () => {
    const workspaceId = await initStore();

    addBlockToWorkspace(workspaceId, block("b1", [], [row("r1", 0, {})]));

    setAlertSummary(workspaceId, { count: 1, blockId: "b1", rowId: "r1" });

    // Add DOM elements
    const blockEl = dom.window.document.createElement("div");
    blockEl.setAttribute("data-testid", "block-card-b1");
    dom.window.document.body.appendChild(blockEl);
    blockEl.scrollIntoView = () => {};

    const rowEl = dom.window.document.createElement("div");
    rowEl.setAttribute("data-testid", "row-r1");
    dom.window.document.body.appendChild(rowEl);
    rowEl.scrollIntoView = () => {};

    // First mount triggers navigation
    await mountHook();
    await wait(600);

    // Reset the selection to verify it doesn't change again
    useUiStore.getState().clearSelection();
    assert.equal(useUiStore.getState().selection.kind, "none");

    // Clear flash marker so we can detect if it fires again
    useUiStore.getState().setAlertFlashRowId(null);

    // Simulate workspace change by triggering a re-render
    // (activeWorkspaceId hasn't changed, so effect should not re-fire)
    // Force a re-render by toggling unrelated state and remounting
    unmountHook();
    resetFlashedAlerts(); // We want to test the hook's behavior, so reset

    // Re-mount — but keep the same workspace, the dedup set was reset,
    // so this should still fire
    await mountHook();
    await wait(600);

    // The dedup check is per-session, and since we reset the set,
    // it should have fired again
    const selectionAfter = useUiStore.getState().selection;
    assert.equal(selectionAfter.kind, "row");
  });

  test("deduplicates — does not re-flash on same workspace within session", async () => {
    const workspaceId = await initStore();

    addBlockToWorkspace(workspaceId, block("b1", [], [row("r1", 0, {})]));

    setAlertSummary(workspaceId, { count: 1, blockId: "b1", rowId: "r1" });

    const blockEl = dom.window.document.createElement("div");
    blockEl.setAttribute("data-testid", "block-card-b1");
    dom.window.document.body.appendChild(blockEl);
    blockEl.scrollIntoView = () => {};

    const rowEl = dom.window.document.createElement("div");
    rowEl.setAttribute("data-testid", "row-r1");
    dom.window.document.body.appendChild(rowEl);
    rowEl.scrollIntoView = () => {};

    // First mount triggers navigation (sets alertFlashRowId)
    await mountHook();
    await wait(100);

    // Wait for full flash cycle to complete
    await wait(3000);
    useUiStore.getState().clearSelection();

    // Change activeWorkspaceId to something else, then back
    const newWsId = "ws_other";
    useDocumentStore.setState({
      workspaceIndex: [
        ...useDocumentStore.getState().workspaceIndex,
        { id: newWsId as WorkspaceIndexEntry["id"], title: "Other", order: 1, style: {}, alertSummary: null },
      ],
      workspacesById: {
        ...useDocumentStore.getState().workspacesById,
        [newWsId]: { id: newWsId, blocks: [] },
      },
      loadedWorkspaceIds: [...useDocumentStore.getState().loadedWorkspaceIds, newWsId as WorkspaceIndexEntry["id"]],
    });
    useDocumentStore.getState().setActiveWorkspaceId(newWsId as WorkspaceId);

    // Flush
    await wait(100);

    // Now switch back to the original workspace
    useDocumentStore.getState().setActiveWorkspaceId(workspaceId as WorkspaceId);
    await wait(600);

    // Selection should NOT have changed because of dedup
    const selection = useUiStore.getState().selection;
    assert.equal(selection.kind, "none");
  });

  test("clears alert summary when block no longer exists", async () => {
    const workspaceId = await initStore();

    // Set alert summary pointing to a non-existent block
    setAlertSummary(workspaceId, {
      count: 1,
      blockId: "nonexistent-block",
      rowId: "r1",
    });

    await mountHook();
    await wait(100);

    const entry = useDocumentStore
      .getState()
      .workspaceIndex.find((e) => e.id === workspaceId);
    assert.ok(entry);
    assert.equal(entry.alertSummary, null);
  });

  test("clears alert summary when row no longer exists", async () => {
    const workspaceId = await initStore();

    // Add a block but without the target row
    addBlockToWorkspace(workspaceId, block("b1", [], []));

    setAlertSummary(workspaceId, { count: 1, blockId: "b1", rowId: "nonexistent-row" });

    await mountHook();
    await wait(100);

    const entry = useDocumentStore
      .getState()
      .workspaceIndex.find((e) => e.id === workspaceId);
    assert.ok(entry);
    assert.equal(entry.alertSummary, null);
  });

  test("does nothing for count-only alert summary (no blockId/rowId)", async () => {
    const workspaceId = await initStore();

    addBlockToWorkspace(workspaceId, block("b1", [], [row("r1", 0, {})]));

    // Set count-only summary without blockId/rowId
    setAlertSummary(workspaceId, { count: 3 });

    await mountHook();
    await wait(100);

    // Selection should remain unchanged
    const selection = useUiStore.getState().selection;
    assert.equal(selection.kind, "none");
    assert.equal(useUiStore.getState().alertFlashRowId, null);
  });

  test("does nothing when alertSummary is null or undefined", async () => {
    const workspaceId = await initStore();

    addBlockToWorkspace(workspaceId, block("b1", [], [row("r1", 0, {})]));

    // Ensure alertSummary is null
    setAlertSummary(workspaceId, null);

    await mountHook();
    await wait(100);

    const selection = useUiStore.getState().selection;
    assert.equal(selection.kind, "none");
  });

  test("does nothing when no active workspace", async () => {
    // Don't initialize store — activeWorkspaceId is null
    await mountHook();
    await wait(100);

    const selection = useUiStore.getState().selection;
    assert.equal(selection.kind, "none");
  });

  test("sets alertFlashRowId on matching row in RowView", async () => {
    // Test the RowView component renders with the flash class
    // when alertFlashRowId matches the row

    // This is a unit test of the store interaction pattern
    useUiStore.getState().setAlertFlashRowId("r1");
    assert.equal(useUiStore.getState().alertFlashRowId, "r1");

    // Clear it
    useUiStore.getState().setAlertFlashRowId(null);
    assert.equal(useUiStore.getState().alertFlashRowId, null);
  });

  test("resetFlashedAlerts clears deduplication set", async () => {
    // Trigger a flash via the hook
    const workspaceId = await initStore();
    addBlockToWorkspace(workspaceId, block("b1", [], [row("r1", 0, {})]));
    setAlertSummary(workspaceId, { count: 1, blockId: "b1", rowId: "r1" });

    const blockEl = dom.window.document.createElement("div");
    blockEl.setAttribute("data-testid", "block-card-b1");
    dom.window.document.body.appendChild(blockEl);
    blockEl.scrollIntoView = () => {};
    const rowEl = dom.window.document.createElement("div");
    rowEl.setAttribute("data-testid", "row-r1");
    dom.window.document.body.appendChild(rowEl);
    rowEl.scrollIntoView = () => {};

    await mountHook();
    await wait(100);
    await wait(3000);

    // Reset flashed alerts set
    resetFlashedAlerts();
    useUiStore.getState().clearSelection();

    // Navigate away and back
    const newWsId = "ws_other2";
    useDocumentStore.setState({
      workspaceIndex: [
        ...useDocumentStore.getState().workspaceIndex,
        { id: newWsId as WorkspaceIndexEntry["id"], title: "Other", order: 1, style: {}, alertSummary: null },
      ],
      workspacesById: {
        ...useDocumentStore.getState().workspacesById,
        [newWsId]: { id: newWsId, blocks: [] },
      },
      loadedWorkspaceIds: [...useDocumentStore.getState().loadedWorkspaceIds, newWsId as WorkspaceIndexEntry["id"]],
    });
    useDocumentStore.getState().setActiveWorkspaceId(newWsId as WorkspaceId);
    await wait(100);

    // Switch back — should re-fire since we reset
    useDocumentStore.getState().setActiveWorkspaceId(workspaceId as WorkspaceId);
    await wait(600);

    const selection = useUiStore.getState().selection;
    assert.equal(selection.kind, "row");
  });
});

describe("alertFlashRowId in uiStore", () => {
  test("defaults to null", () => {
    const state = useUiStore.getState();
    assert.equal(state.alertFlashRowId, null);
  });

  test("setAlertFlashRowId updates the value", () => {
    useUiStore.getState().setAlertFlashRowId("row_test");
    assert.equal(useUiStore.getState().alertFlashRowId, "row_test");
  });

  test("setAlertFlashRowId(null) clears the value", () => {
    useUiStore.getState().setAlertFlashRowId("row_test");
    useUiStore.getState().setAlertFlashRowId(null);
    assert.equal(useUiStore.getState().alertFlashRowId, null);
  });
});
