import { useEffect } from "react";
import { evaluateWorkspace } from "../domain/alerts/index.js";
import { useDocumentStore } from "../stores/documentStore.js";

/**
 * Polling interval for re-evaluating all workspaces (30 seconds).
 * Exported as a named constant so tests can reference or override it.
 */
export const ALERT_POLL_INTERVAL_MS = 30_000;

/**
 * Evaluates all loaded workspaces and updates their alert summaries.
 *
 * Called on startup (once) and on each interval tick.
 * Exported for direct testing.
 */
export function evaluateAllWorkspaces(): void {
  const state = useDocumentStore.getState();

  for (const entry of state.workspaceIndex) {
    const document = state.workspacesById[entry.id];
    if (!document) continue;

    const summary = evaluateWorkspace(document, new Date());
    state.updateWorkspaceAlertSummary(
      entry.id,
      summary.count === 0 ? null : summary,
    );
  }
}

/**
 * React hook that schedules periodic alert evaluation.
 *
 * - Runs an initial evaluation on mount.
 * - Re-evaluates all workspaces every `ALERT_POLL_INTERVAL_MS` (30s).
 * - Cleans up the interval on unmount.
 *
 * Mount this once at the app shell level so it runs for the lifetime of the app.
 */
export function useAlertScheduler(): void {
  useEffect(() => {
    evaluateAllWorkspaces();

    const intervalId = setInterval(evaluateAllWorkspaces, ALERT_POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, []);
}
