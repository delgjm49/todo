import type { Block } from "../../types/block.js";
import type { WorkspaceIndexEntry } from "../../types/workspace.js";
import type { WorkspaceId } from "../../domain/ids.js";

export function BlockContextMenu({
  block,
  workspaces,
  onRename,
  onToggleCollapsed,
  onToggleHideCompletedRows,
  onMoveToWorkspace,
  onDelete,
}: {
  block: Block;
  workspaces: WorkspaceIndexEntry[];
  onRename: () => void;
  onToggleCollapsed: () => void;
  onToggleHideCompletedRows: () => void;
  onMoveToWorkspace: (workspaceId: WorkspaceId) => void;
  onDelete: () => void;
}) {
  const otherWorkspaces = workspaces.filter((workspace) => workspace.id !== block.workspaceId);

  return (
    <div className="w-64 rounded-xl border border-border bg-panel px-2 py-2 shadow-soft">
      <div className="px-3 py-2 text-xs uppercase tracking-[0.24em] text-textMuted">Block actions</div>
      <MenuButton label="Rename block" onClick={onRename} />
      <MenuButton
        label={block.collapsed ? "Expand block" : "Collapse block"}
        onClick={onToggleCollapsed}
      />
      <MenuButton
        label={block.hideCompletedRows ? "Show completed rows" : "Hide completed rows"}
        onClick={onToggleHideCompletedRows}
      />
      <div className="mt-2 border-t border-border pt-2">
        <div className="px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-textMuted">Move to workspace</div>
        {otherWorkspaces.length > 0 ? (
          otherWorkspaces.map((workspace) => (
            <MenuButton
              key={workspace.id}
              label={workspace.title}
              onClick={() => onMoveToWorkspace(workspace.id)}
            />
          ))
        ) : (
          <div className="px-3 py-2 text-sm text-textMuted">No other workspaces available.</div>
        )}
      </div>
      <hr className="my-2 border-border" />
      <MenuButton danger label="Delete block" onClick={onDelete} />
    </div>
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
