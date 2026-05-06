import type { ColumnId, RowId } from "../domain/ids";
import type { CellFormatting, RowFormatting } from "./formatting";

export interface TextCellPayload {
  value: string;
  format?: CellFormatting;
}

export interface CheckboxCellPayload {
  value: boolean;
  format?: CellFormatting;
}

export interface MarkerCellPayload {
  value: null;
  format?: CellFormatting;
}

export interface NullableTextCellPayload {
  value: string | null;
  format?: CellFormatting;
}

export type PersistedCell =
  | TextCellPayload
  | CheckboxCellPayload
  | MarkerCellPayload
  | NullableTextCellPayload;

export type CellMap = Record<ColumnId, PersistedCell>;

export interface Row {
  id: RowId;
  order: number;
  format: RowFormatting;
  cells: CellMap;
}
