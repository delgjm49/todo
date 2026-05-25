import { useEffect } from "react";
import { useDocumentStore } from "../stores/documentStore.js";
import { useUiStore } from "../stores/uiStore.js";

/**
 * Module-level deduplication set.
 *
 * Tracks which alert targets have already been flashed during this
 * app session by their composite key: `${workspaceId}:${blockId}:${rowId}`.
 * This prevents re-flashing the same unresolved alert on repeated
 * workspace selections or scheduler re-evaluations.
 */
const flashedAlertKeys = new Set<string>();

/**
 * Resets the flashed-alerts deduplication set.
 *
 * Exported for testing so each test case can start with a clean slate.
 */
export function resetFlashedAlerts(): void {
  flashedAlertKeys.clear();
}

/**
 * Watches `activeWorkspaceId` changes and coordinates alert navigation:
 *
 * 1. Validates the alert target (blockId / rowId) exists in the document.
 * 2. Sets UI selection to the target row (or cell if columnId is present).
 * 3. Scrolls the block card into view, then the target row.
 * 4. Applies a brief flash animation on the target row.
 *
 * Session deduplication prevents re-flashing the same unresolved alert.
 * If the target no longer exists, the alert summary is silently cleared.
 *
 * Mount this once at the app shell level so it runs for the lifetime
 * of the app.
 */
export function useAlertNavigation(): void {
  const activeWorkspaceId = useDocumentStore((state) => state.activeWorkspaceId);

  useEffect(() => {
    if (!activeWorkspaceId) return;

    const state = useDocumentStore.getState();
    const entry = state.workspaceIndex.find((e) => e.id === activeWorkspaceId);
    if (!entry?.alertSummary) return;

    const { blockId, rowId, columnId } = entry.alertSummary;
    if (!blockId || !rowId) return; // count-only summary — open normally

    // Deduplication check
    const key = `${activeWorkspaceId}:${blockId}:${rowId}`;
    if (flashedAlertKeys.has(key)) return;

    // Validate target exists
    const workspace = state.workspacesById[activeWorkspaceId];
    if (!workspace) return;

    const block = workspace.blocks.find((b) => b.id === blockId);
    if (!block) {
      // Target block no longer exists — clear alert summary
      state.updateWorkspaceAlertSummary(activeWorkspaceId, null);
      return;
    }

    const row = block.rows.find((r) => r.id === rowId);
    if (!row) {
      // Target row no longer exists — clear alert summary
      state.updateWorkspaceAlertSummary(activeWorkspaceId, null);
      return;
    }

    // Set UI selection to the target row (or cell if columnId exists)
    if (columnId) {
      useUiStore.getState().selectCell(activeWorkspaceId, blockId, rowId, columnId);
    } else {
      useUiStore.getState().selectRow(activeWorkspaceId, blockId, rowId);
    }

    // Mark as flashed (synchronously, before any async operations)
    flashedAlertKeys.add(key);

    // Wait one frame for React to render the workspace/selection change,
    // then scroll and flash
    requestAnimationFrame(() => {
      const blockEl = document.querySelector(`[data-testid="block-card-${blockId}"]`);
      if (blockEl) {
        blockEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      // Slight delay to let the block scroll settle, then scroll to row
      setTimeout(() => {
        const rowEl = document.querySelector(`[data-testid="row-${rowId}"]`);
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }

        // Trigger flash animation
        useUiStore.getState().setAlertFlashRowId(rowId);

        // Clear flash after animation completes (slightly longer than 2.5s)
        setTimeout(() => {
          useUiStore.getState().setAlertFlashRowId(null);
        }, 2600);
      }, 300);
    });
  }, [activeWorkspaceId]);
}
