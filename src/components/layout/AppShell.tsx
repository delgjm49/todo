import { LeftDock } from "./LeftDock.js";
import { MainPane } from "./MainPane.js";
import { TopBar } from "./TopBar.js";
import { InspectorShell } from "./InspectorShell.js";
import { useUiStore } from "../../stores/uiStore.js";
import { useHotkeys } from "../../hooks/useHotkeys.js";
import { useAlertScheduler } from "../../hooks/useAlertScheduler.js";

export function AppShell() {
  useHotkeys();
  useAlertScheduler();
  const inspectorOpen = useUiStore((state) => state.inspectorOpen);

  return (
    <main className="grid min-h-screen grid-cols-[280px_minmax(0,1fr)] bg-canvas text-text">
      <LeftDock />
      <div className="flex min-w-0 flex-col">
        <TopBar />
        <div
          className={`grid min-h-0 flex-1 min-w-0 ${
            inspectorOpen ? "grid-cols-[minmax(0,1fr)_320px]" : "grid-cols-1"
          }`}
        >
          <MainPane />
          {inspectorOpen ? <InspectorShell /> : null}
        </div>
      </div>
    </main>
  );
}
