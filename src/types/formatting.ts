export type ThemeMode = "light" | "dark";
export type HorizontalAlign = "left" | "center" | "right";
export type BorderEdge = "top" | "right" | "bottom" | "left";

export interface TextFormatting {
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textColor?: string;
  backgroundColor?: string;
  horizontalAlign?: HorizontalAlign;
}

export interface BorderFormatting {
  borderColor?: string;
  borderWidth?: number;
  edges?: BorderEdge[];
}

export type CellFormatting = TextFormatting & BorderFormatting;
export type RowFormatting = TextFormatting & BorderFormatting;
export type ColumnFormatting = TextFormatting & BorderFormatting;
export type BlockFormatting = TextFormatting & BorderFormatting;

export interface WorkspaceAccentStripe {
  enabled?: boolean;
  color?: string;
}

export interface WorkspaceStyle {
  background?: string;
  textColor?: string;
  accentStripe?: WorkspaceAccentStripe;
}
