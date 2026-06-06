/**
 * Shared date/time validation helpers for DateCell and TimeCell.
 *
 * These are component-scoped validators. Domain-level sorting, alert, and
 * search code in src/domain/ has its own parsing and must stay independent.
 */

/**
 * Validates a date string as strict "YYYY-MM-DD" plus calendar validity.
 *
 * Returns `true` for empty/whitespace-only values (they commit as `null`).
 * Returns `false` for non-empty values that do not match the exact format
 * or represent impossible calendar dates (e.g. 2026-02-30,
 * non-leap 2026-02-29).
 */
export function isValidDateString(value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return false;
  }

  const year = Number(match[1]!);
  const month = Number(match[2]!);
  const day = Number(match[3]!);

  // Basic range guards (the regex already enforces 2-digit boundaries,
  // but validate month 01-12 and day 01-31 before constructing the date).
  if (month < 1 || month > 12) {
    return false;
  }

  if (day < 1 || day > 31) {
    return false;
  }

  // Create a UTC date and round-trip its components to reject impossible
  // calendar dates (e.g. 2026-02-30, 2026-02-29 in a non-leap year).
  const utcTimestamp = Date.UTC(year, month - 1, day);
  const utcDate = new Date(utcTimestamp);

  return (
    utcDate.getUTCFullYear() === year &&
    utcDate.getUTCMonth() === month - 1 &&
    utcDate.getUTCDate() === day
  );
}

/**
 * Validates a time string as strict "HH:MM" (24-hour).
 *
 * Returns `true` for empty/whitespace-only values.
 * Seconds-level values ("HH:MM:SS") are intentionally treated as invalid
 * in the cell UI (the sorting/alert layer may still parse them, but that
 * is out of scope for dispatch 083).
 */
export function isValidTimeString(value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim());
}
