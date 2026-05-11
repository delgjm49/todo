import { createId, type ColumnId } from "../ids.js";
import type {
  CheckboxColumnSettings,
  ColumnDefinition,
  ColumnType,
  DateColumnSettings,
  DropdownColumnSettings,
  TimeColumnSettings,
} from "../../types/column.js";

export interface CreateColumnOptions {
  id?: ColumnId;
  label?: string;
  order?: number;
  width?: number;
  visible?: boolean;
}

export function getDefaultColumnWidth(type: ColumnType): number {
  if (type === "checkbox" || type === "bullet" || type === "numbered") {
    return 44;
  }

  return 220;
}

export function getDefaultColumnLabel(type: ColumnType): string {
  if (type === "checkbox" || type === "bullet" || type === "numbered") {
    return "";
  }

  if (type === "date") {
    return "Date";
  }

  if (type === "time") {
    return "Time";
  }

  if (type === "dropdown") {
    return "Status";
  }

  return "Text";
}

export function getDefaultSettings(type: ColumnType):
  | CheckboxColumnSettings
  | DropdownColumnSettings
  | DateColumnSettings
  | TimeColumnSettings
  | Record<string, never> {
  if (type === "checkbox") {
    return {
      strikeoutRowWhenChecked: true,
      moveCheckedRowsToBottom: false,
    };
  }

  if (type === "dropdown") {
    return {
      options: [],
    };
  }

  if (type === "date" || type === "time") {
    return {
      alertsEnabled: false,
    };
  }

  return {};
}

export function createColumn(type: ColumnType, options: CreateColumnOptions = {}): ColumnDefinition {
  return {
    id: options.id ?? createId("column"),
    type,
    label: options.label ?? getDefaultColumnLabel(type),
    order: options.order ?? 0,
    width: options.width ?? getDefaultColumnWidth(type),
    visible: options.visible ?? true,
    settings: getDefaultSettings(type),
    format: {},
  };
}

export function getVisibleColumnsInDisplayOrder(columns: ColumnDefinition[]): ColumnDefinition[] {
  return columns
    .map((column, index) => ({ column: structuredClone(column), index }))
    .filter((entry) => entry.column.visible)
    .sort((left, right) => {
      if (left.column.order !== right.column.order) {
        return left.column.order - right.column.order;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.column);
}
