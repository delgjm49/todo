import { createId, type RowId } from "../ids.js";
import type { ColumnDefinition } from "../../types/column.js";
import type { PersistedCell, Row } from "../../types/row.js";

export interface CreateRowOptions {
  id?: RowId;
  order?: number;
}

export function createCellForColumn(column: ColumnDefinition): PersistedCell {
  if (column.type === "checkbox") {
    return { value: false, format: {} };
  }

  if (column.type === "bullet" || column.type === "numbered") {
    return { value: null, format: {} };
  }

  if (column.type === "date" || column.type === "time" || column.type === "dropdown") {
    return { value: null, format: {} };
  }

  return { value: "", format: {} };
}

export function createRow(columns: ColumnDefinition[], options: CreateRowOptions = {}): Row {
  const cells = columns.reduce<Row["cells"]>((accumulator, column) => {
    accumulator[column.id] = createCellForColumn(column);
    return accumulator;
  }, {});

  return {
    id: options.id ?? createId("row"),
    order: options.order ?? 0,
    format: {},
    cells,
  };
}
