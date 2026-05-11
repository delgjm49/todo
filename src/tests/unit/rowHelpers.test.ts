import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createColumn } from "../../domain/columns/createColumn.js";
import { createRow } from "../../domain/rows/createRow.js";
import { deleteRowById, insertRowAtIndex, reorderRows } from "../../domain/rows/reorderRows.js";

describe("row helpers", () => {
  test("createRow creates cells that match column types", () => {
    const columns = [
      createColumn("checkbox", { id: "col_check", order: 0 }),
      createColumn("text", { id: "col_text", order: 1 }),
      createColumn("bullet", { id: "col_bullet", order: 2 }),
      createColumn("numbered", { id: "col_num", order: 3 }),
      createColumn("date", { id: "col_date", order: 4 }),
      createColumn("dropdown", { id: "col_status", order: 5 }),
    ];

    const row = createRow(columns, { id: "row_a", order: 0 });
    assert.equal(typeof row.cells.col_check?.value, "boolean");
    assert.equal(row.cells.col_check?.value, false);
    assert.equal(typeof row.cells.col_text?.value, "string");
    assert.equal(row.cells.col_text?.value, "");
    assert.equal(row.cells.col_bullet?.value, null);
    assert.equal(row.cells.col_num?.value, null);
    assert.equal(row.cells.col_date?.value, null);
    assert.equal(row.cells.col_status?.value, null);
  });

  test("insert, delete, and reorder rows preserve ids and reindex order", () => {
    const columns = [createColumn("text", { id: "col_text", order: 0 })];
    const row1 = createRow(columns, { id: "row_1", order: 0 });
    const row2 = createRow(columns, { id: "row_2", order: 1 });
    const row3 = createRow(columns, { id: "row_3", order: 2 });

    const inserted = insertRowAtIndex([row1, row3], row2, 1);
    assert.deepEqual(
      inserted.map((row) => row.id),
      ["row_1", "row_2", "row_3"]
    );
    assert.deepEqual(
      inserted.map((row) => row.order),
      [0, 1, 2]
    );

    const reordered = reorderRows(inserted, "row_3", "row_1");
    assert.deepEqual(
      reordered.map((row) => row.id),
      ["row_3", "row_1", "row_2"]
    );
    assert.deepEqual(
      reordered.map((row) => row.order),
      [0, 1, 2]
    );

    const deleted = deleteRowById(reordered, "row_1");
    assert.deepEqual(
      deleted.map((row) => row.id),
      ["row_3", "row_2"]
    );
    assert.deepEqual(
      deleted.map((row) => row.order),
      [0, 1]
    );
  });
});
