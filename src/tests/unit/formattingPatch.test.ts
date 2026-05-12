import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { applyFormattingPatch } from "../../domain/formatting/applyFormattingPatch.js";
import type { FormattingLayer } from "../../domain/formatting/mergeFormatting.js";

describe("applyFormattingPatch", () => {
  test("sets a property on an empty object", () => {
    const result = applyFormattingPatch(undefined, { bold: true });
    assert.deepEqual(result, { bold: true });
  });

  test("overwrites an existing property", () => {
    const result = applyFormattingPatch({ bold: false, fontSize: 14 }, { bold: true });
    assert.equal(result.bold, true);
    assert.equal(result.fontSize, 14);
  });

  test("removes a property when set to undefined", () => {
    const result = applyFormattingPatch({ bold: true, fontSize: 14 }, { bold: undefined });
    assert.equal("bold" in result, false);
    assert.equal(result.fontSize, 14);
  });

  test("handles multiple keys at once", () => {
    const result = applyFormattingPatch<FormattingLayer>(
      { bold: true, fontSize: 14 },
      { fontSize: 16, italic: true }
    );
    assert.equal(result.bold, true);
    assert.equal(result.fontSize, 16);
    assert.equal(result.italic, true);
  });

  test("removes multiple properties with undefined", () => {
    const result = applyFormattingPatch(
      { bold: true, italic: true, fontSize: 14 },
      { bold: undefined, italic: undefined }
    );
    assert.equal("bold" in result, false);
    assert.equal("italic" in result, false);
    assert.equal(result.fontSize, 14);
  });

  test("does not mutate the input object", () => {
    const original = { bold: true };
    const result = applyFormattingPatch(original, { fontSize: 14 });
    assert.deepEqual(original, { bold: true });
    assert.notStrictEqual(result, original);
  });

  test("returns empty object when all properties are removed", () => {
    const result = applyFormattingPatch({ bold: true }, { bold: undefined });
    assert.deepEqual(result, {});
  });

  test("returns empty object when starting from undefined and patch is empty", () => {
    const result = applyFormattingPatch(undefined, {});
    assert.deepEqual(result, {});
  });

  test("sets text color", () => {
    const result = applyFormattingPatch(undefined, { textColor: "#ff0000" });
    assert.equal(result.textColor, "#ff0000");
  });

  test("sets background color", () => {
    const result = applyFormattingPatch(undefined, { backgroundColor: "#00ff00" });
    assert.equal(result.backgroundColor, "#00ff00");
  });
});
