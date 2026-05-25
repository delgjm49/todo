import { getVisibleColumnsInDisplayOrder } from "../../domain/columns/createColumn.js";
import { getRowsInDisplayOrder } from "../../domain/rows/reorderRows.js";
import { isRowCompletedByCheckbox } from "../../domain/rows/applyCheckboxRules.js";
import { resolveCellFormatting } from "../../domain/formatting/resolveCellFormatting.js";
import { formattingToCellStyle } from "../../domain/formatting/formattingToCellStyle.js";
import { formattingToBorderStyle } from "../../domain/formatting/formattingToBorderStyle.js";
import { useDocumentStore } from "../../stores/documentStore.js";
import { useUiStore } from "../../stores/uiStore.js";
import type { Block } from "../../types/block.js";
import { CellRenderer } from "../cell/CellRenderer.js";

export function RowView({ block, workspaceId }: { block: Block; workspaceId: string }) {
  const updateTextCellValue = useDocumentStore((state) => state.updateTextCellValue);
  const toggleCheckboxCellValue = useDocumentStore((state) => state.toggleCheckboxCellValue);
  const updateDateCellValue = useDocumentStore((state) => state.updateDateCellValue);
  const updateTimeCellValue = useDocumentStore((state) => state.updateTimeCellValue);
  const updateDropdownCellValue = useDocumentStore((state) => state.updateDropdownCellValue);
  const insertRowInBlock = useDocumentStore((state) => state.insertRowInBlock);
  const deleteRowFromBlock = useDocumentStore((state) => state.deleteRowFromBlock);
  const reorderRows = useDocumentStore((state) => state.reorderRows);
  const draggingRowBlockId = useUiStore((state) => state.draggingRowBlockId);
  const draggingRowId = useUiStore((state) => state.draggingRowId);
  const dropTargetRowId = useUiStore((state) => state.dropTargetRowId);
  const setRowDragState = useUiStore((state) => state.setRowDragState);
  const resetRowInteractionState = useUiStore((state) => state.resetRowInteractionState);
  const alertFlashRowId = useUiStore((state) => state.alertFlashRowId);
  const selection = useUiStore((state) => state.selection);
  const selectRow = useUiStore((state) => state.selectRow);
  const selectCell = useUiStore((state) => state.selectCell);
  const openRowMenu = useUiStore((state) => state.openRowMenu);
  const settings = useDocumentStore((state) => state.settings);
  const visibleColumns = getVisibleColumnsInDisplayOrder(block.columns);
  const rows = getRowsInDisplayOrder(block.rows);

  const isRowDragging = draggingRowBlockId === block.id && draggingRowId !== null;
  const isRowSelected = (rowId: string) =>
    (selection.kind === "row" || selection.kind === "cell") &&
    selection.blockId === block.id &&
    selection.rowId === rowId;
  const isCellSelected = (rowId: string, columnId: string) =>
    selection.kind === "cell" &&
    selection.blockId === block.id &&
    selection.rowId === rowId &&
    selection.columnId === columnId;

  return (
    <div className="divide-y divide-border">
      {rows.map((row, rowIndex) => {
        const dragging = isRowDragging && draggingRowId === row.id;
        const dropTarget = isRowDragging && dropTargetRowId === row.id && draggingRowId !== row.id;
        const completed = isRowCompletedByCheckbox(block.columns, row);

        return (
          <div
            className={`px-3 py-2.5 transition ${dragging ? "opacity-50" : ""} ${dropTarget ? "bg-accent/10" : ""} ${
              isRowSelected(row.id) ? "bg-accent/5" : ""
            } ${alertFlashRowId === row.id ? "animate-alertFlash" : ""}`}
            data-completed={completed ? "true" : undefined}
            data-testid={`row-${row.id}`}
            draggable
            key={row.id}
            onClick={() => selectRow(workspaceId, block.id, row.id)}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              selectRow(workspaceId, block.id, row.id);
              openRowMenu(workspaceId, block.id, row.id, event.clientX, event.clientY);
            }}
            onDragEnd={(event) => {
              event.stopPropagation();
              resetRowInteractionState();
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (isRowDragging && draggingRowId !== row.id) {
                event.stopPropagation();
                setRowDragState(block.id, draggingRowId, row.id);
              }
            }}
            onDragStart={(event) => {
              const handle = (event.target as HTMLElement).closest("[data-drag-handle]");
              if (!handle) {
                event.preventDefault();
                return;
              }
              event.stopPropagation();
              setRowDragState(block.id, row.id);
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (isRowDragging && draggingRowId && draggingRowId !== row.id) {
                event.stopPropagation();
                void reorderRows(workspaceId, block.id, draggingRowId, row.id);
              }
              resetRowInteractionState();
            }}
          >
            <div className="flex items-center gap-2">
              <button
                className="shrink-0 cursor-grab rounded border border-border/60 px-1 py-1 text-[10px] text-textMuted transition hover:border-accent/40 hover:text-text"
                data-drag-handle
                data-testid={`row-drag-handle-${row.id}`}
                type="button"
              >
                ⋮⋮
              </button>
              <div className="grid flex-1 gap-2" style={{ gridTemplateColumns: buildGridTemplate(visibleColumns) }}>
                {visibleColumns.map((column) => {
                  const effectiveFormat = settings
                    ? resolveCellFormatting(
                        settings.defaults,
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
                        isCellSelected(row.id, column.id)
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
      })}
    </div>
  );
}

function buildGridTemplate(columns: Block["columns"]): string {
  if (columns.length === 0) {
    return "1fr";
  }

  return columns.map((column) => `${Math.max(column.width, 44)}px`).join(" ");
}
