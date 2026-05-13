import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { applyCheckboxAutoMove, isRowCompletedByCheckbox } from "../../domain/rows/applyCheckboxRules.js";
import type { ColumnDefinition } from "../../types/column.js";
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

function row(id: string, order: number, values: Record<string, PersistedCell["value"]>): Row {
  return {
    id,
    order,
    format: {},
    cells: Object.fromEntries(Object.entries(values).map(([columnId, value]) => [columnId, { value, format: {} }])),
  };
}

describe("checkbox automation helpers", () => {
  test("detects row completion only for checked strikeout-enabled checkbox columns", () => {
    const textColumn = column({ id: "task", type: "text" });
    const inactiveCheckbox = column({
      id: "done",
      type: "checkbox",
      settings: { strikeoutRowWhenChecked: false, moveCheckedRowsToBottom: false },
    });
    const activeCheckbox = column({
      id: "approved",
      type: "checkbox",
      settings: { strikeoutRowWhenChecked: true, moveCheckedRowsToBottom: false },
    });

    assert.equal(isRowCompletedByCheckbox([textColumn], row("row_1", 0, { task: "No checkbox" })), false);
    assert.equal(
      isRowCompletedByCheckbox([inactiveCheckbox], row("row_1", 0, { done: true })),
      false
    );
    assert.equal(
      isRowCompletedByCheckbox([activeCheckbox], row("row_1", 0, { approved: false })),
      false
    );
    assert.equal(
      isRowCompletedByCheckbox([activeCheckbox], row("row_1", 0, { approved: true })),
      true
    );
  });

  test("completes a row when any strikeout-enabled checkbox column is checked", () => {
    const columns = [
      column({
        id: "done",
        type: "checkbox",
        settings: { strikeoutRowWhenChecked: false, moveCheckedRowsToBottom: false },
      }),
      column({
        id: "reviewed",
        type: "checkbox",
        settings: { strikeoutRowWhenChecked: true, moveCheckedRowsToBottom: false },
      }),
    ];

    assert.equal(isRowCompletedByCheckbox(columns, row("row_1", 0, { done: true, reviewed: true })), true);
  });

  test("leaves display order unchanged when auto-move is unavailable or disabled", () => {
    const rows = [row("row_b", 1, { done: true, task: "B" }), row("row_a", 0, { done: false, task: "A" })];
    const disabledColumn = column({
      id: "done",
      type: "checkbox",
      settings: { strikeoutRowWhenChecked: false, moveCheckedRowsToBottom: false },
    });
    const textColumn = column({ id: "task", type: "text" });

    assert.deepEqual(applyCheckboxAutoMove(rows, [disabledColumn], "done").map((entry) => entry.id), [
      "row_a",
      "row_b",
    ]);
    assert.deepEqual(applyCheckboxAutoMove(rows, [textColumn], "task").map((entry) => entry.id), [
      "row_a",
      "row_b",
    ]);
    assert.deepEqual(applyCheckboxAutoMove(rows, [disabledColumn], "missing").map((entry) => entry.id), [
      "row_a",
      "row_b",
    ]);
  });

  test("groups unchecked rows before checked rows while preserving payloads and relative order", () => {
    const rows = [
      row("row_checked_1", 0, { done: true, task: "Checked 1" }),
      row("row_unchecked_1", 1, { done: false, task: "Unchecked 1" }),
      row("row_checked_2", 2, { done: true, task: "Checked 2" }),
      row("row_unchecked_2", 3, { done: false, task: "Unchecked 2" }),
    ];
    const checkboxColumn = column({
      id: "done",
      type: "checkbox",
      settings: { strikeoutRowWhenChecked: false, moveCheckedRowsToBottom: true },
    });

    const moved = applyCheckboxAutoMove(rows, [checkboxColumn], "done");

    assert.deepEqual(moved.map((entry) => entry.id), [
      "row_unchecked_1",
      "row_unchecked_2",
      "row_checked_1",
      "row_checked_2",
    ]);
    assert.deepEqual(moved.map((entry) => entry.order), [0, 1, 2, 3]);
    assert.equal(moved.find((entry) => entry.id === "row_checked_1")?.cells.task?.value, "Checked 1");
    assert.equal(moved.find((entry) => entry.id === "row_unchecked_2")?.cells.done?.value, false);
  });

  test("uses only the toggled checkbox column for grouping", () => {
    const rows = [
      row("row_a", 0, { done: true, reviewed: false }),
      row("row_b", 1, { done: false, reviewed: true }),
      row("row_c", 2, { done: false, reviewed: false }),
    ];
    const columns = [
      column({
        id: "done",
        type: "checkbox",
        settings: { strikeoutRowWhenChecked: false, moveCheckedRowsToBottom: true },
      }),
      column({
        id: "reviewed",
        type: "checkbox",
        settings: { strikeoutRowWhenChecked: false, moveCheckedRowsToBottom: true },
      }),
    ];

    assert.deepEqual(applyCheckboxAutoMove(rows, columns, "reviewed").map((entry) => entry.id), [
      "row_a",
      "row_c",
      "row_b",
    ]);
  });
});
