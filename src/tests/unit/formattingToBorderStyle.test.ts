import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { formattingToBorderStyle } from "../../domain/formatting/formattingToBorderStyle.js";

describe("formattingToBorderStyle", () => {
  test("returns empty object when edges is absent", () => {
    const result = formattingToBorderStyle({ borderWidth: 2, borderColor: "#ff0000" });
    assert.deepEqual(result, {});
  });

  test("returns empty object when edges is undefined", () => {
    const result = formattingToBorderStyle({ borderWidth: 2, borderColor: "#ff0000", edges: undefined });
    assert.deepEqual(result, {});
  });

  test("sets all edges when all are enabled", () => {
    const result = formattingToBorderStyle({
      edges: ["top", "right", "bottom", "left"],
      borderWidth: 3,
      borderColor: "#123456",
    });
    assert.equal(result.borderStyle, "solid");
    assert.equal(result.borderColor, "#123456");
    assert.equal(result.borderTopWidth, 3);
    assert.equal(result.borderRightWidth, 3);
    assert.equal(result.borderBottomWidth, 3);
    assert.equal(result.borderLeftWidth, 3);
  });

  test("sets a single edge", () => {
    const result = formattingToBorderStyle({
      edges: ["bottom"],
      borderWidth: 2,
      borderColor: "#00ff00",
    });
    assert.equal(result.borderTopWidth, 0);
    assert.equal(result.borderRightWidth, 0);
    assert.equal(result.borderBottomWidth, 2);
    assert.equal(result.borderLeftWidth, 0);
  });

  test("sets multiple edges", () => {
    const result = formattingToBorderStyle({
      edges: ["top", "left"],
      borderWidth: 1,
      borderColor: "#0000ff",
    });
    assert.equal(result.borderTopWidth, 1);
    assert.equal(result.borderRightWidth, 0);
    assert.equal(result.borderBottomWidth, 0);
    assert.equal(result.borderLeftWidth, 1);
  });

  test("defaults width to 1 and color to #000000", () => {
    const result = formattingToBorderStyle({ edges: ["right"] });
    assert.equal(result.borderRightWidth, 1);
    assert.equal(result.borderColor, "#000000");
  });

  test("handles empty edges array by zeroing all sides", () => {
    const result = formattingToBorderStyle({ edges: [], borderWidth: 4, borderColor: "#ffffff" });
    assert.equal(result.borderTopWidth, 0);
    assert.equal(result.borderRightWidth, 0);
    assert.equal(result.borderBottomWidth, 0);
    assert.equal(result.borderLeftWidth, 0);
    assert.equal(result.borderColor, "#ffffff");
  });
});
