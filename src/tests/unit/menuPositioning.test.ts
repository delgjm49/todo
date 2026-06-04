import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { clampMenuPosition } from "../../hooks/useClampedMenuPosition.js";

describe("clampMenuPosition — pure helper", () => {
  test("returns raw coordinates when fully inside viewport", () => {
    const result = clampMenuPosition({
      x: 100,
      y: 200,
      width: 300,
      height: 200,
      viewportWidth: 1024,
      viewportHeight: 768,
    });
    assert.equal(result.left, 100);
    assert.equal(result.top, 200);
  });

  test("clamps right overflow", () => {
    const result = clampMenuPosition({
      x: 900,
      y: 100,
      width: 320,
      height: 400,
      viewportWidth: 1024,
      viewportHeight: 768,
      margin: 8,
    });
    // expected left = viewportWidth - width - margin = 1024 - 320 - 8 = 696
    assert.equal(result.left, 696);
    assert.equal(result.top, 100);
  });

  test("clamps bottom overflow", () => {
    const result = clampMenuPosition({
      x: 100,
      y: 600,
      width: 256,
      height: 300,
      viewportWidth: 1024,
      viewportHeight: 768,
      margin: 8,
    });
    // expected top = viewportHeight - height - margin = 768 - 300 - 8 = 460
    assert.equal(result.left, 100);
    assert.equal(result.top, 460);
  });

  test("clamps both right and bottom overflow", () => {
    const result = clampMenuPosition({
      x: 950,
      y: 700,
      width: 320,
      height: 300,
      viewportWidth: 1024,
      viewportHeight: 768,
      margin: 8,
    });
    // left = 1024 - 320 - 8 = 696
    // top = 768 - 300 - 8 = 460
    assert.equal(result.left, 696);
    assert.equal(result.top, 460);
  });

  test("clamps x/y below margin up to the margin", () => {
    const result = clampMenuPosition({
      x: -5,
      y: -10,
      width: 200,
      height: 200,
      viewportWidth: 1024,
      viewportHeight: 768,
      margin: 8,
    });
    assert.equal(result.left, 8);
    assert.equal(result.top, 8);
  });

  test("clamps menu larger than viewport to margin", () => {
    const result = clampMenuPosition({
      x: 100,
      y: 100,
      width: 2000,
      height: 2000,
      viewportWidth: 800,
      viewportHeight: 600,
      margin: 8,
    });
    // maxLeft = Math.max(8, 800 - 2000 - 8) = Math.max(8, -1208) = 8
    // maxTop  = Math.max(8, 600 - 2000 - 8) = Math.max(8, -1408) = 8
    // Both x and y (100) are between margin (8) and maxLeft/maxTop (8),
    // so they get clamped to 8.
    assert.equal(result.left, 8);
    assert.equal(result.top, 8);
  });

  test("uses default margin of 8 when not specified", () => {
    const result = clampMenuPosition({
      x: -3,
      y: -3,
      width: 100,
      height: 100,
      viewportWidth: 1024,
      viewportHeight: 768,
    });
    assert.equal(result.left, 8);
    assert.equal(result.top, 8);
  });

  test("respects custom margin", () => {
    const result = clampMenuPosition({
      x: -3,
      y: -3,
      width: 100,
      height: 100,
      viewportWidth: 1024,
      viewportHeight: 768,
      margin: 16,
    });
    assert.equal(result.left, 16);
    assert.equal(result.top, 16);
  });

  test("x/y at zero are clamped to margin", () => {
    const result = clampMenuPosition({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      viewportWidth: 1024,
      viewportHeight: 768,
      margin: 8,
    });
    assert.equal(result.left, 8);
    assert.equal(result.top, 8);
  });
});
