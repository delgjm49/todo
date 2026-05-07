import type { BlockId, WorkspaceId } from "../domain/ids";

export type AppScreen = "main" | "settings";

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
