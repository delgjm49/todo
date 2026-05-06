import type { WorkspaceId } from "../domain/ids";

export type AppScreen = "main" | "settings";

export interface WorkspaceContextMenuState {
  workspaceId: WorkspaceId;
  x: number;
  y: number;
}
