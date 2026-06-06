import type { AppDefaults, Settings } from "../../types/settings.js";
import type { ThemeMode, WorkspaceStyle } from "../../types/formatting.js";

export const STOCK_DARK_TEXT_COLOR = "#F3F4F6";
export const STOCK_DARK_CELL_BACKGROUND = "#111827";
export const STOCK_DARK_BLOCK_BORDER_COLOR = "#374151";
export const STOCK_DARK_WORKSPACE_BACKGROUND = "#1F2937";
export const STOCK_DARK_WORKSPACE_TEXT_COLOR = "#F9FAFB";
export const STOCK_DARK_WORKSPACE_ACCENT_COLOR = "#60A5FA";

export const STOCK_LIGHT_TEXT_COLOR = "#0F172A";
export const STOCK_LIGHT_CELL_BACKGROUND = "#FFFFFF";
export const STOCK_LIGHT_BLOCK_BORDER_COLOR = "#E2E8F0";
export const STOCK_LIGHT_WORKSPACE_BACKGROUND = "#E0F2FE";
export const STOCK_LIGHT_WORKSPACE_TEXT_COLOR = "#0F172A";
export const STOCK_LIGHT_WORKSPACE_ACCENT_COLOR = "#2563EB";

function mapIfStock(value: string, stockDark: string, stockLight: string): string {
  return value === stockDark ? stockLight : value;
}

export function resolveThemeAwareAppDefaults(settings: Settings): AppDefaults {
  if (settings.theme !== "light") {
    return settings.defaults;
  }
  const d = settings.defaults;
  return {
    ...d,
    textColor: mapIfStock(d.textColor, STOCK_DARK_TEXT_COLOR, STOCK_LIGHT_TEXT_COLOR),
    cellBackground: mapIfStock(d.cellBackground, STOCK_DARK_CELL_BACKGROUND, STOCK_LIGHT_CELL_BACKGROUND),
    blockBorderColor: mapIfStock(d.blockBorderColor, STOCK_DARK_BLOCK_BORDER_COLOR, STOCK_LIGHT_BLOCK_BORDER_COLOR),
    workspaceBackground: mapIfStock(d.workspaceBackground, STOCK_DARK_WORKSPACE_BACKGROUND, STOCK_LIGHT_WORKSPACE_BACKGROUND),
    workspaceTextColor: mapIfStock(d.workspaceTextColor, STOCK_DARK_WORKSPACE_TEXT_COLOR, STOCK_LIGHT_WORKSPACE_TEXT_COLOR),
    workspaceAccentColor: mapIfStock(d.workspaceAccentColor, STOCK_DARK_WORKSPACE_ACCENT_COLOR, STOCK_LIGHT_WORKSPACE_ACCENT_COLOR),
  };
}

export function resolveThemeAwareWorkspaceStyle(style: WorkspaceStyle, theme: ThemeMode): WorkspaceStyle {
  if (theme !== "light") {
    return style;
  }
  const result: WorkspaceStyle = { ...style };
  if (result.background !== undefined) {
    result.background = mapIfStock(result.background, STOCK_DARK_WORKSPACE_BACKGROUND, STOCK_LIGHT_WORKSPACE_BACKGROUND);
  }
  if (result.textColor !== undefined) {
    result.textColor = mapIfStock(result.textColor, STOCK_DARK_WORKSPACE_TEXT_COLOR, STOCK_LIGHT_WORKSPACE_TEXT_COLOR);
  }
  if (result.accentStripe !== undefined) {
    const accent = result.accentStripe;
    result.accentStripe = {
      ...accent,
      color: accent.color !== undefined
        ? mapIfStock(accent.color, STOCK_DARK_WORKSPACE_ACCENT_COLOR, STOCK_LIGHT_WORKSPACE_ACCENT_COLOR)
        : undefined,
    };
  }
  return result;
}
