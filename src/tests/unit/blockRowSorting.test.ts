import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { compareCellValues, isSortableColumn } from "../../domain/sorting/compareValues.js";
import { sortRowsByColumn } from "../../domain/sorting/sortRows.js";
import type { BlockSort } from "../../types/block.js";
import type { ColumnDefinition, ColumnType } from "../../types/column.js";
import type { PersistedCell, Row } from "../../types/row.js";

function column(overrides: Partial<ColumnDefinition> & Pick<ColumnDefinition, "id" | "type">): ColumnDefinition {
  return {
    label: overrides.id,
    order: 0,
    width: 120,
    visible: true,
    settings: {},
    format: {},
    ...overrides,
  };
}

function row(id: string, order: number, values: Record<string, PersistedCell["value"] | undefined>): Row {
  const cells = Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => value !== undefined)
      .map(([columnId, value]) => [columnId, { value, format: { bold: columnId === "task" } } as PersistedCell])
  );

  return {
    id,
    order,
    format: {},
    cells,
  };
}

function sort(columnType: ColumnType, direction: BlockSort["direction"] = "asc"): BlockSort {
  return { columnId: columnType, direction };
}

function ids(rows: Row[]): string[] {
  return rows.map((entry) => entry.id);
}

describe("block row sorting helpers", () => {
  test("identifies v1 sortable columns and rejects numbered or missing columns", () => {
    assert.equal(isSortableColumn(column({ id: "task", type: "text" })), true);
    assert.equal(isSortableColumn(column({ id: "done", type: "checkbox" })), true);
    assert.equal(isSortableColumn(column({ id: "marker", type: "bullet" })), true);
    assert.equal(isSortableColumn(column({ id: "due", type: "date" })), true);
    assert.equal(isSortableColumn(column({ id: "when", type: "time" })), true);
    assert.equal(isSortableColumn(column({ id: "status", type: "dropdown" })), true);
    assert.equal(isSortableColumn(column({ id: "number", type: "numbered" })), false);
    assert.equal(isSortableColumn(undefined), false);
  });

  test("sorts text ascending and descending with empty values last", () => {
    const taskColumn = column({ id: "text", type: "text" });
    const rows = [
      row("row_empty", 0, { text: "" }),
      row("row_b", 1, { text: "Bravo" }),
      row("row_missing", 2, {}),
      row("row_a", 3, { text: " alpha " }),
    ];

    assert.deepEqual(ids(sortRowsByColumn(rows, [taskColumn], sort("text", "asc"))), [
      "row_a",
      "row_b",
      "row_empty",
      "row_missing",
    ]);
    assert.deepEqual(ids(sortRowsByColumn(rows, [taskColumn], sort("text", "desc"))), [
      "row_b",
      "row_a",
      "row_empty",
      "row_missing",
    ]);
  });

  test("preserves equal-value stability from current display order instead of input array order", () => {
    const taskColumn = column({ id: "text", type: "text" });
    const rows = [
      row("row_c", 2, { text: "same" }),
      row("row_b", 1, { text: "same" }),
      row("row_a", 0, { text: "same" }),
    ];

    const sorted = sortRowsByColumn(rows, [taskColumn], sort("text", "asc"));

    assert.deepEqual(ids(sorted), ["row_a", "row_b", "row_c"]);
    assert.deepEqual(
      sorted.map((entry) => entry.order),
      [0, 1, 2]
    );
  });

  test("keeps null, missing, empty, and malformed text-like values last in both directions", () => {
    const textColumn = column({ id: "text", type: "text" });
    const dropdownColumn = column({ id: "dropdown", type: "dropdown", settings: { options: ["Later", "Now"] } });

    assert.equal(Math.sign(compareCellValues({ value: "" }, { value: "A" }, textColumn, "asc")), 1);
    assert.equal(Math.sign(compareCellValues({ value: null }, { value: "A" }, textColumn, "desc")), 1);
    assert.equal(Math.sign(compareCellValues({ value: false }, { value: "A" }, textColumn, "asc")), 1);
    assert.equal(Math.sign(compareCellValues(undefined, { value: "A" }, dropdownColumn, "desc")), 1);
  });

  test("sorts checkboxes unchecked before checked in ascending order and reverses in descending order", () => {
    const doneColumn = column({ id: "checkbox", type: "checkbox" });
    const rows = [
      row("row_checked_1", 0, { checkbox: true }),
      row("row_missing", 1, {}),
      row("row_unchecked", 2, { checkbox: false }),
      row("row_checked_2", 3, { checkbox: true }),
    ];

    assert.deepEqual(ids(sortRowsByColumn(rows, [doneColumn], sort("checkbox", "asc"))), [
      "row_missing",
      "row_unchecked",
      "row_checked_1",
      "row_checked_2",
    ]);
    assert.deepEqual(ids(sortRowsByColumn(rows, [doneColumn], sort("checkbox", "desc"))), [
      "row_checked_1",
      "row_checked_2",
      "row_missing",
      "row_unchecked",
    ]);
  });

  test("sorts dates and treats invalid or null dates as empty", () => {
    const dateColumn = column({ id: "date", type: "date" });
    const rows = [
      row("row_invalid", 0, { date: "not-a-date" }),
      row("row_late", 1, { date: "2026-05-11" }),
      row("row_null", 2, { date: null }),
      row("row_early", 3, { date: "2026-05-09" }),
      row("row_impossible", 4, { date: "2026-02-30" }),
    ];

    assert.deepEqual(ids(sortRowsByColumn(rows, [dateColumn], sort("date", "asc"))), [
      "row_early",
      "row_late",
      "row_invalid",
      "row_null",
      "row_impossible",
    ]);
    assert.deepEqual(ids(sortRowsByColumn(rows, [dateColumn], sort("date", "desc"))), [
      "row_late",
      "row_early",
      "row_invalid",
      "row_null",
      "row_impossible",
    ]);
  });

  test("sorts times and treats invalid or empty times as empty", () => {
    const timeColumn = column({ id: "time", type: "time" });
    const rows = [
      row("row_noon", 0, { time: "12:00" }),
      row("row_invalid", 1, { time: "25:00" }),
      row("row_morning", 2, { time: "09:30:15" }),
      row("row_empty", 3, { time: "" }),
    ];

    assert.deepEqual(ids(sortRowsByColumn(rows, [timeColumn], sort("time", "asc"))), [
      "row_morning",
      "row_noon",
      "row_invalid",
      "row_empty",
    ]);
    assert.deepEqual(ids(sortRowsByColumn(rows, [timeColumn], sort("time", "desc"))), [
      "row_noon",
      "row_morning",
      "row_invalid",
      "row_empty",
    ]);
  });

  test("sorts dropdown persisted values without validating configured options", () => {
    const statusColumn = column({ id: "dropdown", type: "dropdown", settings: { options: ["Blocked", "Done"] } });
    const rows = [
      row("row_done", 0, { dropdown: "Done" }),
      row("row_custom", 1, { dropdown: "Custom" }),
      row("row_blank", 2, { dropdown: null }),
      row("row_blocked", 3, { dropdown: "Blocked" }),
    ];

    assert.deepEqual(ids(sortRowsByColumn(rows, [statusColumn], sort("dropdown", "asc"))), [
      "row_blocked",
      "row_custom",
      "row_done",
      "row_blank",
    ]);
  });

  test("accepts bullet sorting as a stable marker-column no-op", () => {
    const bulletColumn = column({ id: "bullet", type: "bullet" });
    const rows = [
      row("row_c", 2, { bullet: null }),
      row("row_a", 0, { bullet: null }),
      row("row_b", 1, { bullet: null }),
    ];

    const sorted = sortRowsByColumn(rows, [bulletColumn], sort("bullet", "desc"));

    assert.deepEqual(ids(sorted), ["row_a", "row_b", "row_c"]);
    assert.deepEqual(
      sorted.map((entry) => entry.order),
      [0, 1, 2]
    );
  });

  test("treats numbered and missing sort columns as display-order no-ops with normalized order", () => {
    const numberedColumn = column({ id: "numbered", type: "numbered" });
    const rows = [row("row_b", 10, { numbered: null }), row("row_a", 5, { numbered: null })];

    const byNumbered = sortRowsByColumn(rows, [numberedColumn], sort("numbered"));
    const byMissing = sortRowsByColumn(rows, [numberedColumn], { columnId: "missing", direction: "asc" });
    const withoutSort = sortRowsByColumn(rows, [numberedColumn], null);

    assert.deepEqual(ids(byNumbered), ["row_a", "row_b"]);
    assert.deepEqual(ids(byMissing), ["row_a", "row_b"]);
    assert.deepEqual(ids(withoutSort), ["row_a", "row_b"]);
    assert.deepEqual(
      byNumbered.map((entry) => entry.order),
      [0, 1]
    );
  });

  test("preserves row ids and cell payloads while only changing row order values", () => {
    const taskColumn = column({ id: "task", type: "text" });
    const rows = [
      row("row_late", 0, { task: "Zulu" }),
      row("row_early", 1, { task: "Alpha" }),
    ];
    rows[0]!.cells.task = { value: "Zulu", format: { bold: true, textColor: "#123456" } };
    rows[0]!.format = { backgroundColor: "#ffffff" };
    const before = structuredClone(rows);

    const sorted = sortRowsByColumn(rows, [taskColumn], { columnId: "task", direction: "asc" });

    assert.deepEqual(rows, before);
    assert.deepEqual(ids(sorted), ["row_early", "row_late"]);
    for (const sortedRow of sorted) {
      const original = before.find((entry) => entry.id === sortedRow.id);
      assert.ok(original);
      assert.deepEqual(sortedRow.cells, original.cells);
      assert.deepEqual(sortedRow.format, original.format);
    }
    assert.deepEqual(
      sorted.map((entry) => entry.order),
      [0, 1]
    );
  });
});

// ---------------------------------------------------------------------------
// Intl.Collator and edge case coverage
// ---------------------------------------------------------------------------

describe("block row sorting — collation and edge cases", () => {
  test("Intl.Collator numeric ordering sorts text numbers naturally", () => {
    const textColumn = column({ id: "text", type: "text" });
    const rows = [
      row("r_2", 0, { text: "2" }),
      row("r_10", 1, { text: "10" }),
      row("r_1", 2, { text: "1" }),
    ];

    const sorted = sortRowsByColumn(rows, [textColumn], sort("text", "asc"));
    assert.deepEqual(ids(sorted), ["r_1", "r_2", "r_10"]);
  });

  test("case-insensitive ordering places lowercase after uppercase", () => {
    const textColumn = column({ id: "text", type: "text" });
    const rows = [
      row("r_b", 0, { text: "b" }),
      row("r_A", 1, { text: "A" }),
      row("r_C", 2, { text: "C" }),
    ];

    const sorted = sortRowsByColumn(rows, [textColumn], sort("text", "asc"));
    assert.deepEqual(ids(sorted), ["r_A", "r_b", "r_C"]);
  });

  test("diacritic-insensitive equality preserves display order", () => {
    const textColumn = column({ id: "text", type: "text" });
    const rows = [
      row("r_cafe_accent", 0, { text: "café" }),
      row("r_cafe_plain", 1, { text: "cafe" }),
    ];

    const sorted = sortRowsByColumn(rows, [textColumn], sort("text", "asc"));
    // Both compare equal; display order (by row.order) is preserved
    assert.deepEqual(ids(sorted), ["r_cafe_accent", "r_cafe_plain"]);
    assert.deepEqual(
      sorted.map((entry) => entry.order),
      [0, 1]
    );
  });

  test("sortRowsByColumn with empty rows returns empty array", () => {
    const textColumn = column({ id: "text", type: "text" });

    const sorted = sortRowsByColumn([], [textColumn], sort("text", "asc"));
    assert.deepEqual(sorted, []);
  });

  test("sortRowsByColumn with non-sortable column (numbered) returns display order reindexed", () => {
    const numberedColumn = column({ id: "numbered", type: "numbered" });
    const rows = [
      row("r_b", 10, { numbered: null }),
      row("r_a", 5, { numbered: null }),
    ];

    const sorted = sortRowsByColumn(rows, [numberedColumn], sort("numbered", "asc"));
    assert.deepEqual(ids(sorted), ["r_a", "r_b"]);
    assert.deepEqual(
      sorted.map((entry) => entry.order),
      [0, 1]
    );
  });
});
