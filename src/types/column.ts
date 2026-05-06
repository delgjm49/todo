import type { ColumnId } from "../domain/ids";
import type { ColumnFormatting } from "./formatting";

export type ColumnType = "text" | "checkbox" | "bullet" | "numbered" | "date" | "time" | "dropdown";

export interface CheckboxColumnSettings {
  strikeoutRowWhenChecked: boolean;
  moveCheckedRowsToBottom: boolean;
}

export interface DropdownColumnSettings {
  options: string[];
}

export interface DateColumnSettings {
  alertsEnabled: boolean;
}

export interface TimeColumnSettings {
  alertsEnabled: boolean;
}

export type EmptyColumnSettings = Record<string, never>;

export type ColumnSettings =
  | EmptyColumnSettings
  | CheckboxColumnSettings
  | DropdownColumnSettings
  | DateColumnSettings
  | TimeColumnSettings;

export interface ColumnDefinition {
  id: ColumnId;
  type: ColumnType;
  label: string;
  order: number;
  width: number;
  visible: boolean;
  settings: ColumnSettings;
  format: ColumnFormatting;
}
