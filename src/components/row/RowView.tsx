import { type DragEndEvent } from "@dnd-kit/core";
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getVisibleColumnsInDisplayOrder } from "../../domain/columns/createColumn.js";
import { getRowsInDisplayOrder } from "../../domain/rows/reorderRows.js";
import { filterCompletedRows } from "../../domain/rows/completedRowFilter.js";
import { isRowCompletedByCheckbox } from "../../domain/rows/applyCheckboxRules.js";
import { resolveCellFormatting } from "../../domain/formatting/resolveCellFormatting.js";
import { formattingToCellStyle } from "../../domain/formatting/formattingToCellStyle.js";
import { formattingToBorderStyle } from "../../domain/formatting/formattingToBorderStyle.js";
import { resolveThemeAwareAppDefaults } from "../../domain/defaults/themeDefaultColors.js";
import { useDocumentStore } from "../../stores/documentStore.js";
import { useUiStore } from "../../stores/uiStore.js";
import type { Block } from "../../types/block.js";
import { CellRenderer } from "../cell/CellRenderer.js";

export function RowView({ block, workspaceId }: { block: Block; workspaceId: string }) {
  const reorderRows = useDocumentStore((state) => state.reorderRows);

  const orderedRows = getRowsInDisplayOrder(block.rows);
  const rows = filterCompletedRows(orderedRows, block.columns, block.hideCompletedRows);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    void reorderRows(workspaceId, block.id, String(active.id), String(over.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
        <div className="divide-y divide-border">
          {rows.length === 0 && block.hideCompletedRows && orderedRows.length > 0 ? (
            <div className="px-3 py-6 text-center text-sm text-textMuted">
              All completed rows are hidden. Use <span className="font-medium text-text">Show completed</span> to reveal them.
            </div>
          ) : (
            rows.map((row) => (
              <SortableRow
                key={row.id}
                block={block}
                row={row}
                rowIndex={rows.indexOf(row)}
                workspaceId={workspaceId}
              />
            ))
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  block,
  row,
  rowIndex,
  workspaceId,
}: {
  block: Block;
  row: Block["rows"][number];
  rowIndex: number;
  workspaceId: string;
}) {
  const updateTextCellValue = useDocumentStore((state) => state.updateTextCellValue);
  const toggleCheckboxCellValue = useDocumentStore((state) => state.toggleCheckboxCellValue);
  const updateDateCellValue = useDocumentStore((state) => state.updateDateCellValue);
  const updateTimeCellValue = useDocumentStore((state) => state.updateTimeCellValue);
  const updateDropdownCellValue = useDocumentStore((state) => state.updateDropdownCellValue);
  const insertRowInBlock = useDocumentStore((state) => state.insertRowInBlock);
  const deleteRowFromBlock = useDocumentStore((state) => state.deleteRowFromBlock);
  const alertFlashRowId = useUiStore((state) => state.alertFlashRowId);
  const searchFlashRowId = useUiStore((state) => state.searchFlashRowId);
  const selection = useUiStore((state) => state.selection);
  const selectRow = useUiStore((state) => state.selectRow);
  const selectCell = useUiStore((state) => state.selectCell);
  const openRowMenu = useUiStore((state) => state.openRowMenu);
  const settings = useDocumentStore((state) => state.settings);
  const effectiveAppDefaults = settings ? resolveThemeAwareAppDefaults(settings) : null;
  const visibleColumns = getVisibleColumnsInDisplayOrder(block.columns);

  const completed = isRowCompletedByCheckbox(block.columns, row);
  const isRowSelected = () =>
    (selection.kind === "row" || selection.kind === "cell") &&
    selection.blockId === block.id &&
    selection.rowId === row.id;
  const isCellSelected = (columnId: string) =>
    selection.kind === "cell" &&
    selection.blockId === block.id &&
    selection.rowId === row.id &&
    selection.columnId === columnId;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`px-3 py-2.5 transition ${isDragging ? "opacity-50" : ""} ${
        isRowSelected() ? "bg-accent/5" : ""
      } ${alertFlashRowId === row.id || searchFlashRowId === row.id ? "animate-alertFlash" : ""}`}
      data-completed={completed ? "true" : undefined}
      data-testid={`row-${row.id}`}
      {...attributes}
      onClick={() => selectRow(workspaceId, block.id, row.id)}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        selectRow(workspaceId, block.id, row.id);
        openRowMenu(workspaceId, block.id, row.id, event.clientX, event.clientY);
      }}
    >
      <div className="flex items-center gap-2">
        <button
          className="shrink-0 cursor-grab rounded border border-border/60 px-1 py-1 text-[10px] text-textMuted transition hover:border-accent/40 hover:text-text"
          data-drag-handle
          data-testid={`row-drag-handle-${row.id}`}
          type="button"
          {...listeners}
        >
          ⋮⋮
        </button>
        <div className="grid flex-1 gap-2" style={{ gridTemplateColumns: buildGridTemplate(visibleColumns) }}>
          {visibleColumns.map((column) => {
            const effectiveFormat = effectiveAppDefaults
              ? resolveCellFormatting(
                  effectiveAppDefaults,
                  block.format,
                  column.format,
                  row.format,
                  row.cells[column.id]?.format
                )
              : {};
            const cellStyle = {
              ...formattingToCellStyle(effectiveFormat),
              ...formattingToBorderStyle(effectiveFormat),
            };
            return (
              <div
                className={`min-h-8 rounded-md border px-2 py-1.5 text-sm text-text ${
                  completed ? "line-through decoration-textMuted decoration-1" : ""
                } ${
                  isCellSelected(column.id)
                    ? "border-accent/70 ring-1 ring-accent/30 bg-panel"
                    : "border-border/60 bg-panel"
                }`}
                data-testid={`cell-${row.id}-${column.id}`}
                key={column.id}
                onClick={(event) => {
                  event.stopPropagation();
                  selectCell(workspaceId, block.id, row.id, column.id);
                }}
                style={cellStyle}
              >
                <CellRenderer
                  cell={row.cells[column.id]}
                  column={column}
                  onCommitDate={(value) => {
                    void updateDateCellValue(workspaceId, block.id, row.id, column.id, value);
                  }}
                  onCommitDropdown={(value) => {
                    void updateDropdownCellValue(workspaceId, block.id, row.id, column.id, value);
                  }}
                  onCommitText={(value) => {
                    void updateTextCellValue(workspaceId, block.id, row.id, column.id, value);
                  }}
                  onCommitTime={(value) => {
                    void updateTimeCellValue(workspaceId, block.id, row.id, column.id, value);
                  }}
                  onToggleCheckbox={() => {
                    void toggleCheckboxCellValue(workspaceId, block.id, row.id, column.id);
                  }}
                  rowIndex={rowIndex}
                />
              </div>
            );
          })}</div>
      </div>
      <div className="mt-1.5 flex items-center justify-end gap-1">
        <button
          className="rounded border border-border px-2 py-0.5 text-[11px] text-textMuted transition hover:border-accent/40 hover:text-text"
          data-testid={`insert-row-above-${row.id}`}
          onClick={() => {
            void insertRowInBlock(workspaceId, block.id, row.id, "above");
          }}
          type="button"
        >
          Insert Above
        </button>
        <button
          className="rounded border border-border px-2 py-0.5 text-[11px] text-textMuted transition hover:border-accent/40 hover:text-text"
          data-testid={`insert-row-below-${row.id}`}
          onClick={() => {
            void insertRowInBlock(workspaceId, block.id, row.id, "below");
          }}
          type="button"
        >
          Insert Below
        </button>
        <button
          className="rounded border border-border px-2 py-0.5 text-[11px] text-textMuted transition hover:border-danger/50 hover:text-danger"
          data-testid={`delete-row-${row.id}`}
          onClick={() => {
            void deleteRowFromBlock(workspaceId, block.id, row.id);
          }}
          type="button"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function buildGridTemplate(columns: Block["columns"]): string {
  if (columns.length === 0) {
    return "1fr";
  }

  return columns.map((column) => `${Math.max(column.width, 44)}px`).join(" ");
}
