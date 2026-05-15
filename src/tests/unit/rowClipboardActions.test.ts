import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { createBlockTemplate } from "../../domain/templates/blockTemplates.js";
import { useDocumentStore } from "../../stores/documentStore.js";
import { useHistoryStore } from "../../stores/historyStore.js";
import { useUiStore } from "../../stores/uiStore.js";
import type { AppDocumentSnapshot } from "../../types/app.js";
import type { Block } from "../../types/block.js";

const initialDocumentState = useDocumentStore.getState();
const initialUiState = useUiStore.getState();
const initialHistoryState = useHistoryStore.getState();

function resetStores() {
  useDocumentStore.setState(initialDocumentState);
  useUiStore.setState(initialUiState);
  useHistoryStore.setState(initialHistoryState);
}

function buildFixtureBlock(blockId: string, workspaceId: string): Block {
  const block = createBlockTemplate("basic_checklist", workspaceId, {
    blockId,
    title: "Test",
    order: 0,
  });

  const textColumnId = block.columns.find((c) => c.type === "text")?.id;
  const checkboxColumnId = block.columns.find((c) => c.type === "checkbox")?.id;

  if (!textColumnId || !checkboxColumnId) {
    throw new Error("Missing columns in fixture block");
  }

  block.rows = [
    {
      id: "row_a",
      order: 0,
      format: { bold: true, backgroundColor: "#ffffff" },
      cells: {
        [textColumnId]: { value: "Alpha", format: { underline: true } },
        [checkboxColumnId]: { value: false, format: {} },
      },
    },
    {
      id: "row_b",
      order: 1,
      format: { italic: true },
      cells: {
        [textColumnId]: { value: "Bravo", format: { bold: true, textColor: "#123456" } },
        [checkboxColumnId]: { value: true, format: { backgroundColor: "#eeeeee" } },
      },
    },
  ];

  return block;
}

function buildIncompatibleBlock(blockId: string, workspaceId: string): Block {
  // Use numbered_list template which has different column types (numbered + text)
  // This makes both by-column-id and by-shape mapping fail against a basic_checklist source
  const block = createBlockTemplate("numbered_list", workspaceId, {
    blockId,
    title: "Incompatible",
    order: 1,
  });

  return block;
}

function setupDocument(blocks: Block[]) {
  const workspaceId = "ws_test";
  const settings = {
    theme: "dark" as const,
    defaults: {
      fontFamily: "Segoe UI",
      fontSize: 14,
      textColor: "#F3F4F6",
      cellBackground: "#111827",
      blockBorderColor: "#374151",
      blockBorderWidth: 1,
      workspaceAccentEnabled: true,
    },
  };

  const workspaceIndex = [
    {
      id: workspaceId,
      title: "Test",
      order: 0,
      style: {
        background: "#1F2937",
        textColor: "#F9FAFB",
        accentStripe: { enabled: true, color: "#60A5FA" },
      },
    },
  ];

  const workspacesById = {
    [workspaceId]: {
      id: workspaceId,
      blocks,
    },
  };

  useDocumentStore.setState({
    isInitialized: true,
    isHydrating: false,
    loadError: null,
    saveStatus: "idle" as const,
    saveError: null,
    lastSaveOutcome: null,
    settings,
    workspaceIndex,
    workspacesById,
    loadedWorkspaceIds: [workspaceId],
    activeWorkspaceId: workspaceId,
    canUndo: false,
    canRedo: false,
    dirty: false,
    lastSaveAt: null,
  });

  const snapshot: AppDocumentSnapshot = {
    settings: structuredClone(settings),
    workspaceIndex: structuredClone(workspaceIndex),
    workspacesById: structuredClone(workspacesById),
    activeWorkspaceId: workspaceId,
    loadedWorkspaceIds: [workspaceId],
  };

  useHistoryStore.getState().initializeHistory(snapshot);
}

beforeEach(() => {
  resetStores();
});

afterEach(() => {
  resetStores();
});

describe("row clipboard store actions", () => {
  test("copyRows stores a payload in uiStore with clipboardOperation === 'copy' and leaves the document unchanged", () => {
    const block = buildFixtureBlock("block_a", "ws_test");
    setupDocument([block]);

    const docBefore = structuredClone(useDocumentStore.getState().workspacesById.ws_test);
    const result = useDocumentStore.getState().copyRows("ws_test", "block_a", ["row_a"]);

    assert.equal(result, true);
    assert.equal(useUiStore.getState().clipboardOperation, "copy");
    assert.ok(useUiStore.getState().clipboardPayload);
    assert.equal(useUiStore.getState().clipboardPayload?.rows.length, 1);
    assert.equal(useUiStore.getState().clipboardPayload?.rows[0]?.sourceRowId, "row_a");
    assert.deepEqual(useDocumentStore.getState().workspacesById.ws_test, docBefore);
  });

  test("copyRows against an empty row id list returns false and does not touch uiStore", () => {
    const block = buildFixtureBlock("block_a", "ws_test");
    setupDocument([block]);

    const result = useDocumentStore.getState().copyRows("ws_test", "block_a", []);

    assert.equal(result, false);
    assert.equal(useUiStore.getState().clipboardPayload, null);
    assert.equal(useUiStore.getState().clipboardOperation, null);
  });

  test("cutRows removes the source rows in one snapshot, sets clipboardOperation === 'cut', and a single undo restores the rows", () => {
    const block = buildFixtureBlock("block_a", "ws_test");
    setupDocument([block]);

    const result = useDocumentStore.getState().cutRows("ws_test", "block_a", ["row_a"]);

    assert.equal(result, true);
    assert.equal(useUiStore.getState().clipboardOperation, "cut");
    assert.ok(useUiStore.getState().clipboardPayload);

    const rowsAfterCut = useDocumentStore.getState().workspacesById.ws_test?.blocks[0]?.rows ?? [];
    assert.equal(rowsAfterCut.length, 1);
    assert.equal(rowsAfterCut[0]?.id, "row_b");
    assert.equal(useDocumentStore.getState().canUndo, true);

    useDocumentStore.getState().undo();

    const rowsAfterUndo = useDocumentStore.getState().workspacesById.ws_test?.blocks[0]?.rows ?? [];
    assert.equal(rowsAfterUndo.length, 2);
    assert.equal(rowsAfterUndo[0]?.id, "row_a");
    assert.equal(rowsAfterUndo[1]?.id, "row_b");
    assert.equal(rowsAfterUndo[0]?.cells[block.columns.find((c) => c.type === "text")?.id ?? ""]?.value, "Alpha");
  });

  test("pasteRows after a copyRows inserts new rows above the target row, gives them fresh ids, preserves row and cell formatting, and produces consecutive order values", () => {
    const block = buildFixtureBlock("block_a", "ws_test");
    setupDocument([block]);

    useDocumentStore.getState().copyRows("ws_test", "block_a", ["row_a"]);

    const result = useDocumentStore.getState().pasteRows("ws_test", "block_a", "row_b");

    assert.equal(result, true);

    const rowsAfterPaste = useDocumentStore.getState().workspacesById.ws_test?.blocks[0]?.rows ?? [];
    assert.equal(rowsAfterPaste.length, 3);

    // Pasted row should be above row_b (at index 1)
    const pastedRow = rowsAfterPaste[1];
    assert.ok(pastedRow);
    assert.notEqual(pastedRow.id, "row_a");
    assert.equal(pastedRow.order, 1);

    // Formatting preserved
    assert.deepEqual(pastedRow.format, { bold: true, backgroundColor: "#ffffff" });

    const textColumnId = block.columns.find((c) => c.type === "text")?.id ?? "";
    assert.equal(pastedRow.cells[textColumnId]?.value, "Alpha");
    assert.deepEqual(pastedRow.cells[textColumnId]?.format, { underline: true });

    // Orders are consecutive
    assert.deepEqual(
      rowsAfterPaste.map((r) => r.order),
      [0, 1, 2]
    );
  });

  test("pasteRows with targetRowId: null appends at end-of-block", () => {
    const block = buildFixtureBlock("block_a", "ws_test");
    setupDocument([block]);

    useDocumentStore.getState().copyRows("ws_test", "block_a", ["row_a"]);

    const result = useDocumentStore.getState().pasteRows("ws_test", "block_a", null);

    assert.equal(result, true);

    const rowsAfterPaste = useDocumentStore.getState().workspacesById.ws_test?.blocks[0]?.rows ?? [];
    assert.equal(rowsAfterPaste.length, 3);
    assert.equal(rowsAfterPaste[2]?.id !== "row_a", true);
    assert.equal(rowsAfterPaste[2]?.cells[block.columns.find((c) => c.type === "text")?.id ?? ""]?.value, "Alpha");
  });

  test("pasteRows into an incompatible block returns false, leaves the doc untouched, and leaves the clipboard untouched", () => {
    const blockA = buildFixtureBlock("block_a", "ws_test");
    const blockB = buildIncompatibleBlock("block_b", "ws_test");
    setupDocument([blockA, blockB]);

    useDocumentStore.getState().copyRows("ws_test", "block_a", ["row_a"]);

    const docBefore = structuredClone(useDocumentStore.getState().workspacesById.ws_test);
    const clipboardBefore = structuredClone(useUiStore.getState().clipboardPayload);

    const result = useDocumentStore.getState().pasteRows("ws_test", "block_b", null);

    assert.equal(result, false);
    assert.deepEqual(useDocumentStore.getState().workspacesById.ws_test, docBefore);
    assert.deepEqual(useUiStore.getState().clipboardPayload, clipboardBefore);
  });

  test("pasteRows is repeatable: calling it twice produces two distinct sets of rows with unique ids", () => {
    const block = buildFixtureBlock("block_a", "ws_test");
    setupDocument([block]);

    useDocumentStore.getState().copyRows("ws_test", "block_a", ["row_a"]);

    const result1 = useDocumentStore.getState().pasteRows("ws_test", "block_a", null);
    assert.equal(result1, true);

    const result2 = useDocumentStore.getState().pasteRows("ws_test", "block_a", null);
    assert.equal(result2, true);

    const rowsAfterPaste = useDocumentStore.getState().workspacesById.ws_test?.blocks[0]?.rows ?? [];
    assert.equal(rowsAfterPaste.length, 4);

    const ids = rowsAfterPaste.map((r) => r.id);
    assert.equal(new Set(ids).size, 4, "all row ids should be unique");
  });

  test("cutRows failure (no valid source rows) does not modify uiStore.clipboardPayload", () => {
    const block = buildFixtureBlock("block_a", "ws_test");
    setupDocument([block]);

    const result = useDocumentStore.getState().cutRows("ws_test", "block_a", ["nonexistent"]);

    assert.equal(result, false);
    assert.equal(useUiStore.getState().clipboardPayload, null);
    assert.equal(useUiStore.getState().clipboardOperation, null);
  });

  test("undoing a paste removes the pasted rows", () => {
    const block = buildFixtureBlock("block_a", "ws_test");
    setupDocument([block]);

    useDocumentStore.getState().copyRows("ws_test", "block_a", ["row_a"]);
    useDocumentStore.getState().pasteRows("ws_test", "block_a", null);

    const rowsAfterPaste = useDocumentStore.getState().workspacesById.ws_test?.blocks[0]?.rows ?? [];
    assert.equal(rowsAfterPaste.length, 3);
    assert.equal(useDocumentStore.getState().canUndo, true);

    useDocumentStore.getState().undo();

    const rowsAfterUndo = useDocumentStore.getState().workspacesById.ws_test?.blocks[0]?.rows ?? [];
    assert.equal(rowsAfterUndo.length, 2);
    assert.equal(rowsAfterUndo[0]?.id, "row_a");
    assert.equal(rowsAfterUndo[1]?.id, "row_b");
  });
});
