import type { Block, BlockSort } from "../../types/block.js";
import type { ColumnDefinition } from "../../types/column.js";
import type { WorkspaceIndexEntry } from "../../types/workspace.js";
import type { ColumnId, WorkspaceId } from "../../domain/ids.js";
import { getVisibleColumnsInDisplayOrder } from "../../domain/columns/createColumn.js";
import { isUserSortableColumn } from "../../domain/sorting/compareValues.js";

export function BlockContextMenu({
  block,
  workspaces,
  onRename,
  onToggleCollapsed,
  onMoveToWorkspace,
  onSort,
  onDelete,
}: {
  block: Block;
  workspaces: WorkspaceIndexEntry[];
  onRename: () => void;
  onToggleCollapsed: () => void;
  onMoveToWorkspace: (workspaceId: WorkspaceId) => void;
  onSort: (columnId: ColumnId, direction: BlockSort["direction"]) => void;
  onDelete: () => void;
}) {
  const otherWorkspaces = workspaces.filter((workspace) => workspace.id !== block.workspaceId);
  const sortableColumns = getVisibleColumnsInDisplayOrder(block.columns).filter(isUserSortableColumn);

  return (
    <div className="w-80 rounded-xl border border-border bg-panel px-2 py-2 shadow-soft">
      <div className="px-3 py-2 text-xs uppercase tracking-[0.24em] text-textMuted">Block actions</div>
      <MenuButton label="Rename block" onClick={onRename} />
      <MenuButton
        label={block.collapsed ? "Expand block" : "Collapse block"}
        onClick={onToggleCollapsed}
      />
      <div className="mt-2 border-t border-border pt-2" data-testid="block-sort-section">
        <div className="px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-textMuted">Sort by</div>
        {sortableColumns.length > 0 ? (
          <div className="space-y-1">
            {sortableColumns.map((column) => (
              <div className="rounded-lg px-3 py-2 hover:bg-panelMuted" key={column.id}>
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-text">{formatColumnLabel(column)}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <SortButton
                      active={block.sort?.columnId === column.id && block.sort.direction === "asc"}
                      label="Asc"
                      onClick={() => onSort(column.id, "asc")}
                      testId={`sort-${block.id}-${column.id}-asc`}
                    />
                    <SortButton
                      active={block.sort?.columnId === column.id && block.sort.direction === "desc"}
                      label="Desc"
                      onClick={() => onSort(column.id, "desc")}
                      testId={`sort-${block.id}-${column.id}-desc`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-3 py-2 text-sm text-textMuted">No sortable columns available.</div>
        )}
      </div>
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

function SortButton({
  active,
  label,
  onClick,
  testId,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      className={`rounded-md border px-2 py-1 text-[11px] font-medium transition ${
        active
          ? "border-accent/50 bg-accent/15 text-accent"
          : "border-border bg-panel text-textMuted hover:border-accent/40 hover:text-text"
      }`}
      data-testid={testId}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function formatColumnLabel(column: ColumnDefinition): string {
  const trimmed = column.label.trim();
  if (trimmed) {
    return trimmed;
  }

  switch (column.type) {
    case "checkbox":
      return "Checkbox";
    case "bullet":
      return "Bullet";
    case "date":
      return "Date";
    case "time":
      return "Time";
    case "dropdown":
      return "Dropdown";
    case "numbered":
      return "Numbered";
    case "text":
      return "Text";
  }
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
