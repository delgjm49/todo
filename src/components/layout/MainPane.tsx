import { useEffect, useState } from "react";
import { BlockCard } from "../block/BlockCard.js";
import { BlockContextMenu } from "../block/BlockContextMenu.js";
import { BLOCK_TEMPLATES } from "../../domain/templates/blockTemplates.js";
import { useDocumentStore } from "../../stores/documentStore.js";
import { useUiStore } from "../../stores/uiStore.js";

export function MainPane() {
  const workspaceIndex = useDocumentStore((state) => state.workspaceIndex);
  const workspaceById = useDocumentStore((state) => state.workspacesById);
  const createBlockFromTemplate = useDocumentStore((state) => state.createBlockFromTemplate);
  const updateBlockTitle = useDocumentStore((state) => state.updateBlockTitle);
  const toggleBlockCollapsed = useDocumentStore((state) => state.toggleBlockCollapsed);
  const reorderBlocks = useDocumentStore((state) => state.reorderBlocks);
  const moveBlockToWorkspace = useDocumentStore((state) => state.moveBlockToWorkspace);
  const deleteBlock = useDocumentStore((state) => state.deleteBlock);
  const activeWorkspaceId = useDocumentStore((state) => state.activeWorkspaceId);
  const activeWorkspace = workspaceIndex.find((entry) => entry.id === activeWorkspaceId) ?? workspaceIndex[0] ?? null;
  const inspectorOpen = useUiStore((state) => state.inspectorOpen);
  const blockMenu = useUiStore((state) => state.blockMenu);
  const openBlockMenu = useUiStore((state) => state.openBlockMenu);
  const closeBlockMenu = useUiStore((state) => state.closeBlockMenu);
  const draggingBlockId = useUiStore((state) => state.draggingBlockId);
  const dropTargetBlockId = useUiStore((state) => state.dropTargetBlockId);
  const setBlockDragState = useUiStore((state) => state.setBlockDragState);
  const resetBlockInteractionState = useUiStore((state) => state.resetBlockInteractionState);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  const workspaceDocument = activeWorkspace ? workspaceById[activeWorkspace.id] ?? null : null;
  const blocks = [...(workspaceDocument?.blocks ?? [])].sort((left, right) => left.order - right.order);
  const blockCount = blocks.length;
  const activeBlockMenuBlock = blockMenu
    ? workspaceById[blockMenu.workspaceId]?.blocks.find((block) => block.id === blockMenu.blockId) ?? null
    : null;

  useEffect(() => {
    if (editingBlockId && !blocks.some((block) => block.id === editingBlockId)) {
      setEditingBlockId(null);
    }
  }, [blocks, editingBlockId]);

  useEffect(() => {
    closeBlockMenu();
    setEditingBlockId(null);
    setBlockDragState(null);
  }, [activeWorkspaceId, closeBlockMenu, setBlockDragState]);

  useEffect(() => () => resetBlockInteractionState(), [resetBlockInteractionState]);

  return (
    <section className="min-h-0 min-w-0 bg-canvas px-5 py-5">
      <div className="h-full rounded-3xl border border-border bg-panel/80 px-6 py-6 shadow-soft">
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
            <div className="mt-1 text-lg font-semibold">{blockCount}</div>
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
            <div className="mt-4 flex flex-wrap gap-3">
              {BLOCK_TEMPLATES.map((template) => (
                <button
                  key={template.type}
                  className="rounded-lg border border-border bg-panel px-4 py-2 text-sm font-medium text-text transition hover:border-accent/40 hover:bg-panelMuted"
                  onClick={() => createBlockFromTemplate(template.type)}
                  type="button"
                >
                  Add {template.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {blocks.map((block) => (
              <BlockCard
                key={block.id}
                block={block}
                dragging={block.id === draggingBlockId}
                dropTarget={block.id === dropTargetBlockId}
                isEditing={block.id === editingBlockId}
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
                onStartEditing={() => {
                  closeBlockMenu();
                  setEditingBlockId(block.id);
                }}
                onToggleCollapsed={() => {
                  setEditingBlockId(null);
                  void toggleBlockCollapsed(block.workspaceId, block.id);
                }}
              />
            ))}
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
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 z-40"
            data-testid="block-menu-backdrop"
            onPointerDown={() => closeBlockMenu()}
          />
          <div
            className="fixed z-50"
            onPointerDown={(event) => event.stopPropagation()}
            style={{ left: `${blockMenu.x}px`, top: `${blockMenu.y}px` }}
          >
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
              workspaces={workspaceIndex}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}
