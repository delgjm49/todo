import { useEffect } from "react";
import { useDocumentStore } from "../../stores/documentStore.js";
import { useUiStore } from "../../stores/uiStore.js";
import { WorkspaceCard } from "../workspace/WorkspaceCard.js";

export function LeftDock() {
  const workspaceIndex = useDocumentStore((state) => state.workspaceIndex);
  const activeWorkspaceId = useDocumentStore((state) => state.activeWorkspaceId);
  const createWorkspace = useDocumentStore((state) => state.createWorkspace);
  const selectWorkspace = useDocumentStore((state) => state.selectWorkspace);
  const renameWorkspace = useDocumentStore((state) => state.renameWorkspace);
  const deleteWorkspace = useDocumentStore((state) => state.deleteWorkspace);
  const updateWorkspaceStyle = useDocumentStore((state) => state.updateWorkspaceStyle);
  const reorderWorkspaces = useDocumentStore((state) => state.reorderWorkspaces);
  const workspaceMenu = useUiStore((state) => state.workspaceMenu);
  const openWorkspaceMenu = useUiStore((state) => state.openWorkspaceMenu);
  const closeWorkspaceMenu = useUiStore((state) => state.closeWorkspaceMenu);
  const draggingWorkspaceId = useUiStore((state) => state.draggingWorkspaceId);
  const dropTargetWorkspaceId = useUiStore((state) => state.dropTargetWorkspaceId);
  const setWorkspaceDragState = useUiStore((state) => state.setWorkspaceDragState);
  const showSettingsScreen = useUiStore((state) => state.showSettingsScreen);

  useEffect(() => {
    if (!workspaceMenu) {
      return undefined;
    }

    const handlePointerDown = () => closeWorkspaceMenu();
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [closeWorkspaceMenu, workspaceMenu]);

  return (
    <aside className="flex min-h-screen w-[280px] flex-col border-r border-border bg-panel/90 px-4 py-4 backdrop-blur">
      <div className="rounded-2xl border border-border bg-panelMuted/70 px-4 py-4 shadow-soft">
        <div className="text-xs uppercase tracking-[0.28em] text-textMuted">Todo</div>
        <div className="mt-1 text-lg font-semibold">Workspace Dock</div>
        <p className="mt-2 text-sm leading-6 text-textMuted">
          Switch workspaces, open the menu, and reorder the dock.
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          className="inline-flex items-center rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm font-medium text-text transition hover:bg-accent/20"
          onClick={() => void createWorkspace()}
          type="button"
        >
          + Workspace
        </button>
        <span className="text-xs uppercase tracking-[0.24em] text-textMuted">{workspaceIndex.length} total</span>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        {workspaceIndex.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-textMuted">
            No workspaces are available.
          </div>
        ) : (
          <div className="space-y-2">
            {workspaceIndex.map((entry) => (
              <WorkspaceCard
                key={entry.id}
                entry={entry}
                active={entry.id === activeWorkspaceId}
                dragging={entry.id === draggingWorkspaceId}
                dropTarget={entry.id === dropTargetWorkspaceId}
                onOpenMenu={(x, y) => openWorkspaceMenu(entry.id, x, y)}
                onSelect={() => selectWorkspace(entry.id)}
                onDragStart={() => setWorkspaceDragState(entry.id)}
                onDragEnd={() => setWorkspaceDragState(null)}
                onDrop={() => {
                  if (draggingWorkspaceId && draggingWorkspaceId !== entry.id) {
                    void reorderWorkspaces(draggingWorkspaceId, entry.id);
                  }
                  setWorkspaceDragState(null);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (draggingWorkspaceId && draggingWorkspaceId !== entry.id) {
                    setWorkspaceDragState(draggingWorkspaceId, entry.id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-panelMuted/70 px-4 py-4">
        <button
          className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-left text-sm font-medium transition hover:bg-panel"
          onClick={() => showSettingsScreen()}
          type="button"
        >
          Settings
        </button>
        <p className="mt-3 text-xs leading-5 text-textMuted">Workspace-level styling is edited in the inspector.</p>
      </div>

      {workspaceMenu ? (
        <div
          className="fixed z-50 w-56 rounded-xl border border-border bg-panel px-2 py-2 shadow-soft"
          style={{ left: `${workspaceMenu.x}px`, top: `${workspaceMenu.y}px` }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <MenuButton label="Rename workspace" onClick={() => {
            const entry = workspaceIndex.find((item) => item.id === workspaceMenu.workspaceId);
            if (!entry) {
              closeWorkspaceMenu();
              return;
            }
            const nextTitle = window.prompt("Rename workspace", entry.title);
            if (nextTitle !== null) {
              void renameWorkspace(entry.id, nextTitle);
            }
            closeWorkspaceMenu();
          }} />
          <MenuButton label="Toggle accent stripe" onClick={() => {
            const entry = workspaceIndex.find((item) => item.id === workspaceMenu.workspaceId);
            if (entry) {
              void updateWorkspaceStyle(entry.id, {
                accentStripe: { enabled: !entry.style.accentStripe?.enabled },
              });
            }
            closeWorkspaceMenu();
          }} />
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="text-sm text-text">Accent color</span>
            <input
              aria-label="Accent color"
              className="h-9 w-14 rounded-md border border-border bg-transparent p-1"
              defaultValue={
                workspaceIndex.find((item) => item.id === workspaceMenu.workspaceId)?.style.accentStripe?.color ??
                "#60A5FA"
              }
              onChange={(event) => {
                const entry = workspaceIndex.find((item) => item.id === workspaceMenu.workspaceId);
                if (entry) {
                  void updateWorkspaceStyle(entry.id, {
                    accentStripe: { color: event.target.value },
                  });
                }
              }}
              type="color"
            />
          </div>
          <hr className="my-2 border-border" />
          <MenuButton
            label="Delete workspace"
            danger
            onClick={() => {
              const entry = workspaceIndex.find((item) => item.id === workspaceMenu.workspaceId);
              if (entry && window.confirm(`Delete workspace "${entry.title}"?`)) {
                void deleteWorkspace(entry.id);
              }
              closeWorkspaceMenu();
            }}
          />
        </div>
      ) : null}
    </aside>
  );
}

function MenuButton({
  label,
  onClick,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
        danger ? "text-danger hover:bg-danger/10" : "text-text hover:bg-panelMuted"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
