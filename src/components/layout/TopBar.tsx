import { useEffect, useRef, useState } from "react";
import { BlockTemplateMenu } from "../block/BlockTemplateMenu.js";
import { useDocumentStore } from "../../stores/documentStore.js";
import { useUiStore } from "../../stores/uiStore.js";
import { SaveStatusIndicator } from "./SaveStatusIndicator.js";
import { SearchPanel } from "../search/SearchPanel.js";

export function TopBar() {
  const activeWorkspaceId = useDocumentStore((state) => state.activeWorkspaceId);
  const workspaceIndex = useDocumentStore((state) => state.workspaceIndex);
  const undo = useDocumentStore((state) => state.undo);
  const redo = useDocumentStore((state) => state.redo);
  const createBlockFromTemplate = useDocumentStore((state) => state.createBlockFromTemplate);
  const canUndo = useDocumentStore((state) => state.canUndo);
  const canRedo = useDocumentStore((state) => state.canRedo);
  const showSettingsScreen = useUiStore((state) => state.showSettingsScreen);
  const inspectorOpen = useUiStore((state) => state.inspectorOpen);
  const toggleInspector = useUiStore((state) => state.toggleInspector);
  const activeWorkspace = workspaceIndex.find((entry) => entry.id === activeWorkspaceId) ?? workspaceIndex[0] ?? null;
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const blockMenuRef = useRef<HTMLDivElement | null>(null);
  const searchPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!blockMenuOpen && !searchPanelOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (blockMenuRef.current && event.target instanceof Node && blockMenuRef.current.contains(event.target)) {
        return;
      }
      if (searchPanelRef.current && event.target instanceof Node && searchPanelRef.current.contains(event.target)) {
        return;
      }

      setBlockMenuOpen(false);
      setSearchPanelOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [blockMenuOpen, searchPanelOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-[56px] items-center justify-between gap-4 border-b border-border bg-panel/92 px-5 backdrop-blur">
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.28em] text-textMuted">Current workspace</div>
        <div className="truncate text-base font-semibold">{activeWorkspace?.title ?? "None"}</div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={searchPanelRef}>
          <ToolbarButton
            label="Search"
            onClick={() => {
              setSearchPanelOpen((state) => !state);
              setBlockMenuOpen(false);
            }}
          />
          {searchPanelOpen ? (
            <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50">
              <SearchPanel onClose={() => setSearchPanelOpen(false)} />
            </div>
          ) : null}
        </div>
        <div className="relative">
          <ToolbarButton
            label="+ Block"
            onClick={() => {
              setBlockMenuOpen((state) => !state);
              setSearchPanelOpen(false);
            }}
          />
          {blockMenuOpen ? (
            <div className="absolute left-0 top-[calc(100%+0.5rem)] z-40" ref={blockMenuRef}>
              <BlockTemplateMenu
                onSelectTemplate={(template) => {
                  createBlockFromTemplate(template);
                  setBlockMenuOpen(false);
                }}
              />
            </div>
          ) : null}
        </div>
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
        <SaveStatusIndicator />
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
