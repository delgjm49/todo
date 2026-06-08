import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { BLOCK_TEMPLATES, createBlockTemplate, getBlockTemplateLabel } from "../../domain/templates/blockTemplates.js";

describe("block templates", () => {
  test("exposes the supported block templates", () => {
    assert.deepEqual(
      BLOCK_TEMPLATES.map((template) => template.type),
      ["basic_checklist", "bulleted_list", "numbered_list"]
    );
  });

  test("creates checklist, bullet, and numbered block payloads with valid default columns", () => {
    const checklist = createBlockTemplate("basic_checklist", "ws_test");
    const bulletList = createBlockTemplate("bulleted_list", "ws_test");
    const numberedList = createBlockTemplate("numbered_list", "ws_test");

    assert.equal(checklist.blockType, "basic_checklist");
    assert.equal(checklist.columns[0]?.type, "checkbox");
    assert.equal(checklist.columns[1]?.type, "text");
    assert.equal(checklist.rows[0]?.cells[checklist.columns[0]!.id]?.value, false);
    assert.equal("type" in checklist.rows[0]!.cells[checklist.columns[0]!.id]!, false);

    assert.equal(bulletList.blockType, "bulleted_list");
    assert.equal(bulletList.columns[0]?.type, "bullet");
    assert.equal(bulletList.columns[1]?.type, "text");
    assert.equal(bulletList.rows[0]?.cells[bulletList.columns[0]!.id]?.value, null);

    assert.equal(numberedList.blockType, "numbered_list");
    assert.equal(numberedList.columns[0]?.type, "numbered");
    assert.equal(numberedList.columns[1]?.type, "text");
    assert.equal(numberedList.rows[0]?.cells[numberedList.columns[0]!.id]?.value, null);

    // All block templates default hideCompletedRows to false
    assert.equal(checklist.hideCompletedRows, false);
    assert.equal(bulletList.hideCompletedRows, false);
    assert.equal(numberedList.hideCompletedRows, false);
  });
});

describe("block templates — options, labels, and cell defaults", () => {
  test("createBlockTemplate with custom title", () => {
    const result = createBlockTemplate("basic_checklist", "ws_1", { title: "Custom" });
    assert.equal(result.title, "Custom");
  });

  test("createBlockTemplate with explicit blockId", () => {
    const result = createBlockTemplate("basic_checklist", "ws_1", { blockId: "block_explicit" });
    assert.equal(result.id, "block_explicit");
  });

  test("createBlockTemplate with custom order", () => {
    const result = createBlockTemplate("basic_checklist", "ws_1", { order: 5 });
    assert.equal(result.order, 5);
  });

  test("bulleted list has correct default border and sort values", () => {
    const result = createBlockTemplate("bulleted_list", "ws_1");
    assert.equal(result.border.borderWidth, 1);
    assert.equal(result.border.borderColor, "#374151");
    assert.deepEqual(result.border.edges, ["top", "right", "bottom", "left"]);
    assert.equal(result.sort, null);
    assert.equal(result.collapsed, false);
  });

  test("getBlockTemplateLabel returns correct labels", () => {
    assert.equal(getBlockTemplateLabel("basic_checklist"), "Checklist");
    assert.equal(getBlockTemplateLabel("bulleted_list"), "Bullet List");
    assert.equal(getBlockTemplateLabel("numbered_list"), "Numbered List");
  });

  test("template text column cell has value empty string not null", () => {
    const checklist = createBlockTemplate("basic_checklist", "ws_1");
    const textCol = checklist.columns.find((c) => c.type === "text");
    assert.ok(textCol);
    const cell = checklist.rows[0]?.cells[textCol.id];
    assert.ok(cell);
    assert.equal(cell.value, "");
    assert.deepEqual(cell.format, {});
  });
});

