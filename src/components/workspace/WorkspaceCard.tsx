import type { DragEvent } from "react";
import type { WorkspaceIndexEntry, WorkspaceAlertSummary } from "../../types/workspace.js";

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
            <AlertBadge summary={entry.alertSummary} />
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

// ---------------------------------------------------------------------------
// AlertBadge — polished visual indicator for workspace alert state
// ---------------------------------------------------------------------------

function formatAlertCount(count: number): string {
  if (count > 99) return "99+";
  return String(count);
}

function AlertBadge({ summary }: { summary: WorkspaceAlertSummary }) {
  const count = summary.count;

  return (
    <div
      className="flex shrink-0 flex-col items-end gap-0.5"
      data-testid="alert-badge"
    >
      <div
        className="flex items-center gap-1.5 rounded-full bg-warning/20 px-2.5 py-1 text-xs font-semibold text-warning ring-1 ring-warning/40"
        role="status"
        aria-label={`${count} active alert${count > 1 ? "s" : ""}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
        <span data-testid="alert-count">{formatAlertCount(count)}</span>
      </div>
      {summary.note ? (
        <span
          className="max-w-[100px] truncate text-[10px] leading-tight text-warning/65"
          data-testid="alert-note"
          aria-label={`Note: ${summary.note}`}
        >
          {summary.note}
        </span>
      ) : null}
    </div>
  );
}
