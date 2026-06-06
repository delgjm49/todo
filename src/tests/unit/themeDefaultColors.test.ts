import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  resolveThemeAwareAppDefaults,
  resolveThemeAwareWorkspaceStyle,
  STOCK_DARK_TEXT_COLOR,
  STOCK_DARK_CELL_BACKGROUND,
  STOCK_DARK_BLOCK_BORDER_COLOR,
  STOCK_DARK_WORKSPACE_BACKGROUND,
  STOCK_DARK_WORKSPACE_TEXT_COLOR,
  STOCK_DARK_WORKSPACE_ACCENT_COLOR,
  STOCK_LIGHT_TEXT_COLOR,
  STOCK_LIGHT_CELL_BACKGROUND,
  STOCK_LIGHT_BLOCK_BORDER_COLOR,
  STOCK_LIGHT_WORKSPACE_BACKGROUND,
  STOCK_LIGHT_WORKSPACE_TEXT_COLOR,
  STOCK_LIGHT_WORKSPACE_ACCENT_COLOR,
} from "../../domain/defaults/themeDefaultColors.js";
import type { Settings } from "../../types/settings.js";
import type { WorkspaceStyle } from "../../types/formatting.js";

function makeSettings(overrides: Partial<Settings["defaults"]> = {}, theme: Settings["theme"] = "dark"): Settings {
  return {
    theme,
    defaults: {
      fontFamily: "Segoe UI",
      fontSize: 14,
      textColor: STOCK_DARK_TEXT_COLOR,
      cellBackground: STOCK_DARK_CELL_BACKGROUND,
      blockBorderColor: STOCK_DARK_BLOCK_BORDER_COLOR,
      blockBorderWidth: 1,
      workspaceAccentEnabled: true,
      workspaceBackground: STOCK_DARK_WORKSPACE_BACKGROUND,
      workspaceTextColor: STOCK_DARK_WORKSPACE_TEXT_COLOR,
      workspaceAccentColor: STOCK_DARK_WORKSPACE_ACCENT_COLOR,
      ...overrides,
    },
  };
}

// ---------------------------------------------------------------------------
// resolveThemeAwareAppDefaults
// ---------------------------------------------------------------------------

describe("resolveThemeAwareAppDefaults — dark theme", () => {
  test("returns same reference for dark theme", () => {
    const settings = makeSettings({}, "dark");
    const result = resolveThemeAwareAppDefaults(settings);
    assert.strictEqual(result, settings.defaults);
  });

  test("preserves stock dark colors unchanged in dark theme", () => {
    const settings = makeSettings({}, "dark");
    const result = resolveThemeAwareAppDefaults(settings);
    assert.equal(result.textColor, STOCK_DARK_TEXT_COLOR);
    assert.equal(result.cellBackground, STOCK_DARK_CELL_BACKGROUND);
    assert.equal(result.blockBorderColor, STOCK_DARK_BLOCK_BORDER_COLOR);
    assert.equal(result.workspaceBackground, STOCK_DARK_WORKSPACE_BACKGROUND);
    assert.equal(result.workspaceTextColor, STOCK_DARK_WORKSPACE_TEXT_COLOR);
    assert.equal(result.workspaceAccentColor, STOCK_DARK_WORKSPACE_ACCENT_COLOR);
  });
});

describe("resolveThemeAwareAppDefaults — light theme with stock dark defaults", () => {
  test("maps all stock dark editor colors to light stock values", () => {
    const settings = makeSettings({}, "light");
    const result = resolveThemeAwareAppDefaults(settings);
    assert.equal(result.textColor, STOCK_LIGHT_TEXT_COLOR);
    assert.equal(result.cellBackground, STOCK_LIGHT_CELL_BACKGROUND);
    assert.equal(result.blockBorderColor, STOCK_LIGHT_BLOCK_BORDER_COLOR);
  });

  test("maps all stock dark workspace colors to light stock values", () => {
    const settings = makeSettings({}, "light");
    const result = resolveThemeAwareAppDefaults(settings);
    assert.equal(result.workspaceBackground, STOCK_LIGHT_WORKSPACE_BACKGROUND);
    assert.equal(result.workspaceTextColor, STOCK_LIGHT_WORKSPACE_TEXT_COLOR);
    assert.equal(result.workspaceAccentColor, STOCK_LIGHT_WORKSPACE_ACCENT_COLOR);
  });

  test("preserves non-color fields (fontFamily, fontSize, borderWidth, accentEnabled)", () => {
    const settings = makeSettings({ fontFamily: "Arial", fontSize: 16, blockBorderWidth: 2, workspaceAccentEnabled: false }, "light");
    const result = resolveThemeAwareAppDefaults(settings);
    assert.equal(result.fontFamily, "Arial");
    assert.equal(result.fontSize, 16);
    assert.equal(result.blockBorderWidth, 2);
    assert.equal(result.workspaceAccentEnabled, false);
  });
});

describe("resolveThemeAwareAppDefaults — light theme with custom colors", () => {
  test("preserves custom textColor that differs from stock dark", () => {
    const settings = makeSettings({ textColor: "#AABBCC" }, "light");
    const result = resolveThemeAwareAppDefaults(settings);
    assert.equal(result.textColor, "#AABBCC");
  });

  test("preserves custom cellBackground that differs from stock dark", () => {
    const settings = makeSettings({ cellBackground: "#222222" }, "light");
    const result = resolveThemeAwareAppDefaults(settings);
    assert.equal(result.cellBackground, "#222222");
  });

  test("preserves custom workspaceBackground that differs from stock dark", () => {
    const settings = makeSettings({ workspaceBackground: "#101828" }, "light");
    const result = resolveThemeAwareAppDefaults(settings);
    assert.equal(result.workspaceBackground, "#101828");
  });

  test("partially custom — stock fields get mapped, custom fields are preserved", () => {
    const settings = makeSettings({ textColor: "#AABBCC" }, "light");
    const result = resolveThemeAwareAppDefaults(settings);
    assert.equal(result.textColor, "#AABBCC");
    assert.equal(result.cellBackground, STOCK_LIGHT_CELL_BACKGROUND);
    assert.equal(result.workspaceBackground, STOCK_LIGHT_WORKSPACE_BACKGROUND);
  });

  test("does not mutate input settings.defaults", () => {
    const settings = makeSettings({}, "light");
    const original = { ...settings.defaults };
    resolveThemeAwareAppDefaults(settings);
    assert.deepEqual(settings.defaults, original);
  });
});

// ---------------------------------------------------------------------------
// resolveThemeAwareWorkspaceStyle
// ---------------------------------------------------------------------------

describe("resolveThemeAwareWorkspaceStyle — dark theme", () => {
  test("returns same reference for dark theme", () => {
    const style: WorkspaceStyle = {
      background: STOCK_DARK_WORKSPACE_BACKGROUND,
      textColor: STOCK_DARK_WORKSPACE_TEXT_COLOR,
      accentStripe: { enabled: true, color: STOCK_DARK_WORKSPACE_ACCENT_COLOR },
    };
    const result = resolveThemeAwareWorkspaceStyle(style, "dark");
    assert.strictEqual(result, style);
  });
});

describe("resolveThemeAwareWorkspaceStyle — light theme with stock dark values", () => {
  test("maps stock dark workspace background to light", () => {
    const style: WorkspaceStyle = { background: STOCK_DARK_WORKSPACE_BACKGROUND };
    const result = resolveThemeAwareWorkspaceStyle(style, "light");
    assert.equal(result.background, STOCK_LIGHT_WORKSPACE_BACKGROUND);
  });

  test("maps stock dark workspace textColor to light", () => {
    const style: WorkspaceStyle = { textColor: STOCK_DARK_WORKSPACE_TEXT_COLOR };
    const result = resolveThemeAwareWorkspaceStyle(style, "light");
    assert.equal(result.textColor, STOCK_LIGHT_WORKSPACE_TEXT_COLOR);
  });

  test("maps stock dark accent color to light", () => {
    const style: WorkspaceStyle = {
      accentStripe: { enabled: true, color: STOCK_DARK_WORKSPACE_ACCENT_COLOR },
    };
    const result = resolveThemeAwareWorkspaceStyle(style, "light");
    assert.equal(result.accentStripe?.color, STOCK_LIGHT_WORKSPACE_ACCENT_COLOR);
    assert.equal(result.accentStripe?.enabled, true);
  });

  test("maps all stock dark fields at once", () => {
    const style: WorkspaceStyle = {
      background: STOCK_DARK_WORKSPACE_BACKGROUND,
      textColor: STOCK_DARK_WORKSPACE_TEXT_COLOR,
      accentStripe: { enabled: true, color: STOCK_DARK_WORKSPACE_ACCENT_COLOR },
    };
    const result = resolveThemeAwareWorkspaceStyle(style, "light");
    assert.equal(result.background, STOCK_LIGHT_WORKSPACE_BACKGROUND);
    assert.equal(result.textColor, STOCK_LIGHT_WORKSPACE_TEXT_COLOR);
    assert.equal(result.accentStripe?.color, STOCK_LIGHT_WORKSPACE_ACCENT_COLOR);
  });
});

describe("resolveThemeAwareWorkspaceStyle — light theme with custom/non-stock values", () => {
  test("preserves custom background (#101828) unchanged", () => {
    const style: WorkspaceStyle = { background: "#101828" };
    const result = resolveThemeAwareWorkspaceStyle(style, "light");
    assert.equal(result.background, "#101828");
  });

  test("preserves custom textColor (#F8FAFC) unchanged", () => {
    const style: WorkspaceStyle = { textColor: "#F8FAFC" };
    const result = resolveThemeAwareWorkspaceStyle(style, "light");
    assert.equal(result.textColor, "#F8FAFC");
  });

  test("preserves custom accent color unchanged", () => {
    const style: WorkspaceStyle = {
      accentStripe: { enabled: true, color: "#FF0000" },
    };
    const result = resolveThemeAwareWorkspaceStyle(style, "light");
    assert.equal(result.accentStripe?.color, "#FF0000");
  });

  test("preserves undefined background as undefined", () => {
    const style: WorkspaceStyle = { textColor: STOCK_DARK_WORKSPACE_TEXT_COLOR };
    const result = resolveThemeAwareWorkspaceStyle(style, "light");
    assert.equal(result.background, undefined);
    assert.equal(result.textColor, STOCK_LIGHT_WORKSPACE_TEXT_COLOR);
  });

  test("preserves undefined accentStripe as undefined", () => {
    const style: WorkspaceStyle = { background: STOCK_DARK_WORKSPACE_BACKGROUND };
    const result = resolveThemeAwareWorkspaceStyle(style, "light");
    assert.equal(result.accentStripe, undefined);
  });

  test("does not mutate input style", () => {
    const style: WorkspaceStyle = {
      background: STOCK_DARK_WORKSPACE_BACKGROUND,
      textColor: STOCK_DARK_WORKSPACE_TEXT_COLOR,
      accentStripe: { enabled: true, color: STOCK_DARK_WORKSPACE_ACCENT_COLOR },
    };
    const original = { ...style, accentStripe: { ...style.accentStripe } };
    resolveThemeAwareWorkspaceStyle(style, "light");
    assert.equal(style.background, STOCK_DARK_WORKSPACE_BACKGROUND);
    assert.equal(style.textColor, STOCK_DARK_WORKSPACE_TEXT_COLOR);
    assert.equal(style.accentStripe?.color, STOCK_DARK_WORKSPACE_ACCENT_COLOR);
    assert.deepEqual(style, original);
  });

  test("returned object does not share accentStripe reference with input", () => {
    const style: WorkspaceStyle = {
      accentStripe: { enabled: true, color: STOCK_DARK_WORKSPACE_ACCENT_COLOR },
    };
    const result = resolveThemeAwareWorkspaceStyle(style, "light");
    assert.notStrictEqual(result.accentStripe, style.accentStripe);
  });
});
