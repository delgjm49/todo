import type { WorkspaceAlertSummary, WorkspaceDocument } from "../../types/workspace.js";
import { evaluateRow } from "./evaluateRow.js";

interface PrimaryAlert {
  dueAt: number;
  blockId: string;
  rowId: string;
  columnId: string;
}

/**
 * Computes a workspace-level alert summary by iterating all blocks and rows.
 *
 * @param document The workspace document to evaluate
 * @param now The current timestamp (injected for deterministic testing)
 * @returns WorkspaceAlertSummary with count and optional primary alert identifiers
 */
export function evaluateWorkspace(
  document: WorkspaceDocument,
  now: Date,
): WorkspaceAlertSummary {
  let count = 0;
  let primary: PrimaryAlert | undefined;

  for (const block of document.blocks) {
    const enabledColumns = block.columns.filter(
      (col) =>
        (col.type === "date" || col.type === "time") &&
        (col.settings as { alertsEnabled?: boolean }).alertsEnabled,
    );

    if (enabledColumns.length === 0) {
      continue;
    }

    for (const row of block.rows) {
      const result = evaluateRow(row, block.columns, now);
      if (result.hasAlert && result.dueAt !== undefined && result.columnId !== undefined) {
        count++;

        if (primary === undefined || result.dueAt < primary.dueAt) {
          primary = {
            dueAt: result.dueAt,
            blockId: block.id,
            rowId: row.id,
            columnId: result.columnId,
          };
        }
      }
    }
  }

  if (count === 0 || primary === undefined) {
    return { count: 0 };
  }

  return {
    count,
    blockId: primary.blockId,
    rowId: primary.rowId,
    columnId: primary.columnId,
  };
}
