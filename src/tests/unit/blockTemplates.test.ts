import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { BLOCK_TEMPLATES, createBlockTemplate } from "../../domain/templates/blockTemplates.js";

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
  });
});
