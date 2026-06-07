import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { filterCompletedRows, countCompletedRows } from "../../domain/rows/completedRowFilter.js";
import type { ColumnDefinition } from "../../types/column.js";
import type { Row } from "../../types/row.js";

function checkboxColumn(id: string, order: number, strikeout: boolean): ColumnDefinition {
  return {
    id,
    type: "checkbox",
    label: "",
    order,
    width: 44,
    visible: true,
    settings: {
      strikeoutRowWhenChecked: strikeout,
      moveCheckedRowsToBottom: false,
    },
    format: {},
  };
}

function textColumn(id: string, order: number): ColumnDefinition {
  return {
    id,
    type: "text",
    label: "Task",
    order,
    width: 220,
    visible: true,
    settings: {},
    format: {},
  };
}

function row(id: string, order: number, cells: Record<string, boolean | string>): Row {
  const rowCells: Row["cells"] = {};
  for (const [columnId, value] of Object.entries(cells)) {
    rowCells[columnId] = { value, format: {} };
  }
  return { id, order, format: {}, cells: rowCells };
}

describe("completed row filter", () => {
  test("returns all rows when hideCompletedRows is false", () => {
    const columns = [checkboxColumn("done", 0, true)];
    const rows = [row("r1", 0, { done: true }), row("r2", 1, { done: false })];
    const result = filterCompletedRows(rows, columns, false);
    assert.equal(result.length, 2);
    assert.equal(result[0].id, "r1");
    assert.equal(result[1].id, "r2");
  });

  test("filters out completed rows when hideCompletedRows is true", () => {
    const columns = [checkboxColumn("done", 0, true)];
    const rows = [row("r1", 0, { done: true }), row("r2", 1, { done: false })];
    const result = filterCompletedRows(rows, columns, true);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "r2");
  });

  test("preserves display order (sorted by row.order) when filtering", () => {
    const columns = [checkboxColumn("done", 0, true)];
    const rows = [
      row("r3", 2, { done: false }),
      row("r1", 0, { done: true }),
      row("r2", 1, { done: false }),
    ];
    const result = filterCompletedRows(rows, columns, true);
    assert.equal(result.length, 2);
    // getRowsInDisplayOrder sorts by order, so order is r1, r2, r3; then r1 is filtered out
    assert.equal(result[0].id, "r2");
    assert.equal(result[1].id, "r3");
  });

  test("keeps rows with unchecked checkbox visible when hideCompletedRows is true", () => {
    const columns = [checkboxColumn("done", 0, true)];
    const rows = [row("r1", 0, { done: false })];
    const result = filterCompletedRows(rows, columns, true);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "r1");
  });

  test("keeps rows with checked but non-strikeout checkbox visible", () => {
    const columns = [checkboxColumn("done", 0, false)];
    const rows = [row("r1", 0, { done: true })];
    const result = filterCompletedRows(rows, columns, true);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "r1");
  });

  test("handles empty rows", () => {
    const columns = [checkboxColumn("done", 0, true)];
    const result = filterCompletedRows([], columns, true);
    assert.equal(result.length, 0);
  });

  test("handles no checkbox columns", () => {
    const columns = [textColumn("task", 0)];
    const rows = [row("r1", 0, { task: "hello" })];
    const result = filterCompletedRows(rows, columns, true);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "r1");
  });

  test("multiple checkbox columns: any strikeout-enabled checked column completes the row", () => {
    const columns = [
      checkboxColumn("done1", 0, true),
      checkboxColumn("done2", 1, false),
    ];
    const rows = [
      row("r1", 0, { done1: false, done2: true }),    // completed by done2? No, done2 has strikeout=false
      row("r2", 1, { done1: true, done2: false }),     // completed by done1 (strikeout=true)
      row("r3", 2, { done1: true, done2: true }),      // completed by done1 (strikeout=true)
    ];
    const result = filterCompletedRows(rows, columns, true);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "r1");
  });

  test("does not mutate input rows", () => {
    const columns = [checkboxColumn("done", 0, true)];
    const rows = [row("r1", 0, { done: true }), row("r2", 1, { done: false })];
    const originalLength = rows.length;
    filterCompletedRows(rows, columns, true);
    assert.equal(rows.length, originalLength);
  });
});

describe("completed row count", () => {
  test("counts completed rows", () => {
    const columns = [checkboxColumn("done", 0, true)];
    const rows = [row("r1", 0, { done: true }), row("r2", 1, { done: false })];
    assert.equal(countCompletedRows(rows, columns), 1);
  });

  test("returns 0 when no rows are completed", () => {
    const columns = [checkboxColumn("done", 0, true)];
    const rows = [row("r1", 0, { done: false })];
    assert.equal(countCompletedRows(rows, columns), 0);
  });

  test("returns 0 for empty rows", () => {
    const columns = [checkboxColumn("done", 0, true)];
    assert.equal(countCompletedRows([], columns), 0);
  });
});
