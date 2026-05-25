# Plan: In-App Alert Scheduler

## Overview

Build a `useAlertScheduler` React hook that runs the TICKET-053 domain evaluation layer (`evaluateWorkspace`) on all loaded workspaces at startup, on a 30-second interval, and immediately when date/time cell values change. The hook writes computed `WorkspaceAlertSummary` values onto workspace index entries via a new dedicated store action, bridging the gap between the evaluation domain and the existing dock badge UI.

## Prerequisites

- TICKET-053 domain layer is merged: `evaluateRow`, `evaluateWorkspace`, barrel export in `src/domain/alerts/index.ts` (confirmed present)
- `WorkspaceAlertSummary` type exists in `src/types/workspace.ts` (confirmed)
- `WorkspaceIndexEntry.alertSummary` field exists and is persisted via `storageSchemas.ts` (confirmed)
- `WorkspaceCard` already renders `entry.alertSummary?.count` as a badge (confirmed)

## Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Create | `src/hooks/useAlertScheduler.ts` | React hook: startup scan, interval polling, cleanup |
| Modify | `src/stores/documentStore.ts` | Add `updateWorkspaceAlertSummary` action |
| Modify | `src/components/layout/AppShell.tsx` | Mount `useAlertScheduler()` |
| Create | `src/tests/unit/alertScheduler.test.ts` | Unit tests for the scheduler hook and store action |

## Implementation Steps

### Step 1: Add `updateWorkspaceAlertSummary` store action

- **File**: `src/stores/documentStore.ts`
- Add a new action to the `DocumentStoreState` interface:
  ```ts
  updateWorkspaceAlertSummary: (
    workspaceId: WorkspaceId,
    alertSummary: WorkspaceAlertSummary | null,
  ) => void;
  ```
- This action uses **direct `set()` without history** — alert summaries are derived state that should not be undoable. It updates the `workspaceIndex` array in place (mapping over entries to replace the matching workspace's `alertSummary`) and triggers autosave via `scheduleAutosave`.
- Implementation pattern:
  ```ts
  updateWorkspaceAlertSummary: (workspaceId, alertSummary) => {
    const state = get();
    if (!state.settings) return;

    const entryIndex = state.workspaceIndex.findIndex((e) => e.id === workspaceId);
    if (entryIndex < 0) return;

    const current = state.workspaceIndex[entryIndex].alertSummary;
    // Skip if summary is unchanged (same count and same primary target)
    if (
      (current?.count ?? 0) === (alertSummary?.count ?? 0) &&
      current?.blockId === alertSummary?.blockId &&
      current?.rowId === alertSummary?.rowId &&
      current?.columnId === alertSummary?.columnId
    ) {
      return;
    }

    const nextIndex = state.workspaceIndex.map((entry) =>
      entry.id === workspaceId
        ? { ...structuredClone(entry), alertSummary: alertSummary?.count === 0 ? null : alertSummary }
        : structuredClone(entry)
    );

    set({ workspaceIndex: nextIndex });
    scheduleAutosave(undefined, undefined, state.saveAll);
  },
  ```
- Key design decisions:
  - **No undo history**: Alert summaries are computed/derived — pushing them into history would pollute the undo stack with non-user-initiated changes.
  - **No-op guard**: Compare count + primary target before `set()` to avoid unnecessary re-renders on each 30-second tick.
  - **Normalize zero to null**: If `count === 0`, store `null` so the badge disappears cleanly.
  - **Triggers autosave**: So the computed summaries persist to disk (matching existing persistence of `alertSummary` in `storageSchemas.ts`).
- **Verify**: In a unit test, call the action with a summary and confirm `workspaceIndex` entry is updated. Call again with identical data and confirm no state change.

### Step 2: Create `useAlertScheduler` hook

- **File**: `src/hooks/useAlertScheduler.ts`
- Import `evaluateWorkspace` from `../../domain/alerts/index.js`
- Import `useDocumentStore` from `../../stores/documentStore.js`
- The hook runs inside a `useEffect` that:
  1. **Startup scan**: On mount, calls `evaluateAllWorkspaces()` immediately.
  2. **Interval polling**: Starts a `setInterval` at `ALERT_POLL_INTERVAL_MS` (30000ms, exported as a named constant for test overrides).
  3. **Cleanup**: Returns a cleanup function that calls `clearInterval`.

- Core evaluation function (`evaluateAllWorkspaces`):
  ```ts
  function evaluateAllWorkspaces(): void {
    const state = useDocumentStore.getState();
    const now = new Date();

    for (const entry of state.workspaceIndex) {
      const document = state.workspacesById[entry.id];
      if (!document) continue;

      const summary = evaluateWorkspace(document, now);
      state.updateWorkspaceAlertSummary(
        entry.id,
        summary.count === 0 ? null : summary,
      );
    }
  }
  ```

- The function is defined outside the hook body (module-level) so it can be called from both the hook and the edit-triggered path. Export it as a named export for testing.

- Hook body:
  ```ts
  export function useAlertScheduler(): void {
    useEffect(() => {
      evaluateAllWorkspaces();
      const intervalId = setInterval(evaluateAllWorkspaces, ALERT_POLL_INTERVAL_MS);
      return () => clearInterval(intervalId);
    }, []);
  }
  ```

- **Verify**: Mount the hook in a test environment. Confirm that evaluation runs immediately and that `clearInterval` is called on unmount.

### Step 3: Add edit-triggered re-evaluation

- **File**: `src/stores/documentStore.ts`
- In both `updateDateCellValue` and `updateTimeCellValue`, after the `commitSnapshot` call succeeds (returns `true`), add a call to re-evaluate the affected workspace:
  ```ts
  if (committed) {
    // Schedule immediate re-evaluation for this workspace
    queueMicrotask(() => {
      const freshState = get();
      const freshDoc = freshState.workspacesById[workspaceId];
      if (freshDoc) {
        const summary = evaluateWorkspace(freshDoc, new Date());
        freshState.updateWorkspaceAlertSummary(
          workspaceId,
          summary.count === 0 ? null : summary,
        );
      }
    });
  }
  return committed;
  ```
- Import `evaluateWorkspace` from `../domain/alerts/index.js` at the top of `documentStore.ts`.
- Use `queueMicrotask` to ensure the evaluation runs after the snapshot commit has fully propagated, reading fresh state. This avoids evaluating stale data.
- Only the **affected workspace** (identified by `workspaceId` parameter) is re-evaluated, not all workspaces. This keeps edit-triggered evaluation lightweight.
- **Verify**: In a unit test, update a date cell value and confirm the workspace's `alertSummary` is updated in the same tick (after microtask flush).

### Step 4: Mount the hook in AppShell

- **File**: `src/components/layout/AppShell.tsx`
- Add import: `import { useAlertScheduler } from "../../hooks/useAlertScheduler.js";`
- Call `useAlertScheduler();` inside the `AppShell` component body, alongside the existing `useHotkeys()` call.
- **Verify**: App starts without errors. The hook runs on mount.

### Step 5: Write unit tests

- **File**: `src/tests/unit/alertScheduler.test.ts`
- Use the same test runner pattern as `alertEvaluation.test.ts` (`node:test` + `node:assert/strict`).
- Use `vi.useFakeTimers()` (Vitest) or manual mocking for interval control.

Test cases:

1. **Store action — updates alertSummary on workspace index entry**: Initialize store with a workspace. Call `updateWorkspaceAlertSummary(workspaceId, { count: 2, blockId: "b1", rowId: "r1", columnId: "c1" })`. Assert `workspaceIndex[0].alertSummary` matches.

2. **Store action — sets null when count is 0**: Call `updateWorkspaceAlertSummary(workspaceId, { count: 0 })`. Assert `alertSummary` is `null`.

3. **Store action — no-op on identical summary**: Set a summary, then call again with identical values. Verify no state change (use a subscriber spy or reference equality check).

4. **Store action — no-op for unknown workspace**: Call with a non-existent workspace ID. Assert no error and no state change.

5. **evaluateAllWorkspaces — populates summaries on startup**: Set up store with a workspace containing a past-due date row. Call `evaluateAllWorkspaces()`. Assert `alertSummary` is populated with `count > 0`.

6. **evaluateAllWorkspaces — clears summary when no alerts**: Set up store with a workspace containing no alert-enabled columns. Call `evaluateAllWorkspaces()`. Assert `alertSummary` is `null`.

7. **Edit-triggered re-evaluation**: Initialize store. Set a date cell to a past-due value via `updateDateCellValue`. Flush microtasks. Assert `alertSummary` is updated.

8. **Edit-triggered — time cell**: Same as above but with `updateTimeCellValue` and a past-due time.

9. **Interval cleanup**: Mount the hook, capture the interval ID, unmount, verify `clearInterval` was called.

10. **Workspace with no document in workspacesById**: Add a workspace index entry without a matching document in `workspacesById`. Confirm `evaluateAllWorkspaces` skips it without error.

- **Verify**: `npm run test` passes with all new tests green.

## Data / Storage Changes

No schema changes. The `alertSummary` field already exists on `WorkspaceIndexEntry` and is already persisted/validated by `storageSchemas.ts`. The scheduler simply writes computed values to this existing field.

## UI Specifications

No new UI components. The scheduler is invisible infrastructure — `WorkspaceCard` already reads `entry.alertSummary?.count` and renders a badge. Once the scheduler populates this field, badges will appear automatically.

## Acceptance Criteria

- [ ] `updateWorkspaceAlertSummary` store action exists and updates `workspaceIndex` entries without polluting undo history
- [ ] `useAlertScheduler` hook evaluates all workspaces on mount
- [ ] Interval polling re-evaluates all workspaces every 30 seconds
- [ ] `updateDateCellValue` and `updateTimeCellValue` trigger immediate re-evaluation of the affected workspace
- [ ] Zero-count summaries are stored as `null` (badge disappears)
- [ ] Identical re-evaluations are no-ops (no unnecessary re-renders)
- [ ] Interval is cleaned up on unmount (no memory leaks)
- [ ] Unit tests cover: store action, startup scan, interval, edit-triggered, cleanup, edge cases
- [ ] `npm run test` passes
- [ ] `npm run lint` passes

## Estimated Complexity

- **Small–Medium**
- 4 files (1 new hook, 1 new test file, 2 modifications)
- Core logic is straightforward: the hard evaluation work is already done by TICKET-053's domain layer
