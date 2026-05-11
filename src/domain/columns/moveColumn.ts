import type { ColumnDefinition } from "../../types/column.js";
import type { ColumnId } from "../ids.js";

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

export function moveColumnLeft(columns: ColumnDefinition[], columnId: ColumnId): ColumnDefinition[] {
  const ordered = stableOrder(columns);
  const index = ordered.findIndex((column) => column.id === columnId);
  if (index <= 0) {
    return ordered;
  }

  const next = ordered.map((c) => structuredClone(c));
  const temp = next[index];
  next[index] = next[index - 1];
  next[index - 1] = temp;
  return reindex(next);
}

export function moveColumnRight(columns: ColumnDefinition[], columnId: ColumnId): ColumnDefinition[] {
  const ordered = stableOrder(columns);
  const index = ordered.findIndex((column) => column.id === columnId);
  if (index < 0 || index >= ordered.length - 1) {
    return ordered;
  }

  const next = ordered.map((c) => structuredClone(c));
  const temp = next[index];
  next[index] = next[index + 1];
  next[index + 1] = temp;
  return reindex(next);
}
