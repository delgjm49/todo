import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  DEFAULT_SETTINGS,
  createDefaultWorkspaceIndex,
  createStarterWorkspaceDocument,
} from "../../services/storage/index.js";
import type { AppDocumentSnapshot } from "../../types/app.js";
import { useHistoryStore } from "../../stores/historyStore.js";

function createBaseSnapshot(): AppDocumentSnapshot {
  return {
    settings: structuredClone(DEFAULT_SETTINGS),
    workspaceIndex: structuredClone(createDefaultWorkspaceIndex()),
    workspacesById: {
      ws_home: structuredClone(createStarterWorkspaceDocument()),
    },
    activeWorkspaceId: "ws_home",
    loadedWorkspaceIds: ["ws_home"],
  };
}

function createModifiedSnapshot(index: number): AppDocumentSnapshot {
  const snapshot = createBaseSnapshot();
  snapshot.settings = {
    ...snapshot.settings,
    defaults: {
      ...snapshot.settings.defaults,
      fontSize: snapshot.settings.defaults.fontSize + index,
    },
  };
  snapshot.workspaceIndex = snapshot.workspaceIndex.map((workspace) => ({
    ...workspace,
    title: `${workspace.title} ${index}`,
  }));
  return snapshot;
}

describe("history store", () => {
  test("batches typing transactions into a single committed snapshot", () => {
    const baseSnapshot = createBaseSnapshot();
    const nextSnapshot = createModifiedSnapshot(1);
    const finalSnapshot = createModifiedSnapshot(2);

    useHistoryStore.getState().clearHistory(baseSnapshot);
    useHistoryStore.getState().beginTransaction("typing", baseSnapshot);
    useHistoryStore.getState().updateTransaction(nextSnapshot);
    useHistoryStore.getState().updateTransaction(finalSnapshot);

    assert.equal(useHistoryStore.getState().currentTransaction?.kind, "typing");
    assert.equal(
      useHistoryStore.getState().currentTransaction?.pendingSnapshot?.settings.defaults.fontSize,
      finalSnapshot.settings.defaults.fontSize
    );
    assert.equal(useHistoryStore.getState().past.length, 0);

    const committed = useHistoryStore.getState().commitTransaction();
    assert.deepEqual(committed, finalSnapshot);
    assert.equal(useHistoryStore.getState().past.length, 1);
    assert.equal(useHistoryStore.getState().canUndo, true);
    assert.equal(useHistoryStore.getState().canRedo, false);
    assert.equal(useHistoryStore.getState().currentTransaction, null);
  });

  test("records drag, sort, and formatting snapshots as bounded history entries", () => {
    const baseSnapshot = createBaseSnapshot();

    useHistoryStore.getState().clearHistory(baseSnapshot);
    for (let index = 1; index <= 105; index += 1) {
      const snapshot = createModifiedSnapshot(index);
      const kind = index % 3 === 0 ? "formatting" : index % 3 === 1 ? "drag" : "sort";
      const committed = useHistoryStore.getState().commitSnapshot(snapshot, kind);
      assert.ok(committed);
    }

    assert.equal(useHistoryStore.getState().past.length, 100);
    assert.equal(useHistoryStore.getState().canUndo, true);
    assert.equal(useHistoryStore.getState().canRedo, false);

    const lastUndo = useHistoryStore.getState().undo();
    assert.ok(lastUndo);
    assert.equal(useHistoryStore.getState().canRedo, true);
    assert.equal(useHistoryStore.getState().currentTransaction, null);
  });
});
