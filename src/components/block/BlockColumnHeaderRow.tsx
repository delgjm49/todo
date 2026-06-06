import type { BlockSort } from "../../types/block.js";
import type { ColumnDefinition } from "../../types/column.js";
import { getVisibleColumnsInDisplayOrder } from "../../domain/columns/createColumn.js";
import type { BlockId, ColumnId, WorkspaceId } from "../../domain/ids.js";
import { useUiStore } from "../../stores/uiStore.js";

function getSortableGlyph(type: ColumnDefinition["type"]): string {
  if (type === "checkbox") return "☑";
  return getColumnTypeName(type);
}

function getMarkerGlyph(type: ColumnDefinition["type"]): string {
  if (type === "numbered") return "#";
  if (type === "bullet") return "•";
  return "";
}

function getColumnTypeName(type: ColumnDefinition["type"]): string {
  switch (type) {
    case "checkbox": return "Checkbox";
    case "bullet": return "Bullet";
    case "date": return "Date";
    case "time": return "Time";
    case "dropdown": return "Dropdown";
    case "numbered": return "Numbered";
    case "text": return "Text";
  }
}

export function BlockColumnHeaderRow({
  blockId,
  columns,
  onOpenColumnMenu,
  workspaceId,
  sort,
  onSortColumn,
}: {
  blockId: BlockId;
  columns: ColumnDefinition[];
  onOpenColumnMenu?: (columnId: ColumnId, x: number, y: number) => void;
  workspaceId: WorkspaceId;
  sort: BlockSort | null;
  onSortColumn?: (columnId: ColumnId, direction: BlockSort["direction"]) => void;
}) {
  const visibleColumns = getVisibleColumnsInDisplayOrder(columns);
  const selection = useUiStore((state) => state.selection);
  const selectColumn = useUiStore((state) => state.selectColumn);
  const isSelectedColumn = (columnId: ColumnId) =>
    selection.kind === "column" && selection.blockId === blockId && selection.columnId === columnId;

  return (
    <div className="grid gap-2 border-b border-border bg-panelMuted/55 px-3 py-2" style={{ gridTemplateColumns: buildGridTemplate(visibleColumns) }}>
      {visibleColumns.map((column) => {
        // Use a direct check instead of the isUserSortableColumn type guard
        // to avoid TypeScript narrowing the else branch to `never`.
        const userSortable = column.type !== "numbered" && column.type !== "bullet";
        const isActive = sort?.columnId === column.id;
        const direction = sort?.direction;
        const selected = isSelectedColumn(column.id);

        if (userSortable) {
          const label = column.label.trim();
          const displayName = label || getColumnTypeName(column.type);
          const ariaLabel = `Sort by ${displayName}${isActive ? `, currently ${direction}ending` : ""}`;

          return (
            <button
              className={`min-w-0 rounded-md border px-2 py-1.5 text-left transition ${
                selected
                  ? "border-accent/60 bg-accent/10"
                  : "border-border/70 bg-panel/70 hover:border-accent/40 hover:bg-panelMuted"
              }`}
              data-testid={`column-header-${column.id}`}
              key={column.id}
              onClick={() => {
                selectColumn(workspaceId, blockId, column.id);
                const nextDir = isActive && direction === "asc" ? "desc" : "asc";
                onSortColumn?.(column.id, nextDir);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                onOpenColumnMenu?.(column.id, event.clientX, event.clientY);
              }}
              aria-label={ariaLabel}
              aria-pressed={isActive}
              type="button"
              {...(isActive ? { "data-sort-direction": direction } : {})}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate min-w-0 text-sm font-medium text-text">
                  {label || <span className="text-textMuted">{getSortableGlyph(column.type)}</span>}
                </span>
                {isActive ? (
                  <span className="shrink-0 text-xs text-accent">
                    {direction === "asc" ? "▲" : "▼"}
                  </span>
                ) : null}
              </div>
            </button>
          );
        }

        // Marker header (numbered / bullet): minimal, muted, centered.
        const markerLabel = column.label.trim() || getColumnTypeName(column.type);
        return (
          <button
            className={`min-w-0 rounded-md border px-2 py-1.5 text-center transition ${
              selected
                ? "border-accent/60 bg-accent/10"
                : "border-transparent bg-transparent text-textMuted"
            }`}
            data-testid={`column-header-${column.id}`}
            key={column.id}
            onClick={() => selectColumn(workspaceId, blockId, column.id)}
            onContextMenu={(event) => {
              event.preventDefault();
              onOpenColumnMenu?.(column.id, event.clientX, event.clientY);
            }}
            aria-label={markerLabel}
            title={markerLabel}
            type="button"
          >
            <span className="text-sm text-textMuted">{getMarkerGlyph(column.type)}</span>
          </button>
        );
      })}
    </div>
  );
}

function buildGridTemplate(columns: ColumnDefinition[]): string {
  if (columns.length === 0) {
    return "1fr";
  }

  return columns.map((column) => `${Math.max(column.width, 44)}px`).join(" ");
}
