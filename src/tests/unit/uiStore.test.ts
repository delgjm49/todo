import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { useUiStore } from "../../stores/uiStore.js";

describe("ui store", () => {
  test("clears block and workspace interaction state when switching to the settings screen", () => {
    useUiStore.setState({
      screen: "main",
      workspaceMenu: {
        workspaceId: "workspace_a",
        x: 40,
        y: 80,
      },
      blockMenu: {
        workspaceId: "workspace_a",
        blockId: "block_a",
        x: 120,
        y: 240,
      },
      columnMenu: {
        workspaceId: "workspace_a",
        blockId: "block_a",
        columnId: "col_a",
        x: 120,
        y: 240,
      },
      draggingWorkspaceId: "workspace_a",
      dropTargetWorkspaceId: "workspace_b",
      draggingBlockId: "block_a",
      dropTargetBlockId: "block_b",
      draggingRowBlockId: "block_a",
      draggingRowId: "row_a",
      dropTargetRowId: "row_b",
      inspectorOpen: false,
    });

    useUiStore.getState().showSettingsScreen();

    const state = useUiStore.getState();
    assert.equal(state.screen, "settings");
    assert.equal(state.workspaceMenu, null);
    assert.equal(state.blockMenu, null);
    assert.equal(state.columnMenu, null);
    assert.equal(state.draggingWorkspaceId, null);
    assert.equal(state.dropTargetWorkspaceId, null);
    assert.equal(state.draggingBlockId, null);
    assert.equal(state.dropTargetBlockId, null);
    assert.equal(state.draggingRowBlockId, null);
    assert.equal(state.draggingRowId, null);
    assert.equal(state.dropTargetRowId, null);

    useUiStore.setState({
      screen: "main",
      workspaceMenu: null,
      blockMenu: null,
      columnMenu: null,
      draggingWorkspaceId: null,
      dropTargetWorkspaceId: null,
      draggingBlockId: null,
      dropTargetBlockId: null,
      draggingRowBlockId: null,
      draggingRowId: null,
      dropTargetRowId: null,
      inspectorOpen: false,
    });
  });

  test("column menu open and close work and clear other menus", () => {
    useUiStore.setState({
      workspaceMenu: { workspaceId: "ws_a", x: 10, y: 10 },
      blockMenu: { workspaceId: "ws_a", blockId: "block_a", x: 20, y: 20 },
      columnMenu: null,
    });

    useUiStore.getState().openColumnMenu("ws_a", "block_a", "col_a", 30, 30);
    let state = useUiStore.getState();
    assert.deepEqual(state.columnMenu, { workspaceId: "ws_a", blockId: "block_a", columnId: "col_a", x: 30, y: 30 });
    assert.equal(state.workspaceMenu, null);
    assert.equal(state.blockMenu, null);

    useUiStore.getState().closeColumnMenu();
    state = useUiStore.getState();
    assert.equal(state.columnMenu, null);
  });

  test("row drag state can be set and reset independently", () => {
    useUiStore.setState({
      draggingRowBlockId: null,
      draggingRowId: null,
      dropTargetRowId: null,
    });

    useUiStore.getState().setRowDragState("block_a", "row_a", "row_b");
    let state = useUiStore.getState();
    assert.equal(state.draggingRowBlockId, "block_a");
    assert.equal(state.draggingRowId, "row_a");
    assert.equal(state.dropTargetRowId, "row_b");

    useUiStore.getState().resetRowInteractionState();
    state = useUiStore.getState();
    assert.equal(state.draggingRowBlockId, null);
    assert.equal(state.draggingRowId, null);
    assert.equal(state.dropTargetRowId, null);
  });

  test("selection transitions and replacement rules", () => {
    useUiStore.setState({ selection: { kind: "none" } });

    useUiStore.getState().selectBlock("ws_a", "block_a");
    assert.deepEqual(useUiStore.getState().selection, { kind: "block", workspaceId: "ws_a", blockId: "block_a" });

    useUiStore.getState().selectColumn("ws_a", "block_a", "col_a");
    assert.deepEqual(useUiStore.getState().selection, {
      kind: "column",
      workspaceId: "ws_a",
      blockId: "block_a",
      columnId: "col_a",
    });

    useUiStore.getState().selectRow("ws_a", "block_a", "row_a");
    assert.deepEqual(useUiStore.getState().selection, {
      kind: "row",
      workspaceId: "ws_a",
      blockId: "block_a",
      rowId: "row_a",
    });

    useUiStore.getState().selectCell("ws_a", "block_a", "row_a", "col_a");
    assert.deepEqual(useUiStore.getState().selection, {
      kind: "cell",
      workspaceId: "ws_a",
      blockId: "block_a",
      rowId: "row_a",
      columnId: "col_a",
    });

    useUiStore.getState().clearSelection();
    assert.deepEqual(useUiStore.getState().selection, { kind: "none" });
  });

  test("settings screen clears selection", () => {
    useUiStore.setState({ selection: { kind: "block", workspaceId: "ws_a", blockId: "block_a" } });
    useUiStore.getState().showSettingsScreen();
    assert.deepEqual(useUiStore.getState().selection, { kind: "none" });
  });
});
