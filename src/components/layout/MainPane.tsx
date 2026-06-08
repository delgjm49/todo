import { useEffect, useState } from "react";
import { BlockCard } from "../block/BlockCard.js";
import { BlockContextMenu } from "../block/BlockContextMenu.js";
import { BlockSortMenu } from "../block/BlockSortMenu.js";
import { ColumnContextMenu } from "../block/ColumnContextMenu.js";
import { RowContextMenu } from "../row/RowContextMenu.js";
import { MenuPopover } from "../shared/MenuPopover.js";
import { BLOCK_TEMPLATES } from "../../domain/templates/blockTemplates.js";
import { useDocumentStore } from "../../stores/documentStore.js";
import { useUiStore } from "../../stores/uiStore.js";
import { getVisibleColumnsInDisplayOrder } from "../../domain/columns/createColumn.js";
import { mapClipboardRowsToBlock } from "../../domain/clipboard/index.js";
import type { BlockType } from "../../types/block.js";

function AddBlockTemplateButtons({
  onSelectTemplate,
  disambiguateNames = false,
}: {
  onSelectTemplate: (templateType: BlockType) => void;
  disambiguateNames?: boolean;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {BLOCK_TEMPLATES.map((template, index) => (
        <button
          key={template.type}
          aria-label={disambiguateNames ? `Add block preset ${index + 1}` : undefined}
          className="rounded-lg border border-border bg-panel px-4 py-2 text-sm font-medium text-text transition hover:border-accent/40 hover:bg-panelMuted"
          onClick={() => onSelectTemplate(template.type)}
          type="button"
        >
          Add {template.label}
        </button>
      ))}
    </div>
  );
}

export function MainPane() {
  const workspaceIndex = useDocumentStore((state) => state.workspaceIndex);
  const workspaceById = useDocumentStore((state) => state.workspacesById);
  const createBlockFromTemplate = useDocumentStore((state) => state.createBlockFromTemplate);
  const updateBlockTitle = useDocumentStore((state) => state.updateBlockTitle);
  const toggleBlockCollapsed = useDocumentStore((state) => state.toggleBlockCollapsed);
  const toggleBlockHideCompletedRows = useDocumentStore((state) => state.toggleBlockHideCompletedRows);
  const reorderBlocks = useDocumentStore((state) => state.reorderBlocks);
  const moveBlockToWorkspace = useDocumentStore((state) => state.moveBlockToWorkspace);
  const deleteBlock = useDocumentStore((state) => state.deleteBlock);
  const sortBlockRows = useDocumentStore((state) => state.sortBlockRows);
  const appendRowToBlock = useDocumentStore((state) => state.appendRowToBlock);
  const renameColumn = useDocumentStore((state) => state.renameColumn);
  const moveColumnLeft = useDocumentStore((state) => state.moveColumnLeft);
  const moveColumnRight = useDocumentStore((state) => state.moveColumnRight);
  const addColumnLeft = useDocumentStore((state) => state.addColumnLeft);
  const addColumnRight = useDocumentStore((state) => state.addColumnRight);
  const deleteColumn = useDocumentStore((state) => state.deleteColumn);
  const changeColumnType = useDocumentStore((state) => state.changeColumnType);
  const updateColumnSettings = useDocumentStore((state) => state.updateColumnSettings);
  const cutRows = useDocumentStore((state) => state.cutRows);
  const copyRows = useDocumentStore((state) => state.copyRows);
  const pasteRows = useDocumentStore((state) => state.pasteRows);
  const activeWorkspaceId = useDocumentStore((state) => state.activeWorkspaceId);
  const activeWorkspace = workspaceIndex.find((entry) => entry.id === activeWorkspaceId) ?? workspaceIndex[0] ?? null;
  const inspectorOpen = useUiStore((state) => state.inspectorOpen);
  const blockMenu = useUiStore((state) => state.blockMenu);
  const columnMenu = useUiStore((state) => state.columnMenu);
  const openBlockMenu = useUiStore((state) => state.openBlockMenu);
  const closeBlockMenu = useUiStore((state) => state.closeBlockMenu);
  const openColumnMenu = useUiStore((state) => state.openColumnMenu);
  const closeColumnMenu = useUiStore((state) => state.closeColumnMenu);
  const rowMenu = useUiStore((state) => state.rowMenu);
  const closeRowMenu = useUiStore((state) => state.closeRowMenu);
  const openRowMenu = useUiStore((state) => state.openRowMenu);
  const clipboardPayload = useUiStore((state) => state.clipboardPayload);
  const draggingBlockId = useUiStore((state) => state.draggingBlockId);
  const dropTargetBlockId = useUiStore((state) => state.dropTargetBlockId);
  const setBlockDragState = useUiStore((state) => state.setBlockDragState);
  const resetBlockInteractionState = useUiStore((state) => state.resetBlockInteractionState);
  const resetRowInteractionState = useUiStore((state) => state.resetRowInteractionState);
  const selection = useUiStore((state) => state.selection);
  const selectBlock = useUiStore((state) => state.selectBlock);
  const clearSelection = useUiStore((state) => state.clearSelection);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [sortMenuState, setSortMenuState] = useState<{
    blockId: string;
    x: number;
    y: number;
  } | null>(null);

  const workspaceDocument = activeWorkspace ? workspaceById[activeWorkspace.id] ?? null : null;
  const blocks = [...(workspaceDocument?.blocks ?? [])].sort((left, right) => left.order - right.order);
  const blockCount = blocks.length;
  const activeBlockMenuBlock = blockMenu
    ? workspaceById[blockMenu.workspaceId]?.blocks.find((block) => block.id === blockMenu.blockId) ?? null
    : null;
  const activeColumnMenuColumn = columnMenu
    ? (workspaceById[columnMenu.workspaceId]?.blocks.find((block) => block.id === columnMenu.blockId)?.columns.find(
        (column) => column.id === columnMenu.columnId
      ) ?? null)
    : null;
  const activeColumnMenuBlock = columnMenu
    ? workspaceById[columnMenu.workspaceId]?.blocks.find((block) => block.id === columnMenu.blockId) ?? null
    : null;
  const activeRowMenuBlock = rowMenu
    ? workspaceById[rowMenu.workspaceId]?.blocks.find((block) => block.id === rowMenu.blockId) ?? null
    : null;
  const canPaste = (() => {
    if (!clipboardPayload || !activeRowMenuBlock) return false;
    return mapClipboardRowsToBlock(clipboardPayload, activeRowMenuBlock).ok;
  })();

  useEffect(() => {
    if (editingBlockId && !blocks.some((block) => block.id === editingBlockId)) {
      setEditingBlockId(null);
    }
  }, [blocks, editingBlockId]);

  useEffect(() => {
    closeBlockMenu();
    closeColumnMenu();
    closeRowMenu();
    setEditingBlockId(null);
    setSortMenuState(null);
    setBlockDragState(null);
    resetRowInteractionState();
    clearSelection();
  }, [activeWorkspaceId, closeBlockMenu, closeColumnMenu, closeRowMenu, setBlockDragState, resetRowInteractionState, clearSelection]);

  useEffect(() => () => resetBlockInteractionState(), [resetBlockInteractionState]);
  useEffect(() => () => resetRowInteractionState(), [resetRowInteractionState]);

  return (
    <section className="min-h-0 min-w-0 overflow-y-auto bg-canvas px-5 py-5" data-testid="main-canvas-scroll">
      <div className="min-h-full rounded-3xl border border-border bg-panel/80 px-6 py-6 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-textMuted">Workspace canvas</p>
            <h2 className="mt-2 text-3xl font-semibold">{activeWorkspace?.title ?? "No workspace selected"}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-textMuted">
              Blocks can now be renamed inline, collapsed, reordered, moved between workspaces, and removed from the
              current workspace.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-panelMuted px-4 py-3 text-right">
            <div className="text-xs uppercase tracking-[0.24em] text-textMuted">Blocks</div>
            <div className="mt-1 text-lg font-semibold" data-testid="workspace-block-count">{blockCount}</div>
          </div>
        </div>

        {blocks.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-border bg-panelMuted/60 px-5 py-5">
            <div className="text-sm font-medium text-text">Empty workspace shell</div>
            <p className="mt-2 text-sm leading-6 text-textMuted">
              {activeWorkspace
                ? "Use a preset to add your first block to this workspace."
                : "Create or select a workspace to continue."}
            </p>
            <AddBlockTemplateButtons onSelectTemplate={(templateType) => createBlockFromTemplate(templateType)} />
          </div>
        ) : (
          <div className="mt-6">
            <div className="space-y-4">
              {blocks.map((block) => (
              <BlockCard
                key={block.id}
                block={block}
                dragging={block.id === draggingBlockId}
                dropTarget={block.id === dropTargetBlockId}
                isEditing={block.id === editingBlockId}
                isSelected={selection.kind === "block" && selection.blockId === block.id}
                onCancelEditing={() => setEditingBlockId(null)}
                onCommitTitle={(title) => {
                  void updateBlockTitle(block.workspaceId, block.id, title);
                }}
                onDragEnd={() => setBlockDragState(null)}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (draggingBlockId && draggingBlockId !== block.id) {
                    setBlockDragState(draggingBlockId, block.id);
                  }
                }}
                onDragStart={() => {
                  setEditingBlockId(null);
                  closeBlockMenu();
                  setBlockDragState(block.id);
                }}
                onDrop={() => {
                  if (activeWorkspace && draggingBlockId && draggingBlockId !== block.id) {
                    void reorderBlocks(activeWorkspace.id, draggingBlockId, block.id);
                  }
                  setBlockDragState(null);
                }}
                onOpenMenu={(x, y) => {
                  setEditingBlockId(null);
                  openBlockMenu(block.workspaceId, block.id, x, y);
                }}
                onOpenSortMenu={(x, y) => {
                  setEditingBlockId(null);
                  closeBlockMenu();
                  setSortMenuState({ blockId: block.id, x, y });
                }}
                onSelectBlock={() => {
                  if (activeWorkspace) {
                    selectBlock(activeWorkspace.id, block.id);
                  }
                }}
                onStartEditing={() => {
                  closeBlockMenu();
                  setEditingBlockId(block.id);
                }}
                onToggleCollapsed={() => {
                  setEditingBlockId(null);
                  void toggleBlockCollapsed(block.workspaceId, block.id);
                }}
                onToggleHideCompletedRows={() => {
                  setEditingBlockId(null);
                  void toggleBlockHideCompletedRows(block.workspaceId, block.id);
                }}
                onAddRow={() => {
                  void appendRowToBlock(block.workspaceId, block.id);
                }}
                onOpenColumnMenu={(columnId, x, y) => {
                  setEditingBlockId(null);
                  openColumnMenu(block.workspaceId, block.id, columnId, x, y);
                }}
                onOpenRowMenu={(rowId, x, y) => {
                  setEditingBlockId(null);
                  openRowMenu(block.workspaceId, block.id, rowId, x, y);
                }}
                onSortColumn={(columnId, direction) => {
                  void sortBlockRows(block.workspaceId, block.id, columnId, direction);
                }}
              />
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-border bg-panelMuted/60 px-5 py-5">
              <div className="text-sm font-medium text-text">Add another block</div>
              <AddBlockTemplateButtons disambiguateNames onSelectTemplate={(templateType) => createBlockFromTemplate(templateType)} />
            </div>
          </div>
        )}

        <div
          className={`mt-6 rounded-2xl border px-5 py-5 ${
            inspectorOpen ? "border-accent/40 bg-accent/10" : "border-border bg-panelMuted/60"
          }`}
        >
          <div className="text-sm font-medium text-text">Inspector status</div>
          <p className="mt-2 text-sm leading-6 text-textMuted">
            {inspectorOpen
              ? "Inspector is open and still focused on workspace styling until row and cell editing lands."
              : "Inspector is collapsed."}
          </p>
        </div>
      </div>

      {blockMenu && activeBlockMenuBlock ? (
        <MenuPopover backdropTestId="block-menu-backdrop" onDismiss={() => closeBlockMenu()} x={blockMenu.x} y={blockMenu.y}>
          <BlockContextMenu
            block={activeBlockMenuBlock}
            onDelete={() => {
              if (window.confirm(`Delete block "${activeBlockMenuBlock.title}"?`)) {
                void deleteBlock(activeBlockMenuBlock.workspaceId, activeBlockMenuBlock.id);
              }
              setEditingBlockId(null);
              closeBlockMenu();
            }}
            onMoveToWorkspace={(workspaceId) => {
              void moveBlockToWorkspace(activeBlockMenuBlock.workspaceId, activeBlockMenuBlock.id, workspaceId);
              setEditingBlockId(null);
              closeBlockMenu();
            }}
            onRename={() => {
              setEditingBlockId(activeBlockMenuBlock.id);
              closeBlockMenu();
            }}
            onToggleCollapsed={() => {
              void toggleBlockCollapsed(activeBlockMenuBlock.workspaceId, activeBlockMenuBlock.id);
              setEditingBlockId(null);
              closeBlockMenu();
            }}
            onToggleHideCompletedRows={() => {
              void toggleBlockHideCompletedRows(activeBlockMenuBlock.workspaceId, activeBlockMenuBlock.id);
              setEditingBlockId(null);
              closeBlockMenu();
            }}
            workspaces={workspaceIndex}
          />
        </MenuPopover>
      ) : null}

      {sortMenuState ? (
        <MenuPopover
          backdropTestId="block-sort-backdrop"
          onDismiss={() => setSortMenuState(null)}
          x={sortMenuState.x}
          y={sortMenuState.y}
        >
          {(() => {
            const sortBlock = blocks.find((b) => b.id === sortMenuState.blockId);
            if (!sortBlock) return null;
            return (
              <BlockSortMenu
                block={sortBlock}
                onSort={(columnId, direction) => {
                  void sortBlockRows(sortBlock.workspaceId, sortBlock.id, columnId, direction);
                  setEditingBlockId(null);
                  setSortMenuState(null);
                }}
              />
            );
          })()}
        </MenuPopover>
      ) : null}

      {columnMenu && activeColumnMenuColumn && activeColumnMenuBlock && columnMenu.workspaceId ? (
        <MenuPopover backdropTestId="column-menu-backdrop" onDismiss={() => closeColumnMenu()} x={columnMenu.x} y={columnMenu.y}>
          <ColumnContextMenu
            canMoveLeft={
              getVisibleColumnsInDisplayOrder(activeColumnMenuBlock.columns).findIndex(
                (c) => c.id === activeColumnMenuColumn.id
              ) > 0
            }
            canMoveRight={
              getVisibleColumnsInDisplayOrder(activeColumnMenuBlock.columns).findIndex(
                (c) => c.id === activeColumnMenuColumn.id
              ) <
              getVisibleColumnsInDisplayOrder(activeColumnMenuBlock.columns).length - 1
            }
            column={activeColumnMenuColumn}
            onAddLeft={(type) => {
              void addColumnLeft(columnMenu.workspaceId, columnMenu.blockId, columnMenu.columnId, type);
              closeColumnMenu();
            }}
            onAddRight={(type) => {
              void addColumnRight(columnMenu.workspaceId, columnMenu.blockId, columnMenu.columnId, type);
              closeColumnMenu();
            }}
            onChangeType={(type) => {
              void changeColumnType(columnMenu.workspaceId, columnMenu.blockId, columnMenu.columnId, type);
              closeColumnMenu();
            }}
            onClose={() => closeColumnMenu()}
            onDelete={() => {
              if (window.confirm("Delete this column?")) {
                void deleteColumn(columnMenu.workspaceId, columnMenu.blockId, columnMenu.columnId);
              }
              closeColumnMenu();
            }}
            onMoveLeft={() => {
              void moveColumnLeft(columnMenu.workspaceId, columnMenu.blockId, columnMenu.columnId);
              closeColumnMenu();
            }}
            onMoveRight={() => {
              void moveColumnRight(columnMenu.workspaceId, columnMenu.blockId, columnMenu.columnId);
              closeColumnMenu();
            }}
            onRename={(label) => {
              void renameColumn(columnMenu.workspaceId, columnMenu.blockId, columnMenu.columnId, label);
            }}
            onUpdateSettings={(patch) => {
              void updateColumnSettings(columnMenu.workspaceId, columnMenu.blockId, columnMenu.columnId, patch);
            }}
          />
        </MenuPopover>
      ) : null}

      {rowMenu && activeRowMenuBlock ? (
        <MenuPopover backdropTestId="row-menu-backdrop" onDismiss={() => closeRowMenu()} x={rowMenu.x} y={rowMenu.y}>
          <RowContextMenu
            canCutOrCopy={rowMenu.targetRowId !== null}
            canPaste={canPaste}
            onCopy={() => {
              if (rowMenu.targetRowId) {
                void copyRows(rowMenu.workspaceId, rowMenu.blockId, [rowMenu.targetRowId]);
              }
              closeRowMenu();
            }}
            onCut={() => {
              if (rowMenu.targetRowId) {
                void cutRows(rowMenu.workspaceId, rowMenu.blockId, [rowMenu.targetRowId]);
              }
              closeRowMenu();
            }}
            onPaste={() => {
              void pasteRows(rowMenu.workspaceId, rowMenu.blockId, rowMenu.targetRowId);
              closeRowMenu();
            }}
          />
        </MenuPopover>
      ) : null}
    </section>
  );
}
