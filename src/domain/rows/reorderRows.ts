import type { RowId } from "../ids.js";
import type { Row } from "../../types/row.js";

function stableOrder(rows: Row[]): Row[] {
  return rows
    .map((row, index) => ({ row: structuredClone(row), index }))
    .sort((left, right) => {
      if (left.row.order !== right.row.order) {
        return left.row.order - right.row.order;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.row);
}

function reindex(rows: Row[]): Row[] {
  return rows.map((row, index) => ({
    ...structuredClone(row),
    order: index,
  }));
}

export function getRowsInDisplayOrder(rows: Row[]): Row[] {
  return stableOrder(rows);
}

export function insertRowAtIndex(rows: Row[], row: Row, index: number): Row[] {
  const ordered = stableOrder(rows);
  const nextRow = structuredClone(row);
  const insertionIndex = Math.max(0, Math.min(index, ordered.length));
  ordered.splice(insertionIndex, 0, nextRow);
  return reindex(ordered);
}

export function deleteRowById(rows: Row[], rowId: RowId): Row[] {
  const ordered = stableOrder(rows);
  const filtered = ordered.filter((row) => row.id !== rowId);
  if (filtered.length === ordered.length) {
    return ordered;
  }

  return reindex(filtered);
}

export function reorderRows(rows: Row[], sourceRowId: RowId, targetRowId: RowId): Row[] {
  if (sourceRowId === targetRowId) {
    return stableOrder(rows);
  }

  const ordered = stableOrder(rows);
  const sourceIndex = ordered.findIndex((row) => row.id === sourceRowId);
  const targetIndex = ordered.findIndex((row) => row.id === targetRowId);

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
