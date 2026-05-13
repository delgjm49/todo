import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  findBlockById,
  findCellById,
  findColumnById,
  findRowById,
  resolveSelectionTarget,
  selectActiveWorkspaceDocument,
  selectActiveWorkspaceEntry,
  selectWorkspaceContext,
  type DocumentSelectorState,
} from "../../domain/document/documentSelectors.js";
import { createBlockTemplate } from "../../domain/templates/blockTemplates.js";
import type { Block } from "../../types/block.js";
import type { Selection } from "../../types/ui.js";
import type { WorkspaceDocument, WorkspaceIndexEntry } from "../../types/workspace.js";

function makeFixture(blockOverride?: Block): {
  state: DocumentSelectorState;
  workspaceEntry: WorkspaceIndexEntry;
  workspaceDocument: WorkspaceDocument;
  block: Block;
} {
  const block = blockOverride ?? createBlockTemplate("basic_checklist", "ws_home", {
    blockId: "block_home",
    title: "Today",
    order: 0,
  });
  const workspaceEntry: WorkspaceIndexEntry = {
    id: "ws_home",
    title: "Home",
    order: 0,
    style: {
      background: "#1F2937",
      textColor: "#F9FAFB",
      accentStripe: { enabled: true, color: "#60A5FA" },
    },
  };
  const workspaceDocument: WorkspaceDocument = {
    id: "ws_home",
    blocks: [block],
  };

  return {
    state: {
      workspaceIndex: [workspaceEntry],
      workspacesById: { ws_home: workspaceDocument },
      activeWorkspaceId: "ws_home",
    },
    workspaceEntry,
    workspaceDocument,
    block,
  };
}

function idsFromBlock(block: Block): { rowId: string; checkboxColumnId: string; textColumnId: string } {
  const rowId = block.rows[0]?.id;
  const checkboxColumnId = block.columns.find((column) => column.type === "checkbox")?.id;
  const textColumnId = block.columns.find((column) => column.type === "text")?.id;
  assert.ok(rowId);
  assert.ok(checkboxColumnId);
  assert.ok(textColumnId);
  return { rowId, checkboxColumnId, textColumnId };
}

describe("documentSelectors", () => {
  test("selects active workspace entry, document, and explicit workspace context", () => {
    const { state, workspaceEntry, workspaceDocument } = makeFixture();

    assert.equal(selectActiveWorkspaceEntry(state), workspaceEntry);
    assert.equal(selectActiveWorkspaceDocument(state), workspaceDocument);
    assert.deepEqual(selectWorkspaceContext(state, "ws_home"), {
      entry: workspaceEntry,
      document: workspaceDocument,
    });
    assert.deepEqual(selectWorkspaceContext(state, "ws_missing"), {
      entry: null,
      document: null,
    });
  });

  test("returns null active workspace lookups when no active workspace is set", () => {
    const { state } = makeFixture();
    const inactiveState = { ...state, activeWorkspaceId: null };

    assert.equal(selectActiveWorkspaceEntry(inactiveState), null);
    assert.equal(selectActiveWorkspaceDocument(inactiveState), null);
  });

  test("finds block, visible column, row, and cell targets", () => {
    const { workspaceDocument, block } = makeFixture();
    const { rowId, textColumnId } = idsFromBlock(block);

    assert.equal(findBlockById(workspaceDocument, "block_home"), block);
    assert.equal(findColumnById(block, textColumnId)?.id, textColumnId);
    assert.equal(findRowById(block, rowId)?.id, rowId);
    assert.deepEqual(findCellById(block, rowId, textColumnId), block.rows[0]?.cells[textColumnId]);
  });

  test("findColumnById respects visible display columns", () => {
    const baseBlock = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });
    const hiddenColumn = {
      ...baseBlock.columns[1],
      id: "column_hidden",
      order: -1,
      visible: false,
    };
    assert.ok(hiddenColumn);
    const block: Block = {
      ...baseBlock,
      columns: [hiddenColumn, ...baseBlock.columns],
      rows: baseBlock.rows.map((row) => ({
        ...row,
        cells: { ...row.cells, column_hidden: { value: "hidden", format: {} } },
      })),
    };

    assert.equal(findColumnById(block, "column_hidden"), null);
    assert.equal(findCellById(block, block.rows[0]?.id ?? "", "column_hidden"), null);
  });

  test("resolves none, block, column, row, and cell selections", () => {
    const { state, block } = makeFixture();
    const { rowId, textColumnId } = idsFromBlock(block);

    const noneResult = resolveSelectionTarget(state, { kind: "none" });
    assert.equal(noneResult.status, "none");

    const blockResult = resolveSelectionTarget(state, {
      kind: "block",
      workspaceId: "ws_home",
      blockId: "block_home",
    });
    assert.equal(blockResult.status, "resolved");
    assert.equal(blockResult.kind, "block");
    assert.equal(blockResult.block, block);

    const columnResult = resolveSelectionTarget(state, {
      kind: "column",
      workspaceId: "ws_home",
      blockId: "block_home",
      columnId: textColumnId,
    });
    assert.equal(columnResult.status, "resolved");
    assert.equal(columnResult.kind, "column");
    assert.equal(columnResult.column.id, textColumnId);

    const rowResult = resolveSelectionTarget(state, {
      kind: "row",
      workspaceId: "ws_home",
      blockId: "block_home",
      rowId,
    });
    assert.equal(rowResult.status, "resolved");
    assert.equal(rowResult.kind, "row");
    assert.equal(rowResult.row.id, rowId);

    const cellResult = resolveSelectionTarget(state, {
      kind: "cell",
      workspaceId: "ws_home",
      blockId: "block_home",
      rowId,
      columnId: textColumnId,
    });
    assert.equal(cellResult.status, "resolved");
    assert.equal(cellResult.kind, "cell");
    assert.deepEqual(cellResult.cell, block.rows[0]?.cells[textColumnId]);
  });

  test("reports stale workspace, block, column, row, and cell selections as missing", () => {
    const { state, block } = makeFixture();
    const { rowId, textColumnId } = idsFromBlock(block);
    const missingWorkspace: Selection = {
      kind: "block",
      workspaceId: "ws_missing",
      blockId: "block_home",
    };
    const missingBlock: Selection = {
      kind: "block",
      workspaceId: "ws_home",
      blockId: "block_missing",
    };
    const missingColumn: Selection = {
      kind: "column",
      workspaceId: "ws_home",
      blockId: "block_home",
      columnId: "column_missing",
    };
    const missingRow: Selection = {
      kind: "row",
      workspaceId: "ws_home",
      blockId: "block_home",
      rowId: "row_missing",
    };
    const blockWithoutCell: Block = {
      ...block,
      rows: block.rows.map((row) => {
        const cells = { ...row.cells };
        delete cells[textColumnId];
        return { ...row, cells };
      }),
    };
    const staleCellState = makeFixture(blockWithoutCell).state;
    const missingCell: Selection = {
      kind: "cell",
      workspaceId: "ws_home",
      blockId: "block_home",
      rowId,
      columnId: textColumnId,
    };

    const missingWorkspaceResult = resolveSelectionTarget(state, missingWorkspace);
    assert.equal(missingWorkspaceResult.status, "missing");
    assert.equal(missingWorkspaceResult.reason, "workspace");

    const missingBlockResult = resolveSelectionTarget(state, missingBlock);
    assert.equal(missingBlockResult.status, "missing");
    assert.equal(missingBlockResult.reason, "block");

    const missingColumnResult = resolveSelectionTarget(state, missingColumn);
    assert.equal(missingColumnResult.status, "missing");
    assert.equal(missingColumnResult.reason, "column");

    const missingRowResult = resolveSelectionTarget(state, missingRow);
    assert.equal(missingRowResult.status, "missing");
    assert.equal(missingRowResult.reason, "row");

    const missingCellResult = resolveSelectionTarget(staleCellState, missingCell);
    assert.equal(missingCellResult.status, "missing");
    assert.equal(missingCellResult.reason, "cell");
  });
});
