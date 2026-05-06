import { create } from "zustand";
import type { WorkspaceId } from "../domain/ids";
import type { AppScreen, WorkspaceContextMenuState } from "../types/ui.js";

export interface UiStoreState {
  screen: AppScreen;
  inspectorOpen: boolean;
  workspaceMenu: WorkspaceContextMenuState | null;
  draggingWorkspaceId: WorkspaceId | null;
  dropTargetWorkspaceId: WorkspaceId | null;
  showMainScreen: () => void;
  showSettingsScreen: () => void;
  toggleInspector: () => void;
  openWorkspaceMenu: (workspaceId: WorkspaceId, x: number, y: number) => void;
  closeWorkspaceMenu: () => void;
  setWorkspaceDragState: (draggingWorkspaceId: WorkspaceId | null, dropTargetWorkspaceId?: WorkspaceId | null) => void;
}

export const useUiStore = create<UiStoreState>()((set) => ({
  screen: "main",
  inspectorOpen: false,
  workspaceMenu: null,
  draggingWorkspaceId: null,
  dropTargetWorkspaceId: null,
  showMainScreen: () => set({ screen: "main" }),
  showSettingsScreen: () => set({ screen: "settings", workspaceMenu: null }),
  toggleInspector: () => set((state) => ({ inspectorOpen: !state.inspectorOpen })),
  openWorkspaceMenu: (workspaceId, x, y) => set({ workspaceMenu: { workspaceId, x, y } }),
  closeWorkspaceMenu: () => set({ workspaceMenu: null }),
  setWorkspaceDragState: (draggingWorkspaceId, dropTargetWorkspaceId = null) =>
    set({ draggingWorkspaceId, dropTargetWorkspaceId }),
}));
