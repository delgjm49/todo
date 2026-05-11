import type { ColumnDefinition } from "../../types/column.js";
import type { ColumnId } from "../ids.js";

export function renameColumn(
  columns: ColumnDefinition[],
  columnId: ColumnId,
  label: string
): ColumnDefinition[] {
  return columns.map((column) => {
    if (column.id !== columnId) {
      return structuredClone(column);
    }

    return {
      ...structuredClone(column),
      label: label.trim(),
    };
  });
}
