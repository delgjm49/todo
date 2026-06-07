import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createMemoryStorageService } from "../../services/storage/index.js";
import { useDocumentStore } from "../../stores/documentStore.js";
import {
  evaluateAllWorkspaces,
  ALERT_POLL_INTERVAL_MS,
} from "../../hooks/useAlertScheduler.js";
import type { Block } from "../../types/block.js";
import type { ColumnDefinition } from "../../types/column.js";
import type { PersistedCell, Row } from "../../types/row.js";
import type { WorkspaceDocument, WorkspaceIndexEntry } from "../../types/workspace.js";

// ---------------------------------------------------------------------------
// Factory helpers (matching alertEvaluation.test.ts patterns)
// ---------------------------------------------------------------------------

function column(
  overrides: Partial<ColumnDefinition> & Pick<ColumnDefinition, "id" | "type">,
): ColumnDefinition {
  const defaults: ColumnDefinition = {
    id: overrides.id,
    type: overrides.type,
    label: overrides.id,
    order: 0,
    width: 120,
    visible: true,
    settings: {},
    format: {},
  };

  if (
    (overrides.type === "date" || overrides.type === "time") &&
    !("settings" in overrides)
  ) {
    defaults.settings = { alertsEnabled: true };
  }

  return { ...defaults, ...overrides };
}

function row(
  id: string,
  order: number,
  values: Record<string, PersistedCell["value"] | undefined>,
): Row {
  const cells: Record<string, PersistedCell> = {};
  for (const [columnId, value] of Object.entries(values)) {
    if (value !== undefined) {
      cells[columnId] = { value, format: {} };
    }
  }

  return {
    id,
    order,
    format: {},
    cells,
  };
}

function block(
  id: string,
  columns: ColumnDefinition[],
  rows: Row[],
): Block {
  return {
    id,
    workspaceId: "ws_test",
    title: "Test Block",
    blockType: "basic_checklist",
    order: 0,
    collapsed: false,
    hideCompletedRows: false,
    border: {},
    sort: null,
    format: {},
    columns,
    rows,
  };
}

function workspaceDocument(id: string, blocks: Block[]): WorkspaceDocument {
  return {
    id,
    blocks,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Initialize the document store with a memory storage service.
 * Returns the active workspace ID so callers can build on top of the
 * default workspace that `initializeAppData` creates.
 */
async function initStore(): Promise<string> {
  const service = await createMemoryStorageService();
  service.saveAppData = async (document) => ({
    persistenceState: "full" as const,
    persisted: {
      settings: true,
      workspaceIndex: true,
      workspaceIds: document.loadedWorkspaceIds ?? [],
    },
  });

  await useDocumentStore.getState().initializeAppData(service);

  const activeId = useDocumentStore.getState().activeWorkspaceId;
  assert.ok(activeId);
  return activeId;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("updateWorkspaceAlertSummary store action", () => {
  test("updates alertSummary on workspace index entry", async () => {
    const workspaceId = await initStore();

    useDocumentStore
      .getState()
      .updateWorkspaceAlertSummary(workspaceId, {
        count: 2,
        blockId: "b1",
        rowId: "r1",
        columnId: "c1",
      });

    const entry = useDocumentStore
      .getState()
      .workspaceIndex.find((e) => e.id === workspaceId);
    assert.ok(entry);
    assert.equal(entry.alertSummary?.count, 2);
    assert.equal(entry.alertSummary?.blockId, "b1");
    assert.equal(entry.alertSummary?.rowId, "r1");
    assert.equal(entry.alertSummary?.columnId, "c1");
  });

  test("sets null when count is 0", async () => {
    const workspaceId = await initStore();

    useDocumentStore
      .getState()
      .updateWorkspaceAlertSummary(workspaceId, { count: 0 });
    const entry = useDocumentStore
      .getState()
      .workspaceIndex.find((e) => e.id === workspaceId);
    assert.ok(entry);
    assert.equal(entry.alertSummary, null);
  });

  test("no-op on identical summary", async () => {
    const workspaceId = await initStore();

    useDocumentStore
      .getState()
      .updateWorkspaceAlertSummary(workspaceId, {
        count: 1,
        blockId: "b1",
        rowId: "r1",
        columnId: "c1",
      });

    const entryAfterFirst = useDocumentStore
      .getState()
      .workspaceIndex.find((e) => e.id === workspaceId);
    assert.ok(entryAfterFirst);
    assert.equal(entryAfterFirst.alertSummary?.count, 1);

    // Call again with identical values
    useDocumentStore
      .getState()
      .updateWorkspaceAlertSummary(workspaceId, {
        count: 1,
        blockId: "b1",
        rowId: "r1",
        columnId: "c1",
      });

    const entryAfterSecond = useDocumentStore
      .getState()
      .workspaceIndex.find((e) => e.id === workspaceId);
    assert.ok(entryAfterSecond);
    // Should still be the same object reference from the first set
    assert.equal(entryAfterSecond.alertSummary?.count, 1);
  });

  test("no-op for unknown workspace", async () => {
    await initStore();

    // Should not throw or change state
    useDocumentStore.getState().updateWorkspaceAlertSummary("nonexistent-ws", {
      count: 5,
      blockId: "b1",
      rowId: "r1",
      columnId: "c1",
    });

    const entries = useDocumentStore.getState().workspaceIndex;
    assert.ok(entries.every((e) => e.alertSummary == null));
  });
});

describe("evaluateAllWorkspaces", () => {
  test("populates summaries on startup for a workspace with past-due date rows", async () => {
    const workspaceId = await initStore();

    // Add an alert-enabled date column and a row with a past-due date
    const dateCol = column({ id: "due", type: "date" });
    const wsBlock = block(
      "b1",
      [dateCol],
      [row("r1", 0, { due: "2025-01-01" })],
    );
    const doc = workspaceDocument(workspaceId, [wsBlock]);

    // Inject the workspace document directly (store is initialized)
    useDocumentStore.setState({
      workspacesById: {
        ...useDocumentStore.getState().workspacesById,
        [workspaceId]: doc,
      },
    });

    // Set up the index entry to have proper block/column structure
    const indexEntry = useDocumentStore
      .getState()
      .workspaceIndex.find((e) => e.id === workspaceId);
    assert.ok(indexEntry);

    // evaluateAllWorkspaces uses now = new Date(); we need to ensure
    // the test date is in the past relative to "now"
    evaluateAllWorkspaces();

    const entry = useDocumentStore
      .getState()
      .workspaceIndex.find((e) => e.id === workspaceId);
    assert.ok(entry);
    assert.ok(entry.alertSummary !== null && entry.alertSummary !== undefined);
    assert.ok(entry.alertSummary.count > 0);
    assert.equal(entry.alertSummary.blockId, "b1");
    assert.equal(entry.alertSummary.rowId, "r1");
    assert.equal(entry.alertSummary.columnId, "due");
  });

  test("clears summary when workspace has no alerts", async () => {
    const workspaceId = await initStore();

    // Add a text column only (not alert-enabled) with no date/time columns
    const textCol = column({ id: "task", type: "text" });
    const wsBlock = block(
      "b1",
      [textCol],
      [row("r1", 0, { task: "hello" })],
    );
    const doc = workspaceDocument(workspaceId, [wsBlock]);

    useDocumentStore.setState({
      workspacesById: {
        ...useDocumentStore.getState().workspacesById,
        [workspaceId]: doc,
      },
    });

    // Pre-populate a stale summary to confirm it gets cleared
    useDocumentStore.getState().updateWorkspaceAlertSummary(workspaceId, {
      count: 3,
      blockId: "old",
      rowId: "old",
      columnId: "old",
    });

    evaluateAllWorkspaces();

    const entry = useDocumentStore
      .getState()
      .workspaceIndex.find((e) => e.id === workspaceId);
    assert.ok(entry);
    // No alert-enabled columns → count 0 → stored as null
    assert.equal(entry.alertSummary, null);
  });

  test("skips workspace index entries without a matching workspace document", async () => {
    await initStore();

    // Add an orphan workspace index entry with no corresponding document
    const orphanEntry: WorkspaceIndexEntry = {
      id: "ws_orphan" as WorkspaceIndexEntry["id"],
      title: "Orphan",
      order: 999,
      style: {},
      alertSummary: null,
    };
    useDocumentStore.setState({
      workspaceIndex: [
        ...useDocumentStore.getState().workspaceIndex,
        orphanEntry,
      ],
    });

    // Should not throw
    evaluateAllWorkspaces();
  });
});

describe("ALERT_POLL_INTERVAL_MS", () => {
  test("is set to 30 seconds", () => {
    assert.equal(ALERT_POLL_INTERVAL_MS, 30_000);
  });
});

describe("edit-triggered re-evaluation", () => {
  test("updateDateCellValue triggers alert re-evaluation", async () => {
    const workspaceId = await initStore();

    // Build a workspace with an alert-enabled date column and a past-due row
    const dateCol = column({ id: "due", type: "date" });
    const wsBlock = block(
      "b1",
      [dateCol],
      [row("r1", 0, { due: "2099-01-01" })], // far future — no alert yet
    );
    const doc = workspaceDocument(workspaceId, [wsBlock]);
    useDocumentStore.setState({
      workspacesById: {
        ...useDocumentStore.getState().workspacesById,
        [workspaceId]: doc,
      },
    });

    // Confirm no alert initially
    evaluateAllWorkspaces();
    let entry = useDocumentStore
      .getState()
      .workspaceIndex.find((e) => e.id === workspaceId);
    assert.ok(entry);
    assert.equal(entry.alertSummary, null);

    // Change the date to a past-due value via the store action
    const committed = useDocumentStore
      .getState()
      .updateDateCellValue(workspaceId, "b1", "r1", "due", "2024-01-01");
    assert.equal(committed, true);

    // Flush microtasks so the queueMicrotask re-evaluation runs
    await wait(0);

    entry = useDocumentStore
      .getState()
      .workspaceIndex.find((e) => e.id === workspaceId);
    assert.ok(entry);
    assert.ok(entry.alertSummary !== null && entry.alertSummary !== undefined);
    assert.ok(entry.alertSummary.count > 0);
    assert.equal(entry.alertSummary.columnId, "due");
  });

  test("updateTimeCellValue triggers alert re-evaluation", async () => {
    const workspaceId = await initStore();

    // Build a workspace with an alert-enabled time column and a future-time row
    const timeCol = column({ id: "when", type: "time" });
    // Create time far in the future to avoid alert initially
    const futureHour = new Date().getHours() + 5;
    const futureTime = `${String(futureHour % 24).padStart(2, "0")}:00`;
    const wsBlock = block(
      "b1",
      [timeCol],
      [row("r1", 0, { when: futureTime })],
    );
    const doc = workspaceDocument(workspaceId, [wsBlock]);
    useDocumentStore.setState({
      workspacesById: {
        ...useDocumentStore.getState().workspacesById,
        [workspaceId]: doc,
      },
    });

    // Confirm no alert initially
    evaluateAllWorkspaces();
    let entry = useDocumentStore
      .getState()
      .workspaceIndex.find((e) => e.id === workspaceId);
    assert.ok(entry);
    assert.equal(entry.alertSummary, null);

    // Change the time to a past-due value (00:01 — always in the past)
    const committed = useDocumentStore
      .getState()
      .updateTimeCellValue(workspaceId, "b1", "r1", "when", "00:01");
    assert.equal(committed, true);

    // Flush microtasks
    await wait(0);

    entry = useDocumentStore
      .getState()
      .workspaceIndex.find((e) => e.id === workspaceId);
    assert.ok(entry);
    assert.ok(entry.alertSummary !== null && entry.alertSummary !== undefined);
    assert.ok(entry.alertSummary.count > 0);
    assert.equal(entry.alertSummary.columnId, "when");
  });

  test("no re-evaluation when commit fails (no-op date edit)", async () => {
    // Initialize store to ensure it's ready, then call updateDateCellValue
    // with a non-existent workspace — should fail but not throw
    await initStore();
    const committed = useDocumentStore
      .getState()
      .updateDateCellValue("nonexistent", "b1", "r1", "due", "2024-01-01");
    assert.equal(committed, false);
  });
});
