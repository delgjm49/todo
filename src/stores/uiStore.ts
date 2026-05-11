import { create } from "zustand";
import type { BlockId, ColumnId, RowId, WorkspaceId } from "../domain/ids";
import type { AppScreen, BlockContextMenuState, ColumnContextMenuState, Selection, WorkspaceContextMenuState } from "../types/ui.js";

export interface UiStoreState {
  screen: AppScreen;
  inspectorOpen: boolean;
  workspaceMenu: WorkspaceContextMenuState | null;
  blockMenu: BlockContextMenuState | null;
  columnMenu: ColumnContextMenuState | null;
  draggingWorkspaceId: WorkspaceId | null;
  dropTargetWorkspaceId: WorkspaceId | null;
  draggingBlockId: BlockId | null;
  dropTargetBlockId: BlockId | null;
  draggingRowBlockId: BlockId | null;
  draggingRowId: RowId | null;
  dropTargetRowId: RowId | null;
  selection: Selection;
  showMainScreen: () => void;
  showSettingsScreen: () => void;
  toggleInspector: () => void;
  openWorkspaceMenu: (workspaceId: WorkspaceId, x: number, y: number) => void;
  closeWorkspaceMenu: () => void;
  openBlockMenu: (workspaceId: WorkspaceId, blockId: BlockId, x: number, y: number) => void;
  closeBlockMenu: () => void;
  openColumnMenu: (workspaceId: WorkspaceId, blockId: BlockId, columnId: ColumnId, x: number, y: number) => void;
  closeColumnMenu: () => void;
  setWorkspaceDragState: (draggingWorkspaceId: WorkspaceId | null, dropTargetWorkspaceId?: WorkspaceId | null) => void;
  setBlockDragState: (draggingBlockId: BlockId | null, dropTargetBlockId?: BlockId | null) => void;
  setRowDragState: (blockId: BlockId | null, rowId: RowId | null, dropTargetRowId?: RowId | null) => void;
  resetWorkspaceInteractionState: () => void;
  resetBlockInteractionState: () => void;
  resetRowInteractionState: () => void;
  selectBlock: (workspaceId: WorkspaceId, blockId: BlockId) => void;
  selectColumn: (workspaceId: WorkspaceId, blockId: BlockId, columnId: ColumnId) => void;
  selectRow: (workspaceId: WorkspaceId, blockId: BlockId, rowId: RowId) => void;
  selectCell: (workspaceId: WorkspaceId, blockId: BlockId, rowId: RowId, columnId: ColumnId) => void;
  clearSelection: () => void;
}

export const useUiStore = create<UiStoreState>()((set) => ({
  screen: "main",
  inspectorOpen: false,
  workspaceMenu: null,
  blockMenu: null,
  columnMenu: null,
  draggingWorkspaceId: null,
  dropTargetWorkspaceId: null,
  draggingBlockId: null,
  dropTargetBlockId: null,
  draggingRowBlockId: null,
  draggingRowId: null,
  dropTargetRowId: null,
  selection: { kind: "none" },
  showMainScreen: () => set({ screen: "main" }),
  showSettingsScreen: () =>
    set({
      screen: "settings",
      workspaceMenu: null,
      blockMenu: null,
      columnMenu: null,
      draggingWorkspaceId: null,
      dropTargetWorkspaceId: null,
      draggingBlockId: null,
      dropTargetBlockId: null,
      draggingRowBlockId: null,
      draggingRowId: null,
      dropTargetRowId: null,
      selection: { kind: "none" },
    }),
  toggleInspector: () => set((state) => ({ inspectorOpen: !state.inspectorOpen })),
  openWorkspaceMenu: (workspaceId, x, y) => set({ workspaceMenu: { workspaceId, x, y }, blockMenu: null, columnMenu: null }),
  closeWorkspaceMenu: () => set({ workspaceMenu: null }),
  openBlockMenu: (workspaceId, blockId, x, y) => set({ blockMenu: { workspaceId, blockId, x, y }, workspaceMenu: null, columnMenu: null }),
  closeBlockMenu: () => set({ blockMenu: null }),
  openColumnMenu: (workspaceId, blockId, columnId, x, y) => set({ columnMenu: { workspaceId, blockId, columnId, x, y }, workspaceMenu: null, blockMenu: null }),
  closeColumnMenu: () => set({ columnMenu: null }),
  setWorkspaceDragState: (draggingWorkspaceId, dropTargetWorkspaceId = null) =>
    set({ draggingWorkspaceId, dropTargetWorkspaceId }),
  setBlockDragState: (draggingBlockId, dropTargetBlockId = null) => set({ draggingBlockId, dropTargetBlockId }),
  setRowDragState: (blockId, rowId, dropTargetRowId = null) =>
    set({ draggingRowBlockId: blockId, draggingRowId: rowId, dropTargetRowId }),
  resetWorkspaceInteractionState: () =>
    set({ workspaceMenu: null, draggingWorkspaceId: null, dropTargetWorkspaceId: null }),
  resetBlockInteractionState: () => set({ blockMenu: null, draggingBlockId: null, dropTargetBlockId: null }),
  resetRowInteractionState: () =>
    set({ draggingRowBlockId: null, draggingRowId: null, dropTargetRowId: null }),
  selectBlock: (workspaceId, blockId) => set({ selection: { kind: "block", workspaceId, blockId } }),
  selectColumn: (workspaceId, blockId, columnId) => set({ selection: { kind: "column", workspaceId, blockId, columnId } }),
  selectRow: (workspaceId, blockId, rowId) => set({ selection: { kind: "row", workspaceId, blockId, rowId } }),
  selectCell: (workspaceId, blockId, rowId, columnId) => set({ selection: { kind: "cell", workspaceId, blockId, rowId, columnId } }),
  clearSelection: () => set({ selection: { kind: "none" } }),
}));
