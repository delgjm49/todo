import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDocumentStore } from "../../stores/documentStore.js";
import { useUiStore } from "../../stores/uiStore.js";
import { WorkspaceCard } from "../workspace/WorkspaceCard.js";
import { MenuPopover } from "../shared/MenuPopover.js";

export function LeftDock() {
  const workspaceIndex = useDocumentStore((state) => state.workspaceIndex);
  const activeWorkspaceId = useDocumentStore((state) => state.activeWorkspaceId);
  const theme = useDocumentStore((state) => state.settings?.theme ?? "dark");
  const createWorkspace = useDocumentStore((state) => state.createWorkspace);
  const selectWorkspace = useDocumentStore((state) => state.selectWorkspace);
  const renameWorkspace = useDocumentStore((state) => state.renameWorkspace);
  const deleteWorkspace = useDocumentStore((state) => state.deleteWorkspace);
  const updateWorkspaceStyle = useDocumentStore((state) => state.updateWorkspaceStyle);
  const reorderWorkspaces = useDocumentStore((state) => state.reorderWorkspaces);
  const workspaceMenu = useUiStore((state) => state.workspaceMenu);
  const openWorkspaceMenu = useUiStore((state) => state.openWorkspaceMenu);
  const closeWorkspaceMenu = useUiStore((state) => state.closeWorkspaceMenu);
  const resetWorkspaceInteractionState = useUiStore((state) => state.resetWorkspaceInteractionState);
  const showSettingsScreen = useUiStore((state) => state.showSettingsScreen);

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Reset inline states whenever the menu opens or closes
  useEffect(() => {
    if (!workspaceMenu) {
      setRenaming(false);
      setConfirmingDelete(false);
    }
  }, [workspaceMenu]);

  useEffect(() => () => resetWorkspaceInteractionState(), [resetWorkspaceInteractionState]);

  const currentEntry = workspaceMenu
    ? workspaceIndex.find((item) => item.id === workspaceMenu.workspaceId) ?? null
    : null;
  const currentIndex = currentEntry
    ? workspaceIndex.findIndex((item) => item.id === currentEntry.id)
    : -1;

  function handleStartRename() {
    if (!currentEntry) {
      closeWorkspaceMenu();
      return;
    }
    setRenameValue(currentEntry.title);
    setRenaming(true);
    setConfirmingDelete(false);
  }

  function handleCommitRename() {
    if (!currentEntry) {
      closeWorkspaceMenu();
      return;
    }
    const inputValue = renameInputRef.current?.value ?? "";
    const trimmed = inputValue.trim();
    if (trimmed) {
      void renameWorkspace(currentEntry.id, trimmed);
    }
    closeWorkspaceMenu();
  }

  function handleCancelRename() {
    setRenaming(false);
  }

  function handleStartDelete() {
    setConfirmingDelete(true);
    setRenaming(false);
  }

  function handleConfirmDelete() {
    if (!currentEntry) {
      closeWorkspaceMenu();
      return;
    }
    void deleteWorkspace(currentEntry.id);
    closeWorkspaceMenu();
  }

  function handleCancelDelete() {
    closeWorkspaceMenu();
  }

  return (
    <aside className="flex h-full w-[280px] min-h-0 max-h-screen overflow-hidden flex-col border-r border-border bg-panel/90 px-4 py-4 backdrop-blur">
      <div className="shrink-0 rounded-2xl border border-border bg-panelMuted/70 px-4 py-4 shadow-soft">
        <div className="text-xs uppercase tracking-[0.28em] text-textMuted">Todo</div>
        <div className="mt-1 text-lg font-semibold">Workspace Dock</div>
        <p className="mt-2 text-sm leading-6 text-textMuted">
          Switch workspaces, open the context menu to rename, reorder, or delete.
        </p>
      </div>

      <div className="mt-4 flex shrink-0 items-center justify-between gap-3">
        <button
          className="inline-flex items-center rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm font-medium text-text transition hover:bg-accent/20"
          onClick={() => void createWorkspace()}
          type="button"
        >
          + Workspace
        </button>
        <span className="text-xs uppercase tracking-[0.24em] text-textMuted">{workspaceIndex.length} total</span>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1" data-testid="workspace-list-scroll">
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
                theme={theme}
                active={entry.id === activeWorkspaceId}
                onOpenMenu={(x, y) => openWorkspaceMenu(entry.id, x, y)}
                onSelect={() => selectWorkspace(entry.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 shrink-0 rounded-2xl border border-border bg-panelMuted/70 px-4 py-4">
        <button
          aria-label="Settings"
          className="inline-flex w-full items-center gap-2 rounded-lg border border-border bg-transparent px-3 py-2 text-left text-sm font-medium transition hover:bg-panel"
          onClick={() => showSettingsScreen()}
          title="Settings"
          type="button"
        >
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
            <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2.1 2.1 0 0 1-2.97 2.97l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.09 1.65V21.3a2.1 2.1 0 0 1-4.2 0v-.06a1.8 1.8 0 0 0-1.09-1.65 1.8 1.8 0 0 0-1.98.36l-.04.04a2.1 2.1 0 1 1-2.97-2.97l.04-.04A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.65-1.09H2.9a2.1 2.1 0 1 1 0-4.2h.06A1.8 1.8 0 0 0 4.6 8.62a1.8 1.8 0 0 0-.36-1.98l-.04-.04a2.1 2.1 0 1 1 2.97-2.97l.04.04a1.8 1.8 0 0 0 1.98.36A1.8 1.8 0 0 0 10.28 2.4V2.1a2.1 2.1 0 0 1 4.2 0v.3a1.8 1.8 0 0 0 1.09 1.65 1.8 1.8 0 0 0 1.98-.36l.04-.04a2.1 2.1 0 1 1 2.97 2.97l-.04.04a1.8 1.8 0 0 0-.36 1.98 1.8 1.8 0 0 0 1.65 1.09h.3a2.1 2.1 0 0 1 0 4.2h-.3A1.8 1.8 0 0 0 19.4 15Z" />
          </svg>
          Settings
        </button>
        <p className="mt-3 text-xs leading-5 text-textMuted">Workspace-level styling is edited in the inspector.</p>
      </div>

      {/* Portal workspace menu to body so it escapes the aside's backdrop-blur stacking context */}
      {workspaceMenu ? createPortal(
        <MenuPopover backdropTestId="workspace-menu-backdrop" onDismiss={() => closeWorkspaceMenu()} x={workspaceMenu.x} y={workspaceMenu.y}>
          {renaming ? (
            <div className="w-56 rounded-xl border border-border bg-panel px-3 py-3 shadow-soft">
              <label className="block text-xs font-medium text-textMuted mb-1.5">Rename workspace</label>
              <input
                ref={renameInputRef}
                aria-label="Workspace name"
                className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm text-text placeholder-textMuted outline-none transition focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
                defaultValue={renameValue}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCommitRename();
                  } else if (e.key === "Escape") {
                    handleCancelRename();
                  }
                }}
                placeholder="Workspace name"
              />
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  className="rounded-lg px-3 py-1.5 text-sm text-textMuted transition hover:text-text"
                  onClick={handleCancelRename}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:bg-accent/90"
                  onClick={handleCommitRename}
                  type="button"
                >
                  Save
                </button>
              </div>
            </div>
          ) : confirmingDelete ? (
            <div className="w-56 rounded-xl border border-border bg-panel px-3 py-3 shadow-soft">
              <p className="text-sm font-medium text-text">
                Delete "{currentEntry?.title ?? "workspace"}"?
              </p>
              <p className="mt-1 text-xs leading-5 text-textMuted">
                This cannot be undone.
              </p>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  className="rounded-lg px-3 py-1.5 text-sm text-textMuted transition hover:text-text"
                  onClick={handleCancelDelete}
                  type="button"
                >
                  Keep
                </button>
                <button
                  className="rounded-lg bg-danger px-3 py-1.5 text-sm font-medium text-white transition hover:bg-danger/90"
                  onClick={handleConfirmDelete}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="w-56 rounded-xl border border-border bg-panel px-2 py-2 shadow-soft">
              <MenuButton label="Rename workspace" onClick={handleStartRename} />
              <MenuButton
                label="Move up"
                disabled={currentIndex <= 0}
                onClick={() => {
                  if (!currentEntry) {
                    closeWorkspaceMenu();
                    return;
                  }
                  if (currentIndex > 0) {
                    const targetId = workspaceIndex[currentIndex - 1]?.id;
                    if (targetId) {
                      void reorderWorkspaces(currentEntry.id, targetId);
                    }
                  }
                  closeWorkspaceMenu();
                }}
              />
              <MenuButton
                label="Move down"
                disabled={currentIndex >= workspaceIndex.length - 1}
                onClick={() => {
                  if (!currentEntry) {
                    closeWorkspaceMenu();
                    return;
                  }
                  if (currentIndex < workspaceIndex.length - 1) {
                    const nextItemId = workspaceIndex[currentIndex + 1]?.id;
                    if (nextItemId) {
                      // Move the item below BEFORE our item, effectively pushing ours down
                      void reorderWorkspaces(nextItemId, currentEntry.id);
                    }
                  }
                  closeWorkspaceMenu();
                }}
              />
              <MenuButton label="Toggle accent stripe" onClick={() => {
                if (!currentEntry) {
                  closeWorkspaceMenu();
                  return;
                }
                void updateWorkspaceStyle(currentEntry.id, {
                  accentStripe: { enabled: !currentEntry.style.accentStripe?.enabled },
                });
                closeWorkspaceMenu();
              }} />
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-sm text-text">Accent color</span>
                <input
                  aria-label="Accent color"
                  className="h-9 w-14 rounded-md border border-border bg-transparent p-1"
                  defaultValue={
                    currentEntry?.style.accentStripe?.color ?? "#60A5FA"
                  }
                  onChange={(event) => {
                    if (currentEntry) {
                      void updateWorkspaceStyle(currentEntry.id, {
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
                onClick={handleStartDelete}
              />
            </div>
          )}
        </MenuPopover>,
        document.body
      ) : null}
    </aside>
  );
}

function MenuButton({
  label,
  onClick,
  danger = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
        disabled
          ? "cursor-not-allowed text-textMuted/40"
          : danger
            ? "text-danger hover:bg-danger/10"
            : "text-text hover:bg-panelMuted"
      }`}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      type="button"
    >
      {label}
    </button>
  );
}
