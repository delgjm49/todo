import type { BlockSort } from "../../types/block.js";
import type { ColumnDefinition, ColumnType } from "../../types/column.js";
import type { PersistedCell } from "../../types/row.js";

export type SortDirection = BlockSort["direction"];

const sortableColumnTypes = new Set<ColumnType>(["text", "checkbox", "bullet", "date", "time", "dropdown"]);
const stringCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

interface ComparableValue {
  empty: boolean;
  value: number | string | boolean | null;
}

export function isSortableColumn(column: ColumnDefinition | undefined): column is ColumnDefinition {
  return column !== undefined && sortableColumnTypes.has(column.type);
}

export function compareCellValues(
  left: PersistedCell | undefined,
  right: PersistedCell | undefined,
  column: ColumnDefinition,
  direction: SortDirection
): number {
  if (column.type === "bullet") {
    return 0;
  }

  const leftValue = normalizeCellValue(left, column.type);
  const rightValue = normalizeCellValue(right, column.type);

  if (leftValue.empty || rightValue.empty) {
    if (leftValue.empty && rightValue.empty) {
      return 0;
    }

    return leftValue.empty ? 1 : -1;
  }

  const comparison = compareNormalizedValues(leftValue.value, rightValue.value);
  return direction === "desc" ? -comparison : comparison;
}

function normalizeCellValue(cell: PersistedCell | undefined, columnType: ColumnType): ComparableValue {
  switch (columnType) {
    case "text":
    case "dropdown":
      return normalizeStringValue(cell?.value);
    case "checkbox":
      return { empty: false, value: typeof cell?.value === "boolean" ? cell.value : false };
    case "date":
      return normalizeDateValue(cell?.value);
    case "time":
      return normalizeTimeValue(cell?.value);
    case "bullet":
    case "numbered":
      return { empty: false, value: null };
  }
}

function normalizeStringValue(value: PersistedCell["value"] | undefined): ComparableValue {
  if (typeof value !== "string") {
    return { empty: true, value: null };
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? { empty: false, value: trimmed } : { empty: true, value: null };
}

function normalizeDateValue(value: PersistedCell["value"] | undefined): ComparableValue {
  if (typeof value !== "string" || value.trim() === "") {
    return { empty: true, value: null };
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return { empty: true, value: null };
  }

  const [, yearPart, monthPart, dayPart] = match;
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    return { empty: true, value: null };
  }

  return { empty: false, value: timestamp };
}

function normalizeTimeValue(value: PersistedCell["value"] | undefined): ComparableValue {
  if (typeof value !== "string" || value.trim() === "") {
    return { empty: true, value: null };
  }

  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) {
    return { empty: true, value: null };
  }

  const [, hourPart, minutePart, secondPart = "0"] = match;
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  const second = Number(secondPart);

  if (hour > 23 || minute > 59 || second > 59) {
    return { empty: true, value: null };
  }

  return { empty: false, value: hour * 60 * 60 + minute * 60 + second };
}

function compareNormalizedValues(
  left: ComparableValue["value"],
  right: ComparableValue["value"]
): number {
  if (typeof left === "string" && typeof right === "string") {
    return stringCollator.compare(left, right);
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }

  return 0;
}
