import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { formattingToCellStyle } from "../../domain/formatting/formattingToCellStyle.js";

describe("formattingToCellStyle", () => {
  test("fontFamily is passed through unchanged", () => {
    const result = formattingToCellStyle({ fontFamily: "Arial" });
    assert.equal(result.fontFamily, "Arial");
  });

  test("fontSize is rendered as npx", () => {
    const result = formattingToCellStyle({ fontSize: 14 });
    assert.equal(result.fontSize, "14px");
  });

  test("fontSize undefined yields undefined", () => {
    const result = formattingToCellStyle({ fontSize: undefined });
    assert.equal(result.fontSize, undefined);
  });

  test("bold true yields fontWeight 700", () => {
    const result = formattingToCellStyle({ bold: true });
    assert.equal(result.fontWeight, 700);
  });

  test("bold false yields fontWeight undefined", () => {
    const result = formattingToCellStyle({ bold: false });
    assert.equal(result.fontWeight, undefined);
  });

  test("italic true yields fontStyle italic", () => {
    const result = formattingToCellStyle({ italic: true });
    assert.equal(result.fontStyle, "italic");
  });

  test("italic false yields fontStyle undefined", () => {
    const result = formattingToCellStyle({ italic: false });
    assert.equal(result.fontStyle, undefined);
  });

  test("underline true yields textDecoration underline", () => {
    const result = formattingToCellStyle({ underline: true });
    assert.equal(result.textDecoration, "underline");
  });

  test("underline false yields textDecoration undefined", () => {
    const result = formattingToCellStyle({ underline: false });
    assert.equal(result.textDecoration, undefined);
  });

  test("textColor maps to color", () => {
    const result = formattingToCellStyle({ textColor: "#ff0000" });
    assert.equal(result.color, "#ff0000");
  });

  test("backgroundColor maps to backgroundColor", () => {
    const result = formattingToCellStyle({ backgroundColor: "#00ff00" });
    assert.equal(result.backgroundColor, "#00ff00");
  });

  test("empty input yields object with all CSS keys present but undefined", () => {
    const result = formattingToCellStyle({});
    const keys = ["fontFamily", "fontSize", "fontWeight", "fontStyle", "textDecoration", "color", "backgroundColor"] as const;
    for (const key of keys) {
      assert.equal(key in result, true);
      assert.equal(result[key], undefined);
    }
  });

  test("fontFamily undefined yields undefined", () => {
    const result = formattingToCellStyle({ fontFamily: undefined });
    assert.equal(result.fontFamily, undefined);
  });
});
