import type { Selection } from "../../types/ui.js";
import type { WorkspaceIndexEntry, WorkspaceDocument } from "../../types/workspace.js";
import type { BlockType } from "../../types/block.js";
import type { ColumnType } from "../../types/column.js";
import { getVisibleColumnsInDisplayOrder } from "../../domain/columns/createColumn.js";
import { getRowsInDisplayOrder } from "../../domain/rows/reorderRows.js";

export type InspectorTargetSummary = {
  kind: "none" | "missing" | "block" | "column" | "row" | "cell";
  eyebrow: string;
  title: string;
  description: string;
  details: Array<{ label: string; value: string }>;
};

function getBlockTypeLabel(blockType: BlockType): string {
  switch (blockType) {
    case "basic_checklist":
      return "Checklist";
    case "bulleted_list":
      return "Bullet list";
    case "numbered_list":
      return "Numbered list";
  }
}

function getColumnTypeLabel(columnType: ColumnType): string {
  switch (columnType) {
    case "text":
      return "Text";
    case "checkbox":
      return "Checkbox";
    case "bullet":
      return "Bullet";
    case "numbered":
      return "Numbered";
    case "date":
      return "Date";
    case "time":
      return "Time";
    case "dropdown":
      return "Dropdown";
  }
}

export function buildInspectorTargetSummary(args: {
  selection: Selection;
  activeWorkspace: WorkspaceIndexEntry | null;
  workspaceDocument: WorkspaceDocument | null;
}): InspectorTargetSummary {
  const { selection, activeWorkspace, workspaceDocument } = args;

  if (selection.kind === "none") {
    return {
      kind: "none",
      eyebrow: "No selection",
      title: activeWorkspace
        ? `Select a target in ${activeWorkspace.title}`
        : "Select a block, column, row, or cell",
      description: "Inspector details update based on the active selection.",
      details: activeWorkspace && workspaceDocument
        ? [
            { label: "Workspace", value: activeWorkspace.title },
            { label: "Blocks", value: String(workspaceDocument.blocks.length) },
          ]
        : [],
    };
  }

  if (!workspaceDocument) {
    return {
      kind: "missing",
      eyebrow: "Selection unavailable",
      title: "Workspace data not found",
      description: "Select another target to update the inspector.",
      details: [],
    };
  }

  const blocks = [...workspaceDocument.blocks].sort((a, b) => a.order - b.order);

  if (selection.kind === "block") {
    const block = blocks.find((b) => b.id === selection.blockId);
    if (!block) {
      return {
        kind: "missing",
        eyebrow: "Block unavailable",
        title: "Block not found",
        description: "This block may have been removed. Select another target.",
        details: [],
      };
    }

    const visibleColumns = getVisibleColumnsInDisplayOrder(block.columns);
    const blockPosition = blocks.indexOf(block) + 1;
    return {
      kind: "block",
      eyebrow: "Block selected",
      title: block.title,
      description: `${block.title} — ${getBlockTypeLabel(block.blockType)}`,
      details: [
        { label: "Type", value: getBlockTypeLabel(block.blockType) },
        { label: "Position", value: `Block ${blockPosition} of ${blocks.length}` },
        { label: "Rows", value: String(block.rows.length) },
        { label: "Columns", value: String(visibleColumns.length) },
      ],
    };
  }

  if (selection.kind === "column") {
    const block = blocks.find((b) => b.id === selection.blockId);
    if (!block) {
      return {
        kind: "missing",
        eyebrow: "Column unavailable",
        title: "Block not found",
        description: "This column's block may have been removed. Select another target.",
        details: [],
      };
    }

    const visibleColumns = getVisibleColumnsInDisplayOrder(block.columns);
    const column = visibleColumns.find((c) => c.id === selection.columnId);
    if (!column) {
      return {
        kind: "missing",
        eyebrow: "Column unavailable",
        title: "Column not found",
        description: "This column may have been removed. Select another target.",
        details: [],
      };
    }

    const columnPosition = visibleColumns.indexOf(column) + 1;
    return {
      kind: "column",
      eyebrow: "Column selected",
      title: column.label || "Untitled column",
      description: `${column.label || "Untitled column"} — ${getColumnTypeLabel(column.type)}`,
      details: [
        { label: "Type", value: getColumnTypeLabel(column.type) },
        { label: "Block", value: block.title },
        { label: "Position", value: `Column ${columnPosition} of ${visibleColumns.length}` },
      ],
    };
  }

  if (selection.kind === "row") {
    const block = blocks.find((b) => b.id === selection.blockId);
    if (!block) {
      return {
        kind: "missing",
        eyebrow: "Row unavailable",
        title: "Block not found",
        description: "This row's block may have been removed. Select another target.",
        details: [],
      };
    }

    const rows = getRowsInDisplayOrder(block.rows);
    const row = rows.find((r) => r.id === selection.rowId);
    if (!row) {
      return {
        kind: "missing",
        eyebrow: "Row unavailable",
        title: "Row not found",
        description: "This row may have been removed. Select another target.",
        details: [],
      };
    }

    const rowPosition = rows.indexOf(row) + 1;
    const visibleColumns = getVisibleColumnsInDisplayOrder(block.columns);
    return {
      kind: "row",
      eyebrow: "Row selected",
      title: `Row ${rowPosition}`,
      description: `Row ${rowPosition} of ${rows.length} in ${block.title}`,
      details: [
        { label: "Block", value: block.title },
        { label: "Position", value: `Row ${rowPosition} of ${rows.length}` },
        { label: "Cells", value: String(visibleColumns.length) },
      ],
    };
  }

  if (selection.kind === "cell") {
    const block = blocks.find((b) => b.id === selection.blockId);
    if (!block) {
      return {
        kind: "missing",
        eyebrow: "Cell unavailable",
        title: "Block not found",
        description: "This cell's block may have been removed. Select another target.",
        details: [],
      };
    }

    const rows = getRowsInDisplayOrder(block.rows);
    const row = rows.find((r) => r.id === selection.rowId);
    const visibleColumns = getVisibleColumnsInDisplayOrder(block.columns);
    const column = visibleColumns.find((c) => c.id === selection.columnId);

    if (!row || !column) {
      return {
        kind: "missing",
        eyebrow: "Cell unavailable",
        title: "Cell not found",
        description: "This cell's row or column may have been removed. Select another target.",
        details: [],
      };
    }

    const rowPosition = rows.indexOf(row) + 1;
    return {
      kind: "cell",
      eyebrow: "Cell selected",
      title: column.label || "Untitled column",
      description: `Cell at Row ${rowPosition}, ${column.label || "Untitled column"}`,
      details: [
        { label: "Block", value: block.title },
        { label: "Row", value: `Row ${rowPosition} of ${rows.length}` },
        { label: "Column", value: `${column.label || "Untitled column"} (${getColumnTypeLabel(column.type)})` },
      ],
    };
  }

  return {
    kind: "missing",
    eyebrow: "Unknown selection",
    title: "Unknown target",
    description: "Select another target to update the inspector.",
    details: [],
  };
}