import { useDocumentStore } from "../../stores/documentStore.js";
import { useUiStore } from "../../stores/uiStore.js";

export function TopBar() {
  const activeWorkspaceId = useDocumentStore((state) => state.activeWorkspaceId);
  const workspaceIndex = useDocumentStore((state) => state.workspaceIndex);
  const undo = useDocumentStore((state) => state.undo);
  const redo = useDocumentStore((state) => state.redo);
  const saveStatus = useDocumentStore((state) => state.saveStatus);
  const dirty = useDocumentStore((state) => state.dirty);
  const canUndo = useDocumentStore((state) => state.canUndo);
  const canRedo = useDocumentStore((state) => state.canRedo);
  const showSettingsScreen = useUiStore((state) => state.showSettingsScreen);
  const inspectorOpen = useUiStore((state) => state.inspectorOpen);
  const toggleInspector = useUiStore((state) => state.toggleInspector);
  const activeWorkspace = workspaceIndex.find((entry) => entry.id === activeWorkspaceId) ?? workspaceIndex[0] ?? null;

  return (
    <header className="sticky top-0 z-30 flex h-[56px] items-center justify-between gap-4 border-b border-border bg-panel/92 px-5 backdrop-blur">
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.28em] text-textMuted">Current workspace</div>
        <div className="truncate text-base font-semibold">{activeWorkspace?.title ?? "None"}</div>
      </div>

      <div className="flex items-center gap-2">
        <ToolbarButton label="+ Block" disabled />
        <ToolbarButton
          label="Undo"
          disabled={!canUndo}
          onClick={() => {
            void undo();
          }}
        />
        <ToolbarButton
          label="Redo"
          disabled={!canRedo}
          onClick={() => {
            void redo();
          }}
        />
        <ToolbarButton label={inspectorOpen ? "Inspector On" : "Inspector Off"} onClick={() => toggleInspector()} />
        <ToolbarButton label="Settings" onClick={() => showSettingsScreen()} />
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            dirty ? "border-accent/50 bg-accent/10 text-text" : "border-border bg-panelMuted text-textMuted"
          }`}
        >
          {dirty ? "Unsaved changes" : saveStatus}
        </span>
      </div>
    </header>
  );
}

function ToolbarButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="rounded-lg border border-border bg-panel px-3 py-2 text-sm font-medium text-text transition hover:border-accent/40 hover:bg-panelMuted disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
