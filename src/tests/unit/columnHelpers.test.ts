import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createColumn, getVisibleColumnsInDisplayOrder } from "../../domain/columns/createColumn.js";
import { reorderColumns } from "../../domain/columns/reorderColumns.js";
import { addColumn } from "../../domain/columns/addColumn.js";
import { deleteColumn } from "../../domain/columns/deleteColumn.js";
import { renameColumn } from "../../domain/columns/renameColumn.js";
import { changeColumnType } from "../../domain/columns/changeColumnType.js";
import { moveColumnLeft, moveColumnRight } from "../../domain/columns/moveColumn.js";
import { updateColumnSettings } from "../../domain/columns/updateColumnSettings.js";

describe("column helpers", () => {
  test("createColumn returns type-aligned defaults", () => {
    const checkbox = createColumn("checkbox", { id: "col_check", order: 0 });
    const text = createColumn("text", { id: "col_text", order: 1 });
    const bullet = createColumn("bullet", { id: "col_bullet", order: 2 });
    const dropdown = createColumn("dropdown", { id: "col_status", order: 3 });

    assert.equal(checkbox.width, 44);
    assert.equal(checkbox.label, "");
    assert.equal(
      "strikeoutRowWhenChecked" in checkbox.settings && checkbox.settings.strikeoutRowWhenChecked,
      true
    );
    assert.equal(text.label, "Text");
    assert.equal(text.width, 220);
    assert.equal(bullet.label, "");
    assert.equal(
      "options" in dropdown.settings && Array.isArray(dropdown.settings.options),
      true
    );
  });

  test("getVisibleColumnsInDisplayOrder filters hidden columns and sorts by order stably", () => {
    const columns = [
      createColumn("text", { id: "col_1", order: 1, label: "B" }),
      createColumn("text", { id: "col_hidden", order: 0, visible: false, label: "Hidden" }),
      createColumn("text", { id: "col_2", order: 0, label: "A" }),
      createColumn("text", { id: "col_3", order: 1, label: "C" }),
    ];

    const ordered = getVisibleColumnsInDisplayOrder(columns);
    assert.deepEqual(
      ordered.map((column) => column.id),
      ["col_2", "col_1", "col_3"]
    );
  });

  test("reorderColumns preserves ids and only changes ordering", () => {
    const columns = [
      createColumn("text", { id: "col_1", order: 0 }),
      createColumn("text", { id: "col_2", order: 1 }),
      createColumn("text", { id: "col_3", order: 2 }),
    ];

    const reordered = reorderColumns(columns, "col_3", "col_1");
    assert.deepEqual(
      reordered.map((column) => column.id),
      ["col_3", "col_1", "col_2"]
    );
    assert.deepEqual(
      reordered.map((column) => column.order),
      [0, 1, 2]
    );
  });

  test("addColumn inserts a column and creates matching cells for existing rows", () => {
    const columns = [
      createColumn("text", { id: "col_1", order: 0 }),
      createColumn("checkbox", { id: "col_2", order: 1 }),
    ];
    const rows = [
      { id: "row_1", order: 0, format: {}, cells: { col_1: { value: "A", format: {} }, col_2: { value: false, format: {} } } },
    ];

    const result = addColumn(columns, rows, "col_1", "right", "date");
    assert.equal(result.columns.length, 3);
    assert.equal(result.columns[0].id, "col_1");
    assert.equal(result.columns[1].type, "date");
    assert.equal(result.columns[2].id, "col_2");
    assert.deepEqual(result.rows[0].cells[result.columns[1].id], { value: null, format: {} });
  });

  test("deleteColumn removes the column and its cells from all rows", () => {
    const columns = [
      createColumn("text", { id: "col_1", order: 0 }),
      createColumn("checkbox", { id: "col_2", order: 1 }),
    ];
    const rows = [
      { id: "row_1", order: 0, format: {}, cells: { col_1: { value: "A", format: {} }, col_2: { value: false, format: {} } } },
    ];

    const result = deleteColumn(columns, rows, "col_2");
    assert.equal(result.columns.length, 1);
    assert.equal(result.columns[0].id, "col_1");
    assert.equal("col_2" in result.rows[0].cells, false);
  });

  test("renameColumn updates the target column label only", () => {
    const columns = [
      createColumn("text", { id: "col_1", order: 0, label: "Old" }),
      createColumn("text", { id: "col_2", order: 1, label: "Keep" }),
    ];

    const renamed = renameColumn(columns, "col_1", "New");
    assert.equal(renamed[0].label, "New");
    assert.equal(renamed[1].label, "Keep");
  });

  test("changeColumnType converts cells and resets settings", () => {
    const columns = [
      createColumn("text", { id: "col_1", order: 0, label: "Task" }),
    ];
    const rows = [
      { id: "row_1", order: 0, format: {}, cells: { col_1: { value: "hello", format: {} } } },
    ];

    const result = changeColumnType(columns, rows, "col_1", "checkbox");
    assert.equal(result.columns[0].type, "checkbox");
    assert.equal(
      "strikeoutRowWhenChecked" in result.columns[0].settings && result.columns[0].settings.strikeoutRowWhenChecked,
      true
    );
    assert.equal(result.rows[0].cells.col_1.value, true);
  });

  test("changeColumnType preserves string values when switching to date/time/dropdown", () => {
    const columns = [
      createColumn("text", { id: "col_1", order: 0 }),
    ];
    const rows = [
      { id: "row_1", order: 0, format: {}, cells: { col_1: { value: "2026-05-11", format: {} } } },
    ];

    const result = changeColumnType(columns, rows, "col_1", "date");
    assert.equal(result.rows[0].cells.col_1.value, "2026-05-11");
  });

  test("moveColumnLeft swaps with previous column", () => {
    const columns = [
      createColumn("text", { id: "col_1", order: 0 }),
      createColumn("text", { id: "col_2", order: 1 }),
      createColumn("text", { id: "col_3", order: 2 }),
    ];

    const moved = moveColumnLeft(columns, "col_2");
    assert.deepEqual(moved.map((c) => c.id), ["col_2", "col_1", "col_3"]);
  });

  test("moveColumnLeft is inert at the first position", () => {
    const columns = [
      createColumn("text", { id: "col_1", order: 0 }),
      createColumn("text", { id: "col_2", order: 1 }),
    ];

    const moved = moveColumnLeft(columns, "col_1");
    assert.deepEqual(moved.map((c) => c.id), ["col_1", "col_2"]);
  });

  test("moveColumnRight swaps with next column", () => {
    const columns = [
      createColumn("text", { id: "col_1", order: 0 }),
      createColumn("text", { id: "col_2", order: 1 }),
      createColumn("text", { id: "col_3", order: 2 }),
    ];

    const moved = moveColumnRight(columns, "col_2");
    assert.deepEqual(moved.map((c) => c.id), ["col_1", "col_3", "col_2"]);
  });

  test("moveColumnRight is inert at the last position", () => {
    const columns = [
      createColumn("text", { id: "col_1", order: 0 }),
      createColumn("text", { id: "col_2", order: 1 }),
    ];

    const moved = moveColumnRight(columns, "col_2");
    assert.deepEqual(moved.map((c) => c.id), ["col_1", "col_2"]);
  });

  test("updateColumnSettings patches settings without affecting other columns", () => {
    const columns = [
      createColumn("checkbox", { id: "col_1", order: 0 }),
      createColumn("text", { id: "col_2", order: 1 }),
    ];

    const updated = updateColumnSettings(columns, "col_1", { moveCheckedRowsToBottom: true });
    assert.equal(
      "moveCheckedRowsToBottom" in updated[0].settings && updated[0].settings.moveCheckedRowsToBottom,
      true
    );
    assert.equal(updated[1].type, "text");
  });
});
