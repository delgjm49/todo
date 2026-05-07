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
      draggingWorkspaceId: "workspace_a",
      dropTargetWorkspaceId: "workspace_b",
      draggingBlockId: "block_a",
      dropTargetBlockId: "block_b",
      inspectorOpen: false,
    });

    useUiStore.getState().showSettingsScreen();

    const state = useUiStore.getState();
    assert.equal(state.screen, "settings");
    assert.equal(state.workspaceMenu, null);
    assert.equal(state.blockMenu, null);
    assert.equal(state.draggingWorkspaceId, null);
    assert.equal(state.dropTargetWorkspaceId, null);
    assert.equal(state.draggingBlockId, null);
    assert.equal(state.dropTargetBlockId, null);

    useUiStore.setState({
      screen: "main",
      workspaceMenu: null,
      blockMenu: null,
      draggingWorkspaceId: null,
      dropTargetWorkspaceId: null,
      draggingBlockId: null,
      dropTargetBlockId: null,
      inspectorOpen: false,
    });
  });
});
