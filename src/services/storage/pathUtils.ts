export interface AppDataPaths {
  root: string;
  dataDir: string;
  workspacesDir: string;
  settingsFile: string;
  settingsBackupFile: string;
  settingsTempFile: string;
  workspaceIndexFile: string;
  workspaceIndexBackupFile: string;
  workspaceIndexTempFile: string;
  workspaceFile: (workspaceId: string) => string;
  workspaceBackupFile: (workspaceId: string) => string;
  workspaceTempFile: (workspaceId: string) => string;
}

export function joinStoragePath(...segments: Array<string | undefined | null>): string {
  const parts = segments
    .filter((segment): segment is string => typeof segment === "string" && segment.length > 0)
    .map((segment) => segment.replaceAll("\\", "/").replace(/^\/+|\/+$/g, ""));

  if (parts.length === 0) {
    return "";
  }

  const head = parts[0].replace(/\/+$/, "");
  const tail = parts.slice(1).join("/");
  return tail.length === 0 ? head : `${head}/${tail}`;
}

export function getParentStoragePath(path: string): string {
  const normalized = path.replaceAll("\\", "/").replace(/\/+$/, "");
  const index = normalized.lastIndexOf("/");
  if (index <= 0) {
    return "";
  }

  return normalized.slice(0, index);
}

export function resolveAppDataPaths(root: string): AppDataPaths {
  const dataDir = joinStoragePath(root, "data");
  const workspacesDir = joinStoragePath(dataDir, "workspaces");
  const settingsFile = joinStoragePath(dataDir, "settings.json");
  const workspaceIndexFile = joinStoragePath(dataDir, "workspaces.json");

  return {
    root,
    dataDir,
    workspacesDir,
    settingsFile,
    settingsBackupFile: joinStoragePath(dataDir, "settings.backup.json"),
    settingsTempFile: joinStoragePath(dataDir, "settings.json.tmp"),
    workspaceIndexFile,
    workspaceIndexBackupFile: joinStoragePath(dataDir, "workspaces.backup.json"),
    workspaceIndexTempFile: joinStoragePath(dataDir, "workspaces.json.tmp"),
    workspaceFile: (workspaceId) => joinStoragePath(workspacesDir, `${workspaceId}.json`),
    workspaceBackupFile: (workspaceId) => joinStoragePath(workspacesDir, `${workspaceId}.backup.json`),
    workspaceTempFile: (workspaceId) => joinStoragePath(workspacesDir, `${workspaceId}.json.tmp`),
  };
}
