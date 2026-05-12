import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { applyFormattingPatch } from "../../domain/formatting/applyFormattingPatch.js";
import type { FormattingLayer } from "../../domain/formatting/mergeFormatting.js";
import type { BorderEdge } from "../../types/formatting.js";

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

  test("sets border width", () => {
    const result = applyFormattingPatch(undefined, { borderWidth: 3 });
    assert.equal(result.borderWidth, 3);
  });

  test("sets border color", () => {
    const result = applyFormattingPatch(undefined, { borderColor: "#ff00ff" });
    assert.equal(result.borderColor, "#ff00ff");
  });

  test("sets edges", () => {
    const result = applyFormattingPatch(undefined, { edges: ["top", "left"] });
    assert.deepEqual(result.edges, ["top", "left"]);
  });

  test("resets border width", () => {
    const result = applyFormattingPatch({ borderWidth: 2, borderColor: "#000" }, { borderWidth: undefined });
    assert.equal("borderWidth" in result, false);
    assert.equal(result.borderColor, "#000");
  });

  test("resets border color", () => {
    const result = applyFormattingPatch({ borderWidth: 2, borderColor: "#000" }, { borderColor: undefined });
    assert.equal("borderColor" in result, false);
    assert.equal(result.borderWidth, 2);
  });

  test("resets edges", () => {
    const result = applyFormattingPatch({ edges: ["top"], borderWidth: 1 }, { edges: undefined });
    assert.equal("edges" in result, false);
    assert.equal(result.borderWidth, 1);
  });

  test("does not mutate input edges array", () => {
    const originalEdges: BorderEdge[] = ["top", "bottom"];
    const original = { edges: originalEdges };
    const result = applyFormattingPatch(original, { edges: ["left"] as BorderEdge[] });
    assert.deepEqual(original.edges, ["top", "bottom"]);
    assert.deepEqual(result.edges, ["left"]);
  });
});
