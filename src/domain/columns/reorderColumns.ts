import type { ColumnId } from "../ids.js";
import type { ColumnDefinition } from "../../types/column.js";

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

export function reorderColumns(
  columns: ColumnDefinition[],
  sourceColumnId: ColumnId,
  targetColumnId: ColumnId
): ColumnDefinition[] {
  if (sourceColumnId === targetColumnId) {
    return stableOrder(columns);
  }

  const ordered = stableOrder(columns);
  const sourceIndex = ordered.findIndex((column) => column.id === sourceColumnId);
  const targetIndex = ordered.findIndex((column) => column.id === targetColumnId);

  if (sourceIndex < 0 || targetIndex < 0) {
    return ordered;
  }

  const [moved] = ordered.splice(sourceIndex, 1);
  if (!moved) {
    return ordered;
  }

  const insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
  ordered.splice(insertIndex, 0, moved);
  return reindex(ordered);
}
