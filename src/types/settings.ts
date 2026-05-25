import type { ThemeMode } from "./formatting";

export interface AppDefaults {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  cellBackground: string;
  blockBorderColor: string;
  blockBorderWidth: number;
  workspaceAccentEnabled: boolean;
  workspaceBackground: string;
  workspaceTextColor: string;
  workspaceAccentColor: string;
}

export interface Settings {
  theme: ThemeMode;
  defaults: AppDefaults;
}
