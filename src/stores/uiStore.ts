import { create } from "zustand";
import type { BlockId, WorkspaceId } from "../domain/ids";
import type { AppScreen, BlockContextMenuState, WorkspaceContextMenuState } from "../types/ui.js";

export interface UiStoreState {
  screen: AppScreen;
  inspectorOpen: boolean;
  workspaceMenu: WorkspaceContextMenuState | null;
  blockMenu: BlockContextMenuState | null;
  draggingWorkspaceId: WorkspaceId | null;
  dropTargetWorkspaceId: WorkspaceId | null;
  draggingBlockId: BlockId | null;
  dropTargetBlockId: BlockId | null;
  showMainScreen: () => void;
  showSettingsScreen: () => void;
  toggleInspector: () => void;
  openWorkspaceMenu: (workspaceId: WorkspaceId, x: number, y: number) => void;
  closeWorkspaceMenu: () => void;
  openBlockMenu: (workspaceId: WorkspaceId, blockId: BlockId, x: number, y: number) => void;
  closeBlockMenu: () => void;
  setWorkspaceDragState: (draggingWorkspaceId: WorkspaceId | null, dropTargetWorkspaceId?: WorkspaceId | null) => void;
  setBlockDragState: (draggingBlockId: BlockId | null, dropTargetBlockId?: BlockId | null) => void;
  resetWorkspaceInteractionState: () => void;
  resetBlockInteractionState: () => void;
}

export const useUiStore = create<UiStoreState>()((set) => ({
  screen: "main",
  inspectorOpen: false,
  workspaceMenu: null,
  blockMenu: null,
  draggingWorkspaceId: null,
  dropTargetWorkspaceId: null,
  draggingBlockId: null,
  dropTargetBlockId: null,
  showMainScreen: () => set({ screen: "main" }),
  showSettingsScreen: () =>
    set({
      screen: "settings",
      workspaceMenu: null,
      blockMenu: null,
      draggingWorkspaceId: null,
      dropTargetWorkspaceId: null,
      draggingBlockId: null,
      dropTargetBlockId: null,
    }),
  toggleInspector: () => set((state) => ({ inspectorOpen: !state.inspectorOpen })),
  openWorkspaceMenu: (workspaceId, x, y) => set({ workspaceMenu: { workspaceId, x, y }, blockMenu: null }),
  closeWorkspaceMenu: () => set({ workspaceMenu: null }),
  openBlockMenu: (workspaceId, blockId, x, y) => set({ blockMenu: { workspaceId, blockId, x, y }, workspaceMenu: null }),
  closeBlockMenu: () => set({ blockMenu: null }),
  setWorkspaceDragState: (draggingWorkspaceId, dropTargetWorkspaceId = null) =>
    set({ draggingWorkspaceId, dropTargetWorkspaceId }),
  setBlockDragState: (draggingBlockId, dropTargetBlockId = null) => set({ draggingBlockId, dropTargetBlockId }),
  resetWorkspaceInteractionState: () =>
    set({ workspaceMenu: null, draggingWorkspaceId: null, dropTargetWorkspaceId: null }),
  resetBlockInteractionState: () => set({ blockMenu: null, draggingBlockId: null, dropTargetBlockId: null }),
}));
