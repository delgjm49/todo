import type { BlockId, ColumnId, RowId } from "../ids.js";
import type { Block, BlockType } from "../../types/block.js";
import type { ColumnType } from "../../types/column.js";
import type { CellFormatting, RowFormatting } from "../../types/formatting.js";
import type { PersistedCell } from "../../types/row.js";

export const INTERNAL_ROW_CLIPBOARD_MARKER = "todo-app.internal-row-clipboard";
export const INTERNAL_ROW_CLIPBOARD_VERSION = 1;

export type ClipboardMappingStrategy = "by-column-id" | "by-shape";

export interface InternalRowClipboardColumn {
  id: ColumnId;
  type: ColumnType;
  order: number;
}

export interface InternalRowClipboardRow {
  sourceRowId: RowId;
  order: number;
  format: RowFormatting;
  cells: Partial<Record<ColumnId, PersistedCell>>;
}

export interface InternalRowClipboardPayload {
  marker: typeof INTERNAL_ROW_CLIPBOARD_MARKER;
  version: typeof INTERNAL_ROW_CLIPBOARD_VERSION;
  source: {
    blockId: BlockId;
    blockType: BlockType;
    columns: InternalRowClipboardColumn[];
  };
  rows: InternalRowClipboardRow[];
}

export type SerializeInternalRowsFailureReason = "no-rows";
export type DeserializeInternalRowsFailureReason =
  | "invalid-json"
  | "invalid-marker"
  | "unsupported-version"
  | "invalid-payload";
export type MapClipboardRowsFailureReason = "empty-payload" | "incompatible-target";

export type SerializeInternalRowsResult =
  | { ok: true; payload: InternalRowClipboardPayload; json: string }
  | { ok: false; reason: SerializeInternalRowsFailureReason };

export type DeserializeInternalRowsResult =
  | { ok: true; payload: InternalRowClipboardPayload }
  | { ok: false; reason: DeserializeInternalRowsFailureReason };

export type MapClipboardRowsResult =
  | { ok: true; rows: Block["rows"]; strategy: ClipboardMappingStrategy }
  | { ok: false; reason: MapClipboardRowsFailureReason; rows: [] };

export type PlainRecord = Record<string, unknown>;

export function isPlainRecord(value: unknown): value is PlainRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isColumnType(value: unknown): value is ColumnType {
  return (
    value === "text" ||
    value === "checkbox" ||
    value === "bullet" ||
    value === "numbered" ||
    value === "date" ||
    value === "time" ||
    value === "dropdown"
  );
}

export function isBlockType(value: unknown): value is BlockType {
  return value === "basic_checklist" || value === "bulleted_list" || value === "numbered_list";
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isCssColor(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }

  if (typeof document !== "undefined") {
    const probe = document.createElement("span");
    probe.style.color = "";
    probe.style.color = value;
    return probe.style.color.length > 0;
  }

  return /^#([0-9a-fA-F]{3,8})$/.test(value) || /^(rgb|rgba|hsl|hsla)\(/i.test(value);
}

function normalizeFormatting(value: unknown): CellFormatting {
  if (!isPlainRecord(value)) {
    return {};
  }

  const format: CellFormatting = {};
  if (typeof value.fontFamily === "string" && value.fontFamily.trim().length > 0) {
    format.fontFamily = value.fontFamily;
  }
  if (typeof value.fontSize === "number" && Number.isFinite(value.fontSize) && value.fontSize > 0) {
    format.fontSize = value.fontSize;
  }
  if (typeof value.bold === "boolean") {
    format.bold = value.bold;
  }
  if (typeof value.italic === "boolean") {
    format.italic = value.italic;
  }
  if (typeof value.underline === "boolean") {
    format.underline = value.underline;
  }
  if (isCssColor(value.textColor)) {
    format.textColor = value.textColor;
  }
  if (isCssColor(value.backgroundColor)) {
    format.backgroundColor = value.backgroundColor;
  }
  if (value.horizontalAlign === "left" || value.horizontalAlign === "center" || value.horizontalAlign === "right") {
    format.horizontalAlign = value.horizontalAlign;
  }
  if (isCssColor(value.borderColor)) {
    format.borderColor = value.borderColor;
  }
  if (typeof value.borderWidth === "number" && Number.isFinite(value.borderWidth) && value.borderWidth >= 0) {
    format.borderWidth = value.borderWidth;
  }
  const rawEdges = value.edges;
  if (Array.isArray(rawEdges)) {
    const edgeOrder = ["top", "right", "bottom", "left"] as const;
    const edges = edgeOrder.filter((edge) => rawEdges.includes(edge));
    if (edges.length > 0) {
      format.edges = edges;
    }
  }

  return format;
}

export function normalizeRowFormatting(value: unknown): RowFormatting {
  return normalizeFormatting(value);
}

export function normalizeCellFormatting(value: unknown): CellFormatting {
  return normalizeFormatting(value);
}

export function normalizeCellForColumnType(cell: unknown, columnType: ColumnType): PersistedCell | null {
  if (!isPlainRecord(cell)) {
    return null;
  }

  const format = normalizeCellFormatting(cell.format);

  if (columnType === "checkbox") {
    return typeof cell.value === "boolean" ? { value: cell.value, format } : null;
  }

  if (columnType === "bullet" || columnType === "numbered") {
    return cell.value === null ? { value: null, format } : null;
  }

  if (columnType === "date" || columnType === "time" || columnType === "dropdown") {
    return typeof cell.value === "string" || cell.value === null ? { value: cell.value, format } : null;
  }

  return typeof cell.value === "string" ? { value: cell.value, format } : null;
}

export function getColumnsInStableOrder<T extends { order: number }>(columns: readonly T[]): T[] {
  return columns
    .map((column, index) => ({ column, index }))
    .sort((left, right) => {
      if (left.column.order !== right.column.order) {
        return left.column.order - right.column.order;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.column);
}
