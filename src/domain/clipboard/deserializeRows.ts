import type { ColumnId } from "../ids.js";
import type { PersistedCell } from "../../types/row.js";
import {
  getColumnsInStableOrder,
  INTERNAL_ROW_CLIPBOARD_MARKER,
  INTERNAL_ROW_CLIPBOARD_VERSION,
  isBlockType,
  isColumnType,
  isNonEmptyString,
  isPlainRecord,
  normalizeCellForColumnType,
  normalizeRowFormatting,
  type DeserializeInternalRowsResult,
  type InternalRowClipboardColumn,
  type InternalRowClipboardRow,
} from "./rowClipboardTypes.js";

export function deserializeRowsFromClipboardJson(raw: string): DeserializeInternalRowsResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }

  if (!isPlainRecord(parsed)) {
    return { ok: false, reason: "invalid-payload" };
  }

  if (parsed.marker !== INTERNAL_ROW_CLIPBOARD_MARKER) {
    return { ok: false, reason: "invalid-marker" };
  }

  if (parsed.version !== INTERNAL_ROW_CLIPBOARD_VERSION) {
    return { ok: false, reason: "unsupported-version" };
  }

  const source = parsed.source;
  if (!isPlainRecord(source) || !isNonEmptyString(source.blockId) || !isBlockType(source.blockType)) {
    return { ok: false, reason: "invalid-payload" };
  }

  if (!Array.isArray(source.columns)) {
    return { ok: false, reason: "invalid-payload" };
  }

  const columns = normalizeColumns(source.columns);
  if (!columns) {
    return { ok: false, reason: "invalid-payload" };
  }

  if (!Array.isArray(parsed.rows)) {
    return { ok: false, reason: "invalid-payload" };
  }

  const rows = normalizeRows(parsed.rows, columns);
  if (!rows) {
    return { ok: false, reason: "invalid-payload" };
  }

  return {
    ok: true,
    payload: {
      marker: INTERNAL_ROW_CLIPBOARD_MARKER,
      version: INTERNAL_ROW_CLIPBOARD_VERSION,
      source: {
        blockId: source.blockId,
        blockType: source.blockType,
        columns,
      },
      rows,
    },
  };
}

function normalizeColumns(rawColumns: unknown[]): InternalRowClipboardColumn[] | null {
  const columns: InternalRowClipboardColumn[] = [];
  const seenIds = new Set<ColumnId>();

  for (const rawColumn of rawColumns) {
    if (!isPlainRecord(rawColumn)) {
      return null;
    }
    if (!isNonEmptyString(rawColumn.id) || !isColumnType(rawColumn.type)) {
      return null;
    }
    if (typeof rawColumn.order !== "number" || !Number.isFinite(rawColumn.order)) {
      return null;
    }
    if (seenIds.has(rawColumn.id)) {
      return null;
    }

    seenIds.add(rawColumn.id);
    columns.push({
      id: rawColumn.id,
      type: rawColumn.type,
      order: rawColumn.order,
    });
  }

  return getColumnsInStableOrder(columns);
}

function normalizeRows(rawRows: unknown[], columns: InternalRowClipboardColumn[]): InternalRowClipboardRow[] | null {
  const rows: InternalRowClipboardRow[] = [];

  for (const rawRow of rawRows) {
    if (!isPlainRecord(rawRow)) {
      return null;
    }
    if (!isNonEmptyString(rawRow.sourceRowId)) {
      return null;
    }
    if (typeof rawRow.order !== "number" || !Number.isFinite(rawRow.order)) {
      return null;
    }
    if (rawRow.cells !== undefined && !isPlainRecord(rawRow.cells)) {
      return null;
    }

    const rawCells = isPlainRecord(rawRow.cells) ? rawRow.cells : {};
    const cells: Partial<Record<ColumnId, PersistedCell>> = {};
    for (const column of columns) {
      const normalizedCell = normalizeCellForColumnType(rawCells[column.id], column.type);
      if (normalizedCell) {
        cells[column.id] = structuredClone(normalizedCell);
      }
    }

    rows.push({
      sourceRowId: rawRow.sourceRowId,
      order: rawRow.order,
      format: normalizeRowFormatting(rawRow.format),
      cells,
    });
  }

  return rows;
}
