import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { mergeFormatting } from "../../domain/formatting/mergeFormatting.js";
import { appDefaultsToFormatting } from "../../domain/formatting/appDefaultsToFormatting.js";
import { resolveCellFormatting } from "../../domain/formatting/resolveCellFormatting.js";
import { resolveRowStyle } from "../../domain/formatting/resolveRowStyle.js";
import { resolveThemeAwareAppDefaults } from "../../domain/defaults/themeDefaultColors.js";
import type { AppDefaults, Settings } from "../../types/settings.js";

function makeDefaults(overrides: Partial<AppDefaults> = {}): AppDefaults {
  return {
    fontFamily: "Segoe UI",
    fontSize: 14,
    textColor: "#000000",
    cellBackground: "#ffffff",
    blockBorderColor: "#e5e7eb",
    blockBorderWidth: 1,
    workspaceAccentEnabled: false,
    workspaceBackground: "#1F2937",
    workspaceTextColor: "#F9FAFB",
    workspaceAccentColor: "#60A5FA",
    ...overrides,
  };
}

describe("mergeFormatting", () => {
  test("returns base when override is empty", () => {
    const base = { bold: true, fontSize: 16 };
    const result = mergeFormatting(base, {});
    assert.deepEqual(result, { bold: true, fontSize: 16 });
  });

  test("override replaces base properties", () => {
    const base = { bold: true, fontSize: 16, textColor: "#000" };
    const override = { fontSize: 20, textColor: "#fff" };
    const result = mergeFormatting(base, override);
    assert.deepEqual(result, { bold: true, fontSize: 20, textColor: "#fff" });
  });

  test("override adds new properties", () => {
    const base = { bold: true };
    const override = { italic: true };
    const result = mergeFormatting(base, override);
    assert.deepEqual(result, { bold: true, italic: true });
  });

  test("explicit undefined removes inherited property", () => {
    const base = { bold: true, fontSize: 16 };
    const override = { bold: undefined };
    const result = mergeFormatting(base, override);
    assert.equal("bold" in result, false);
    assert.equal(result.fontSize, 16);
  });

  test("does not mutate inputs", () => {
    const base = { bold: true };
    const override = { italic: true };
    const result = mergeFormatting(base, override);
    assert.deepEqual(base, { bold: true });
    assert.deepEqual(override, { italic: true });
    assert.notStrictEqual(result, base);
    assert.notStrictEqual(result, override);
  });

  test("replaces edges array entirely", () => {
    const base = { edges: ["top", "bottom"] as ["top", "bottom"] };
    const override = { edges: ["left"] as ["left"] };
    const result = mergeFormatting(base, override);
    assert.deepEqual(result.edges, ["left"]);
  });

  test("empty edges array overrides non-empty edges", () => {
    const base = { edges: ["top", "bottom"] as ["top", "bottom"] };
    const override = { edges: [] as [] };
    const result = mergeFormatting(base, override);
    assert.deepEqual(result.edges, []);
  });
});

describe("appDefaultsToFormatting", () => {
  test("maps AppDefaults to formatting layer", () => {
    const defaults = makeDefaults();
    const result = appDefaultsToFormatting(defaults);
    assert.equal(result.fontFamily, "Segoe UI");
    assert.equal(result.fontSize, 14);
    assert.equal(result.textColor, "#000000");
    assert.equal(result.backgroundColor, "#ffffff");
    assert.equal(result.borderColor, "#e5e7eb");
    assert.equal(result.borderWidth, 1);
  });
});

describe("resolveCellFormatting", () => {
  test("inherits from app defaults when no overrides", () => {
    const defaults = makeDefaults();
    const result = resolveCellFormatting(defaults, {}, {}, {}, undefined);
    assert.equal(result.fontFamily, "Segoe UI");
    assert.equal(result.fontSize, 14);
    assert.equal(result.textColor, "#000000");
  });

  test("block format overrides app defaults", () => {
    const defaults = makeDefaults();
    const result = resolveCellFormatting(defaults, { fontSize: 18 }, {}, {}, undefined);
    assert.equal(result.fontSize, 18);
    assert.equal(result.fontFamily, "Segoe UI");
  });

  test("column format overrides block format", () => {
    const defaults = makeDefaults();
    const result = resolveCellFormatting(
      defaults,
      { textColor: "#111" },
      { textColor: "#222" },
      {},
      undefined
    );
    assert.equal(result.textColor, "#222");
  });

  test("row format overrides column format", () => {
    const defaults = makeDefaults();
    const result = resolveCellFormatting(
      defaults,
      {},
      { bold: true },
      { bold: false },
      undefined
    );
    assert.equal(result.bold, false);
  });

  test("cell format overrides row format", () => {
    const defaults = makeDefaults();
    const result = resolveCellFormatting(
      defaults,
      {},
      {},
      { italic: true },
      { italic: false }
    );
    assert.equal(result.italic, false);
  });

  test("full precedence chain: app < block < column < row < cell", () => {
    const defaults = makeDefaults({ fontSize: 10, textColor: "#000" });
    const result = resolveCellFormatting(
      defaults,
      { fontSize: 12 },
      { fontSize: 14, textColor: "#333" },
      { fontSize: 16 },
      { textColor: "#666" }
    );
    assert.equal(result.fontSize, 16);
    assert.equal(result.textColor, "#666");
  });

  test("empty override objects do not erase inherited values", () => {
    const defaults = makeDefaults();
    const result = resolveCellFormatting(
      defaults,
      { bold: true },
      {},
      {},
      undefined
    );
    assert.equal(result.bold, true);
    assert.equal(result.fontFamily, "Segoe UI");
  });

  test("border properties merge through all layers", () => {
    const defaults = makeDefaults({ blockBorderColor: "#ccc", blockBorderWidth: 1 });
    const result = resolveCellFormatting(
      defaults,
      { borderWidth: 2 },
      { borderColor: "#f00" },
      { edges: ["top", "bottom"] },
      { borderWidth: 3 }
    );
    assert.equal(result.borderColor, "#f00");
    assert.equal(result.borderWidth, 3);
    assert.deepEqual(result.edges, ["top", "bottom"]);
  });
});

describe("theme-aware default resolution with resolveCellFormatting", () => {
  function makeSettings(theme: Settings["theme"]): Settings {
    return {
      theme,
      defaults: {
        fontFamily: "Segoe UI",
        fontSize: 14,
        textColor: "#F3F4F6",
        cellBackground: "#111827",
        blockBorderColor: "#374151",
        blockBorderWidth: 1,
        workspaceAccentEnabled: true,
        workspaceBackground: "#1F2937",
        workspaceTextColor: "#F9FAFB",
        workspaceAccentColor: "#60A5FA",
      },
    };
  }

  test("stock-default light-mode settings produce light text and background for empty-format cell", () => {
    const settings = makeSettings("light");
    const effectiveDefaults = resolveThemeAwareAppDefaults(settings);
    const result = resolveCellFormatting(effectiveDefaults, {}, {}, {}, undefined);
    assert.equal(result.textColor, "#0F172A");
    assert.equal(result.backgroundColor, "#FFFFFF");
    assert.equal(result.borderColor, "#E2E8F0");
  });

  test("stock-default dark-mode settings preserve dark text and background for empty-format cell", () => {
    const settings = makeSettings("dark");
    const effectiveDefaults = resolveThemeAwareAppDefaults(settings);
    const result = resolveCellFormatting(effectiveDefaults, {}, {}, {}, undefined);
    assert.equal(result.textColor, "#F3F4F6");
    assert.equal(result.backgroundColor, "#111827");
    assert.equal(result.borderColor, "#374151");
  });

  test("explicit cell textColor overrides light stock default", () => {
    const settings = makeSettings("light");
    const effectiveDefaults = resolveThemeAwareAppDefaults(settings);
    const result = resolveCellFormatting(effectiveDefaults, {}, {}, {}, { textColor: "#FF0000" });
    assert.equal(result.textColor, "#FF0000");
    assert.equal(result.backgroundColor, "#FFFFFF");
  });

  test("explicit block backgroundColor overrides light stock default", () => {
    const settings = makeSettings("light");
    const effectiveDefaults = resolveThemeAwareAppDefaults(settings);
    const result = resolveCellFormatting(effectiveDefaults, { backgroundColor: "#AABBCC" }, {}, {}, undefined);
    assert.equal(result.backgroundColor, "#AABBCC");
    assert.equal(result.textColor, "#0F172A");
  });
});

describe("resolveRowStyle", () => {
  test("inherits from app defaults and block format", () => {
    const defaults = makeDefaults();
    const result = resolveRowStyle(defaults, { fontSize: 20 }, {});
    assert.equal(result.fontSize, 20);
    assert.equal(result.fontFamily, "Segoe UI");
  });

  test("row format overrides block format", () => {
    const defaults = makeDefaults();
    const result = resolveRowStyle(
      defaults,
      { backgroundColor: "#fff" },
      { backgroundColor: "#eee" }
    );
    assert.equal(result.backgroundColor, "#eee");
  });

  test("does not include column or cell formatting", () => {
    const defaults = makeDefaults();
    const result = resolveRowStyle(
      defaults,
      {},
      { bold: true }
    );
    assert.equal(result.bold, true);
    assert.equal(result.fontFamily, "Segoe UI");
  });

  test("empty row format inherits block and app defaults", () => {
    const defaults = makeDefaults();
    const result = resolveRowStyle(
      defaults,
      { underline: true },
      {}
    );
    assert.equal(result.underline, true);
    assert.equal(result.fontSize, 14);
  });
});
