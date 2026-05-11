import { createColumn } from "./createColumn.js";
import type { ColumnDefinition, ColumnType } from "../../types/column.js";
import type { ColumnId } from "../ids.js";
import type { Row } from "../../types/row.js";
import { createCellForColumn } from "../rows/createRow.js";

export interface AddColumnResult {
  columns: ColumnDefinition[];
  rows: Row[];
}

export function addColumn(
  columns: ColumnDefinition[],
  rows: Row[],
  referenceColumnId: ColumnId,
  position: "left" | "right",
  type: ColumnType
): AddColumnResult {
  const ordered = stableOrder(columns);
  const referenceIndex = ordered.findIndex((column) => column.id === referenceColumnId);

  if (referenceIndex < 0) {
    return { columns: reindex(ordered), rows: structuredClone(rows) };
  }

  const newColumn = createColumn(type, { order: 0 });
  const insertIndex = position === "left" ? referenceIndex : referenceIndex + 1;
  ordered.splice(insertIndex, 0, newColumn);

  const nextColumns = reindex(ordered);
  const nextRows = rows.map((row) => ({
    ...structuredClone(row),
    cells: {
      ...structuredClone(row.cells),
      [newColumn.id]: createCellForColumn(newColumn),
    },
  }));

  return { columns: nextColumns, rows: nextRows };
}

function stableOrder(columns: ColumnDefinition[]): ColumnDefinition[] {
  return columns
    .map((column, index) => ({ column: structuredClone(column), index }))
    .sort((left, right) => {
      if (left.column.order !== right.column.order) {
        return left.column.order - right.column.order;
      }
      return left.index - right.index;
    })
    .map((entry) => entry.column);
}

function reindex(columns: ColumnDefinition[]): ColumnDefinition[] {
  return columns.map((column, index) => ({
    ...structuredClone(column),
    order: index,
  }));
}
