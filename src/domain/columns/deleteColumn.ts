import type { ColumnDefinition } from "../../types/column.js";
import type { ColumnId } from "../ids.js";
import type { Row } from "../../types/row.js";

export interface DeleteColumnResult {
  columns: ColumnDefinition[];
  rows: Row[];
}

export function deleteColumn(
  columns: ColumnDefinition[],
  rows: Row[],
  columnId: ColumnId
): DeleteColumnResult {
  const remainingColumns = columns
    .filter((column) => column.id !== columnId)
    .map((column, index) => ({
      ...structuredClone(column),
      order: index,
    }));

  const nextRows = rows.map((row) => {
    const nextCells = { ...structuredClone(row.cells) };
    delete nextCells[columnId];
    return {
      ...structuredClone(row),
      cells: nextCells,
    };
  });

  return { columns: remainingColumns, rows: nextRows };
}
