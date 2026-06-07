import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { evaluateRow } from "../../domain/alerts/evaluateRow.js";
import { evaluateWorkspace } from "../../domain/alerts/evaluateWorkspace.js";
import type { Block } from "../../types/block.js";
import type { ColumnDefinition } from "../../types/column.js";
import type { PersistedCell, Row } from "../../types/row.js";
import type { WorkspaceDocument } from "../../types/workspace.js";

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function column(overrides: Partial<ColumnDefinition> & Pick<ColumnDefinition, "id" | "type">): ColumnDefinition {
  const defaults: ColumnDefinition = {
    id: overrides.id,
    type: overrides.type,
    label: overrides.id,
    order: 0,
    width: 120,
    visible: true,
    settings: {},
    format: {},
  };

  // For date/time columns, default alertsEnabled to true
  if ((overrides.type === "date" || overrides.type === "time") && !("settings" in overrides)) {
    defaults.settings = { alertsEnabled: true };
  }

  return { ...defaults, ...overrides };
}

function row(id: string, order: number, values: Record<string, PersistedCell["value"] | undefined>): Row {
  const cells: Record<string, PersistedCell> = {};
  for (const [columnId, value] of Object.entries(values)) {
    if (value !== undefined) {
      cells[columnId] = { value, format: {} };
    }
  }

  return {
    id,
    order,
    format: {},
    cells,
  };
}

function block(id: string, columns: ColumnDefinition[], rows: Row[]): Block {
  return {
    id,
    workspaceId: "ws_test",
    title: "Test Block",
    blockType: "basic_checklist",
    order: 0,
    collapsed: false,
    hideCompletedRows: false,
    border: {},
    sort: null,
    format: {},
    columns,
    rows,
  };
}

function workspaceDocument(blocks: Block[]): WorkspaceDocument {
  return {
    id: "ws_test",
    blocks,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("evaluateRow", () => {
  // --- Date tests ---

  test("date past due — returns hasAlert: true", () => {
    const dateCol = column({ id: "due", type: "date" });
    const now = new Date(2025, 0, 2, 9, 0, 0, 0); // 2025-01-02 09:00
    const r = row("r1", 0, { due: "2025-01-01" });

    const result = evaluateRow(r, [dateCol], now);
    assert.equal(result.hasAlert, true);
    assert.ok(result.dueAt !== undefined);
    assert.equal(result.columnId, "due");
  });

  test("date not yet due (same day before 09:00) — returns hasAlert: false", () => {
    const dateCol = column({ id: "due", type: "date" });
    const now = new Date(2025, 5, 15, 8, 59, 0, 0); // 2025-06-15 08:59
    const r = row("r1", 0, { due: "2025-06-15" });

    const result = evaluateRow(r, [dateCol], now);
    assert.equal(result.hasAlert, false);
  });

  test("date exactly at due time (09:00) — returns hasAlert: true", () => {
    const dateCol = column({ id: "due", type: "date" });
    const now = new Date(2025, 5, 15, 9, 0, 0, 0); // 2025-06-15 09:00
    const r = row("r1", 0, { due: "2025-06-15" });

    const result = evaluateRow(r, [dateCol], now);
    assert.equal(result.hasAlert, true);
  });

  // --- Time tests ---

  test("time past due — returns hasAlert: true", () => {
    const timeCol = column({ id: "when", type: "time" });
    // Use a fixed "today" so time evaluation is deterministic
    const now = new Date(2025, 5, 15, 14, 31, 0, 0); // today 14:31
    const r = row("r1", 0, { when: "14:30" });

    const result = evaluateRow(r, [timeCol], now);
    assert.equal(result.hasAlert, true);
  });

  test("time not yet due — returns hasAlert: false", () => {
    const timeCol = column({ id: "when", type: "time" });
    const now = new Date(2025, 5, 15, 14, 29, 0, 0); // today 14:29
    const r = row("r1", 0, { when: "14:30" });

    const result = evaluateRow(r, [timeCol], now);
    assert.equal(result.hasAlert, false);
  });

  test("time exactly at due time — returns hasAlert: true", () => {
    const timeCol = column({ id: "when", type: "time" });
    const now = new Date(2025, 5, 15, 14, 30, 0, 0); // today 14:30
    const r = row("r1", 0, { when: "14:30" });

    const result = evaluateRow(r, [timeCol], now);
    assert.equal(result.hasAlert, true);
  });

  // --- Invalid / null / missing values ---

  test("invalid date value — returns hasAlert: false", () => {
    const dateCol = column({ id: "due", type: "date" });
    const now = new Date(2025, 5, 15, 10, 0, 0, 0);
    const r = row("r1", 0, { due: "not-a-date" });

    const result = evaluateRow(r, [dateCol], now);
    assert.equal(result.hasAlert, false);
  });

  test("invalid time value (hours > 23) — returns hasAlert: false", () => {
    const timeCol = column({ id: "when", type: "time" });
    const now = new Date(2025, 5, 15, 10, 0, 0, 0);
    const r = row("r1", 0, { when: "25:00" });

    const result = evaluateRow(r, [timeCol], now);
    assert.equal(result.hasAlert, false);
  });

  test("invalid time value (minutes > 59) — returns hasAlert: false", () => {
    const timeCol = column({ id: "when", type: "time" });
    const now = new Date(2025, 5, 15, 10, 0, 0, 0);
    const r = row("r1", 0, { when: "12:61" });

    const result = evaluateRow(r, [timeCol], now);
    assert.equal(result.hasAlert, false);
  });

  test("null cell value — returns hasAlert: false", () => {
    const dateCol = column({ id: "due", type: "date" });
    const now = new Date(2025, 5, 15, 10, 0, 0, 0);
    const r = row("r1", 0, { due: null });

    const result = evaluateRow(r, [dateCol], now);
    assert.equal(result.hasAlert, false);
  });

  test("missing cell (column not in row.cells) — returns hasAlert: false", () => {
    const dateCol = column({ id: "due", type: "date" });
    const now = new Date(2025, 5, 15, 10, 0, 0, 0);
    const r = row("r1", 0, {}); // no 'due' cell

    const result = evaluateRow(r, [dateCol], now);
    assert.equal(result.hasAlert, false);
  });

  // --- Checkbox suppression ---

  test("checkbox suppression — checked checkbox suppresses alert", () => {
    const dateCol = column({ id: "due", type: "date" });
    const doneCol = column({ id: "done", type: "checkbox" });
    const now = new Date(2025, 0, 2, 10, 0, 0, 0);
    const r = row("r1", 0, { due: "2025-01-01", done: true });

    const result = evaluateRow(r, [dateCol, doneCol], now);
    assert.equal(result.hasAlert, false);
  });

  test("checkbox not checked does not suppress alerts", () => {
    const dateCol = column({ id: "due", type: "date" });
    const doneCol = column({ id: "done", type: "checkbox" });
    const now = new Date(2025, 0, 2, 10, 0, 0, 0);
    const r = row("r1", 0, { due: "2025-01-01", done: false });

    const result = evaluateRow(r, [dateCol, doneCol], now);
    assert.equal(result.hasAlert, true);
  });

  // --- Column settings ---

  test("column alertsEnabled: false — no alert even if date is past due", () => {
    const dateCol = column({
      id: "due",
      type: "date",
      settings: { alertsEnabled: false },
    });
    const now = new Date(2025, 0, 2, 10, 0, 0, 0);
    const r = row("r1", 0, { due: "2025-01-01" });

    const result = evaluateRow(r, [dateCol], now);
    assert.equal(result.hasAlert, false);
  });

  // --- Multiple date columns: earliest due wins ---

  test("multiple alert-enabled columns — returns earliest due (most overdue)", () => {
    const dueA = column({ id: "dueA", type: "date" });
    const dueB = column({ id: "dueB", type: "date" });
    const now = new Date(2025, 0, 5, 10, 0, 0, 0);
    // dueA is more overdue (Jan 1) than dueB (Jan 3)
    const r = row("r1", 0, { dueA: "2025-01-01", dueB: "2025-01-03" });

    const result = evaluateRow(r, [dueA, dueB], now);
    assert.equal(result.hasAlert, true);
    assert.equal(result.columnId, "dueA");
  });
});

// ---------------------------------------------------------------------------
// evaluateWorkspace tests
// ---------------------------------------------------------------------------

describe("evaluateWorkspace", () => {
  test("empty workspace — returns count: 0", () => {
    const doc = workspaceDocument([]);
    const now = new Date(2025, 5, 15, 10, 0, 0, 0);

    const result = evaluateWorkspace(doc, now);
    assert.equal(result.count, 0);
    assert.equal(result.blockId, undefined);
    assert.equal(result.rowId, undefined);
    assert.equal(result.columnId, undefined);
  });

  test("workspace with no alert-enabled columns — returns count: 0", () => {
    const textCol = column({ id: "task", type: "text" });
    const checkCol = column({ id: "done", type: "checkbox" });
    const blocks = [block("b1", [textCol, checkCol], [row("r1", 0, { task: "hello", done: false })])];
    const doc = workspaceDocument(blocks);
    const now = new Date(2025, 5, 15, 10, 0, 0, 0);

    const result = evaluateWorkspace(doc, now);
    assert.equal(result.count, 0);
  });

  test("workspace with one active alert — returns count: 1 with identifiers", () => {
    const dateCol = column({ id: "due", type: "date" });
    const blocks = [
      block("b1", [dateCol], [row("r1", 0, { due: "2025-01-01" })]),
    ];
    const doc = workspaceDocument(blocks);
    const now = new Date(2025, 0, 2, 10, 0, 0, 0);

    const result = evaluateWorkspace(doc, now);
    assert.equal(result.count, 1);
    assert.equal(result.blockId, "b1");
    assert.equal(result.rowId, "r1");
    assert.equal(result.columnId, "due");
  });

  test("workspace with multiple alerts — returns correct count and primary (earliest due)", () => {
    const dateCol = column({ id: "due", type: "date" });
    const blocks = [
      block("b1", [dateCol], [
        row("r_early", 0, { due: "2025-01-01" }), // most overdue
        row("r_late", 1, { due: "2025-01-03" }),
      ]),
      block("b2", [dateCol], [
        row("r_mid", 0, { due: "2025-01-02" }),
      ]),
    ];
    const doc = workspaceDocument(blocks);
    const now = new Date(2025, 0, 5, 10, 0, 0, 0);

    const result = evaluateWorkspace(doc, now);
    assert.equal(result.count, 3);
    assert.equal(result.blockId, "b1");
    assert.equal(result.rowId, "r_early");
    assert.equal(result.columnId, "due");
  });

  test("workspace with no active alerts (dates in future) — returns count: 0", () => {
    const dateCol = column({ id: "due", type: "date" });
    const blocks = [
      block("b1", [dateCol], [row("r1", 0, { due: "2026-01-01" })]),
    ];
    const doc = workspaceDocument(blocks);
    const now = new Date(2025, 5, 15, 10, 0, 0, 0);

    const result = evaluateWorkspace(doc, now);
    assert.equal(result.count, 0);
  });

  test("mixed column types — only date/time columns trigger alerts", () => {
    const textCol = column({ id: "task", type: "text" });
    const dateCol = column({ id: "due", type: "date" });
    const checkCol = column({ id: "done", type: "checkbox" });
    const timeCol = column({ id: "when", type: "time" });
    const blocks = [
      block("b1", [textCol, dateCol, checkCol, timeCol], [
        row("r1", 0, { task: "hello", due: "2025-01-01", done: false, when: "14:30" }),
      ]),
    ];
    const doc = workspaceDocument(blocks);
    const now = new Date(2025, 0, 2, 15, 0, 0, 0);

    const result = evaluateWorkspace(doc, now);
    assert.equal(result.count, 1);
    // Primary should be the date alert (Jan 1 09:00), which is earlier than time (today 14:30)
    assert.equal(result.blockId, "b1");
    assert.equal(result.rowId, "r1");
    assert.equal(result.columnId, "due");
  });

  test("block skipped when it has no alert-enabled columns", () => {
    const textCol = column({ id: "task", type: "text" });
    const dateCol = column({ id: "due", type: "date" });
    const blocks = [
      block("b1", [textCol], [row("r1", 0, { task: "hello" })]), // no alert-enabled columns
      block("b2", [dateCol], [row("r2", 0, { due: "2025-01-01" })]), // has alert
    ];
    const doc = workspaceDocument(blocks);
    const now = new Date(2025, 0, 2, 10, 0, 0, 0);

    const result = evaluateWorkspace(doc, now);
    assert.equal(result.count, 1);
    assert.equal(result.blockId, "b2");
    assert.equal(result.rowId, "r2");
  });

  test("workspace with all rows suppressed by checkbox — returns count: 0", () => {
    const dateCol = column({ id: "due", type: "date" });
    const doneCol = column({ id: "done", type: "checkbox" });
    const blocks = [
      block("b1", [dateCol, doneCol], [
        row("r1", 0, { due: "2025-01-01", done: true }),
      ]),
    ];
    const doc = workspaceDocument(blocks);
    const now = new Date(2025, 0, 2, 10, 0, 0, 0);

    const result = evaluateWorkspace(doc, now);
    assert.equal(result.count, 0);
  });
});

// ---------------------------------------------------------------------------
// Edge case: impossible calendar dates should not trigger alerts
// ---------------------------------------------------------------------------

describe("evaluateRow — calendar-validity edge cases", () => {
  test("impossible date (Feb 30) — returns hasAlert: false", () => {
    const dateCol = column({ id: "due", type: "date" });
    const now = new Date(2026, 1, 15, 10, 0, 0, 0);
    const r = row("r1", 0, { due: "2026-02-30" });

    const result = evaluateRow(r, [dateCol], now);
    assert.equal(result.hasAlert, false);
  });

  test("time with seconds component — correctly evaluated", () => {
    const timeCol = column({ id: "when", type: "time" });
    const now = new Date(2025, 5, 15, 14, 30, 30, 0); // 14:30:30
    const r = row("r1", 0, { when: "14:30:15" }); // 14:30:15

    const result = evaluateRow(r, [timeCol], now);
    assert.equal(result.hasAlert, true);
  });

  test("empty string value — returns hasAlert: false", () => {
    const dateCol = column({ id: "due", type: "date" });
    const now = new Date(2025, 5, 15, 10, 0, 0, 0);
    const r = row("r1", 0, { due: "" });

    const result = evaluateRow(r, [dateCol], now);
    assert.equal(result.hasAlert, false);
  });
});

// ---------------------------------------------------------------------------
// Calendar edge cases and time boundaries
// ---------------------------------------------------------------------------

describe("evaluateRow — calendar and time boundaries", () => {
  test("leap-year valid date (2024-02-29) triggers alert", () => {
    const dateCol = column({ id: "due", type: "date" });
    const now = new Date(2024, 2, 1, 9, 0, 0, 0); // 2024-03-01 09:00
    const r = row("r1", 0, { due: "2024-02-29" });

    const result = evaluateRow(r, [dateCol], now);
    assert.equal(result.hasAlert, true);
  });

  test("non-leap-year Feb 29 is invalid and does not trigger alert", () => {
    const dateCol = column({ id: "due", type: "date" });
    const now = new Date(2025, 2, 1, 9, 0, 0, 0);
    const r = row("r1", 0, { due: "2025-02-29" });

    const result = evaluateRow(r, [dateCol], now);
    assert.equal(result.hasAlert, false);
  });

  test("month 13 is invalid and does not trigger alert", () => {
    const dateCol = column({ id: "due", type: "date" });
    const now = new Date(2025, 5, 15, 10, 0, 0, 0);
    const r = row("r1", 0, { due: "2025-13-01" });

    const result = evaluateRow(r, [dateCol], now);
    assert.equal(result.hasAlert, false);
  });

  test("month 00 is invalid and does not trigger alert", () => {
    const dateCol = column({ id: "due", type: "date" });
    const now = new Date(2025, 5, 15, 10, 0, 0, 0);
    const r = row("r1", 0, { due: "2025-00-15" });

    const result = evaluateRow(r, [dateCol], now);
    assert.equal(result.hasAlert, false);
  });

  test("day 00 is invalid and does not trigger alert", () => {
    const dateCol = column({ id: "due", type: "date" });
    const now = new Date(2025, 5, 15, 10, 0, 0, 0);
    const r = row("r1", 0, { due: "2025-06-00" });

    const result = evaluateRow(r, [dateCol], now);
    assert.equal(result.hasAlert, false);
  });

  test("time 23:59:59 at exactly the same time triggers alert (boundary)", () => {
    const timeCol = column({ id: "when", type: "time" });
    const now = new Date(2025, 5, 15, 23, 59, 59, 0); // 23:59:59
    const r = row("r1", 0, { when: "23:59:59" });

    const result = evaluateRow(r, [timeCol], now);
    assert.equal(result.hasAlert, true);
  });

  test("time 00:00 with now at 00:01 same local day triggers alert", () => {
    const timeCol = column({ id: "when", type: "time" });
    const now = new Date(2025, 5, 15, 0, 1, 0, 0); // 00:01
    const r = row("r1", 0, { when: "00:00" });

    const result = evaluateRow(r, [timeCol], now);
    assert.equal(result.hasAlert, true);
  });

  test("mixed date and time alerts in one row — returns earliest dueAt", () => {
    const dateCol = column({ id: "due", type: "date" });
    const timeCol = column({ id: "when", type: "time" });
    // date: 2025-01-01 09:00 UTC, time: today 14:30 (both past due)
    const now = new Date(2025, 0, 5, 15, 0, 0, 0); // 2025-01-05 15:00
    const r = row("r1", 0, { due: "2025-01-01", when: "14:30" });

    const result = evaluateRow(r, [dateCol, timeCol], now);
    assert.equal(result.hasAlert, true);
    // The date column (Jan 1 09:00) is earlier than time (today 14:30)
    assert.equal(result.columnId, "due");
  });
});

describe("evaluateWorkspace — tie-breaking and block ordering", () => {
  test("two rows with exactly equal dueAt — first row encountered wins as primary", () => {
    const dateCol = column({ id: "due", type: "date" });
    const rows = [
      row("r1", 0, { due: "2025-01-01" }),
      row("r2", 1, { due: "2025-01-01" }),
    ];
    const doc = workspaceDocument([block("b1", [dateCol], rows)]);
    const now = new Date(2025, 0, 5, 10, 0, 0, 0);

    const result = evaluateWorkspace(doc, now);
    assert.equal(result.count, 2);
    assert.equal(result.blockId, "b1");
    assert.equal(result.rowId, "r1"); // first row wins
  });

  test("primary alert lives in the second block", () => {
    const dateCol = column({ id: "due", type: "date" });
    const blocks = [
      block("b1", [dateCol], [row("r2", 0, { due: "2025-01-05" })]), // less overdue
      block("b2", [dateCol], [row("r1", 0, { due: "2025-01-01" })]), // more overdue
    ];
    const doc = workspaceDocument(blocks);
    const now = new Date(2025, 0, 5, 10, 0, 0, 0);

    const result = evaluateWorkspace(doc, now);
    assert.equal(result.count, 2);
    assert.equal(result.blockId, "b2"); // second block has the primary alert
    assert.equal(result.rowId, "r1");
    assert.equal(result.columnId, "due");
  });
});
