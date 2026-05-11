import type { ColumnDefinition } from "../../types/column.js";
import { getVisibleColumnsInDisplayOrder } from "../../domain/columns/createColumn.js";
import type { BlockId, ColumnId, WorkspaceId } from "../../domain/ids.js";
import { useUiStore } from "../../stores/uiStore.js";

function getColumnTypeBadge(type: ColumnDefinition["type"]): string {
  if (type === "checkbox") {
    return "CHK";
  }

  if (type === "bullet") {
    return "BLT";
  }

  if (type === "numbered") {
    return "NUM";
  }

  if (type === "date") {
    return "DATE";
  }

  if (type === "time") {
    return "TIME";
  }

  if (type === "dropdown") {
    return "OPT";
  }

  return "TXT";
}

export function BlockColumnHeaderRow({
  blockId,
  columns,
  onOpenColumnMenu,
  workspaceId,
}: {
  blockId: BlockId;
  columns: ColumnDefinition[];
  onOpenColumnMenu?: (columnId: ColumnId, x: number, y: number) => void;
  workspaceId: WorkspaceId;
}) {
  const visibleColumns = getVisibleColumnsInDisplayOrder(columns);
  const selection = useUiStore((state) => state.selection);
  const selectColumn = useUiStore((state) => state.selectColumn);
  const isSelectedColumn = (columnId: ColumnId) =>
    selection.kind === "column" && selection.blockId === blockId && selection.columnId === columnId;

  return (
    <div className="grid gap-2 border-b border-border bg-panelMuted/55 px-3 py-2" style={{ gridTemplateColumns: buildGridTemplate(visibleColumns) }}>
      {visibleColumns.map((column) => (
        <button
          className={`min-w-0 rounded-md border px-2 py-1.5 text-left transition ${
            isSelectedColumn(column.id)
              ? "border-accent/60 bg-accent/10"
              : "border-border/70 bg-panel/70 hover:border-accent/40 hover:bg-panelMuted"
          }`}
          data-testid={`column-header-${column.id}`}
          key={column.id}
          onClick={() => selectColumn(workspaceId, blockId, column.id)}
          onContextMenu={(event) => {
            event.preventDefault();
            onOpenColumnMenu?.(column.id, event.clientX, event.clientY);
          }}
          type="button"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium text-text">{column.label || " "}</span>
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-textMuted">
              {getColumnTypeBadge(column.type)}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

function buildGridTemplate(columns: ColumnDefinition[]): string {
  if (columns.length === 0) {
    return "1fr";
  }

  return columns.map((column) => `${Math.max(column.width, 44)}px`).join(" ");
}
