import type { ThemeMode } from "./formatting";

export interface AppDefaults {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  cellBackground: string;
  blockBorderColor: string;
  blockBorderWidth: number;
  workspaceAccentEnabled: boolean;
}

export interface Settings {
  theme: ThemeMode;
  defaults: AppDefaults;
}
