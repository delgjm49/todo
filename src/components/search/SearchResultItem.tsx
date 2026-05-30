import type { SearchResult } from "../../domain/search/index.js";

export function SearchResultItem({ result, onSelect }: { result: SearchResult; onSelect: (result: SearchResult) => void }) {
  return (
    <button
      className="w-full rounded-lg border border-border/70 bg-panel px-3 py-2 text-left transition hover:border-accent/50 hover:bg-panelMuted focus:outline-none focus:ring-2 focus:ring-accent/30"
      data-testid={`search-result-${result.id}`}
      onClick={() => onSelect(result)}
      type="button"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">{labelForKind(result)}</span>
        {result.columnLabel ? <span className="truncate text-xs text-textMuted">{result.columnLabel}</span> : null}
      </div>
      <div className="mt-1 truncate text-sm font-medium text-text">{result.snippet}</div>
      <div className="mt-1 truncate text-xs text-textMuted">{contextForResult(result)}</div>
    </button>
  );
}

function labelForKind(result: SearchResult): string {
  if (result.kind === "workspace") return "Workspace";
  if (result.kind === "block") return "Block";
  return "Cell";
}

function contextForResult(result: SearchResult): string {
  if (result.blockTitle) return `${result.workspaceTitle} / ${result.blockTitle}`;
  return result.workspaceTitle;
}
