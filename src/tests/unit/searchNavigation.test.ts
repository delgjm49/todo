import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { navigateToSearchResult } from "../../hooks/useSearchNavigation.js";
import { useDocumentStore } from "../../stores/documentStore.js";
import { useUiStore } from "../../stores/uiStore.js";
import type { SearchResult } from "../../domain/search/index.js";
import type { Block } from "../../types/block.js";
import type { WorkspaceDocument, WorkspaceIndexEntry } from "../../types/workspace.js";

const initialDocumentState = useDocumentStore.getState();
const initialUiState = useUiStore.getState();

function createFixture(): {
  workspaceIndex: WorkspaceIndexEntry[];
  workspacesById: Record<string, WorkspaceDocument>;
  result: SearchResult;
} {
  const workspaceIndex: WorkspaceIndexEntry[] = [
    { id: "ws_source", title: "Source", order: 0, style: {} },
    { id: "ws_target", title: "Target", order: 1, style: {} },
  ];
  const block: Block = {
    id: "block_target",
    workspaceId: "ws_target",
    title: "Target block",
    blockType: "basic_checklist",
    order: 0,
    collapsed: false,
    border: {},
    sort: null,
    format: {},
    columns: [{ id: "col_task", type: "text", label: "Task", order: 0, width: 220, visible: true, settings: {}, format: {} }],
    rows: [{ id: "row_target", order: 0, format: {}, cells: { col_task: { value: "Find me" } } }],
  };
  return {
    workspaceIndex,
    workspacesById: {
      ws_source: { id: "ws_source", blocks: [] },
      ws_target: { id: "ws_target", blocks: [block] },
    },
    result: {
      id: "cell:ws_target:block_target:row_target:col_task",
      kind: "cell",
      workspaceId: "ws_target",
      blockId: "block_target",
      rowId: "row_target",
      columnId: "col_task",
      workspaceTitle: "Target",
      blockTitle: "Target block",
      columnLabel: "Task",
      cellType: "text",
      snippet: "Find me",
      matchedText: "Find me",
    },
  };
}

afterEach(() => {
  useDocumentStore.setState(initialDocumentState, true);
  useUiStore.setState(initialUiState, true);
});

describe("search navigation", () => {
  test("selects the result target without dirtying or saving", async () => {
    const fixture = createFixture();
    let saveCalls = 0;
    useDocumentStore.setState({
      ...initialDocumentState,
      workspaceIndex: fixture.workspaceIndex,
      workspacesById: fixture.workspacesById,
      loadedWorkspaceIds: ["ws_source", "ws_target"],
      activeWorkspaceId: "ws_source",
      dirty: false,
      saveAll: async () => {
        saveCalls += 1;
        return true;
      },
      retrySave: async () => {
        saveCalls += 1;
        return true;
      },
    });
    useUiStore.setState({ ...initialUiState, selection: { kind: "none" }, searchFlashRowId: null });

    navigateToSearchResult(fixture.result, []);

    await new Promise((resolve) => setTimeout(resolve, 350));

    assert.equal(useDocumentStore.getState().activeWorkspaceId, "ws_target");
    assert.deepEqual(useUiStore.getState().selection, {
      kind: "cell",
      workspaceId: "ws_target",
      blockId: "block_target",
      rowId: "row_target",
      columnId: "col_task",
    });
    assert.equal(useUiStore.getState().searchFlashRowId, "row_target");
    assert.equal(useDocumentStore.getState().dirty, false);
    assert.equal(saveCalls, 0);
  });
});
