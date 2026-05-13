import { createId, type ColumnId, type RowId } from "../ids.js";
import { createCellForColumn } from "../rows/createRow.js";
import type { Block } from "../../types/block.js";
import type { ColumnDefinition } from "../../types/column.js";
import type { Row } from "../../types/row.js";
import {
  getColumnsInStableOrder,
  normalizeCellForColumnType,
  normalizeRowFormatting,
  type ClipboardMappingStrategy,
  type InternalRowClipboardColumn,
  type InternalRowClipboardPayload,
  type MapClipboardRowsResult,
} from "./rowClipboardTypes.js";

export interface MapClipboardRowsOptions {
  generateRowId?: () => RowId;
  startOrder?: number;
}

interface ColumnMapping {
  strategy: ClipboardMappingStrategy;
  sourceByTargetColumnId: Map<ColumnId, InternalRowClipboardColumn>;
}

export function mapClipboardRowsToBlock(
  payload: InternalRowClipboardPayload,
  targetBlock: Block,
  options: MapClipboardRowsOptions = {}
): MapClipboardRowsResult {
  if (payload.rows.length === 0) {
    return { ok: false, reason: "empty-payload", rows: [] };
  }

  const targetColumns = getColumnsInStableOrder(targetBlock.columns);
  const sourceColumns = getColumnsInStableOrder(payload.source.columns);
  const mapping = buildColumnMapping(sourceColumns, targetColumns);

  if (!mapping) {
    return { ok: false, reason: "incompatible-target", rows: [] };
  }

  const generateRowId = options.generateRowId ?? (() => createId("row"));
  const startOrder = options.startOrder ?? 0;
  const rows = payload.rows.map<Row>((sourceRow, index) => {
    const cells: Row["cells"] = {};

    for (const targetColumn of targetColumns) {
      const sourceColumn = mapping.sourceByTargetColumnId.get(targetColumn.id);
      const sourceCell = sourceColumn ? sourceRow.cells[sourceColumn.id] : undefined;
      const normalizedSourceCell = sourceCell ? normalizeCellForColumnType(sourceCell, targetColumn.type) : null;
      cells[targetColumn.id] = normalizedSourceCell
        ? structuredClone(normalizedSourceCell)
        : createCellForColumn(targetColumn);
    }

    return {
      id: generateRowId(),
      order: startOrder + index,
      format: normalizeRowFormatting(sourceRow.format),
      cells,
    };
  });

  return {
    ok: true,
    rows,
    strategy: mapping.strategy,
  };
}

function buildColumnMapping(
  sourceColumns: InternalRowClipboardColumn[],
  targetColumns: ColumnDefinition[]
): ColumnMapping | null {
  const byColumnId = buildColumnIdMapping(sourceColumns, targetColumns);
  if (byColumnId) {
    return byColumnId;
  }

  return buildShapeMapping(sourceColumns, targetColumns);
}

function buildColumnIdMapping(
  sourceColumns: InternalRowClipboardColumn[],
  targetColumns: ColumnDefinition[]
): ColumnMapping | null {
  const targetById = new Map(targetColumns.map((column) => [column.id, column]));
  const sourceByTargetColumnId = new Map<ColumnId, InternalRowClipboardColumn>();

  for (const sourceColumn of sourceColumns) {
    const targetColumn = targetById.get(sourceColumn.id);
    if (!targetColumn || targetColumn.type !== sourceColumn.type) {
      return null;
    }
    sourceByTargetColumnId.set(targetColumn.id, sourceColumn);
  }

  return {
    strategy: "by-column-id",
    sourceByTargetColumnId,
  };
}

function buildShapeMapping(
  sourceColumns: InternalRowClipboardColumn[],
  targetColumns: ColumnDefinition[]
): ColumnMapping | null {
  if (sourceColumns.length !== targetColumns.length) {
    return null;
  }

  const sourceByTargetColumnId = new Map<ColumnId, InternalRowClipboardColumn>();
  for (let index = 0; index < sourceColumns.length; index += 1) {
    const sourceColumn = sourceColumns[index];
    const targetColumn = targetColumns[index];
    if (!sourceColumn || !targetColumn || sourceColumn.type !== targetColumn.type) {
      return null;
    }
    sourceByTargetColumnId.set(targetColumn.id, sourceColumn);
  }

  return {
    strategy: "by-shape",
    sourceByTargetColumnId,
  };
}
