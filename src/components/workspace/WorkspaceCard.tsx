import type { DragEvent } from "react";
import type { WorkspaceIndexEntry } from "../../types/workspace.js";

export function WorkspaceCard({
  entry,
  active,
  dragging,
  dropTarget,
  onOpenMenu,
  onSelect,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
}: {
  entry: WorkspaceIndexEntry;
  active: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onOpenMenu: (x: number, y: number) => void;
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onDragOver: (event: DragEvent<HTMLButtonElement>) => void;
}) {
  const workspaceBackground = entry.style.background ?? undefined;
  const workspaceTextColor = entry.style.textColor ?? undefined;

  return (
    <button
      className={`group relative flex w-full items-stretch overflow-hidden rounded-2xl border text-left transition ${
        active
          ? "border-accent/70 shadow-soft ring-1 ring-accent/40"
          : "border-border bg-panelMuted/60 hover:border-accent/40"
      } ${dragging ? "opacity-50" : ""} ${dropTarget ? "ring-2 ring-accent/60" : ""}`}
      draggable
      onClick={onSelect}
      onContextMenu={(event) => {
        event.preventDefault();
        onOpenMenu(event.clientX, event.clientY);
      }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      style={{
        backgroundColor: workspaceBackground,
        color: workspaceTextColor,
      }}
      type="button"
    >
      <div
        className={`w-2 shrink-0 ${
          entry.style.accentStripe?.enabled === false ? "bg-transparent" : "bg-accent"
        }`}
        style={{
          backgroundColor:
            entry.style.accentStripe?.enabled === false ? "transparent" : entry.style.accentStripe?.color,
        }}
      />
      <div className="min-w-0 flex-1 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{entry.title}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.22em] opacity-70">
              Workspace {entry.order + 1}
            </div>
          </div>
          {entry.alertSummary?.count ? (
            <div className="rounded-full border border-warning/40 bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
              {entry.alertSummary.count}
            </div>
          ) : null}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs opacity-70">
          <span>{entry.style.background ?? "#1F2937"}</span>
          <span>/</span>
          <span>{entry.style.textColor ?? "#F9FAFB"}</span>
        </div>
      </div>
    </button>
  );
}
