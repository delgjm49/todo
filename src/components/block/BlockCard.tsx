import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import type { Block } from "../../types/block.js";

export function BlockCard({
  block,
  isEditing,
  dragging,
  dropTarget,
  onStartEditing,
  onCommitTitle,
  onCancelEditing,
  onToggleCollapsed,
  onOpenMenu,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  block: Block;
  isEditing: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onStartEditing: () => void;
  onCommitTitle: (title: string) => void;
  onCancelEditing: () => void;
  onToggleCollapsed: () => void;
  onOpenMenu: (x: number, y: number) => void;
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
        dropTarget ? "border-accent/70 ring-2 ring-accent/40" : "border-border"
      } ${dragging ? "opacity-50" : ""}`}
      draggable={!isEditing}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
    >
      <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
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
          <div className="rounded-2xl border border-dashed border-border bg-panelMuted/50 px-4 py-6 text-sm text-textMuted">
            Row and cell editing land in the next checkpoint. This block now supports title editing, collapsing,
            reordering, moving, and deletion.
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
