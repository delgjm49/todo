import type { ColumnDefinition, ColumnSettings } from "../../types/column.js";
import type { ColumnId } from "../ids.js";

export function updateColumnSettings(
  columns: ColumnDefinition[],
  columnId: ColumnId,
  settingsPatch: Partial<ColumnSettings>
): ColumnDefinition[] {
  return columns.map((column) => {
    if (column.id !== columnId) {
      return structuredClone(column);
    }

    return {
      ...structuredClone(column),
      settings: {
        ...structuredClone(column.settings),
        ...structuredClone(settingsPatch),
      } as ColumnSettings,
    };
  });
}
