import { useEffect } from "react";
import { AppShell } from "../components/layout/AppShell.js";
import { SettingsPage } from "../components/settings/SettingsPage.js";
import { useDocumentStore } from "../stores/documentStore.js";
import { useUiStore } from "../stores/uiStore.js";

export function App() {
  const screen = useUiStore((state) => state.screen);
  const isHydrating = useDocumentStore((state) => state.isHydrating);
  const isInitialized = useDocumentStore((state) => state.isInitialized);
  const loadError = useDocumentStore((state) => state.loadError);
  const initializeAppData = useDocumentStore((state) => state.initializeAppData);

  useEffect(() => {
    void initializeAppData();
  }, [initializeAppData]);

  if (isHydrating || (!isInitialized && !loadError)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-10 text-text">
        <div className="max-w-md rounded-2xl border border-border bg-panel px-6 py-6 shadow-soft">
          <p className="text-xs uppercase tracking-[0.3em] text-textMuted">Todo</p>
          <h1 className="mt-3 text-2xl font-semibold">Loading workspace</h1>
          <p className="mt-3 text-sm leading-6 text-textMuted">
            Hydrating the document store and loading the starter workspace.
          </p>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-10 text-text">
        <div className="max-w-lg rounded-2xl border border-danger/40 bg-panel px-6 py-6 shadow-soft">
          <p className="text-xs uppercase tracking-[0.3em] text-textMuted">Todo</p>
          <h1 className="mt-3 text-2xl font-semibold">Failed to load app data</h1>
          <p className="mt-3 text-sm leading-6 text-danger">{loadError}</p>
        </div>
      </main>
    );
  }

  return screen === "settings" ? <SettingsPage /> : <AppShell />;
}
