import type { Selection } from "../../types/ui.js";
import type { WorkspaceIndexEntry, WorkspaceDocument } from "../../types/workspace.js";
import type { AppDefaults } from "../../types/settings.js";
import type { FormattingLayer } from "./mergeFormatting.js";
import { resolveCellFormatting } from "./resolveCellFormatting.js";
import { resolveRowStyle } from "./resolveRowStyle.js";
import { getVisibleColumnsInDisplayOrder } from "../columns/createColumn.js";
import { getRowsInDisplayOrder } from "../rows/reorderRows.js";

export type SelectedFormattingTarget = {
  kind: "block" | "column" | "row" | "cell";
  direct: FormattingLayer;
  effective: FormattingLayer;
};

export function resolveSelectedFormattingTarget(
  selection: Selection,
  activeWorkspace: WorkspaceIndexEntry | null,
  workspaceDocument: WorkspaceDocument | null,
  appDefaults: AppDefaults
): SelectedFormattingTarget | null {
  if (selection.kind === "none" || !workspaceDocument) {
    return null;
  }

  const block = workspaceDocument.blocks.find((b) => b.id === selection.blockId);
  if (!block) {
    return null;
  }

  if (selection.kind === "block") {
    const effective = resolveCellFormatting(appDefaults, block.format, {}, {}, undefined);
    return { kind: "block", direct: block.format, effective };
  }

  if (selection.kind === "column") {
    const column = getVisibleColumnsInDisplayOrder(block.columns).find(
      (c) => c.id === selection.columnId
    );
    if (!column) {
      return null;
    }
    const effective = resolveCellFormatting(appDefaults, block.format, column.format, {}, undefined);
    return { kind: "column", direct: column.format, effective };
  }

  if (selection.kind === "row") {
    const row = getRowsInDisplayOrder(block.rows).find((r) => r.id === selection.rowId);
    if (!row) {
      return null;
    }
    const effective = resolveRowStyle(appDefaults, block.format, row.format);
    return { kind: "row", direct: row.format, effective };
  }

  if (selection.kind === "cell") {
    const row = getRowsInDisplayOrder(block.rows).find((r) => r.id === selection.rowId);
    const column = getVisibleColumnsInDisplayOrder(block.columns).find(
      (c) => c.id === selection.columnId
    );
    if (!row || !column) {
      return null;
    }
    const cell = row.cells[column.id];
    const effective = resolveCellFormatting(
      appDefaults,
      block.format,
      column.format,
      row.format,
      cell?.format
    );
    return { kind: "cell", direct: cell?.format ?? {}, effective };
  }

  return null;
}
