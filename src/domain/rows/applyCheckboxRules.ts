import type { ColumnId } from "../ids.js";
import type { ColumnDefinition } from "../../types/column.js";
import type { Row } from "../../types/row.js";
import { getRowsInDisplayOrder } from "./reorderRows.js";

function isChecked(row: Row, columnId: ColumnId): boolean {
  return row.cells[columnId]?.value === true;
}

export function isCheckboxColumnCompleted(column: ColumnDefinition, row: Row): boolean {
  return (
    column.type === "checkbox" &&
    "strikeoutRowWhenChecked" in column.settings &&
    column.settings.strikeoutRowWhenChecked === true &&
    isChecked(row, column.id)
  );
}

export function isRowCompletedByCheckbox(columns: ColumnDefinition[], row: Row): boolean {
  return columns.some((column) => isCheckboxColumnCompleted(column, row));
}

export function applyCheckboxAutoMove(
  rows: Row[],
  columns: ColumnDefinition[],
  toggledColumnId: ColumnId
): Row[] {
  const orderedRows = getRowsInDisplayOrder(rows);
  const toggledColumn = columns.find((column) => column.id === toggledColumnId);

  if (
    !toggledColumn ||
    toggledColumn.type !== "checkbox" ||
    !("moveCheckedRowsToBottom" in toggledColumn.settings) ||
    toggledColumn.settings.moveCheckedRowsToBottom !== true
  ) {
    return orderedRows;
  }

  const uncheckedRows = orderedRows.filter((row) => !isChecked(row, toggledColumnId));
  const checkedRows = orderedRows.filter((row) => isChecked(row, toggledColumnId));

  return [...uncheckedRows, ...checkedRows].map((row, index) => ({
    ...structuredClone(row),
    order: index,
  }));
}
