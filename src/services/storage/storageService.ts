import type { AppDocument, LoadedAppData, SaveFailure, SaveOutcome } from "../../types/app";
import type { Settings } from "../../types/settings";
import type { WorkspaceDocument, WorkspaceIndexEntry } from "../../types/workspace";
import {
  createDefaultWorkspaceDocuments,
  createDefaultWorkspaceIndex,
  DEFAULT_SETTINGS,
} from "./bootstrapData.js";
import {
  createDefaultStorageBackend,
  createMemoryStorageBackend,
  type StorageBackend,
} from "./backends.js";
import {
  resolveAppDataPaths,
  type AppDataPaths,
  getParentStoragePath,
} from "./pathUtils.js";
import {
  coerceSettingsForSave,
  coerceWorkspaceForSave,
  coerceWorkspaceIndexForSave,
  validateSettingsFile,
  validateWorkspaceFile,
  validateWorkspaceIndexFile,
  type PersistedWorkspaceFile,
  type PersistedWorkspaceIndexFile,
  type PersistedSettingsFile,
  type ValidationIssue,
} from "./storageSchemas.js";

export class StorageOperationError extends Error {
  public readonly stage: SaveFailure["stage"];
  public readonly workspaceId?: string;
  public readonly path: string;

  constructor(message: string, options: { stage: SaveFailure["stage"]; path: string; workspaceId?: string; cause?: unknown }) {
    super(message);
    this.name = "StorageOperationError";
    this.stage = options.stage;
    this.path = options.path;
    this.workspaceId = options.workspaceId;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export interface StorageService {
  backend: StorageBackend;
  paths: AppDataPaths | null;
  ensureBootstrapFiles(): Promise<void>;
  loadAppData(): Promise<LoadedAppData>;
  saveSettings(settings: Settings): Promise<void>;
  saveWorkspaceIndex(workspaceIndex: WorkspaceIndexEntry[]): Promise<void>;
  saveWorkspace(workspace: WorkspaceDocument): Promise<void>;
  saveAppData(document: AppDocument): Promise<SaveOutcome>;
}

interface LoadedDocument<T> {
  value: T;
  issues: ValidationIssue[];
  recovered: boolean;
}

function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

async function parseDocument<T>(backend: StorageBackend, path: string): Promise<unknown | null> {
  const rawText = await backend.readText(path);
  if (rawText === null) {
    return null;
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    return null;
  }
}

async function writeDocumentWithBackup(
  backend: StorageBackend,
  primaryPath: string,
  backupPath: string,
  tempPath: string,
  payload: unknown,
  stage: SaveFailure["stage"],
  workspaceId?: string
): Promise<void> {
  try {
    await backend.ensureDir(getParentStoragePath(primaryPath));
    await backend.writeText(tempPath, toJson(payload));

    const primaryExists = await backend.exists(primaryPath);
    if (await backend.exists(backupPath)) {
      await backend.remove(backupPath);
    }

    if (primaryExists) {
      await backend.rename(primaryPath, backupPath);
    }

    await backend.rename(tempPath, primaryPath);
  } catch (cause) {
    const restoreBackup = (async () => {
      const primaryStillMissing = !(await backend.exists(primaryPath));
      const backupStillExists = await backend.exists(backupPath);
      if (primaryStillMissing && backupStillExists) {
        await backend.rename(backupPath, primaryPath);
      }
    })();

    await restoreBackup.catch(() => undefined);
    throw new StorageOperationError(`Failed to save ${stage}.`, {
      stage,
      path: primaryPath,
      workspaceId,
      cause,
    });
  } finally {
    if (await backend.exists(tempPath)) {
      await backend.remove(tempPath);
    }
  }
}

async function readJsonWithRecovery<T>(
  backend: StorageBackend,
  primaryPath: string,
  backupPath: string,
  tempPath: string,
  validator: (value: unknown) => { value: T; issues: ValidationIssue[] },
  fallbackFactory: () => T,
  required: boolean,
  stage: SaveFailure["stage"],
  workspaceId?: string
): Promise<LoadedDocument<T> | null> {
  const candidates: Array<{ path: string; source: "primary" | "backup" }> = [
    { path: primaryPath, source: "primary" },
    { path: backupPath, source: "backup" },
  ];

  for (const candidate of candidates) {
    const parsed = await parseDocument<T>(backend, candidate.path);
    if (parsed === null) {
      continue;
    }

    const validated = validator(parsed);
    const hasSchemaVersionIssue = validated.issues.some((issue) => issue.path === "schemaVersion");
    const acceptableIssues = validated.issues.length === 0 || !hasSchemaVersionIssue;

    if (acceptableIssues) {
      if (candidate.source === "backup" || validated.issues.length > 0) {
        await writeDocumentWithBackup(backend, primaryPath, backupPath, tempPath, validated.value, stage, workspaceId);
      }
      return {
        value: validated.value,
        issues: validated.issues,
        recovered: candidate.source === "backup" || validated.issues.length > 0,
      };
    }
  }

  if (!required) {
    return null;
  }

  const fallback = fallbackFactory();
  await writeDocumentWithBackup(backend, primaryPath, backupPath, tempPath, fallback, stage, workspaceId);
  return {
    value: fallback,
    issues: [],
    recovered: true,
  };
}

async function ensureStarterState(service: StorageService): Promise<void> {
  const paths = service.paths;
  if (!paths) {
    return;
  }

  const settingsExists = await service.backend.exists(paths.settingsFile);
  const indexExists = await service.backend.exists(paths.workspaceIndexFile);
  const workspaceExists = await service.backend.exists(paths.workspaceFile("ws_home"));

  if (settingsExists || indexExists || workspaceExists) {
    return;
  }

  await service.saveAppData({
    settings: DEFAULT_SETTINGS,
    workspaceIndex: createDefaultWorkspaceIndex(),
    workspacesById: createDefaultWorkspaceDocuments().reduce<Record<string, WorkspaceDocument>>(
      (accumulator, workspace) => {
        accumulator[workspace.id] = workspace;
        return accumulator;
      },
      {}
    ),
    activeWorkspaceId: "ws_home",
    loadedWorkspaceIds: ["ws_home"],
    dirty: false,
    lastSaveAt: null,
  });
}

function createServiceState(backend: StorageBackend, paths: AppDataPaths): StorageService {
  return {
    backend,
    paths,
    async ensureBootstrapFiles() {
      await backend.ensureDir(paths.dataDir);
      await backend.ensureDir(paths.workspacesDir);

      const settingsExists = await backend.exists(paths.settingsFile);
      const indexExists = await backend.exists(paths.workspaceIndexFile);
      const starterWorkspaceExists = await backend.exists(paths.workspaceFile("ws_home"));

      if (!settingsExists) {
        await writeDocumentWithBackup(
          backend,
          paths.settingsFile,
          paths.settingsBackupFile,
          paths.settingsTempFile,
          coerceSettingsForSave(DEFAULT_SETTINGS),
          "settings"
        );
      }

      if (!indexExists) {
        await writeDocumentWithBackup(
          backend,
          paths.workspaceIndexFile,
          paths.workspaceIndexBackupFile,
          paths.workspaceIndexTempFile,
          coerceWorkspaceIndexForSave(createDefaultWorkspaceIndex()),
          "workspace-index"
        );
      }

      if (!starterWorkspaceExists) {
        const starterWorkspace = createDefaultWorkspaceDocuments()[0];
        await writeDocumentWithBackup(
          backend,
          paths.workspaceFile(starterWorkspace.id),
          paths.workspaceBackupFile(starterWorkspace.id),
          paths.workspaceTempFile(starterWorkspace.id),
          coerceWorkspaceForSave(starterWorkspace),
          "workspace",
          starterWorkspace.id
        );
      }
    },
    async loadAppData() {
      await this.ensureBootstrapFiles();

      const settingsResult = await readJsonWithRecovery<PersistedSettingsFile>(
        backend,
        paths.settingsFile,
        paths.settingsBackupFile,
        paths.settingsTempFile,
        validateSettingsFile,
        () => coerceSettingsForSave(DEFAULT_SETTINGS),
        true,
        "settings"
      );

      const indexResult = await readJsonWithRecovery<PersistedWorkspaceIndexFile>(
        backend,
        paths.workspaceIndexFile,
        paths.workspaceIndexBackupFile,
        paths.workspaceIndexTempFile,
        validateWorkspaceIndexFile,
        () => coerceWorkspaceIndexForSave(createDefaultWorkspaceIndex()),
        true,
        "workspace-index"
      );

      const workspaceDocuments: WorkspaceDocument[] = [];
      const liveIndexEntries: WorkspaceIndexEntry[] = [];

      for (const entry of indexResult?.value.workspaces ?? []) {
        const workspaceResult = await readJsonWithRecovery<PersistedWorkspaceFile>(
          backend,
          paths.workspaceFile(entry.id),
          paths.workspaceBackupFile(entry.id),
          paths.workspaceTempFile(entry.id),
          validateWorkspaceFile,
          () => coerceWorkspaceForSave(createDefaultWorkspaceDocuments()[0]),
          false,
          "workspace",
          entry.id
        );

        if (!workspaceResult) {
          continue;
        }

        const workspaceDocument: WorkspaceDocument = {
          id: entry.id,
          blocks: workspaceResult.value.blocks,
        };

        workspaceDocuments.push(workspaceDocument);
        liveIndexEntries.push(entry);

        if (workspaceResult.value.id !== entry.id) {
          await this.saveWorkspace(workspaceDocument);
        }
      }

      if (indexResult && liveIndexEntries.length !== indexResult.value.workspaces.length) {
        await this.saveWorkspaceIndex(liveIndexEntries);
      }

      const activeWorkspaceId = liveIndexEntries[0]?.id ?? null;

      return {
        settings: settingsResult?.value.settings ?? DEFAULT_SETTINGS,
        workspaceIndex: liveIndexEntries,
        workspaces: workspaceDocuments,
        activeWorkspaceId,
      };
    },
    async saveSettings(settings: Settings) {
      await writeDocumentWithBackup(
        backend,
        paths.settingsFile,
        paths.settingsBackupFile,
        paths.settingsTempFile,
        coerceSettingsForSave(settings),
        "settings"
      );
    },
    async saveWorkspaceIndex(workspaceIndex: WorkspaceIndexEntry[]) {
      await writeDocumentWithBackup(
        backend,
        paths.workspaceIndexFile,
        paths.workspaceIndexBackupFile,
        paths.workspaceIndexTempFile,
        coerceWorkspaceIndexForSave(workspaceIndex),
        "workspace-index"
      );
    },
    async saveWorkspace(workspace: WorkspaceDocument) {
      await writeDocumentWithBackup(
        backend,
        paths.workspaceFile(workspace.id),
        paths.workspaceBackupFile(workspace.id),
        paths.workspaceTempFile(workspace.id),
        coerceWorkspaceForSave(workspace),
        "workspace",
        workspace.id
      );
    },
    async saveAppData(document: AppDocument) {
      const persisted = {
        settings: false,
        workspaceIndex: false,
        workspaceIds: [] as string[],
      };

      try {
        for (const workspaceId of document.loadedWorkspaceIds) {
          const workspace = document.workspacesById[workspaceId];
          if (workspace) {
            await this.saveWorkspace(workspace);
            persisted.workspaceIds.push(workspace.id);
          }
        }

        await this.saveWorkspaceIndex(document.workspaceIndex);
        persisted.workspaceIndex = true;
        await this.saveSettings(document.settings);
        persisted.settings = true;

        return {
          persistenceState: "full" as const,
          persisted,
        };
      } catch (cause) {
        const persistenceState = persisted.settings || persisted.workspaceIndex || persisted.workspaceIds.length > 0 ? "partial" : "none";
        const error: SaveFailure = {
          message: cause instanceof Error ? cause.message : "Failed to save app data.",
          stage: cause instanceof StorageOperationError ? cause.stage : "settings",
          workspaceId: cause instanceof StorageOperationError ? cause.workspaceId : undefined,
          cause,
          persistenceState,
          persisted,
        };

        return {
          persistenceState,
          persisted,
          error,
        };
      }
    },
  };
}

export async function createStorageService(backend?: StorageBackend): Promise<StorageService> {
  const resolvedBackend = backend ?? (await createDefaultStorageBackend());
  const root = await resolvedBackend.resolveAppDataDir();
  const paths = resolveAppDataPaths(root);
  const service = createServiceState(resolvedBackend, paths);
  await ensureStarterState(service);
  return service;
}

export async function createMemoryStorageService(): Promise<StorageService> {
  return createStorageService(createMemoryStorageBackend());
}

export async function createDefaultStorageService(): Promise<StorageService> {
  return createStorageService();
}
