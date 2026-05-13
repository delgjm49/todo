import { getRowsInDisplayOrder } from "../rows/reorderRows.js";
import type { Block } from "../../types/block.js";
import type { ColumnId, RowId } from "../ids.js";
import type { PersistedCell } from "../../types/row.js";
import {
  getColumnsInStableOrder,
  INTERNAL_ROW_CLIPBOARD_MARKER,
  INTERNAL_ROW_CLIPBOARD_VERSION,
  normalizeCellForColumnType,
  normalizeRowFormatting,
  type InternalRowClipboardPayload,
  type SerializeInternalRowsResult,
} from "./rowClipboardTypes.js";

export function serializeRowsForClipboard(block: Block, selectedRowIds: RowId[]): SerializeInternalRowsResult {
  const selectedIds = new Set(selectedRowIds);
  const sourceColumns = getColumnsInStableOrder(block.columns);
  const sourceColumnIds = new Set<ColumnId>(sourceColumns.map((column) => column.id));
  const selectedRows = getRowsInDisplayOrder(block.rows).filter((row) => selectedIds.has(row.id));

  if (selectedRows.length === 0) {
    return { ok: false, reason: "no-rows" };
  }

  const payload: InternalRowClipboardPayload = {
    marker: INTERNAL_ROW_CLIPBOARD_MARKER,
    version: INTERNAL_ROW_CLIPBOARD_VERSION,
    source: {
      blockId: block.id,
      blockType: block.blockType,
      columns: sourceColumns.map((column) => ({
        id: column.id,
        type: column.type,
        order: column.order,
      })),
    },
    rows: selectedRows.map((row) => {
      const cells: Partial<Record<ColumnId, PersistedCell>> = {};
      for (const column of sourceColumns) {
        if (!sourceColumnIds.has(column.id)) {
          continue;
        }

        const normalizedCell = normalizeCellForColumnType(row.cells[column.id], column.type);
        if (normalizedCell) {
          cells[column.id] = structuredClone(normalizedCell);
        }
      }

      return {
        sourceRowId: row.id,
        order: row.order,
        format: normalizeRowFormatting(row.format),
        cells,
      };
    }),
  };

  return {
    ok: true,
    payload,
    json: JSON.stringify(payload),
  };
}
