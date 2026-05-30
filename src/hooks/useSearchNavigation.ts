import { useCallback, useRef } from "react";
import { useDocumentStore } from "../stores/documentStore.js";
import { useUiStore } from "../stores/uiStore.js";
import type { SearchResult } from "../domain/search/index.js";

type TimeoutHandle = ReturnType<typeof setTimeout>;
type PendingSearchNavigationHandle =
  | { kind: "timeout"; handle: TimeoutHandle }
  | { kind: "animationFrame"; handle: number };

function clearPendingSearchNavigation(handles: PendingSearchNavigationHandle[]): void {
  for (const entry of handles) {
    if (entry.kind === "animationFrame" && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(entry.handle);
    } else if (entry.kind === "timeout") {
      clearTimeout(entry.handle);
    }
  }
  handles.length = 0;
}

export function navigateToSearchResult(result: SearchResult, timeoutHandles: PendingSearchNavigationHandle[] = []): void {
  clearPendingSearchNavigation(timeoutHandles);

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
        timeoutHandles.push({ kind: "timeout", handle: flashTimeout });
      }, 300);
      timeoutHandles.push({ kind: "timeout", handle: rowTimeout });
    }
  };

  if (typeof requestAnimationFrame === "function") {
    const animationFrame = requestAnimationFrame(selectAndScroll);
    timeoutHandles.push({ kind: "animationFrame", handle: animationFrame });
  } else {
    const fallbackTimeout = setTimeout(selectAndScroll, 0);
    timeoutHandles.push({ kind: "timeout", handle: fallbackTimeout });
  }
}

export function useSearchNavigation(): (result: SearchResult) => void {
  const timeoutHandles = useRef<PendingSearchNavigationHandle[]>([]);

  return useCallback((result: SearchResult) => {
    navigateToSearchResult(result, timeoutHandles.current);
  }, []);
}
