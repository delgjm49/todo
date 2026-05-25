import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createMemoryStorageService } from "../../services/storage/index.js";
import type { AppDocumentSnapshot } from "../../types/app.js";
import { useDocumentStore } from "../../stores/documentStore.js";
import { useHistoryStore } from "../../stores/historyStore.js";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createSavedOutcome(document: AppDocumentSnapshot) {
  return {
    persistenceState: "full" as const,
    persisted: {
      settings: true,
      workspaceIndex: true,
      workspaceIds: [...document.loadedWorkspaceIds],
    },
  };
}

describe("dirty/autosave coherence", () => {
  test("cell edit sets dirty and triggers autosave", async () => {
    const service = await createMemoryStorageService();
    const calls: AppDocumentSnapshot[] = [];

    service.saveAppData = async (document) => {
      calls.push({
        settings: structuredClone(document.settings),
        workspaceIndex: structuredClone(document.workspaceIndex),
        workspacesById: structuredClone(document.workspacesById),
        activeWorkspaceId: document.activeWorkspaceId,
        loadedWorkspaceIds: [...document.loadedWorkspaceIds],
      });

      return createSavedOutcome(document);
    };

    await useDocumentStore.getState().initializeAppData(service);
    const workspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(workspaceId);
    const workspace = useDocumentStore.getState().workspacesById[workspaceId];
    assert.ok(workspace);
    const block = workspace.blocks[0];
    assert.ok(block);
    const textColumn = block.columns.find((column) => column.type === "text");
    const baseRowId = block.rows[0]?.id;
    assert.ok(textColumn);
    assert.ok(baseRowId);

    // Initial state should be clean
    assert.equal(useDocumentStore.getState().dirty, false);

    const textEdited = useDocumentStore
      .getState()
      .updateTextCellValue(workspaceId, block.id, baseRowId, textColumn.id, "Prepare report", {
        service,
        autosaveDelayMs: 5,
      });
    assert.equal(textEdited, true);

    // dirty should be true immediately after mutation
    assert.equal(useDocumentStore.getState().dirty, true);

    // Wait for autosave to fire
    await wait(20);
    assert.equal(calls.length, 1);
    assert.equal(useDocumentStore.getState().saveStatus, "saved");
    assert.equal(useDocumentStore.getState().dirty, false);
  });

  test("undo sets dirty and triggers autosave", async () => {
    const service = await createMemoryStorageService();
    const calls: AppDocumentSnapshot[] = [];

    service.saveAppData = async (document) => {
      calls.push({
        settings: structuredClone(document.settings),
        workspaceIndex: structuredClone(document.workspaceIndex),
        workspacesById: structuredClone(document.workspacesById),
        activeWorkspaceId: document.activeWorkspaceId,
        loadedWorkspaceIds: [...document.loadedWorkspaceIds],
      });

      return createSavedOutcome(document);
    };

    await useDocumentStore.getState().initializeAppData(service);
    const baseSnapshot = snapshotFromStore();
    const changedSnapshot = structuredClone(baseSnapshot);
    changedSnapshot.settings = {
      ...changedSnapshot.settings,
      defaults: {
        ...changedSnapshot.settings.defaults,
        fontSize: changedSnapshot.settings.defaults.fontSize + 1,
      },
    };

    const committed = useDocumentStore
      .getState()
      .commitDocumentSnapshot(changedSnapshot, "formatting", { service, autosaveDelayMs: 5 });

    assert.equal(committed, true);
    assert.equal(useDocumentStore.getState().dirty, true);

    // Wait for autosave
    await wait(20);
    assert.equal(calls.length, 1);
    assert.equal(useDocumentStore.getState().saveStatus, "saved");
    assert.equal(useDocumentStore.getState().dirty, false);
    assert.equal(useHistoryStore.getState().canUndo, true);

    // Undo — should set dirty and trigger autosave
    const undoOk = await useDocumentStore.getState().undo({ service, autosaveDelayMs: 5 });
    assert.equal(undoOk, true);
    assert.equal(useDocumentStore.getState().dirty, true);

    // Wait for autosave after undo
    await wait(20);
    assert.equal(calls.length, 2);
    assert.equal(useDocumentStore.getState().saveStatus, "saved");
    assert.equal(useDocumentStore.getState().dirty, false);
  });

  test("redo sets dirty and triggers autosave", async () => {
    const service = await createMemoryStorageService();
    const calls: AppDocumentSnapshot[] = [];

    service.saveAppData = async (document) => {
      calls.push({
        settings: structuredClone(document.settings),
        workspaceIndex: structuredClone(document.workspaceIndex),
        workspacesById: structuredClone(document.workspacesById),
        activeWorkspaceId: document.activeWorkspaceId,
        loadedWorkspaceIds: [...document.loadedWorkspaceIds],
      });

      return createSavedOutcome(document);
    };

    await useDocumentStore.getState().initializeAppData(service);
    const baseSnapshot = snapshotFromStore();
    const changedSnapshot = structuredClone(baseSnapshot);
    changedSnapshot.settings = {
      ...changedSnapshot.settings,
      defaults: {
        ...changedSnapshot.settings.defaults,
        fontSize: changedSnapshot.settings.defaults.fontSize + 1,
      },
    };

    const committed = useDocumentStore
      .getState()
      .commitDocumentSnapshot(changedSnapshot, "formatting", { service, autosaveDelayMs: 5 });

    assert.equal(committed, true);

    // Wait for autosave
    await wait(20);
    assert.equal(calls.length, 1);
    assert.equal(useDocumentStore.getState().saveStatus, "saved");

    // Undo first
    const undoOk = await useDocumentStore.getState().undo({ service, autosaveDelayMs: 5 });
    assert.equal(undoOk, true);
    assert.equal(useDocumentStore.getState().dirty, true);

    // Wait for autosave after undo
    await wait(20);
    assert.equal(calls.length, 2);
    assert.equal(useDocumentStore.getState().saveStatus, "saved");
    assert.equal(useDocumentStore.getState().dirty, false);

    // Redo — should set dirty and trigger autosave
    const redoOk = await useDocumentStore.getState().redo({ service, autosaveDelayMs: 5 });
    assert.equal(redoOk, true);
    assert.equal(useDocumentStore.getState().dirty, true);

    // Wait for autosave after redo
    await wait(20);
    assert.equal(calls.length, 3);
    assert.equal(useDocumentStore.getState().saveStatus, "saved");
    assert.equal(useDocumentStore.getState().dirty, false);
  });

  test("updateSettings sets dirty and triggers autosave", async () => {
    const service = await createMemoryStorageService();
    const calls: AppDocumentSnapshot[] = [];

    service.saveAppData = async (document) => {
      calls.push({
        settings: structuredClone(document.settings),
        workspaceIndex: structuredClone(document.workspaceIndex),
        workspacesById: structuredClone(document.workspacesById),
        activeWorkspaceId: document.activeWorkspaceId,
        loadedWorkspaceIds: [...document.loadedWorkspaceIds],
      });

      return createSavedOutcome(document);
    };

    await useDocumentStore.getState().initializeAppData(service);

    // Initial state should be clean
    assert.equal(useDocumentStore.getState().dirty, false);

    const result = useDocumentStore.getState().updateSettings({ theme: "light" }, { service, autosaveDelayMs: 5 });
    assert.equal(result, true);

    // dirty should be true immediately
    assert.equal(useDocumentStore.getState().dirty, true);

    // Wait for autosave to fire
    await wait(20);
    assert.equal(calls.length, 1);
    assert.equal(useDocumentStore.getState().saveStatus, "saved");
    assert.equal(useDocumentStore.getState().dirty, false);
  });

  test("selectWorkspace does NOT set dirty", async () => {
    const service = await createMemoryStorageService();

    service.saveAppData = async (document) => {
      return createSavedOutcome(document);
    };

    await useDocumentStore.getState().initializeAppData(service);
    assert.equal(useDocumentStore.getState().dirty, false);

    // Grab the initial workspace id before creating a second one
    const initialWorkspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(initialWorkspaceId);

    // Create a second workspace — this switches to it
    useDocumentStore.getState().createWorkspace("Draft", { service, autosaveDelayMs: 5 });
    const draftWorkspaceId =
      useDocumentStore.getState().workspaceIndex.find((entry) => entry.title === "Draft")?.id ?? null;
    assert.ok(draftWorkspaceId);

    // Wait for autosave so we're in a clean state
    await wait(20);
    assert.equal(useDocumentStore.getState().dirty, false);

    // Select the original workspace — should NOT set dirty
    useDocumentStore.getState().selectWorkspace(initialWorkspaceId);
    assert.equal(useDocumentStore.getState().dirty, false);
  });
});

function snapshotFromStore() {
  const state = useDocumentStore.getState();
  assert.ok(state.settings);

  return {
    settings: structuredClone(state.settings),
    workspaceIndex: structuredClone(state.workspaceIndex),
    workspacesById: structuredClone(state.workspacesById),
    activeWorkspaceId: state.activeWorkspaceId,
    loadedWorkspaceIds: structuredClone(state.loadedWorkspaceIds),
  };
}
