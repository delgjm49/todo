import type { BlockSort } from "../../types/block.js";
import type { ColumnDefinition } from "../../types/column.js";
import type { Row } from "../../types/row.js";
import { getRowsInDisplayOrder } from "../rows/reorderRows.js";
import { compareCellValues, isSortableColumn } from "./compareValues.js";

export function sortRowsByColumn(
  rows: Row[],
  columns: ColumnDefinition[],
  sort: BlockSort | null | undefined
): Row[] {
  const orderedRows = getRowsInDisplayOrder(rows);
  const sortColumn = columns.find((column) => column.id === sort?.columnId);

  if (!sort || !isSortableColumn(sortColumn)) {
    return reindexRows(orderedRows);
  }

  const sortedRows = orderedRows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const comparison = compareCellValues(
        left.row.cells[sortColumn.id],
        right.row.cells[sortColumn.id],
        sortColumn,
        sort.direction
      );

      if (comparison !== 0) {
        return comparison;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.row);

  return reindexRows(sortedRows);
}

function reindexRows(rows: Row[]): Row[] {
  return rows.map((row, index) => ({
    ...row,
    order: index,
  }));
}
