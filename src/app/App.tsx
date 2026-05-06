import { useEffect } from "react";
import { useDocumentStore } from "../stores/documentStore.js";

export function App() {
  const {
    activeWorkspaceId,
    dirty,
    initializeAppData,
    isHydrating,
    isInitialized,
    lastSaveAt,
    loadError,
    retrySave,
    saveError,
    saveStatus,
    settings,
    workspaceIndex,
  } = useDocumentStore();

  useEffect(() => {
    void initializeAppData();
  }, [initializeAppData]);

  const activeWorkspace = workspaceIndex.find((entry) => entry.id === activeWorkspaceId) ?? workspaceIndex[0];

  return (
    <main className="min-h-screen bg-canvas text-text">
      <section className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-10">
        <div className="w-full rounded-xl border border-border bg-panel shadow-soft">
          <div className="border-b border-border px-6 py-4">
            <p className="text-xs uppercase tracking-[0.28em] text-textMuted">Todo App</p>
            <h1 className="mt-2 text-2xl font-semibold">
              {isHydrating ? "Loading workspace" : "Document store online"}
            </h1>
          </div>
          <div className="space-y-5 px-6 py-6">
            {loadError ? (
              <div className="rounded-lg border border-danger/60 bg-danger/10 px-4 py-3 text-sm text-danger">
                {loadError}
              </div>
            ) : null}

            {saveError ? (
              <div className="rounded-lg border border-danger/60 bg-danger/10 px-4 py-3 text-sm text-danger">
                <div>{saveError.message}</div>
                <button
                  className="mt-3 rounded-md border border-danger/40 px-3 py-1.5 text-xs font-medium"
                  onClick={() => void retrySave()}
                  type="button"
                >
                  Retry save
                </button>
              </div>
            ) : null}

            <p className="max-w-2xl text-sm leading-6 text-textMuted">
              The Tauri + React + TypeScript shell is in place. Core domain types, storage
              schemas, bootstrap logic, and the persistent document store are wired for the
              implementation checkpoint.
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-panelMuted px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-textMuted">Platform</div>
                <div className="mt-1 text-sm font-medium">Windows-first</div>
              </div>
              <div className="rounded-lg border border-border bg-panelMuted px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-textMuted">Workspace</div>
                <div className="mt-1 text-sm font-medium">{activeWorkspace?.title ?? "None"}</div>
              </div>
              <div className="rounded-lg border border-border bg-panelMuted px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-textMuted">Save</div>
                <div className="mt-1 text-sm font-medium">
                  {saveStatus}
                  {dirty ? " · dirty" : ""}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-panelMuted px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-textMuted">Theme</div>
                <div className="mt-1 text-sm font-medium">{settings?.theme ?? "unknown"}</div>
              </div>
              <div className="rounded-lg border border-border bg-panelMuted px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-textMuted">Workspaces</div>
                <div className="mt-1 text-sm font-medium">{workspaceIndex.length}</div>
              </div>
              <div className="rounded-lg border border-border bg-panelMuted px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-textMuted">Last save</div>
                <div className="mt-1 text-sm font-medium">{lastSaveAt ?? "not yet"}</div>
              </div>
            </div>

            {!isInitialized && !isHydrating ? (
              <p className="text-sm text-textMuted">Waiting for initial document load.</p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
