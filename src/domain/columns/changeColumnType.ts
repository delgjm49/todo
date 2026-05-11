import type { ColumnDefinition, ColumnType } from "../../types/column.js";
import type { ColumnId } from "../ids.js";
import type { PersistedCell, Row } from "../../types/row.js";
import { getDefaultColumnWidth, getDefaultSettings } from "./createColumn.js";

export interface ChangeColumnTypeResult {
  columns: ColumnDefinition[];
  rows: Row[];
}

export function changeColumnType(
  columns: ColumnDefinition[],
  rows: Row[],
  columnId: ColumnId,
  type: ColumnType
): ChangeColumnTypeResult {
  const nextColumns = columns.map((column) => {
    if (column.id !== columnId) {
      return structuredClone(column);
    }

    return {
      ...structuredClone(column),
      type,
      width: getDefaultColumnWidth(type),
      settings: getDefaultSettings(type),
    };
  });

  const nextRows = rows.map((row) => {
    const cell = row.cells[columnId];
    return {
      ...structuredClone(row),
      cells: {
        ...structuredClone(row.cells),
        [columnId]: convertCell(cell, type),
      },
    };
  });

  return { columns: nextColumns, rows: nextRows };
}

function convertCell(cell: PersistedCell | undefined, type: ColumnType): PersistedCell {
  if (type === "checkbox") {
    return { value: Boolean(cell?.value), format: {} };
  }

  if (type === "bullet" || type === "numbered") {
    return { value: null, format: {} };
  }

  if (type === "date" || type === "time" || type === "dropdown") {
    if (cell && typeof cell.value === "string") {
      return { value: cell.value, format: {} };
    }
    return { value: null, format: {} };
  }

  // text
  if (cell && typeof cell.value === "string") {
    return { value: cell.value, format: {} };
  }
  if (cell && typeof cell.value === "boolean") {
    return { value: cell.value ? "true" : "false", format: {} };
  }
  return { value: "", format: {} };
}
