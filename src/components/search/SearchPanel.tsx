import { useEffect, useMemo, useRef, useState } from "react";
import { searchDocuments, type SearchResult } from "../../domain/search/index.js";
import { useDocumentStore } from "../../stores/documentStore.js";
import { useSearchNavigation } from "../../hooks/useSearchNavigation.js";
import { SearchResultItem } from "./SearchResultItem.js";

export function SearchPanel({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const workspaceIndex = useDocumentStore((state) => state.workspaceIndex);
  const workspacesById = useDocumentStore((state) => state.workspacesById);
  const navigateToSearchResult = useSearchNavigation();
  const searchResult = useMemo(
    () => searchDocuments({ query, workspaceIndex, workspacesById }),
    [query, workspaceIndex, workspacesById],
  );
  const blank = query.trim().length === 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const groups = useMemo(() => groupByWorkspace(searchResult.results), [searchResult.results]);

  return (
    <div
      className="w-[420px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-panel p-3 text-text shadow-soft"
      data-testid="search-panel"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-textMuted" htmlFor="global-search-input">
        Search
      </label>
      <input
        aria-label="Search workspaces, blocks, and cells"
        className="mt-2 w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm text-text outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
        data-testid="search-input"
        id="global-search-input"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search workspaces, blocks, cells..."
        ref={inputRef}
        value={query}
      />
      <div className="mt-3 max-h-[min(70vh,520px)] overflow-y-auto pr-1">
        {blank ? <p className="rounded-lg bg-panelMuted p-3 text-sm text-textMuted">Search workspaces, blocks, and text/date/time/dropdown cells.</p> : null}
        {!blank && searchResult.totalMatches === 0 ? <p className="rounded-lg bg-panelMuted p-3 text-sm text-textMuted">No results found.</p> : null}
        {!blank && searchResult.totalMatches > 0 ? (
          <>
            <p className="mb-2 text-xs text-textMuted" data-testid="search-result-count">
              {searchResult.capped ? `Showing first ${searchResult.results.length} of ${searchResult.totalMatches} results` : `${searchResult.totalMatches} result${searchResult.totalMatches === 1 ? "" : "s"}`}
            </p>
            <div className="space-y-3">
              {groups.map((group) => (
                <section key={group.workspaceTitle}>
                  <h3 className="mb-1 text-xs font-semibold text-textMuted">{group.workspaceTitle}</h3>
                  <div className="space-y-1.5">
                    {group.results.map((result) => (
                      <SearchResultItem
                        key={result.id}
                        result={result}
                        onSelect={(selected) => {
                          navigateToSearchResult(selected);
                          onClose();
                        }}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function groupByWorkspace(results: SearchResult[]): Array<{ workspaceTitle: string; results: SearchResult[] }> {
  const groups: Array<{ workspaceTitle: string; results: SearchResult[] }> = [];
  for (const result of results) {
    let group = groups.find((candidate) => candidate.workspaceTitle === result.workspaceTitle);
    if (!group) {
      group = { workspaceTitle: result.workspaceTitle, results: [] };
      groups.push(group);
    }
    group.results.push(result);
  }
  return groups;
}
