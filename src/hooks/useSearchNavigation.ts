import { useCallback, useRef } from "react";
import { useDocumentStore } from "../stores/documentStore.js";
import { useUiStore } from "../stores/uiStore.js";
import type { SearchResult } from "../domain/search/index.js";

type TimeoutHandle = ReturnType<typeof setTimeout>;

export function navigateToSearchResult(result: SearchResult, timeoutHandles: TimeoutHandle[] = []): void {
  for (const handle of timeoutHandles) clearTimeout(handle);
  timeoutHandles.length = 0;

  useDocumentStore.getState().selectWorkspace(result.workspaceId);

  const selectAndScroll = () => {
    if (result.blockId && result.rowId && result.columnId) {
      useUiStore.getState().selectCell(result.workspaceId, result.blockId, result.rowId, result.columnId);
    } else if (result.blockId && result.rowId) {
      useUiStore.getState().selectRow(result.workspaceId, result.blockId, result.rowId);
    } else if (result.blockId) {
      useUiStore.getState().selectBlock(result.workspaceId, result.blockId);
    }

    const activeDocument = typeof document === "undefined" ? null : document;
    if (result.blockId) {
      activeDocument
        ?.querySelector(`[data-testid="block-card-${result.blockId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (result.rowId) {
      const rowTimeout = setTimeout(() => {
        activeDocument
          ?.querySelector(`[data-testid="row-${result.rowId}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        useUiStore.getState().setSearchFlashRowId(result.rowId ?? null);
        const flashTimeout = setTimeout(() => useUiStore.getState().setSearchFlashRowId(null), 2600);
        timeoutHandles.push(flashTimeout);
      }, 300);
      timeoutHandles.push(rowTimeout);
    }
  };

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(selectAndScroll);
  } else {
    setTimeout(selectAndScroll, 0);
  }
}

export function useSearchNavigation(): (result: SearchResult) => void {
  const timeoutHandles = useRef<TimeoutHandle[]>([]);

  return useCallback((result: SearchResult) => {
    navigateToSearchResult(result, timeoutHandles.current);
  }, []);
}
