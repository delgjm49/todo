import type { Settings } from "./settings";
import type { WorkspaceDocument, WorkspaceIndexEntry } from "./workspace";
import type { WorkspaceId } from "../domain/ids";

export interface LoadedAppData {
  settings: Settings;
  workspaces: WorkspaceDocument[];
  workspaceIndex: WorkspaceIndexEntry[];
  activeWorkspaceId: WorkspaceId | null;
}

export type SaveStatus = "idle" | "loading" | "saving" | "saved" | "partial" | "error";
export type PersistenceState = "none" | "partial" | "full";

export interface PersistedFileManifest {
  settings: boolean;
  workspaceIndex: boolean;
  workspaceIds: WorkspaceId[];
}

export interface SaveFailure {
  message: string;
  stage: "settings" | "workspace-index" | "workspace";
  workspaceId?: WorkspaceId;
  cause?: unknown;
  persistenceState?: Exclude<PersistenceState, "full">;
  persisted?: PersistedFileManifest;
}

export interface SaveOutcome {
  persistenceState: PersistenceState;
  persisted: PersistedFileManifest;
  error?: SaveFailure;
}

export interface AppDocument {
  settings: Settings;
  workspaceIndex: WorkspaceIndexEntry[];
  workspacesById: Record<WorkspaceId, WorkspaceDocument>;
  activeWorkspaceId: WorkspaceId | null;
  loadedWorkspaceIds: WorkspaceId[];
  dirty: boolean;
  lastSaveAt: string | null;
}

export type AppDocumentSnapshot = Pick<
  AppDocument,
  "settings" | "workspaceIndex" | "workspacesById" | "activeWorkspaceId" | "loadedWorkspaceIds"
>;
