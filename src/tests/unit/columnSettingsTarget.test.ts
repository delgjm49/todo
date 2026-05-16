import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { resolveColumnSettingsTarget } from "../../components/layout/columnSettingsTarget.js";
import { createBlockTemplate } from "../../domain/templates/blockTemplates.js";
import { createColumn } from "../../domain/columns/createColumn.js";
import type { Selection } from "../../types/ui.js";
import type { WorkspaceDocument } from "../../types/workspace.js";

function makeTestWorkspace(
  blocksOverride?: ReturnType<typeof createBlockTemplate>[]
): {
  workspaceDocument: WorkspaceDocument;
} {
  const block = createBlockTemplate("basic_checklist", "ws_home", {
    blockId: "block_home",
    title: "Today",
    order: 0,
  });
  return {
    workspaceDocument: {
      id: "ws_home",
      blocks: blocksOverride ?? [block],
    },
  };
}

describe("resolveColumnSettingsTarget", () => {
  test("none selection returns null", () => {
    const { workspaceDocument } = makeTestWorkspace();
    const selection: Selection = { kind: "none" };
    const target = resolveColumnSettingsTarget(selection, workspaceDocument);
    assert.equal(target, null);
  });

  test("block selection returns null", () => {
    const { workspaceDocument } = makeTestWorkspace();
    const selection: Selection = {
      kind: "block",
      workspaceId: "ws_home",
      blockId: "block_home",
    };
    const target = resolveColumnSettingsTarget(selection, workspaceDocument);
    assert.equal(target, null);
  });

  test("row selection returns null", () => {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });
    const { workspaceDocument } = makeTestWorkspace([block]);
    const rowId = block.rows[0]?.id;
    assert.ok(rowId);
    const selection: Selection = {
      kind: "row",
      workspaceId: "ws_home",
      blockId: "block_home",
      rowId,
    };
    const target = resolveColumnSettingsTarget(selection, workspaceDocument);
    assert.equal(target, null);
  });

  test("column selection on existing visible column returns target with that column", () => {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });
    const { workspaceDocument } = makeTestWorkspace([block]);
    const textColumnId = block.columns.find((c) => c.type === "text")?.id;
    assert.ok(textColumnId);
    const selection: Selection = {
      kind: "column",
      workspaceId: "ws_home",
      blockId: "block_home",
      columnId: textColumnId,
    };
    const target = resolveColumnSettingsTarget(selection, workspaceDocument);
    assert.ok(target);
    assert.equal(target.workspaceId, "ws_home");
    assert.equal(target.blockId, "block_home");
    assert.equal(target.column.id, textColumnId);
    assert.equal(target.column.type, "text");
  });

  test("cell selection on existing visible column returns target with the column", () => {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });
    const { workspaceDocument } = makeTestWorkspace([block]);
    const rowId = block.rows[0]?.id;
    const textColumnId = block.columns.find((c) => c.type === "text")?.id;
    assert.ok(rowId);
    assert.ok(textColumnId);
    const selection: Selection = {
      kind: "cell",
      workspaceId: "ws_home",
      blockId: "block_home",
      rowId,
      columnId: textColumnId,
    };
    const target = resolveColumnSettingsTarget(selection, workspaceDocument);
    assert.ok(target);
    assert.equal(target.column.id, textColumnId);
    assert.equal(target.column.type, "text");
  });

  test("column selection on hidden column returns null", () => {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });
    const hiddenColumn = createColumn("text", {
      id: "col_hidden",
      visible: false,
    });
    block.columns = [...block.columns, hiddenColumn];
    const { workspaceDocument } = makeTestWorkspace([block]);
    const selection: Selection = {
      kind: "column",
      workspaceId: "ws_home",
      blockId: "block_home",
      columnId: "col_hidden",
    };
    const target = resolveColumnSettingsTarget(selection, workspaceDocument);
    assert.equal(target, null);
  });

  test("column selection on missing column returns null", () => {
    const { workspaceDocument } = makeTestWorkspace();
    const selection: Selection = {
      kind: "column",
      workspaceId: "ws_home",
      blockId: "block_home",
      columnId: "col_nonexistent",
    };
    const target = resolveColumnSettingsTarget(selection, workspaceDocument);
    assert.equal(target, null);
  });

  test("column selection on missing block returns null", () => {
    const { workspaceDocument } = makeTestWorkspace();
    const selection: Selection = {
      kind: "column",
      workspaceId: "ws_home",
      blockId: "block_nonexistent",
      columnId: "col_1",
    };
    const target = resolveColumnSettingsTarget(selection, workspaceDocument);
    assert.equal(target, null);
  });

  test("workspaceDocument is null returns null for non-none selection", () => {
    const selection: Selection = {
      kind: "column",
      workspaceId: "ws_home",
      blockId: "block_home",
      columnId: "col_1",
    };
    const target = resolveColumnSettingsTarget(selection, null);
    assert.equal(target, null);
  });
});
