import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  deserializeRowsFromClipboardJson,
  INTERNAL_ROW_CLIPBOARD_MARKER,
  INTERNAL_ROW_CLIPBOARD_VERSION,
  mapClipboardRowsToBlock,
  serializeRowsForClipboard,
  type InternalRowClipboardPayload,
} from "../../domain/clipboard/index.js";
import { createColumn } from "../../domain/columns/createColumn.js";
import type { Block } from "../../types/block.js";
import type { ColumnDefinition, ColumnType } from "../../types/column.js";
import type { PersistedCell, Row } from "../../types/row.js";

function column(type: ColumnType, id: string, order: number): ColumnDefinition {
  return createColumn(type, { id, order, label: id });
}

function row(id: string, order: number, cells: Record<string, PersistedCell>, format: Row["format"] = {}): Row {
  return {
    id,
    order,
    format,
    cells,
  };
}

function block(overrides: Partial<Block> & Pick<Block, "columns" | "rows">): Block {
  return {
    id: "block_source",
    workspaceId: "workspace_1",
    title: "Source",
    blockType: "basic_checklist",
    order: 0,
    collapsed: false,
    border: {},
    sort: null,
    format: {},
    ...overrides,
  };
}

function baseSourceBlock(): Block {
  const columns = [column("text", "task", 1), column("checkbox", "done", 0), column("date", "due", 2)];
  return block({
    columns,
    rows: [
      row(
        "row_b",
        1,
        {
          done: { value: true, format: { backgroundColor: "#eeeeee" } },
          task: { value: "Bravo", format: { bold: true, textColor: "#123456" } },
          due: { value: "2026-05-14", format: { italic: true } },
        },
        { backgroundColor: "#ffffff" }
      ),
      row(
        "row_a",
        0,
        {
          done: { value: false, format: {} },
          task: { value: "Alpha", format: { underline: true } },
          due: { value: null, format: {} },
        },
        { bold: true, borderWidth: 2, edges: ["top", "bottom"] }
      ),
      row("row_c", 2, {
        done: { value: false, format: {} },
        task: { value: "Charlie", format: {} },
        due: { value: null, format: {} },
      }),
    ],
  });
}

function assertSerializeSuccess(result: ReturnType<typeof serializeRowsForClipboard>) {
  assert.equal(result.ok, true);
  return result;
}

function assertDeserializeSuccess(result: ReturnType<typeof deserializeRowsFromClipboardJson>) {
  assert.equal(result.ok, true);
  return result;
}

function assertMapSuccess(result: ReturnType<typeof mapClipboardRowsToBlock>) {
  assert.equal(result.ok, true);
  return result;
}

describe("internal row clipboard helpers", () => {
  test("serializes selected rows in display order and preserves source metadata and formatting", () => {
    const source = baseSourceBlock();
    const before = structuredClone(source);

    const result = assertSerializeSuccess(serializeRowsForClipboard(source, ["row_b", "row_a"]));

    assert.equal(result.payload.marker, INTERNAL_ROW_CLIPBOARD_MARKER);
    assert.equal(result.payload.version, INTERNAL_ROW_CLIPBOARD_VERSION);
    assert.deepEqual(
      result.payload.source.columns.map((entry) => entry.id),
      ["done", "task", "due"]
    );
    assert.deepEqual(
      result.payload.rows.map((entry) => entry.sourceRowId),
      ["row_a", "row_b"]
    );
    assert.deepEqual(result.payload.rows[0]?.format, { bold: true, borderWidth: 2, edges: ["top", "bottom"] });
    assert.deepEqual(result.payload.rows[1]?.cells.task, {
      value: "Bravo",
      format: { bold: true, textColor: "#123456" },
    });
    assert.equal(JSON.parse(result.json).marker, INTERNAL_ROW_CLIPBOARD_MARKER);
    assert.deepEqual(source, before);
  });

  test("returns no-rows when no selected source rows match", () => {
    const result = serializeRowsForClipboard(baseSourceBlock(), ["missing"]);

    assert.deepEqual(result, { ok: false, reason: "no-rows" });
  });

  test("rejects malformed, non-app, unsupported, and invalid payload JSON without throwing", () => {
    assert.deepEqual(deserializeRowsFromClipboardJson("{"), { ok: false, reason: "invalid-json" });
    assert.deepEqual(deserializeRowsFromClipboardJson(JSON.stringify({ marker: "other" })), {
      ok: false,
      reason: "invalid-marker",
    });
    assert.deepEqual(
      deserializeRowsFromClipboardJson(
        JSON.stringify({ marker: INTERNAL_ROW_CLIPBOARD_MARKER, version: INTERNAL_ROW_CLIPBOARD_VERSION + 1 })
      ),
      { ok: false, reason: "unsupported-version" }
    );
    assert.deepEqual(
      deserializeRowsFromClipboardJson(
        JSON.stringify({ marker: INTERNAL_ROW_CLIPBOARD_MARKER, version: INTERNAL_ROW_CLIPBOARD_VERSION, source: {} })
      ),
      { ok: false, reason: "invalid-payload" }
    );
  });

  test("deserializes valid payloads and omits invalid individual cells and formatting fields", () => {
    const rawPayload = {
      marker: INTERNAL_ROW_CLIPBOARD_MARKER,
      version: INTERNAL_ROW_CLIPBOARD_VERSION,
      source: {
        blockId: "block_source",
        blockType: "basic_checklist",
        columns: [
          { id: "task", type: "text", order: 0 },
          { id: "done", type: "checkbox", order: 1 },
        ],
      },
      rows: [
        {
          sourceRowId: "row_1",
          order: 0,
          format: { bold: true, borderWidth: -1, textColor: "not-a-color" },
          cells: {
            task: { value: 123, format: { bold: true } },
            done: { value: true, format: { italic: true, edges: ["left", "bad"] } },
            unknown: { value: "ignored" },
          },
        },
      ],
    };

    const result = assertDeserializeSuccess(deserializeRowsFromClipboardJson(JSON.stringify(rawPayload)));

    assert.deepEqual(result.payload.rows[0]?.format, { bold: true });
    assert.equal(result.payload.rows[0]?.cells.task, undefined);
    assert.deepEqual(result.payload.rows[0]?.cells.done, {
      value: true,
      format: { italic: true, edges: ["left"] },
    });
  });

  test("maps same-id payloads to fresh rows with preserved compatible values and default target extras", () => {
    const source = baseSourceBlock();
    const payload = assertSerializeSuccess(serializeRowsForClipboard(source, ["row_b"])).payload;
    const target = block({
      id: "target",
      columns: [...source.columns, column("text", "notes", 3)],
      rows: [],
    });
    const beforePayload = structuredClone(payload);
    const beforeTarget = structuredClone(target);
    const ids = ["row_new_1"];

    const result = assertMapSuccess(
      mapClipboardRowsToBlock(payload, target, { startOrder: 10, generateRowId: () => ids.shift() ?? "row_fallback" })
    );

    assert.equal(result.strategy, "by-column-id");
    assert.deepEqual(result.rows.map((entry) => entry.id), ["row_new_1"]);
    assert.notEqual(result.rows[0]?.id, payload.rows[0]?.sourceRowId);
    assert.equal(result.rows[0]?.order, 10);
    assert.deepEqual(result.rows[0]?.format, { backgroundColor: "#ffffff" });
    assert.deepEqual(result.rows[0]?.cells.task, { value: "Bravo", format: { bold: true, textColor: "#123456" } });
    assert.deepEqual(result.rows[0]?.cells.notes, { value: "", format: {} });
    assert.deepEqual(payload, beforePayload);
    assert.deepEqual(target, beforeTarget);
    assert.notEqual(result.rows[0]?.cells.task, payload.rows[0]?.cells.task);
  });

  test("maps compatible cross-block payloads by column shape when ids differ", () => {
    const source = baseSourceBlock();
    const payload = assertSerializeSuccess(serializeRowsForClipboard(source, ["row_a"])).payload;
    const target = block({
      id: "target_shape",
      columns: [column("checkbox", "target_done", 0), column("text", "target_task", 1), column("date", "target_due", 2)],
      rows: [],
    });

    const result = assertMapSuccess(
      mapClipboardRowsToBlock(payload, target, { generateRowId: () => "row_new_shape" })
    );

    assert.equal(result.strategy, "by-shape");
    assert.deepEqual(result.rows[0]?.cells.target_done, { value: false, format: {} });
    assert.deepEqual(result.rows[0]?.cells.target_task, { value: "Alpha", format: { underline: true } });
    assert.deepEqual(result.rows[0]?.cells.target_due, { value: null, format: {} });
  });

  test("rejects incompatible target shapes without producing rows", () => {
    const source = baseSourceBlock();
    const payload = assertSerializeSuccess(serializeRowsForClipboard(source, ["row_a"])).payload;
    const target = block({
      id: "target_incompatible",
      columns: [column("text", "target_text", 0), column("checkbox", "target_done", 1), column("date", "target_due", 2)],
      rows: [],
    });

    assert.deepEqual(mapClipboardRowsToBlock(payload, target), {
      ok: false,
      reason: "incompatible-target",
      rows: [],
    });
  });

  test("fills defaults for missing source cells and rejects empty payload mapping", () => {
    const payload: InternalRowClipboardPayload = {
      marker: INTERNAL_ROW_CLIPBOARD_MARKER,
      version: INTERNAL_ROW_CLIPBOARD_VERSION,
      source: {
        blockId: "block_source",
        blockType: "basic_checklist",
        columns: [
          { id: "task", type: "text", order: 0 },
          { id: "done", type: "checkbox", order: 1 },
        ],
      },
      rows: [
        {
          sourceRowId: "row_1",
          order: 0,
          format: {},
          cells: {
            done: { value: false, format: { bold: true } },
          },
        },
      ],
    };
    const target = block({
      columns: [column("text", "task", 0), column("checkbox", "done", 1)],
      rows: [],
    });

    const result = assertMapSuccess(mapClipboardRowsToBlock(payload, target, { generateRowId: () => "row_new" }));

    assert.deepEqual(result.rows[0]?.cells.task, { value: "", format: {} });
    assert.deepEqual(result.rows[0]?.cells.done, { value: false, format: { bold: true } });
    assert.deepEqual(mapClipboardRowsToBlock({ ...payload, rows: [] }, target), {
      ok: false,
      reason: "empty-payload",
      rows: [],
    });
  });
});
