import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildInspectorTargetSummary } from "../../components/layout/inspectorTargetSummary.js";
import { createBlockTemplate } from "../../domain/templates/blockTemplates.js";
import type { Selection } from "../../types/ui.js";
import type { WorkspaceIndexEntry, WorkspaceDocument } from "../../types/workspace.js";

function makeTestWorkspace(
  blocksOverride?: ReturnType<typeof createBlockTemplate>[]
): {
  activeWorkspace: WorkspaceIndexEntry;
  workspaceDocument: WorkspaceDocument;
} {
  const block = createBlockTemplate("basic_checklist", "ws_home", {
    blockId: "block_home",
    title: "Today",
    order: 0,
  });

  return {
    activeWorkspace: {
      id: "ws_home",
      title: "Home",
      order: 0,
      style: {
        background: "#1F2937",
        textColor: "#F9FAFB",
        accentStripe: { enabled: true, color: "#60A5FA" },
      },
    },
    workspaceDocument: {
      id: "ws_home",
      blocks: blocksOverride ?? [block],
    },
  };
}

describe("buildInspectorTargetSummary", () => {
  test("no-selection summary includes useful guidance and active workspace context", () => {
    const { activeWorkspace, workspaceDocument } = makeTestWorkspace();
    const selection: Selection = { kind: "none" };

    const summary = buildInspectorTargetSummary({
      selection,
      activeWorkspace,
      workspaceDocument,
    });

    assert.equal(summary.kind, "none");
    assert.equal(summary.eyebrow, "No selection");
    assert.ok(summary.title.includes("Home"), `Expected title to include workspace name, got: ${summary.title}`);
    assert.ok(summary.description.length > 0);
    assert.equal(summary.details[0]?.label, "Workspace");
    assert.equal(summary.details[0]?.value, "Home");
    assert.equal(summary.details[1]?.label, "Blocks");
    assert.equal(summary.details[1]?.value, "1");
  });

  test("no-selection without workspace shows generic guidance", () => {
    const selection: Selection = { kind: "none" };

    const summary = buildInspectorTargetSummary({
      selection,
      activeWorkspace: null,
      workspaceDocument: null,
    });

    assert.equal(summary.kind, "none");
    assert.equal(summary.eyebrow, "No selection");
    assert.equal(summary.details.length, 0);
  });

  test("block summary includes selected block title and block context", () => {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });
    const { activeWorkspace, workspaceDocument } = makeTestWorkspace([block]);
    const selection: Selection = { kind: "block", workspaceId: "ws_home", blockId: "block_home" };

    const summary = buildInspectorTargetSummary({
      selection,
      activeWorkspace,
      workspaceDocument,
    });

    assert.equal(summary.kind, "block");
    assert.equal(summary.eyebrow, "Block selected");
    assert.equal(summary.title, "Today");
    assert.equal(summary.details[0]?.label, "Type");
    assert.equal(summary.details[0]?.value, "Checklist");
    assert.equal(summary.details[1]?.label, "Position");
    assert.equal(summary.details[1]?.value, "Block 1 of 1");
    assert.equal(summary.details[2]?.label, "Rows");
    assert.equal(summary.details[2]?.value, "1");
    assert.equal(summary.details[3]?.label, "Columns");
    // basic_checklist has 2 visible columns (checkbox + text)
    assert.equal(summary.details[3]?.value, "2");
  });

  test("column summary includes selected column label/type and block context", () => {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });
    const { activeWorkspace, workspaceDocument } = makeTestWorkspace([block]);
    const textColumnId = block.columns.find((c) => c.type === "text")?.id;
    assert.ok(textColumnId);

    const selection: Selection = {
      kind: "column",
      workspaceId: "ws_home",
      blockId: "block_home",
      columnId: textColumnId,
    };

    const summary = buildInspectorTargetSummary({
      selection,
      activeWorkspace,
      workspaceDocument,
    });

    assert.equal(summary.kind, "column");
    assert.equal(summary.eyebrow, "Column selected");
    assert.equal(summary.title, "Task");
    assert.equal(summary.details[0]?.label, "Type");
    assert.equal(summary.details[0]?.value, "Text");
    assert.equal(summary.details[1]?.label, "Block");
    assert.equal(summary.details[1]?.value, "Today");
    assert.equal(summary.details[2]?.label, "Position");
    assert.equal(summary.details[2]?.value, "Column 2 of 2");
  });

  test("row summary includes row position/context", () => {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });
    const rowId = block.rows[0]?.id;
    assert.ok(rowId);

    const { activeWorkspace, workspaceDocument } = makeTestWorkspace([block]);
    const selection: Selection = {
      kind: "row",
      workspaceId: "ws_home",
      blockId: "block_home",
      rowId,
    };

    const summary = buildInspectorTargetSummary({
      selection,
      activeWorkspace,
      workspaceDocument,
    });

    assert.equal(summary.kind, "row");
    assert.equal(summary.eyebrow, "Row selected");
    assert.equal(summary.title, "Row 1");
    assert.equal(summary.details[0]?.label, "Block");
    assert.equal(summary.details[0]?.value, "Today");
    assert.equal(summary.details[1]?.label, "Position");
    assert.equal(summary.details[1]?.value, "Row 1 of 1");
    assert.equal(summary.details[2]?.label, "Cells");
    assert.equal(summary.details[2]?.value, "2");
  });

  test("cell summary includes row position and column label/type", () => {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });
    const rowId = block.rows[0]?.id;
    const textColumnId = block.columns.find((c) => c.type === "text")?.id;
    assert.ok(rowId);
    assert.ok(textColumnId);

    const { activeWorkspace, workspaceDocument } = makeTestWorkspace([block]);
    const selection: Selection = {
      kind: "cell",
      workspaceId: "ws_home",
      blockId: "block_home",
      rowId,
      columnId: textColumnId,
    };

    const summary = buildInspectorTargetSummary({
      selection,
      activeWorkspace,
      workspaceDocument,
    });

    assert.equal(summary.kind, "cell");
    assert.equal(summary.eyebrow, "Cell selected");
    assert.equal(summary.title, "Task");
    assert.equal(summary.details[0]?.label, "Block");
    assert.equal(summary.details[0]?.value, "Today");
    assert.equal(summary.details[1]?.label, "Row");
    assert.equal(summary.details[1]?.value, "Row 1 of 1");
    assert.equal(summary.details[2]?.label, "Column");
    assert.equal(summary.details[2]?.value, "Task (Text)");
  });

  test("stale block selection returns missing-target summary", () => {
    const { activeWorkspace, workspaceDocument } = makeTestWorkspace();
    const selection: Selection = {
      kind: "block",
      workspaceId: "ws_home",
      blockId: "block_nonexistent",
    };

    const summary = buildInspectorTargetSummary({
      selection,
      activeWorkspace,
      workspaceDocument,
    });

    assert.equal(summary.kind, "missing");
    assert.equal(summary.eyebrow, "Block unavailable");
    assert.ok(summary.description.includes("removed") || summary.description.includes("Select"));
  });

  test("stale column selection with missing block returns missing summary", () => {
    const { activeWorkspace, workspaceDocument } = makeTestWorkspace();
    const selection: Selection = {
      kind: "column",
      workspaceId: "ws_home",
      blockId: "block_nonexistent",
      columnId: "col_1",
    };

    const summary = buildInspectorTargetSummary({
      selection,
      activeWorkspace,
      workspaceDocument,
    });

    assert.equal(summary.kind, "missing");
    assert.equal(summary.eyebrow, "Column unavailable");
  });

  test("stale column selection with missing column returns missing summary", () => {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });
    const { activeWorkspace, workspaceDocument } = makeTestWorkspace([block]);
    const selection: Selection = {
      kind: "column",
      workspaceId: "ws_home",
      blockId: "block_home",
      columnId: "col_nonexistent",
    };

    const summary = buildInspectorTargetSummary({
      selection,
      activeWorkspace,
      workspaceDocument,
    });

    assert.equal(summary.kind, "missing");
    assert.equal(summary.eyebrow, "Column unavailable");
  });

  test("stale row selection returns missing summary", () => {
    const { activeWorkspace, workspaceDocument } = makeTestWorkspace();
    const selection: Selection = {
      kind: "row",
      workspaceId: "ws_home",
      blockId: "block_home",
      rowId: "row_nonexistent",
    };

    const summary = buildInspectorTargetSummary({
      selection,
      activeWorkspace,
      workspaceDocument,
    });

    assert.equal(summary.kind, "missing");
    assert.equal(summary.eyebrow, "Row unavailable");
  });

  test("stale cell selection returns missing summary", () => {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });
    const { activeWorkspace, workspaceDocument } = makeTestWorkspace([block]);
    const selection: Selection = {
      kind: "cell",
      workspaceId: "ws_home",
      blockId: "block_home",
      rowId: "row_nonexistent",
      columnId: "col_nonexistent",
    };

    const summary = buildInspectorTargetSummary({
      selection,
      activeWorkspace,
      workspaceDocument,
    });

    assert.equal(summary.kind, "missing");
    assert.equal(summary.eyebrow, "Cell unavailable");
  });

  test("selection with no workspace document returns missing summary", () => {
    const selection: Selection = {
      kind: "block",
      workspaceId: "ws_home",
      blockId: "block_home",
    };

    const summary = buildInspectorTargetSummary({
      selection,
      activeWorkspace: { id: "ws_home", title: "Home", order: 0, style: { background: "#1F2937", textColor: "#F9FAFB" } },
      workspaceDocument: null,
    });

    assert.equal(summary.kind, "missing");
    assert.equal(summary.eyebrow, "Selection unavailable");
  });

  test("block summary in multi-block workspace shows correct position", () => {
    const block1 = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_1",
      title: "First",
      order: 0,
    });
    const block2 = createBlockTemplate("bulleted_list", "ws_home", {
      blockId: "block_2",
      title: "Second",
      order: 1,
    });
    // Fix workspace references for block2
    const { activeWorkspace } = makeTestWorkspace();
    const workspaceDocument: WorkspaceDocument = {
      id: "ws_home",
      blocks: [block1, block2],
    };

    const selection: Selection = {
      kind: "block",
      workspaceId: "ws_home",
      blockId: "block_2",
    };

    const summary = buildInspectorTargetSummary({
      selection,
      activeWorkspace,
      workspaceDocument,
    });

    assert.equal(summary.kind, "block");
    assert.equal(summary.title, "Second");
    assert.equal(summary.details[0]?.value, "Bullet list");
    assert.equal(summary.details[1]?.value, "Block 2 of 2");
  });

  test("column with empty label shows 'Untitled column'", () => {
    const block = createBlockTemplate("basic_checklist", "ws_home", {
      blockId: "block_home",
      title: "Today",
      order: 0,
    });

    // Find the checkbox column which has an empty label
    const checkboxColumnId = block.columns.find((c) => c.type === "checkbox")?.id;
    assert.ok(checkboxColumnId);

    const { activeWorkspace, workspaceDocument } = makeTestWorkspace([block]);
    const selection: Selection = {
      kind: "column",
      workspaceId: "ws_home",
      blockId: "block_home",
      columnId: checkboxColumnId,
    };

    const summary = buildInspectorTargetSummary({
      selection,
      activeWorkspace,
      workspaceDocument,
    });

    assert.equal(summary.kind, "column");
    assert.equal(summary.title, "Untitled column");
  });
});