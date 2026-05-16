import type { Selection } from "../../types/ui.js";
import type { WorkspaceDocument } from "../../types/workspace.js";
import type { ColumnDefinition } from "../../types/column.js";
import type { WorkspaceId, BlockId } from "../../domain/ids.js";
import { getVisibleColumnsInDisplayOrder } from "../../domain/columns/createColumn.js";

export type ColumnSettingsTarget = {
  workspaceId: WorkspaceId;
  blockId: BlockId;
  column: ColumnDefinition;
};

export function resolveColumnSettingsTarget(
  selection: Selection,
  workspaceDocument: WorkspaceDocument | null
): ColumnSettingsTarget | null {
  if (selection.kind === "none" || !workspaceDocument) {
    return null;
  }

  const block = workspaceDocument.blocks.find((b) => b.id === selection.blockId);
  if (!block) {
    return null;
  }

  if (selection.kind === "column") {
    const visibleColumns = getVisibleColumnsInDisplayOrder(block.columns);
    const column = visibleColumns.find((c) => c.id === selection.columnId);
    if (!column) {
      return null;
    }
    return {
      workspaceId: selection.workspaceId,
      blockId: selection.blockId,
      column,
    };
  }

  if (selection.kind === "cell") {
    const visibleColumns = getVisibleColumnsInDisplayOrder(block.columns);
    const column = visibleColumns.find((c) => c.id === selection.columnId);
    if (!column) {
      return null;
    }
    return {
      workspaceId: selection.workspaceId,
      blockId: selection.blockId,
      column,
    };
  }

  // block and row selections do not have a single column target
  return null;
}
