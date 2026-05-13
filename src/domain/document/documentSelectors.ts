import type { Block } from "../../types/block.js";
import type { ColumnDefinition } from "../../types/column.js";
import type { Row, PersistedCell } from "../../types/row.js";
import type { Selection } from "../../types/ui.js";
import type { WorkspaceIndexEntry, WorkspaceDocument } from "../../types/workspace.js";
import type { BlockId, ColumnId, RowId, WorkspaceId } from "../ids.js";
import { getVisibleColumnsInDisplayOrder } from "../columns/createColumn.js";
import { getRowsInDisplayOrder } from "../rows/reorderRows.js";

export type DocumentSelectorState = {
  workspaceIndex: WorkspaceIndexEntry[];
  workspacesById: Record<WorkspaceId, WorkspaceDocument>;
  activeWorkspaceId: WorkspaceId | null;
};

export type WorkspaceContext = {
  entry: WorkspaceIndexEntry | null;
  document: WorkspaceDocument | null;
};

export type SelectionMissingReason = "workspace" | "block" | "column" | "row" | "cell";

export type SelectionResolution =
  | { status: "none"; selection: Extract<Selection, { kind: "none" }> }
  | {
      status: "missing";
      selection: Exclude<Selection, { kind: "none" }>;
      reason: SelectionMissingReason;
      workspaceEntry: WorkspaceIndexEntry | null;
      workspace: WorkspaceDocument | null;
    }
  | {
      status: "resolved";
      kind: "block";
      selection: Extract<Selection, { kind: "block" }>;
      workspaceEntry: WorkspaceIndexEntry | null;
      workspace: WorkspaceDocument;
      block: Block;
    }
  | {
      status: "resolved";
      kind: "column";
      selection: Extract<Selection, { kind: "column" }>;
      workspaceEntry: WorkspaceIndexEntry | null;
      workspace: WorkspaceDocument;
      block: Block;
      column: ColumnDefinition;
    }
  | {
      status: "resolved";
      kind: "row";
      selection: Extract<Selection, { kind: "row" }>;
      workspaceEntry: WorkspaceIndexEntry | null;
      workspace: WorkspaceDocument;
      block: Block;
      row: Row;
    }
  | {
      status: "resolved";
      kind: "cell";
      selection: Extract<Selection, { kind: "cell" }>;
      workspaceEntry: WorkspaceIndexEntry | null;
      workspace: WorkspaceDocument;
      block: Block;
      row: Row;
      column: ColumnDefinition;
      cell: PersistedCell;
    };

export function selectActiveWorkspaceEntry(
  state: DocumentSelectorState
): WorkspaceIndexEntry | null {
  if (!state.activeWorkspaceId) {
    return null;
  }

  return state.workspaceIndex.find((entry) => entry.id === state.activeWorkspaceId) ?? null;
}

export function selectActiveWorkspaceDocument(
  state: DocumentSelectorState
): WorkspaceDocument | null {
  if (!state.activeWorkspaceId) {
    return null;
  }

  return state.workspacesById[state.activeWorkspaceId] ?? null;
}

export function selectWorkspaceContext(
  state: DocumentSelectorState,
  workspaceId: WorkspaceId
): WorkspaceContext {
  return {
    entry: state.workspaceIndex.find((entry) => entry.id === workspaceId) ?? null,
    document: state.workspacesById[workspaceId] ?? null,
  };
}

export function findBlockById(
  workspaceDocument: WorkspaceDocument | null,
  blockId: BlockId
): Block | null {
  return workspaceDocument?.blocks.find((block) => block.id === blockId) ?? null;
}

export function findColumnById(block: Block | null, columnId: ColumnId): ColumnDefinition | null {
  if (!block) {
    return null;
  }

  return getVisibleColumnsInDisplayOrder(block.columns).find((column) => column.id === columnId) ?? null;
}

export function findRowById(block: Block | null, rowId: RowId): Row | null {
  if (!block) {
    return null;
  }

  return getRowsInDisplayOrder(block.rows).find((row) => row.id === rowId) ?? null;
}

export function findCellById(
  block: Block | null,
  rowId: RowId,
  columnId: ColumnId
): PersistedCell | null {
  const row = findRowById(block, rowId);
  const column = findColumnById(block, columnId);

  if (!row || !column) {
    return null;
  }

  return row.cells[column.id] ?? null;
}

function missingSelectionTarget(
  selection: Exclude<Selection, { kind: "none" }>,
  reason: SelectionMissingReason,
  context: WorkspaceContext
): Extract<SelectionResolution, { status: "missing" }> {
  return {
    status: "missing",
    selection,
    reason,
    workspaceEntry: context.entry,
    workspace: context.document,
  };
}

export function resolveSelectionTarget(
  state: DocumentSelectorState,
  selection: Selection
): SelectionResolution {
  if (selection.kind === "none") {
    return { status: "none", selection };
  }

  const context = selectWorkspaceContext(state, selection.workspaceId);
  if (!context.document) {
    return missingSelectionTarget(selection, "workspace", context);
  }

  const block = findBlockById(context.document, selection.blockId);
  if (!block) {
    return missingSelectionTarget(selection, "block", context);
  }

  if (selection.kind === "block") {
    return {
      status: "resolved",
      kind: "block",
      selection,
      workspaceEntry: context.entry,
      workspace: context.document,
      block,
    };
  }

  if (selection.kind === "column") {
    const column = findColumnById(block, selection.columnId);
    if (!column) {
      return missingSelectionTarget(selection, "column", context);
    }

    return {
      status: "resolved",
      kind: "column",
      selection,
      workspaceEntry: context.entry,
      workspace: context.document,
      block,
      column,
    };
  }

  if (selection.kind === "row") {
    const row = findRowById(block, selection.rowId);
    if (!row) {
      return missingSelectionTarget(selection, "row", context);
    }

    return {
      status: "resolved",
      kind: "row",
      selection,
      workspaceEntry: context.entry,
      workspace: context.document,
      block,
      row,
    };
  }

  const row = findRowById(block, selection.rowId);
  if (!row) {
    return missingSelectionTarget(selection, "row", context);
  }

  const column = findColumnById(block, selection.columnId);
  if (!column) {
    return missingSelectionTarget(selection, "column", context);
  }

  const cell = row.cells[column.id] ?? null;
  if (!cell) {
    return missingSelectionTarget(selection, "cell", context);
  }

  return {
    status: "resolved",
    kind: "cell",
    selection,
    workspaceEntry: context.entry,
    workspace: context.document,
    block,
    row,
    column,
    cell,
  };
}
