import type { ColumnDefinition } from "../../types/column.js";
import type { ColumnId } from "../ids.js";
import type { Row } from "../../types/row.js";

export interface RowAlertResult {
  hasAlert: boolean;
  /** Earliest due timestamp (ms since epoch) among all alert-enabled columns in this row (undefined if no alert) */
  dueAt?: number;
  /** Column that produced the earliest due alert */
  columnId?: ColumnId;
}

/**
 * Parses a YYYY-MM-DD date string and returns the due timestamp (09:00 local time on that date).
 * Returns undefined for invalid/empty values.
 */
function parseDateDueTime(value: string | null | undefined): number | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return undefined;
  }

  const [, yearPart, monthPart, dayPart] = match;
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);

  // Calendar-validity check using Date.UTC then roundtrip
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return undefined;
  }

  // Due at 09:00 local time on the saved date
  return new Date(year, month - 1, day, 9, 0, 0, 0).getTime();
}

/**
 * Parses an HH:MM (optionally HH:MM:SS) time string and returns the due timestamp
 * for today (from `now`) at the given local time.
 * Returns undefined for invalid/empty values.
 */
function parseTimeDueTime(value: string | null | undefined, now: Date): number | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) {
    return undefined;
  }

  const [, hourPart, minutePart, secondPart = "0"] = match;
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  const second = Number(secondPart);

  if (hour > 23 || minute > 59 || second > 59) {
    return undefined;
  }

  // Due today at the given local time
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    minute,
    second,
    0,
  ).getTime();
}

/**
 * Evaluates a single row for active alert state.
 *
 * - Date-only due semantics: a date becomes due at 09:00 local time on that date.
 * - Time-only due semantics: a time is due at that time on the current local day.
 * - Checkbox suppression: if the row has any checkbox cell with `value === true`,
 *   alerts are suppressed.
 * - Invalid or null date/time values never produce alerts.
 *
 * @param row The row to evaluate
 * @param columns All column definitions for the block containing this row
 * @param now The current timestamp (injected for deterministic testing)
 * @returns RowAlertResult indicating whether an alert is active and the earliest due info
 */
export function evaluateRow(
  row: Row,
  columns: ColumnDefinition[],
  now: Date,
): RowAlertResult {
  const nowMs = now.getTime();
  let earliestDueAt: number | undefined;
  let earliestColumnId: ColumnId | undefined;

  // Step 1: Checkbox suppression — if any checkbox cell in this row is checked, suppress all alerts
  for (const cell of Object.values(row.cells)) {
    if (typeof cell.value === "boolean" && cell.value === true) {
      return { hasAlert: false };
    }
  }

  // Step 2: Iterate columns to find alert-enabled date/time columns
  for (const column of columns) {
    if (column.type !== "date" && column.type !== "time") {
      continue;
    }

    const settings = column.settings as { alertsEnabled?: boolean };
    if (!settings.alertsEnabled) {
      continue;
    }

    const cell = row.cells[column.id];
    if (!cell) {
      continue;
    }

    // cell.value could be boolean for checkbox cells, but we already filtered to date/time columns
    const rawValue = typeof cell.value === "string" || cell.value === null ? cell.value : undefined;

    let dueAt: number | undefined;

    if (column.type === "date") {
      dueAt = parseDateDueTime(rawValue);
    } else {
      dueAt = parseTimeDueTime(rawValue, now);
    }

    // Skip invalid/unparseable values
    if (dueAt === undefined) {
      continue;
    }

    // Step 3: Check if the due time is now or past
    if (nowMs >= dueAt) {
      // Active alert — track the earliest (most overdue)
      if (earliestDueAt === undefined || dueAt < earliestDueAt) {
        earliestDueAt = dueAt;
        earliestColumnId = column.id;
      }
    }
  }

  if (earliestDueAt === undefined) {
    return { hasAlert: false };
  }

  return { hasAlert: true, dueAt: earliestDueAt, columnId: earliestColumnId };
}
