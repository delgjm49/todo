import { create } from "zustand";
import type { AppDocument, LoadedAppData, SaveFailure, SaveOutcome, SaveStatus } from "../types/app";
import type { WorkspaceDocument, WorkspaceIndexEntry } from "../types/workspace";
import type { WorkspaceId } from "../domain/ids";
import type { Settings } from "../types/settings";
import {
  createDefaultStorageService,
  type StorageService,
  StorageOperationError,
} from "../services/storage/index.js";

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
  dirty: boolean;
  lastSaveAt: string | null;
  initializeAppData: (service?: StorageService) => Promise<void>;
  saveAll: (service?: StorageService) => Promise<boolean>;
  retrySave: (service?: StorageService) => Promise<boolean>;
  setActiveWorkspaceId: (workspaceId: WorkspaceId | null) => void;
  markDirty: (dirty: boolean) => void;
}

let cachedDefaultService: Promise<StorageService> | null = null;

async function getDefaultService(): Promise<StorageService> {
  if (cachedDefaultService === null) {
    cachedDefaultService = createDefaultStorageService();
  }

  return cachedDefaultService;
}

function toDocumentState(payload: LoadedAppData): AppDocument {
  return {
    settings: payload.settings,
    workspaceIndex: payload.workspaceIndex,
    workspacesById: payload.workspaces.reduce<Record<WorkspaceId, WorkspaceDocument>>(
      (accumulator, workspace) => {
        accumulator[workspace.id] = workspace;
        return accumulator;
      },
      {}
    ),
    activeWorkspaceId: payload.activeWorkspaceId,
    loadedWorkspaceIds: payload.workspaces.map((workspace) => workspace.id),
    dirty: false,
    lastSaveAt: null,
  };
}

async function withStorageService(service?: StorageService): Promise<StorageService> {
  if (service) {
    return service;
  }

  return getDefaultService();
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
  dirty: false,
  lastSaveAt: null,
  initializeAppData: async (service) => {
    set({ isHydrating: true, loadError: null, saveStatus: "loading" });

    try {
      const resolvedService = await withStorageService(service);
      const payload = await resolvedService.loadAppData();
      const documentState = toDocumentState(payload);

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
        dirty: documentState.dirty,
        lastSaveAt: documentState.lastSaveAt,
      });
    } catch (error) {
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
          persisted: {
            settings: false,
            workspaceIndex: false,
            workspaceIds: [],
          },
        },
      });
      return false;
    }

    const resolvedService = await withStorageService(service);
    const document: AppDocument = {
      settings: state.settings,
      workspaceIndex: state.workspaceIndex,
      workspacesById: state.workspacesById,
      activeWorkspaceId: state.activeWorkspaceId,
      loadedWorkspaceIds: state.loadedWorkspaceIds,
      dirty: state.dirty,
      lastSaveAt: state.lastSaveAt,
    };

    set({ saveStatus: "saving", saveError: null });

    try {
      const outcome = await resolvedService.saveAppData(document);

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
      set({
        saveStatus: "error",
        saveError: toSaveFailure(error),
        lastSaveOutcome: {
          persistenceState: "none",
          persisted: {
            settings: false,
            workspaceIndex: false,
            workspaceIds: [],
          },
        },
        dirty: true,
      });
      return false;
    }
  },
  retrySave: async (service) => get().saveAll(service),
  setActiveWorkspaceId: (workspaceId) => set({ activeWorkspaceId: workspaceId }),
  markDirty: (dirty) => set({ dirty }),
}));
