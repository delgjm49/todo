import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import type { Block, BlockSort } from "../../types/block.js";
import type { ColumnId, RowId } from "../../domain/ids.js";
import { BlockColumnHeaderRow } from "./BlockColumnHeaderRow.js";
import { RowView } from "../row/RowView.js";

export function BlockCard({
  block,
  isEditing,
  dragging,
  dropTarget,
  isSelected,
  onStartEditing,
  onCommitTitle,
  onCancelEditing,
  onToggleCollapsed,
  onAddRow,
  onOpenMenu,
  onOpenColumnMenu,
  onOpenRowMenu,
  onSortColumn,
  onSelectBlock,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  block: Block;
  isEditing: boolean;
  dragging: boolean;
  dropTarget: boolean;
  isSelected: boolean;
  onStartEditing: () => void;
  onCommitTitle: (title: string) => void;
  onCancelEditing: () => void;
  onToggleCollapsed: () => void;
  onAddRow: () => void;
  onOpenMenu: (x: number, y: number) => void;
  onOpenColumnMenu?: (columnId: ColumnId, x: number, y: number) => void;
  onOpenRowMenu?: (rowId: RowId | null, x: number, y: number) => void;
  onSortColumn?: (columnId: ColumnId, direction: BlockSort["direction"]) => void;
  onSelectBlock: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: () => void;
}) {
  const [draftTitle, setDraftTitle] = useState(block.title);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraftTitle(block.title);
  }, [block.title]);

  useEffect(() => {
    if (isEditing) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditing]);

  const finishEditing = () => {
    const trimmedTitle = draftTitle.trim();

    if (!trimmedTitle || trimmedTitle === block.title) {
      setDraftTitle(block.title);
      onCancelEditing();
      return;
    }

    onCommitTitle(trimmedTitle);
    onCancelEditing();
  };

  const handleTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finishEditing();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setDraftTitle(block.title);
      onCancelEditing();
    }
  };

  return (
    <article
      className={`overflow-hidden rounded-3xl border bg-panel/85 shadow-soft transition ${
        dropTarget ? "border-accent/70 ring-2 ring-accent/40" : isSelected ? "border-accent/40 ring-1 ring-accent/30" : "border-border"
      } ${dragging ? "opacity-50" : ""}`}
      data-testid={`block-card-${block.id}`}
      draggable={!isEditing}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
    >
      <header
        className="flex items-start justify-between gap-4 border-b border-border px-5 py-4"
        data-testid={`block-header-${block.id}`}
        onClick={onSelectBlock}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-textMuted">
            <span>Block {block.order + 1}</span>
            <span>{dragging ? "Dragging" : "Drag to reorder"}</span>
          </div>
          {isEditing ? (
            <input
              ref={titleInputRef}
              className="mt-2 w-full rounded-lg border border-accent/50 bg-panel px-3 py-2 text-xl font-semibold text-text outline-none ring-1 ring-accent/30"
              onBlur={finishEditing}
              onChange={(event) => setDraftTitle(event.target.value)}
              onKeyDown={handleTitleKeyDown}
              value={draftTitle}
            />
          ) : (
            <button
              className="mt-1 truncate text-left text-xl font-semibold text-text transition hover:text-accent"
              onClick={onStartEditing}
              type="button"
            >
              {block.title}
            </button>
          )}
          <p className="mt-2 text-sm text-textMuted">{formatBlockTypeLabel(block.blockType)}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-text transition hover:border-accent/40 hover:bg-panelMuted"
            data-testid={`sort-menu-${block.id}`}
            onClick={(event) => onOpenMenu(event.clientX, event.clientY)}
            type="button"
          >
            Sort
          </button>
          <button
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-text transition hover:border-accent/40 hover:bg-panelMuted"
            data-testid={`add-row-${block.id}`}
            onClick={onAddRow}
            type="button"
          >
            + Row
          </button>
          <button
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-text transition hover:border-accent/40 hover:bg-panelMuted"
            onClick={onToggleCollapsed}
            type="button"
          >
            {block.collapsed ? "Expand" : "Collapse"}
          </button>
          <button
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-text transition hover:border-accent/40 hover:bg-panelMuted"
            onClick={(event) => onOpenMenu(event.clientX, event.clientY)}
            onContextMenu={(event) => {
              event.preventDefault();
              onOpenMenu(event.clientX, event.clientY);
            }}
            type="button"
          >
            Menu
          </button>
        </div>
      </header>

      {!block.collapsed ? (
        <div className="px-5 py-5">
          <div
            className="overflow-x-auto rounded-2xl border border-border bg-panelMuted/35"
            onContextMenu={(event) => {
              event.preventDefault();
              onOpenRowMenu?.(null, event.clientX, event.clientY);
            }}
          >
            <BlockColumnHeaderRow
              blockId={block.id}
              columns={block.columns}
              onOpenColumnMenu={onOpenColumnMenu}
              workspaceId={block.workspaceId}
              sort={block.sort}
              onSortColumn={onSortColumn}
            />
            <RowView block={block} workspaceId={block.workspaceId} />
          </div>
        </div>
      ) : null}
    </article>
  );
}

function formatBlockTypeLabel(blockType: Block["blockType"]): string {
  if (blockType === "basic_checklist") {
    return "Checklist";
  }

  if (blockType === "bulleted_list") {
    return "Bullet list";
  }

  return "Numbered list";
}
