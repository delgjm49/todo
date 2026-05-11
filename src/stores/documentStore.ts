import { create } from "zustand";
import type { AppDocument, AppDocumentSnapshot, LoadedAppData, SaveFailure, SaveOutcome, SaveStatus } from "../types/app";
import type { WorkspaceDocument, WorkspaceIndexEntry } from "../types/workspace";
import type { Block } from "../types/block";
import type { BlockId, ColumnId, RowId, WorkspaceId } from "../domain/ids";
import { createId } from "../domain/ids.js";
import type { Settings } from "../types/settings";
import type { WorkspaceStyle } from "../types/formatting";
import {
  createDefaultStorageService,
  createDefaultWorkspaceIndexEntry,
  type StorageService,
  StorageOperationError,
} from "../services/storage/index.js";
import { BLOCK_TEMPLATES, createBlockTemplate, getBlockTemplateLabel } from "../domain/templates/blockTemplates.js";
import { createRow } from "../domain/rows/createRow.js";
import { deleteRowById, getRowsInDisplayOrder, insertRowAtIndex, reorderRows } from "../domain/rows/reorderRows.js";
import { addColumn } from "../domain/columns/addColumn.js";
import { changeColumnType } from "../domain/columns/changeColumnType.js";
import { deleteColumn } from "../domain/columns/deleteColumn.js";
import { moveColumnLeft, moveColumnRight } from "../domain/columns/moveColumn.js";
import { renameColumn } from "../domain/columns/renameColumn.js";
import { updateColumnSettings } from "../domain/columns/updateColumnSettings.js";
import type { ColumnType } from "../types/column.js";
import type { HistoryTransactionKind } from "./historyStore.js";
import { useHistoryStore } from "./historyStore.js";

export interface DocumentMutationOptions {
  service?: StorageService;
  autosaveDelayMs?: number;
}

export interface DocumentStoreState {
  isInitialized: boolean;
  isHydrating: boolean;
  loadError: string | null;
  saveStatus: SaveStatus;
  saveError: SaveFailure | null;
  lastSaveOutcome: SaveOutcome | null;
  settings: Settings | null;
  workspaceIndex: WorkspaceIndexEntry[];
  workspacesById: Record<WorkspaceId, WorkspaceDocument>;
  loadedWorkspaceIds: WorkspaceId[];
  activeWorkspaceId: WorkspaceId | null;
  canUndo: boolean;
  canRedo: boolean;
  dirty: boolean;
  lastSaveAt: string | null;
  initializeAppData: (service?: StorageService) => Promise<void>;
  saveAll: (service?: StorageService) => Promise<boolean>;
  retrySave: (service?: StorageService) => Promise<boolean>;
  setActiveWorkspaceId: (workspaceId: WorkspaceId | null) => void;
  markDirty: (dirty: boolean) => void;
  beginDocumentTransaction: (kind: HistoryTransactionKind) => void;
  updateDocumentTransaction: (snapshot: AppDocumentSnapshot) => void;
  commitDocumentTransaction: (options?: DocumentMutationOptions) => boolean;
  commitDocumentSnapshot: (
    snapshot: AppDocumentSnapshot,
    kind: HistoryTransactionKind,
    options?: DocumentMutationOptions
  ) => boolean;
  undo: (options?: DocumentMutationOptions) => boolean;
  redo: (options?: DocumentMutationOptions) => boolean;
  createWorkspace: (title?: string, options?: DocumentMutationOptions) => boolean;
  selectWorkspace: (workspaceId: WorkspaceId) => void;
  renameWorkspace: (
    workspaceId: WorkspaceId,
    title: string,
    options?: DocumentMutationOptions
  ) => boolean;
  deleteWorkspace: (workspaceId: WorkspaceId, options?: DocumentMutationOptions) => boolean;
  updateWorkspaceStyle: (
    workspaceId: WorkspaceId,
    stylePatch: Partial<WorkspaceStyle>,
    options?: DocumentMutationOptions
  ) => boolean;
  reorderWorkspaces: (
    sourceWorkspaceId: WorkspaceId,
    targetWorkspaceId: WorkspaceId,
    options?: DocumentMutationOptions
  ) => boolean;
  createBlockFromTemplate: (
    templateType: (typeof BLOCK_TEMPLATES)[number]["type"],
    options?: DocumentMutationOptions
  ) => boolean;
  updateBlockTitle: (
    workspaceId: WorkspaceId,
    blockId: BlockId,
    title: string,
    options?: DocumentMutationOptions
  ) => boolean;
  toggleBlockCollapsed: (
    workspaceId: WorkspaceId,
    blockId: BlockId,
    options?: DocumentMutationOptions
  ) => boolean;
  reorderBlocks: (
    workspaceId: WorkspaceId,
    sourceBlockId: BlockId,
    targetBlockId: BlockId,
    options?: DocumentMutationOptions
  ) => boolean;
  moveBlockToWorkspace: (
    sourceWorkspaceId: WorkspaceId,
    blockId: BlockId,
    targetWorkspaceId: WorkspaceId,
    options?: DocumentMutationOptions
  ) => boolean;
  deleteBlock: (
    workspaceId: WorkspaceId,
    blockId: BlockId,
    options?: DocumentMutationOptions
  ) => boolean;
  updateTextCellValue: (
    workspaceId: WorkspaceId,
    blockId: BlockId,
    rowId: RowId,
    columnId: ColumnId,
    value: string,
    options?: DocumentMutationOptions
  ) => boolean;
  toggleCheckboxCellValue: (
    workspaceId: WorkspaceId,
    blockId: BlockId,
    rowId: RowId,
    columnId: ColumnId,
    options?: DocumentMutationOptions
  ) => boolean;
  updateDateCellValue: (
    workspaceId: WorkspaceId,
    blockId: BlockId,
    rowId: RowId,
    columnId: ColumnId,
    value: string | null,
    options?: DocumentMutationOptions
  ) => boolean;
  updateTimeCellValue: (
    workspaceId: WorkspaceId,
    blockId: BlockId,
    rowId: RowId,
    columnId: ColumnId,
    value: string | null,
    options?: DocumentMutationOptions
  ) => boolean;
  updateDropdownCellValue: (
    workspaceId: WorkspaceId,
    blockId: BlockId,
    rowId: RowId,
    columnId: ColumnId,
    value: string | null,
    options?: DocumentMutationOptions
  ) => boolean;
  reorderRows: (
    workspaceId: WorkspaceId,
    blockId: BlockId,
    sourceRowId: RowId,
    targetRowId: RowId,
    options?: DocumentMutationOptions
  ) => boolean;
  appendRowToBlock: (
    workspaceId: WorkspaceId,
    blockId: BlockId,
    options?: DocumentMutationOptions
  ) => boolean;
  insertRowInBlock: (
    workspaceId: WorkspaceId,
    blockId: BlockId,
    targetRowId: RowId,
    position: "above" | "below",
    options?: DocumentMutationOptions
  ) => boolean;
  deleteRowFromBlock: (
    workspaceId: WorkspaceId,
    blockId: BlockId,
    rowId: RowId,
    options?: DocumentMutationOptions
  ) => boolean;
  renameColumn: (
    workspaceId: WorkspaceId,
    blockId: BlockId,
    columnId: ColumnId,
    label: string,
    options?: DocumentMutationOptions
  ) => boolean;
  moveColumnLeft: (
    workspaceId: WorkspaceId,
    blockId: BlockId,
    columnId: ColumnId,
    options?: DocumentMutationOptions
  ) => boolean;
  moveColumnRight: (
    workspaceId: WorkspaceId,
    blockId: BlockId,
    columnId: ColumnId,
    options?: DocumentMutationOptions
  ) => boolean;
  addColumnLeft: (
    workspaceId: WorkspaceId,
    blockId: BlockId,
    columnId: ColumnId,
    type: ColumnType,
    options?: DocumentMutationOptions
  ) => boolean;
  addColumnRight: (
    workspaceId: WorkspaceId,
    blockId: BlockId,
    columnId: ColumnId,
    type: ColumnType,
    options?: DocumentMutationOptions
  ) => boolean;
  deleteColumn: (
    workspaceId: WorkspaceId,
    blockId: BlockId,
    columnId: ColumnId,
    options?: DocumentMutationOptions
  ) => boolean;
  changeColumnType: (
    workspaceId: WorkspaceId,
    blockId: BlockId,
    columnId: ColumnId,
    type: ColumnType,
    options?: DocumentMutationOptions
  ) => boolean;
  updateColumnSettings: (
    workspaceId: WorkspaceId,
    blockId: BlockId,
    columnId: ColumnId,
    settingsPatch: Partial<Record<string, unknown>>,
    options?: DocumentMutationOptions
  ) => boolean;
}

let cachedDefaultService: Promise<StorageService> | null = null;
let activeStorageService: StorageService | null = null;
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
let saveInFlight = false;
let saveQueuedAfterFlight = false;
let documentRevision = 0;

const DEFAULT_AUTOSAVE_DELAY_MS = 250;

function getEmptyPersistedManifest() {
  return {
    settings: false,
    workspaceIndex: false,
    workspaceIds: [] as WorkspaceId[],
  };
}

function cloneSnapshot(snapshot: AppDocumentSnapshot): AppDocumentSnapshot {
  return structuredClone(snapshot);
}

function cloneWorkspaceDocument(workspace: WorkspaceDocument): WorkspaceDocument {
  return structuredClone(workspace);
}

function getDefaultWorkspaceTitle(index: number): string {
  return index <= 0 ? "Workspace" : `Workspace ${index + 1}`;
}

function createWorkspaceDocument(workspaceId: WorkspaceId): WorkspaceDocument {
  return {
    id: workspaceId,
    blocks: [],
  };
}

function createWorkspaceIndexEntry(
  workspaceId: WorkspaceId,
  title: string,
  order: number
): WorkspaceIndexEntry {
  const template = createDefaultWorkspaceIndexEntry();
  return {
    ...template,
    id: workspaceId,
    title,
    order,
    style: structuredClone(template.style),
  };
}

function createSnapshotFromState(state: Pick<
  DocumentStoreState,
  "settings" | "workspaceIndex" | "workspacesById" | "activeWorkspaceId" | "loadedWorkspaceIds"
>): AppDocumentSnapshot {
  if (!state.settings) {
    throw new Error("Document store is not initialized.");
  }

  return {
    settings: structuredClone(state.settings),
    workspaceIndex: structuredClone(state.workspaceIndex),
    workspacesById: structuredClone(state.workspacesById),
    activeWorkspaceId: state.activeWorkspaceId,
    loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
  };
}

function toDocumentState(payload: LoadedAppData): {
  settings: Settings;
  workspaceIndex: WorkspaceIndexEntry[];
  workspacesById: Record<WorkspaceId, WorkspaceDocument>;
  loadedWorkspaceIds: WorkspaceId[];
  activeWorkspaceId: WorkspaceId | null;
} {
  const workspaceIndex = structuredClone(payload.workspaceIndex).sort((left, right) => left.order - right.order);
  const workspacesById = payload.workspaces.reduce<Record<WorkspaceId, WorkspaceDocument>>((accumulator, workspace) => {
    accumulator[workspace.id] = cloneWorkspaceDocument(workspace);
    return accumulator;
  }, {});
  const loadedWorkspaceIds = workspaceIndex
    .map((entry) => entry.id)
    .filter((workspaceId) => workspaceId in workspacesById);

  const activeWorkspaceId = loadedWorkspaceIds.includes(payload.activeWorkspaceId ?? "")
    ? payload.activeWorkspaceId
    : loadedWorkspaceIds[0] ?? null;

  return {
    settings: structuredClone(payload.settings),
    workspaceIndex,
    workspacesById,
    loadedWorkspaceIds,
    activeWorkspaceId,
  };
}

function withStorageService(service?: StorageService): Promise<StorageService> {
  if (service) {
    activeStorageService = service;
    return Promise.resolve(service);
  }

  if (activeStorageService) {
    return Promise.resolve(activeStorageService);
  }

  if (cachedDefaultService === null) {
    cachedDefaultService = createDefaultStorageService();
  }

  return cachedDefaultService.then((resolved) => {
    activeStorageService = resolved;
    return resolved;
  });
}

function toSaveFailure(error: unknown): SaveFailure {
  if (error instanceof StorageOperationError) {
    return {
      message: error.message,
      stage: error.stage,
      workspaceId: error.workspaceId,
      cause: error.cause,
    };
  }

  return {
    message: error instanceof Error ? error.message : "Unknown storage failure.",
    stage: "settings",
    cause: error,
  };
}

function scheduleAutosave(service: StorageService | undefined, delayMs: number | undefined, saveAll: (service?: StorageService) => Promise<boolean>): void {
  const resolvedDelay = delayMs ?? DEFAULT_AUTOSAVE_DELAY_MS;

  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
  }

  autosaveTimer = setTimeout(() => {
    autosaveTimer = null;
    void saveAll(service);
  }, resolvedDelay);
}

function clearAutosaveTimer(): void {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }
}

function setCommittedSnapshot(
  set: (partial: Partial<DocumentStoreState> | ((state: DocumentStoreState) => Partial<DocumentStoreState>)) => void,
  snapshot: AppDocumentSnapshot,
  dirty: boolean
): void {
  set({
    settings: structuredClone(snapshot.settings),
    workspaceIndex: structuredClone(snapshot.workspaceIndex),
    workspacesById: structuredClone(snapshot.workspacesById),
    activeWorkspaceId: snapshot.activeWorkspaceId,
    loadedWorkspaceIds: structuredClone(snapshot.loadedWorkspaceIds),
    canUndo: useHistoryStore.getState().canUndo,
    canRedo: useHistoryStore.getState().canRedo,
    dirty,
    saveStatus: dirty ? "idle" : "saved",
    saveError: null,
  });
}

function setDirtyState(
  set: (partial: Partial<DocumentStoreState> | ((state: DocumentStoreState) => Partial<DocumentStoreState>)) => void,
  state: Partial<Pick<DocumentStoreState, "saveStatus" | "saveError" | "lastSaveOutcome">> = {}
): void {
  set({
    dirty: true,
    saveStatus: state.saveStatus ?? "idle",
    saveError: state.saveError ?? null,
    lastSaveOutcome: state.lastSaveOutcome ?? null,
  });
}

function updateWorkspaceIndexOrder(workspaceIndex: WorkspaceIndexEntry[]): WorkspaceIndexEntry[] {
  return workspaceIndex.map((entry, index) => ({
    ...structuredClone(entry),
    order: index,
  }));
}

function reconcileActiveWorkspace(
  activeWorkspaceId: WorkspaceId | null,
  workspaceIndex: WorkspaceIndexEntry[],
  workspacesById: Record<WorkspaceId, WorkspaceDocument>
): WorkspaceId | null {
  if (activeWorkspaceId && workspaceIndex.some((entry) => entry.id === activeWorkspaceId) && activeWorkspaceId in workspacesById) {
    return activeWorkspaceId;
  }

  const firstWorkspace = workspaceIndex.find((entry) => entry.id in workspacesById);
  return firstWorkspace?.id ?? null;
}

function replaceWorkspaceDocument(
  workspacesById: Record<WorkspaceId, WorkspaceDocument>,
  workspace: WorkspaceDocument
): Record<WorkspaceId, WorkspaceDocument> {
  return {
    ...structuredClone(workspacesById),
    [workspace.id]: cloneWorkspaceDocument(workspace),
  };
}

function removeWorkspaceDocument(
  workspacesById: Record<WorkspaceId, WorkspaceDocument>,
  workspaceId: WorkspaceId
): Record<WorkspaceId, WorkspaceDocument> {
  const next = structuredClone(workspacesById);
  delete next[workspaceId];
  return next;
}

function reindexSnapshotWorkspaces(workspaceIndex: WorkspaceIndexEntry[]): WorkspaceIndexEntry[] {
  return updateWorkspaceIndexOrder(workspaceIndex);
}

function createDefaultWorkspaceState(title?: string): {
  workspace: WorkspaceDocument;
  workspaceIndexEntry: WorkspaceIndexEntry;
} {
  const workspaceId = createId("workspace");
  const workspace = createWorkspaceDocument(workspaceId);
  const workspaceIndexEntry = createWorkspaceIndexEntry(workspaceId, title?.trim() || "Workspace", 0);
  return { workspace, workspaceIndexEntry };
}

function appendBlockToWorkspace(
  workspace: WorkspaceDocument,
  templateType: (typeof BLOCK_TEMPLATES)[number]["type"]
): WorkspaceDocument {
  const nextBlock = createBlockTemplate(templateType, workspace.id, {
    title: getBlockTemplateLabel(templateType),
    order: workspace.blocks.length,
  });

  return {
    ...structuredClone(workspace),
    blocks: [...structuredClone(workspace.blocks), nextBlock],
  };
}

function sortBlocksByOrder(blocks: Block[]): Block[] {
  return structuredClone(blocks).sort((left, right) => left.order - right.order);
}

function reindexBlocks(blocks: Block[]): Block[] {
  return blocks.map((block, index) => ({
    ...structuredClone(block),
    order: index,
  }));
}

function replaceWorkspaceBlocks(workspace: WorkspaceDocument, blocks: Block[]): WorkspaceDocument {
  return {
    ...structuredClone(workspace),
    blocks: reindexBlocks(blocks),
  };
}

function replaceBlockRows(block: Block, rows: Block["rows"]): Block {
  return {
    ...structuredClone(block),
    rows: rows.map((row, index) => ({
      ...structuredClone(row),
      order: index,
    })),
  };
}

function updateBlockInWorkspace(
  workspace: WorkspaceDocument,
  blockId: BlockId,
  updater: (block: Block) => Block | null
): WorkspaceDocument | null {
  let changed = false;

  const nextBlocks = workspace.blocks.map((block) => {
    if (block.id !== blockId) {
      return structuredClone(block);
    }

    const updated = updater(structuredClone(block));
    if (!updated) {
      return structuredClone(block);
    }

    changed = true;
    return updated;
  });

  if (!changed) {
    return null;
  }

  return replaceWorkspaceBlocks(workspace, nextBlocks);
}

function commitSnapshot(
  set: (partial: Partial<DocumentStoreState> | ((state: DocumentStoreState) => Partial<DocumentStoreState>)) => void,
  get: () => DocumentStoreState,
  snapshot: AppDocumentSnapshot,
  kind: HistoryTransactionKind,
  options?: DocumentMutationOptions
): boolean {
  const committed = useHistoryStore.getState().commitSnapshot(snapshot, kind);
  if (!committed) {
    return false;
  }

  const nextSnapshot = cloneSnapshot(committed);
  documentRevision += 1;
  setCommittedSnapshot(set, nextSnapshot, true);
  set({
    activeWorkspaceId: reconcileActiveWorkspace(
      nextSnapshot.activeWorkspaceId,
      nextSnapshot.workspaceIndex,
      nextSnapshot.workspacesById
    ),
    canUndo: useHistoryStore.getState().canUndo,
    canRedo: useHistoryStore.getState().canRedo,
  });
  scheduleAutosave(options?.service, options?.autosaveDelayMs, get().saveAll);
  return true;
}

function currentSnapshotFromState(state: DocumentStoreState): AppDocumentSnapshot | null {
  if (!state.settings) {
    return null;
  }

  return createSnapshotFromState(state);
}

export const useDocumentStore = create<DocumentStoreState>()((set, get) => ({
  isInitialized: false,
  isHydrating: false,
  loadError: null,
  saveStatus: "idle",
  saveError: null,
  lastSaveOutcome: null,
  settings: null,
  workspaceIndex: [],
  workspacesById: {},
  loadedWorkspaceIds: [],
  activeWorkspaceId: null,
  canUndo: false,
  canRedo: false,
  dirty: false,
  lastSaveAt: null,
  initializeAppData: async (service) => {
    clearAutosaveTimer();
    saveInFlight = false;
    saveQueuedAfterFlight = false;
    documentRevision = 0;
    set({ isHydrating: true, loadError: null, saveStatus: "loading" });

    try {
      const resolvedService = await withStorageService(service);
      const payload = await resolvedService.loadAppData();
      const documentState = toDocumentState(payload);
      activeStorageService = resolvedService;

      set({
        isInitialized: true,
        isHydrating: false,
        loadError: null,
        saveStatus: "idle",
        saveError: null,
        lastSaveOutcome: null,
        settings: documentState.settings,
        workspaceIndex: documentState.workspaceIndex,
        workspacesById: documentState.workspacesById,
        loadedWorkspaceIds: documentState.loadedWorkspaceIds,
        activeWorkspaceId: documentState.activeWorkspaceId,
        canUndo: false,
        canRedo: false,
        dirty: false,
        lastSaveAt: null,
      });

      useHistoryStore.getState().initializeHistory({
        settings: structuredClone(documentState.settings),
        workspaceIndex: structuredClone(documentState.workspaceIndex),
        workspacesById: structuredClone(documentState.workspacesById),
        activeWorkspaceId: documentState.activeWorkspaceId,
        loadedWorkspaceIds: structuredClone(documentState.loadedWorkspaceIds),
      });
    } catch (error) {
      useHistoryStore.getState().clearHistory();
      set({
        isHydrating: false,
        isInitialized: true,
        loadError: error instanceof Error ? error.message : "Failed to initialize app data.",
        saveStatus: "error",
      });
    }
  },
  saveAll: async (service) => {
    const state = get();
    if (!state.settings) {
      set({
        saveStatus: "error",
        saveError: {
          message: "Cannot save before document state is initialized.",
          stage: "settings",
        },
        lastSaveOutcome: {
          persistenceState: "none",
          persisted: getEmptyPersistedManifest(),
        },
      });
      return false;
    }

    const resolvedService = await withStorageService(service);
    activeStorageService = resolvedService;
    const startRevision = documentRevision;
    const document: AppDocument = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: structuredClone(state.workspacesById),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
      dirty: state.dirty,
      lastSaveAt: state.lastSaveAt,
    };

    if (saveInFlight) {
      saveQueuedAfterFlight = true;
      return false;
    }

    saveInFlight = true;
    set({ saveStatus: "saving", saveError: null });

    try {
      const outcome = await resolvedService.saveAppData(document);

      if (startRevision !== documentRevision) {
        saveQueuedAfterFlight = true;
        return outcome.persistenceState === "full";
      }

      if (outcome.persistenceState === "full") {
        set({
          saveStatus: "saved",
          saveError: null,
          lastSaveOutcome: outcome,
          dirty: false,
          lastSaveAt: new Date().toISOString(),
        });
        return true;
      }

      set({
        saveStatus: outcome.persistenceState === "partial" ? "partial" : "error",
        saveError: outcome.error ?? {
          message: "Save did not complete.",
          stage: "settings",
          persistenceState: outcome.persistenceState,
          persisted: outcome.persisted,
        },
        lastSaveOutcome: outcome,
        dirty: true,
      });
      return false;
    } catch (error) {
      if (startRevision !== documentRevision) {
        saveQueuedAfterFlight = true;
        return false;
      }

      set({
        saveStatus: "error",
        saveError: toSaveFailure(error),
        lastSaveOutcome: {
          persistenceState: "none",
          persisted: getEmptyPersistedManifest(),
        },
        dirty: true,
      });
      return false;
    } finally {
      saveInFlight = false;

      if (saveQueuedAfterFlight && get().dirty) {
        saveQueuedAfterFlight = false;
        scheduleAutosave(activeStorageService ?? resolvedService, 0, get().saveAll);
      } else {
        saveQueuedAfterFlight = false;
      }
    }
  },
  retrySave: async (service) => get().saveAll(service),
  setActiveWorkspaceId: (workspaceId) => set({ activeWorkspaceId: workspaceId }),
  markDirty: (dirty) => set({ dirty }),
  beginDocumentTransaction: (kind) => {
    clearAutosaveTimer();
    const snapshot = currentSnapshotFromState(get());
    if (!snapshot) {
      return;
    }

    useHistoryStore.getState().beginTransaction(kind, snapshot);
  },
  updateDocumentTransaction: (snapshot) => {
    clearAutosaveTimer();
    documentRevision += 1;
    useHistoryStore.getState().updateTransaction(snapshot);
    setCommittedSnapshot(set, snapshot, true);
    setDirtyState(set);
  },
  commitDocumentTransaction: (options) => {
    const committed = useHistoryStore.getState().commitTransaction();
    if (!committed) {
      set({ saveStatus: get().dirty ? "idle" : "saved", saveError: null });
      return false;
    }

    documentRevision += 1;
    const nextSnapshot = cloneSnapshot(committed);
    setCommittedSnapshot(set, nextSnapshot, true);
    set({
      activeWorkspaceId: reconcileActiveWorkspace(
        nextSnapshot.activeWorkspaceId,
        nextSnapshot.workspaceIndex,
        nextSnapshot.workspacesById
      ),
      canUndo: useHistoryStore.getState().canUndo,
      canRedo: useHistoryStore.getState().canRedo,
    });
    scheduleAutosave(options?.service, options?.autosaveDelayMs, get().saveAll);
    return true;
  },
  commitDocumentSnapshot: (snapshot, kind, options) =>
    commitSnapshot(set, get, snapshot, kind, options),
  undo: (options) => {
    clearAutosaveTimer();
    const committed = useHistoryStore.getState().undo();
    if (!committed) {
      return false;
    }

    documentRevision += 1;
    const nextSnapshot = cloneSnapshot(committed);
    setCommittedSnapshot(set, nextSnapshot, true);
    set({
      activeWorkspaceId: reconcileActiveWorkspace(
        nextSnapshot.activeWorkspaceId,
        nextSnapshot.workspaceIndex,
        nextSnapshot.workspacesById
      ),
      canUndo: useHistoryStore.getState().canUndo,
      canRedo: useHistoryStore.getState().canRedo,
    });
    scheduleAutosave(options?.service, options?.autosaveDelayMs, get().saveAll);
    return true;
  },
  redo: (options) => {
    clearAutosaveTimer();
    const committed = useHistoryStore.getState().redo();
    if (!committed) {
      return false;
    }

    documentRevision += 1;
    const nextSnapshot = cloneSnapshot(committed);
    setCommittedSnapshot(set, nextSnapshot, true);
    set({
      activeWorkspaceId: reconcileActiveWorkspace(
        nextSnapshot.activeWorkspaceId,
        nextSnapshot.workspaceIndex,
        nextSnapshot.workspacesById
      ),
      canUndo: useHistoryStore.getState().canUndo,
      canRedo: useHistoryStore.getState().canRedo,
    });
    scheduleAutosave(options?.service, options?.autosaveDelayMs, get().saveAll);
    return true;
  },
  createWorkspace: (title, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    const created = createDefaultWorkspaceState(title ?? getDefaultWorkspaceTitle(state.workspaceIndex.length));
    const nextWorkspaceIndex = reindexSnapshotWorkspaces([
      ...structuredClone(state.workspaceIndex),
      created.workspaceIndexEntry,
    ]);
    const nextWorkspacesById = replaceWorkspaceDocument(structuredClone(state.workspacesById), created.workspace);
    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: nextWorkspaceIndex,
      workspacesById: nextWorkspacesById,
      activeWorkspaceId: created.workspace.id,
      loadedWorkspaceIds: [...nextWorkspaceIndex.map((entry) => entry.id)],
    };

    return commitSnapshot(set, get, nextSnapshot, "formatting", options);
  },
  selectWorkspace: (workspaceId) => {
    const state = get();
    if (workspaceId !== null && !state.workspaceIndex.some((entry) => entry.id === workspaceId)) {
      return;
    }

    set({ activeWorkspaceId: workspaceId });
  },
  renameWorkspace: (workspaceId, title, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    const trimmed = title.trim();
    if (!trimmed) {
      return false;
    }

    const nextWorkspaceIndex = state.workspaceIndex.map((entry) =>
      entry.id === workspaceId ? { ...structuredClone(entry), title: trimmed } : structuredClone(entry)
    );

    if (!nextWorkspaceIndex.some((entry) => entry.id === workspaceId)) {
      return false;
    }

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: updateWorkspaceIndexOrder(nextWorkspaceIndex),
      workspacesById: structuredClone(state.workspacesById),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "typing", options);
  },
  deleteWorkspace: (workspaceId, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    if (!state.workspaceIndex.some((entry) => entry.id === workspaceId)) {
      return false;
    }

    const remainingIndex = state.workspaceIndex.filter((entry) => entry.id !== workspaceId);
    const remainingWorkspaces = removeWorkspaceDocument(state.workspacesById, workspaceId);

    let nextWorkspaceIndex = reindexSnapshotWorkspaces(remainingIndex);
    let nextWorkspacesById = remainingWorkspaces;
    let nextActiveWorkspaceId = reconcileActiveWorkspace(state.activeWorkspaceId, nextWorkspaceIndex, nextWorkspacesById);

    if (nextWorkspaceIndex.length === 0) {
      const replacement = createDefaultWorkspaceState("Home");
      nextWorkspaceIndex = [replacement.workspaceIndexEntry];
      nextWorkspacesById = replaceWorkspaceDocument({}, replacement.workspace);
      nextActiveWorkspaceId = replacement.workspace.id;
    }

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: nextWorkspaceIndex,
      workspacesById: nextWorkspacesById,
      activeWorkspaceId: nextActiveWorkspaceId,
      loadedWorkspaceIds: nextWorkspaceIndex.map((entry) => entry.id),
    };

    return commitSnapshot(set, get, nextSnapshot, "formatting", options);
  },
  updateWorkspaceStyle: (workspaceId, stylePatch, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    const target = state.workspaceIndex.find((entry) => entry.id === workspaceId);
    if (!target) {
      return false;
    }

    const nextWorkspaceIndex = state.workspaceIndex.map((entry) => {
      if (entry.id !== workspaceId) {
        return structuredClone(entry);
      }

      const nextAccentStripe = {
        ...structuredClone(entry.style.accentStripe ?? {}),
        ...structuredClone(stylePatch.accentStripe ?? {}),
      };

      return {
        ...structuredClone(entry),
        style: {
          ...structuredClone(entry.style),
          ...structuredClone(stylePatch),
          accentStripe: nextAccentStripe,
        },
      };
    });

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: updateWorkspaceIndexOrder(nextWorkspaceIndex),
      workspacesById: structuredClone(state.workspacesById),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "formatting", options);
  },
  reorderWorkspaces: (sourceWorkspaceId, targetWorkspaceId, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    if (sourceWorkspaceId === targetWorkspaceId) {
      return false;
    }

    const sourceIndex = state.workspaceIndex.findIndex((entry) => entry.id === sourceWorkspaceId);
    const targetIndex = state.workspaceIndex.findIndex((entry) => entry.id === targetWorkspaceId);
    if (sourceIndex < 0 || targetIndex < 0) {
      return false;
    }

    const nextWorkspaceIndex = structuredClone(state.workspaceIndex);
    const [moved] = nextWorkspaceIndex.splice(sourceIndex, 1);
    if (!moved) {
      return false;
    }

    nextWorkspaceIndex.splice(targetIndex, 0, moved);

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: reindexSnapshotWorkspaces(nextWorkspaceIndex),
      workspacesById: structuredClone(state.workspacesById),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "drag", options);
  },
  createBlockFromTemplate: (templateType, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    const workspaceId = state.activeWorkspaceId ?? state.workspaceIndex[0]?.id ?? null;
    if (!workspaceId) {
      return false;
    }

    const workspace = state.workspacesById[workspaceId];
    if (!workspace) {
      return false;
    }

    const nextWorkspace = appendBlockToWorkspace(workspace, templateType);
    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: replaceWorkspaceDocument(state.workspacesById, nextWorkspace),
      activeWorkspaceId: workspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "formatting", options);
  },
  updateBlockTitle: (workspaceId, blockId, title, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return false;
    }

    const workspace = state.workspacesById[workspaceId];
    if (!workspace) {
      return false;
    }

    let found = false;
    const nextBlocks = workspace.blocks.map((block) => {
      if (block.id !== blockId) {
        return structuredClone(block);
      }

      found = true;
      return {
        ...structuredClone(block),
        title: trimmedTitle,
      };
    });

    if (!found) {
      return false;
    }

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: replaceWorkspaceDocument(state.workspacesById, replaceWorkspaceBlocks(workspace, nextBlocks)),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "typing", options);
  },
  toggleBlockCollapsed: (workspaceId, blockId, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    const workspace = state.workspacesById[workspaceId];
    if (!workspace) {
      return false;
    }

    let found = false;
    const nextBlocks = workspace.blocks.map((block) => {
      if (block.id !== blockId) {
        return structuredClone(block);
      }

      found = true;
      return {
        ...structuredClone(block),
        collapsed: !block.collapsed,
      };
    });

    if (!found) {
      return false;
    }

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: replaceWorkspaceDocument(state.workspacesById, replaceWorkspaceBlocks(workspace, nextBlocks)),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "formatting", options);
  },
  reorderBlocks: (workspaceId, sourceBlockId, targetBlockId, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    if (sourceBlockId === targetBlockId) {
      return false;
    }

    const workspace = state.workspacesById[workspaceId];
    if (!workspace) {
      return false;
    }

    const nextBlocks = sortBlocksByOrder(workspace.blocks);
    const sourceIndex = nextBlocks.findIndex((block) => block.id === sourceBlockId);
    const targetIndex = nextBlocks.findIndex((block) => block.id === targetBlockId);

    if (sourceIndex < 0 || targetIndex < 0) {
      return false;
    }

    const [movedBlock] = nextBlocks.splice(sourceIndex, 1);
    if (!movedBlock) {
      return false;
    }

    const insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    nextBlocks.splice(insertIndex, 0, movedBlock);

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: replaceWorkspaceDocument(state.workspacesById, replaceWorkspaceBlocks(workspace, nextBlocks)),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "drag", options);
  },
  moveBlockToWorkspace: (sourceWorkspaceId, blockId, targetWorkspaceId, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    if (sourceWorkspaceId === targetWorkspaceId) {
      return false;
    }

    const sourceWorkspace = state.workspacesById[sourceWorkspaceId];
    const targetWorkspace = state.workspacesById[targetWorkspaceId];
    if (!sourceWorkspace || !targetWorkspace) {
      return false;
    }

    const sourceBlocks = sortBlocksByOrder(sourceWorkspace.blocks);
    const blockIndex = sourceBlocks.findIndex((block) => block.id === blockId);
    if (blockIndex < 0) {
      return false;
    }

    const [movedBlock] = sourceBlocks.splice(blockIndex, 1);
    if (!movedBlock) {
      return false;
    }

    const targetBlocks = sortBlocksByOrder(targetWorkspace.blocks);
    targetBlocks.push({
      ...structuredClone(movedBlock),
      workspaceId: targetWorkspaceId,
    });

    const nextWorkspacesById = replaceWorkspaceDocument(
      replaceWorkspaceDocument(state.workspacesById, replaceWorkspaceBlocks(sourceWorkspace, sourceBlocks)),
      replaceWorkspaceBlocks(targetWorkspace, targetBlocks)
    );

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: nextWorkspacesById,
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "drag", options);
  },
  deleteBlock: (workspaceId, blockId, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    const workspace = state.workspacesById[workspaceId];
    if (!workspace) {
      return false;
    }

    const nextBlocks = sortBlocksByOrder(workspace.blocks).filter((block) => block.id !== blockId);
    if (nextBlocks.length === workspace.blocks.length) {
      return false;
    }

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: replaceWorkspaceDocument(state.workspacesById, replaceWorkspaceBlocks(workspace, nextBlocks)),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "formatting", options);
  },
  updateTextCellValue: (workspaceId, blockId, rowId, columnId, value, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    const workspace = state.workspacesById[workspaceId];
    if (!workspace) {
      return false;
    }

    const nextWorkspace = updateBlockInWorkspace(workspace, blockId, (block) => {
      const rows = getRowsInDisplayOrder(block.rows);
      const rowIndex = rows.findIndex((row) => row.id === rowId);
      if (rowIndex < 0) {
        return null;
      }

      const column = block.columns.find((entry) => entry.id === columnId);
      if (!column || column.type !== "text") {
        return null;
      }

      const row = rows[rowIndex];
      const cell = row?.cells[columnId];
      if (!row || !cell || typeof cell.value !== "string") {
        return null;
      }

      if (cell.value === value) {
        return null;
      }

      rows[rowIndex] = {
        ...structuredClone(row),
        cells: {
          ...structuredClone(row.cells),
          [columnId]: {
            ...structuredClone(cell),
            value,
          },
        },
      };

      return replaceBlockRows(block, rows);
    });

    if (!nextWorkspace) {
      return false;
    }

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: replaceWorkspaceDocument(state.workspacesById, nextWorkspace),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "typing", options);
  },
  toggleCheckboxCellValue: (workspaceId, blockId, rowId, columnId, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    const workspace = state.workspacesById[workspaceId];
    if (!workspace) {
      return false;
    }

    const nextWorkspace = updateBlockInWorkspace(workspace, blockId, (block) => {
      const rows = getRowsInDisplayOrder(block.rows);
      const rowIndex = rows.findIndex((row) => row.id === rowId);
      if (rowIndex < 0) {
        return null;
      }

      const column = block.columns.find((entry) => entry.id === columnId);
      if (!column || column.type !== "checkbox") {
        return null;
      }

      const row = rows[rowIndex];
      const cell = row?.cells[columnId];
      if (!row || !cell || typeof cell.value !== "boolean") {
        return null;
      }

      rows[rowIndex] = {
        ...structuredClone(row),
        cells: {
          ...structuredClone(row.cells),
          [columnId]: {
            ...structuredClone(cell),
            value: !cell.value,
          },
        },
      };

      return replaceBlockRows(block, rows);
    });

    if (!nextWorkspace) {
      return false;
    }

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: replaceWorkspaceDocument(state.workspacesById, nextWorkspace),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "formatting", options);
  },
  appendRowToBlock: (workspaceId, blockId, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    const workspace = state.workspacesById[workspaceId];
    if (!workspace) {
      return false;
    }

    const nextWorkspace = updateBlockInWorkspace(workspace, blockId, (block) => {
      const orderedRows = getRowsInDisplayOrder(block.rows);
      const row = createRow(block.columns, { order: orderedRows.length });
      return replaceBlockRows(block, [...orderedRows, row]);
    });

    if (!nextWorkspace) {
      return false;
    }

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: replaceWorkspaceDocument(state.workspacesById, nextWorkspace),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "formatting", options);
  },
  insertRowInBlock: (workspaceId, blockId, targetRowId, position, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    const workspace = state.workspacesById[workspaceId];
    if (!workspace) {
      return false;
    }

    const nextWorkspace = updateBlockInWorkspace(workspace, blockId, (block) => {
      const orderedRows = getRowsInDisplayOrder(block.rows);
      const targetIndex = orderedRows.findIndex((row) => row.id === targetRowId);
      if (targetIndex < 0) {
        return null;
      }

      const nextRow = createRow(block.columns);
      const insertAt = position === "above" ? targetIndex : targetIndex + 1;
      return replaceBlockRows(block, insertRowAtIndex(orderedRows, nextRow, insertAt));
    });

    if (!nextWorkspace) {
      return false;
    }

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: replaceWorkspaceDocument(state.workspacesById, nextWorkspace),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "formatting", options);
  },
  deleteRowFromBlock: (workspaceId, blockId, rowId, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    const workspace = state.workspacesById[workspaceId];
    if (!workspace) {
      return false;
    }

    const nextWorkspace = updateBlockInWorkspace(workspace, blockId, (block) => {
      const orderedRows = getRowsInDisplayOrder(block.rows);
      const nextRows = deleteRowById(orderedRows, rowId);
      if (nextRows.length === orderedRows.length) {
        return null;
      }

      return replaceBlockRows(block, nextRows);
    });

    if (!nextWorkspace) {
      return false;
    }

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: replaceWorkspaceDocument(state.workspacesById, nextWorkspace),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "formatting", options);
  },
  updateDateCellValue: (workspaceId, blockId, rowId, columnId, value, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    const workspace = state.workspacesById[workspaceId];
    if (!workspace) {
      return false;
    }

    const nextWorkspace = updateBlockInWorkspace(workspace, blockId, (block) => {
      const rows = getRowsInDisplayOrder(block.rows);
      const rowIndex = rows.findIndex((row) => row.id === rowId);
      if (rowIndex < 0) {
        return null;
      }

      const column = block.columns.find((entry) => entry.id === columnId);
      if (!column || column.type !== "date") {
        return null;
      }

      const row = rows[rowIndex];
      const cell = row?.cells[columnId];
      if (!row || !cell) {
        return null;
      }

      if (cell.value === value) {
        return null;
      }

      rows[rowIndex] = {
        ...structuredClone(row),
        cells: {
          ...structuredClone(row.cells),
          [columnId]: {
            ...structuredClone(cell),
            value,
          },
        },
      };

      return replaceBlockRows(block, rows);
    });

    if (!nextWorkspace) {
      return false;
    }

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: replaceWorkspaceDocument(state.workspacesById, nextWorkspace),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "typing", options);
  },
  updateTimeCellValue: (workspaceId, blockId, rowId, columnId, value, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    const workspace = state.workspacesById[workspaceId];
    if (!workspace) {
      return false;
    }

    const nextWorkspace = updateBlockInWorkspace(workspace, blockId, (block) => {
      const rows = getRowsInDisplayOrder(block.rows);
      const rowIndex = rows.findIndex((row) => row.id === rowId);
      if (rowIndex < 0) {
        return null;
      }

      const column = block.columns.find((entry) => entry.id === columnId);
      if (!column || column.type !== "time") {
        return null;
      }

      const row = rows[rowIndex];
      const cell = row?.cells[columnId];
      if (!row || !cell) {
        return null;
      }

      if (cell.value === value) {
        return null;
      }

      rows[rowIndex] = {
        ...structuredClone(row),
        cells: {
          ...structuredClone(row.cells),
          [columnId]: {
            ...structuredClone(cell),
            value,
          },
        },
      };

      return replaceBlockRows(block, rows);
    });

    if (!nextWorkspace) {
      return false;
    }

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: replaceWorkspaceDocument(state.workspacesById, nextWorkspace),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "typing", options);
  },
  updateDropdownCellValue: (workspaceId, blockId, rowId, columnId, value, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    const workspace = state.workspacesById[workspaceId];
    if (!workspace) {
      return false;
    }

    const nextWorkspace = updateBlockInWorkspace(workspace, blockId, (block) => {
      const rows = getRowsInDisplayOrder(block.rows);
      const rowIndex = rows.findIndex((row) => row.id === rowId);
      if (rowIndex < 0) {
        return null;
      }

      const column = block.columns.find((entry) => entry.id === columnId);
      if (!column || column.type !== "dropdown") {
        return null;
      }

      const row = rows[rowIndex];
      const cell = row?.cells[columnId];
      if (!row || !cell) {
        return null;
      }

      if (cell.value === value) {
        return null;
      }

      rows[rowIndex] = {
        ...structuredClone(row),
        cells: {
          ...structuredClone(row.cells),
          [columnId]: {
            ...structuredClone(cell),
            value,
          },
        },
      };

      return replaceBlockRows(block, rows);
    });

    if (!nextWorkspace) {
      return false;
    }

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: replaceWorkspaceDocument(state.workspacesById, nextWorkspace),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "typing", options);
  },
  reorderRows: (workspaceId, blockId, sourceRowId, targetRowId, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    if (sourceRowId === targetRowId) {
      return false;
    }

    const workspace = state.workspacesById[workspaceId];
    if (!workspace) {
      return false;
    }

    const nextWorkspace = updateBlockInWorkspace(workspace, blockId, (block) => {
      const nextRows = reorderRows(block.rows, sourceRowId, targetRowId);
      const orderedBefore = getRowsInDisplayOrder(block.rows);
      const orderedAfter = getRowsInDisplayOrder(nextRows);
      if (orderedAfter.every((row, index) => row.id === orderedBefore[index]?.id)) {
        return null;
      }

      return replaceBlockRows(block, nextRows);
    });

    if (!nextWorkspace) {
      return false;
    }

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: replaceWorkspaceDocument(state.workspacesById, nextWorkspace),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "drag", options);
  },
  renameColumn: (workspaceId, blockId, columnId, label, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    const trimmed = label.trim();
    if (!trimmed) {
      return false;
    }

    const workspace = state.workspacesById[workspaceId];
    if (!workspace) {
      return false;
    }

    const nextWorkspace = updateBlockInWorkspace(workspace, blockId, (block) => {
      if (!block.columns.some((column) => column.id === columnId)) {
        return null;
      }

      return {
        ...structuredClone(block),
        columns: renameColumn(block.columns, columnId, trimmed),
      };
    });

    if (!nextWorkspace) {
      return false;
    }

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: replaceWorkspaceDocument(state.workspacesById, nextWorkspace),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "typing", options);
  },
  moveColumnLeft: (workspaceId, blockId, columnId, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    const workspace = state.workspacesById[workspaceId];
    if (!workspace) {
      return false;
    }

    const nextWorkspace = updateBlockInWorkspace(workspace, blockId, (block) => {
      if (!block.columns.some((column) => column.id === columnId)) {
        return null;
      }

      const nextColumns = moveColumnLeft(block.columns, columnId);
      return {
        ...structuredClone(block),
        columns: nextColumns,
      };
    });

    if (!nextWorkspace) {
      return false;
    }

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: replaceWorkspaceDocument(state.workspacesById, nextWorkspace),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "drag", options);
  },
  moveColumnRight: (workspaceId, blockId, columnId, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    const workspace = state.workspacesById[workspaceId];
    if (!workspace) {
      return false;
    }

    const nextWorkspace = updateBlockInWorkspace(workspace, blockId, (block) => {
      if (!block.columns.some((column) => column.id === columnId)) {
        return null;
      }

      const nextColumns = moveColumnRight(block.columns, columnId);
      return {
        ...structuredClone(block),
        columns: nextColumns,
      };
    });

    if (!nextWorkspace) {
      return false;
    }

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: replaceWorkspaceDocument(state.workspacesById, nextWorkspace),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "drag", options);
  },
  addColumnLeft: (workspaceId, blockId, columnId, type, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    const workspace = state.workspacesById[workspaceId];
    if (!workspace) {
      return false;
    }

    const nextWorkspace = updateBlockInWorkspace(workspace, blockId, (block) => {
      if (!block.columns.some((column) => column.id === columnId)) {
        return null;
      }

      const result = addColumn(block.columns, block.rows, columnId, "left", type);
      return {
        ...structuredClone(block),
        columns: result.columns,
        rows: result.rows,
      };
    });

    if (!nextWorkspace) {
      return false;
    }

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: replaceWorkspaceDocument(state.workspacesById, nextWorkspace),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "formatting", options);
  },
  addColumnRight: (workspaceId, blockId, columnId, type, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    const workspace = state.workspacesById[workspaceId];
    if (!workspace) {
      return false;
    }

    const nextWorkspace = updateBlockInWorkspace(workspace, blockId, (block) => {
      if (!block.columns.some((column) => column.id === columnId)) {
        return null;
      }

      const result = addColumn(block.columns, block.rows, columnId, "right", type);
      return {
        ...structuredClone(block),
        columns: result.columns,
        rows: result.rows,
      };
    });

    if (!nextWorkspace) {
      return false;
    }

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: replaceWorkspaceDocument(state.workspacesById, nextWorkspace),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "formatting", options);
  },
  deleteColumn: (workspaceId, blockId, columnId, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    const workspace = state.workspacesById[workspaceId];
    if (!workspace) {
      return false;
    }

    const nextWorkspace = updateBlockInWorkspace(workspace, blockId, (block) => {
      if (!block.columns.some((column) => column.id === columnId)) {
        return null;
      }

      const result = deleteColumn(block.columns, block.rows, columnId);
      return {
        ...structuredClone(block),
        columns: result.columns,
        rows: result.rows,
      };
    });

    if (!nextWorkspace) {
      return false;
    }

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: replaceWorkspaceDocument(state.workspacesById, nextWorkspace),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "formatting", options);
  },
  changeColumnType: (workspaceId, blockId, columnId, type, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    const workspace = state.workspacesById[workspaceId];
    if (!workspace) {
      return false;
    }

    const nextWorkspace = updateBlockInWorkspace(workspace, blockId, (block) => {
      const column = block.columns.find((c) => c.id === columnId);
      if (!column) {
        return null;
      }

      if (column.type === type) {
        return null;
      }

      const result = changeColumnType(block.columns, block.rows, columnId, type);
      return {
        ...structuredClone(block),
        columns: result.columns,
        rows: result.rows,
      };
    });

    if (!nextWorkspace) {
      return false;
    }

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: replaceWorkspaceDocument(state.workspacesById, nextWorkspace),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "formatting", options);
  },
  updateColumnSettings: (workspaceId, blockId, columnId, settingsPatch, options) => {
    const state = get();
    if (!state.settings) {
      return false;
    }

    const workspace = state.workspacesById[workspaceId];
    if (!workspace) {
      return false;
    }

    const nextWorkspace = updateBlockInWorkspace(workspace, blockId, (block) => {
      if (!block.columns.some((column) => column.id === columnId)) {
        return null;
      }

      return {
        ...structuredClone(block),
        columns: updateColumnSettings(block.columns, columnId, settingsPatch),
      };
    });

    if (!nextWorkspace) {
      return false;
    }

    const nextSnapshot: AppDocumentSnapshot = {
      settings: structuredClone(state.settings),
      workspaceIndex: structuredClone(state.workspaceIndex),
      workspacesById: replaceWorkspaceDocument(state.workspacesById, nextWorkspace),
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
    };

    return commitSnapshot(set, get, nextSnapshot, "formatting", options);
  },
}));

export { DEFAULT_AUTOSAVE_DELAY_MS };
