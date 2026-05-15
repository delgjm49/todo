import type { BlockId, ColumnId, RowId, WorkspaceId } from "../domain/ids";

export type AppScreen = "main" | "settings";

export type Selection =
  | { kind: "none" }
  | { kind: "block"; workspaceId: WorkspaceId; blockId: BlockId }
  | { kind: "column"; workspaceId: WorkspaceId; blockId: BlockId; columnId: ColumnId }
  | { kind: "row"; workspaceId: WorkspaceId; blockId: BlockId; rowId: RowId }
  | { kind: "cell"; workspaceId: WorkspaceId; blockId: BlockId; rowId: RowId; columnId: ColumnId };

export interface WorkspaceContextMenuState {
  workspaceId: WorkspaceId;
  x: number;
  y: number;
}

export interface BlockContextMenuState {
  workspaceId: WorkspaceId;
  blockId: BlockId;
  x: number;
  y: number;
}

export interface ColumnContextMenuState {
  workspaceId: WorkspaceId;
  blockId: BlockId;
  columnId: ColumnId;
  x: number;
  y: number;
}

export interface RowContextMenuState {
  workspaceId: WorkspaceId;
  blockId: BlockId;
  targetRowId: RowId | null;
  x: number;
  y: number;
}

export type RowClipboardOperation = "cut" | "copy";

export interface RowDragState {
  blockId: BlockId;
  rowId: RowId;
  dropTargetRowId: RowId | null;
}
