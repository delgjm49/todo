import type { ColumnDefinition } from "../../types/column.js";
import type { Row } from "../../types/row.js";
import { isRowCompletedByCheckbox } from "./applyCheckboxRules.js";
import { getRowsInDisplayOrder } from "./reorderRows.js";

/**
 * Filter rows based on the hideCompletedRows preference.
 * When hideCompletedRows is true, rows that are completed by the
 * checkbox completion predicate are excluded from the result.
 * The original input array is not mutated.
 */
export function filterCompletedRows(
  rows: Row[],
  columns: ColumnDefinition[],
  hideCompletedRows: boolean
): Row[] {
  const orderedRows = getRowsInDisplayOrder(rows);

  if (!hideCompletedRows) {
    return orderedRows;
  }

  return orderedRows.filter((row) => !isRowCompletedByCheckbox(columns, row));
}

/**
 * Count how many rows are completed by the checkbox completion predicate.
 */
export function countCompletedRows(
  rows: Row[],
  columns: ColumnDefinition[]
): number {
  return rows.filter((row) => isRowCompletedByCheckbox(columns, row)).length;
}
