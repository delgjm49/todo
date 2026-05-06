export interface StorageBackend {
  kind: "memory" | "browser" | "tauri";
  resolveAppDataDir(): Promise<string>;
  ensureDir(path: string): Promise<void>;
  readText(path: string): Promise<string | null>;
  writeText(path: string, contents: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  rename(fromPath: string, toPath: string): Promise<void>;
  copy(fromPath: string, toPath: string): Promise<void>;
  remove(path: string): Promise<void>;
  list(path: string): Promise<string[]>;
}

function normalizeKey(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\/+/, "");
}

function createKeyPrefix(path: string): string {
  const normalized = normalizeKey(path);
  return normalized.length === 0 ? "" : `${normalized}/`;
}

export function createMemoryStorageBackend(): StorageBackend {
  const files = new Map<string, string>();
  const directories = new Set<string>([""]);

  const ensureParentDirectories = (path: string) => {
    const normalized = normalizeKey(path);
    const parts = normalized.split("/");
    let current = "";
    for (const part of parts.slice(0, -1)) {
      current = current.length === 0 ? part : `${current}/${part}`;
      directories.add(current);
    }
  };

  return {
    kind: "memory",
    async resolveAppDataDir() {
      return "todo-app";
    },
    async ensureDir(path: string) {
      directories.add(normalizeKey(path));
    },
    async readText(path: string) {
      const key = normalizeKey(path);
      return files.has(key) ? files.get(key) ?? null : null;
    },
    async writeText(path: string, contents: string) {
      ensureParentDirectories(path);
      files.set(normalizeKey(path), contents);
    },
    async exists(path: string) {
      const key = normalizeKey(path);
      return files.has(key) || directories.has(key);
    },
    async rename(fromPath: string, toPath: string) {
      const fromKey = normalizeKey(fromPath);
      const toKey = normalizeKey(toPath);
      if (!files.has(fromKey)) {
        throw new Error(`Missing file: ${fromPath}`);
      }
      ensureParentDirectories(toPath);
      const value = files.get(fromKey);
      files.delete(fromKey);
      files.set(toKey, value ?? "");
    },
    async copy(fromPath: string, toPath: string) {
      const fromKey = normalizeKey(fromPath);
      const toKey = normalizeKey(toPath);
      if (!files.has(fromKey)) {
        throw new Error(`Missing file: ${fromPath}`);
      }
      ensureParentDirectories(toPath);
      files.set(toKey, files.get(fromKey) ?? "");
    },
    async remove(path: string) {
      const key = normalizeKey(path);
      files.delete(key);
      directories.delete(key);
    },
    async list(path: string) {
      const prefix = createKeyPrefix(path);
      const keys = new Set<string>();
      for (const key of files.keys()) {
        if (key.startsWith(prefix)) {
          const remainder = key.slice(prefix.length);
          const entry = remainder.split("/")[0];
          if (entry.length > 0) {
            keys.add(entry);
          }
        }
      }
      return Array.from(keys);
    },
  };
}

export function createBrowserStorageBackend(namespace = "todo-app"): StorageBackend {
  const prefix = `${namespace}::`;

  const readStore = (path: string): string | null => {
    const value = window.localStorage.getItem(`${prefix}${normalizeKey(path)}`);
    return value;
  };

  return {
    kind: "browser",
    async resolveAppDataDir() {
      return namespace;
    },
    async ensureDir() {},
    async readText(path: string) {
      return readStore(path);
    },
    async writeText(path: string, contents: string) {
      window.localStorage.setItem(`${prefix}${normalizeKey(path)}`, contents);
    },
    async exists(path: string) {
      const key = `${prefix}${normalizeKey(path)}`;
      return window.localStorage.getItem(key) !== null;
    },
    async rename(fromPath: string, toPath: string) {
      const source = `${prefix}${normalizeKey(fromPath)}`;
      const target = `${prefix}${normalizeKey(toPath)}`;
      const value = window.localStorage.getItem(source);
      if (value === null) {
        throw new Error(`Missing file: ${fromPath}`);
      }
      window.localStorage.setItem(target, value);
      window.localStorage.removeItem(source);
    },
    async copy(fromPath: string, toPath: string) {
      const source = `${prefix}${normalizeKey(fromPath)}`;
      const target = `${prefix}${normalizeKey(toPath)}`;
      const value = window.localStorage.getItem(source);
      if (value === null) {
        throw new Error(`Missing file: ${fromPath}`);
      }
      window.localStorage.setItem(target, value);
    },
    async remove(path: string) {
      window.localStorage.removeItem(`${prefix}${normalizeKey(path)}`);
    },
    async list(path: string) {
      const normalized = createKeyPrefix(path);
      const keys = new Set<string>();
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (!key || !key.startsWith(prefix)) {
          continue;
        }
        const relative = key.slice(prefix.length);
        if (!relative.startsWith(normalized)) {
          continue;
        }
        const remainder = relative.slice(normalized.length);
        const entry = remainder.split("/")[0];
        if (entry.length > 0) {
          keys.add(entry);
        }
      }
      return Array.from(keys);
    },
  };
}

export async function createTauriStorageBackend(): Promise<StorageBackend> {
  const { appDataDir } = await import("@tauri-apps/api/path");
  const { copyFile, exists, mkdir, readTextFile, remove, rename, writeTextFile } = await import(
    "@tauri-apps/plugin-fs"
  );

  return {
    kind: "tauri",
    async resolveAppDataDir() {
      return appDataDir();
    },
    async ensureDir(path: string) {
      await mkdir(path, { recursive: true });
    },
    async readText(path: string) {
      const fileExists = await exists(path);
      if (!fileExists) {
        return null;
      }
      return readTextFile(path);
    },
    async writeText(path: string, contents: string) {
      await writeTextFile(path, contents);
    },
    async exists(path: string) {
      return exists(path);
    },
    async rename(fromPath: string, toPath: string) {
      await rename(fromPath, toPath);
    },
    async copy(fromPath: string, toPath: string) {
      await copyFile(fromPath, toPath);
    },
    async remove(path: string) {
      const fileExists = await exists(path);
      if (fileExists) {
        await remove(path);
      }
    },
    async list(path: string) {
      void path;
      const entries = await Promise.resolve([] as string[]);
      return entries;
    },
  };
}

export async function createDefaultStorageBackend(): Promise<StorageBackend> {
  try {
    const backend = await createTauriStorageBackend();
    if ((await backend.resolveAppDataDir()).length > 0) {
      return backend;
    }
  } catch {
    // Fall back to browser or memory storage in non-Tauri contexts.
  }

  if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
    return createBrowserStorageBackend();
  }

  return createMemoryStorageBackend();
}
