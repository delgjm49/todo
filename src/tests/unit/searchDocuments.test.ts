import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { searchDocuments } from "../../domain/search/index.js";
import type { Block } from "../../types/block.js";
import type { ColumnDefinition, ColumnType } from "../../types/column.js";
import type { Row } from "../../types/row.js";
import type { WorkspaceDocument, WorkspaceIndexEntry } from "../../types/workspace.js";

function column(id: string, type: ColumnType, order: number, label = id): ColumnDefinition {
  return { id, type, order, label, width: 120, visible: true, settings: {}, format: {} };
}
function row(id: string, order: number, cells: Row["cells"]): Row {
  return { id, order, cells, format: {} };
}
function block(id: string, order: number, columns: ColumnDefinition[], rows: Row[], title = "Block"): Block {
  return { id, workspaceId: "ws1", title, order, columns, rows, blockType: "basic_checklist", collapsed: false, border: {}, sort: null, format: {} };
}
const workspaceIndex: WorkspaceIndexEntry[] = [
  { id: "ws1", title: "Planning", order: 0, style: {} },
  { id: "ws2", title: "Archive", order: 1, style: {} },
];

function fixture() {
  const columns = [
    column("done", "checkbox", 0),
    column("text", "text", 1, "Task"),
    column("date", "date", 2, "Due"),
    column("time", "time", 3, "At"),
    column("status", "dropdown", 4, "Status"),
    column("bullet", "bullet", 5),
    column("numbered", "numbered", 6),
  ];
  const workspacesById: Record<string, WorkspaceDocument> = {
    ws1: { id: "ws1", blocks: [block("b1", 0, columns, [row("r1", 0, {
      done: { value: true, format: { textColor: "needle" } },
      text: { value: "Call Vendor" },
      date: { value: "2026-05-30" },
      time: { value: "09:30" },
      status: { value: "Waiting" },
      bullet: { value: null },
      numbered: { value: null },
    })], "Today")] },
    ws2: { id: "ws2", blocks: [] },
  };
  return workspacesById;
}

describe("searchDocuments", () => {
  test("returns no results for blank queries", () => {
    assert.deepEqual(searchDocuments({ query: "  ", workspaceIndex, workspacesById: fixture() }), { query: "  ", results: [], totalMatches: 0, capped: false });
  });

  test("matches workspace, block, text, date, time, and dropdown values case-insensitively", () => {
    const data = fixture();
    assert.equal(searchDocuments({ query: "planning", workspaceIndex, workspacesById: data }).results[0]?.kind, "workspace");
    assert.equal(searchDocuments({ query: "today", workspaceIndex, workspacesById: data }).results[0]?.kind, "block");
    assert.equal(searchDocuments({ query: "vendor", workspaceIndex, workspacesById: data }).results[0]?.columnId, "text");
    assert.equal(searchDocuments({ query: "2026-05", workspaceIndex, workspacesById: data }).results[0]?.columnId, "date");
    assert.equal(searchDocuments({ query: "09:30", workspaceIndex, workspacesById: data }).results[0]?.columnId, "time");
    assert.equal(searchDocuments({ query: "waiting", workspaceIndex, workspacesById: data }).results[0]?.columnId, "status");
  });

  test("excludes checkbox boolean values from searchable text", () => {
    const result = searchDocuments({ query: "true", workspaceIndex, workspacesById: fixture() });
    assert.equal(result.totalMatches, 0);
  });

  test("excludes bullet and numbered marker string values from searchable text", () => {
    const data = fixture();
    const row = data.ws1.blocks[0]?.rows[0];
    if (!row) throw new Error("missing fixture row");
    row.cells.bullet = { value: "marker needle bullet" };
    row.cells.numbered = { value: "marker needle numbered" };

    const result = searchDocuments({ query: "marker needle", workspaceIndex, workspacesById: data });
    assert.equal(result.totalMatches, 0);
  });

  test("excludes formatting and id metadata from searchable text", () => {
    const result = searchDocuments({ query: "needle", workspaceIndex, workspacesById: fixture() });
    assert.equal(result.totalMatches, 0);
    assert.equal(searchDocuments({ query: "r1", workspaceIndex, workspacesById: fixture() }).totalMatches, 0);
  });

  test("preserves workspace, block, row, and column order", () => {
    const result = searchDocuments({ query: "a", workspaceIndex, workspacesById: fixture() });
    assert.deepEqual(result.results.map((entry) => entry.id).slice(0, 5), ["workspace:ws1", "block:ws1:b1", "cell:ws1:b1:r1:text", "cell:ws1:b1:r1:status", "workspace:ws2"]);
  });

  test("orders matches deterministically across multiple workspaces, blocks, rows, and columns", () => {
    const columns = [column("late", "text", 2, "Late"), column("early", "text", 1, "Early")];
    const orderedIndex: WorkspaceIndexEntry[] = [
      { id: "ws_late", title: "Late", order: 2, style: {} },
      { id: "ws_early", title: "Early", order: 1, style: {} },
    ];
    const data: Record<string, WorkspaceDocument> = {
      ws_late: { id: "ws_late", blocks: [block("late_block", 0, columns, [row("late_row", 0, { early: { value: "target late" }, late: { value: "target late" } })], "Late block")] },
      ws_early: {
        id: "ws_early",
        blocks: [
          block("block_second", 2, columns, [row("row_second", 2, { early: { value: "target second" }, late: { value: "target second" } })], "Second block"),
          block("block_first", 1, columns, [
            row("row_late", 3, { early: { value: "target row late" }, late: { value: "target row late" } }),
            row("row_early", 1, { early: { value: "target row early" }, late: { value: "target row early" } }),
          ], "First block"),
        ],
      },
    };

    const result = searchDocuments({ query: "target", workspaceIndex: orderedIndex, workspacesById: data });
    assert.deepEqual(result.results.map((entry) => entry.id), [
      "cell:ws_early:block_first:row_early:early",
      "cell:ws_early:block_first:row_early:late",
      "cell:ws_early:block_first:row_late:early",
      "cell:ws_early:block_first:row_late:late",
      "cell:ws_early:block_second:row_second:early",
      "cell:ws_early:block_second:row_second:late",
      "cell:ws_late:late_block:late_row:early",
      "cell:ws_late:late_block:late_row:late",
    ]);
  });

  test("caps retained results while counting all matches", () => {
    const result = searchDocuments({ query: "a", workspaceIndex, workspacesById: fixture(), maxResults: 2 });
    assert.equal(result.results.length, 2);
    assert.equal(result.totalMatches > 2, true);
    assert.equal(result.capped, true);
  });
});
