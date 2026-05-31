import type { ReactNode } from "react";
import { useDocumentStore } from "../../stores/documentStore.js";
import { useUiStore } from "../../stores/uiStore.js";
import { SearchPanel } from "../search/SearchPanel.js";
import { SaveStatusIndicator } from "./SaveStatusIndicator.js";

export function TopBar() {
  const activeWorkspaceId = useDocumentStore((state) => state.activeWorkspaceId);
  const workspaceIndex = useDocumentStore((state) => state.workspaceIndex);
  const undo = useDocumentStore((state) => state.undo);
  const redo = useDocumentStore((state) => state.redo);
  const canUndo = useDocumentStore((state) => state.canUndo);
  const canRedo = useDocumentStore((state) => state.canRedo);
  const inspectorOpen = useUiStore((state) => state.inspectorOpen);
  const toggleInspector = useUiStore((state) => state.toggleInspector);
  const activeWorkspace = workspaceIndex.find((entry) => entry.id === activeWorkspaceId) ?? workspaceIndex[0] ?? null;

  return (
    <header className="sticky top-0 z-30 flex h-[56px] shrink-0 items-center justify-between gap-4 border-b border-border bg-panel/92 px-5 backdrop-blur">
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.28em] text-textMuted">Current workspace</div>
        <div className="truncate text-base font-semibold">{activeWorkspace?.title ?? "None"}</div>
      </div>

      <div className="flex items-center gap-2">
        <SearchPanel />
        <IconButton
          label="Undo"
          disabled={!canUndo}
          onClick={() => {
            void undo();
          }}
        >
          <path d="M9 7H4v5" />
          <path d="M4 12a8 8 0 1 0 2.34-5.66L4 8.68" />
        </IconButton>
        <IconButton
          label="Redo"
          disabled={!canRedo}
          onClick={() => {
            void redo();
          }}
        >
          <path d="M15 7h5v5" />
          <path d="M20 12a8 8 0 1 1-2.34-5.66L20 8.68" />
        </IconButton>
        <ToolbarButton label={inspectorOpen ? "Inspector On" : "Inspector Off"} onClick={() => toggleInspector()} />
        <SaveStatusIndicator />
      </div>
    </header>
  );
}

function IconButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-panel text-text transition hover:border-accent/40 hover:bg-panelMuted disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
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
