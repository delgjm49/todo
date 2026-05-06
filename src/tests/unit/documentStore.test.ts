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

function snapshotFromStore(): AppDocumentSnapshot {
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

describe("document store autosave", () => {
  test("batches document transactions through the store integration layer", async () => {
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

    useDocumentStore.getState().beginDocumentTransaction("typing");
    const firstUpdate = structuredClone(baseSnapshot);
    firstUpdate.settings = {
      ...firstUpdate.settings,
      defaults: {
        ...firstUpdate.settings.defaults,
        fontSize: firstUpdate.settings.defaults.fontSize + 1,
      },
    };

    const secondUpdate = structuredClone(firstUpdate);
    secondUpdate.workspaceIndex = secondUpdate.workspaceIndex.map((workspace) => ({
      ...workspace,
      title: `${workspace.title} updated`,
    }));

    useDocumentStore.getState().updateDocumentTransaction(firstUpdate);
    useDocumentStore.getState().updateDocumentTransaction(secondUpdate);

    assert.equal(useHistoryStore.getState().currentTransaction?.kind, "typing");
    assert.deepEqual(useHistoryStore.getState().currentTransaction?.pendingSnapshot, secondUpdate);
    assert.equal(useDocumentStore.getState().dirty, true);

    const committed = useDocumentStore.getState().commitDocumentTransaction({ service, autosaveDelayMs: 5 });
    assert.equal(committed, true);

    await wait(20);
    assert.equal(calls.length, 1);
    assert.equal(useDocumentStore.getState().saveStatus, "saved");
    assert.equal(useHistoryStore.getState().canUndo, true);
  });

  test("creates new workspaces empty while preserving workspace CRUD, style, reorder, and delete flows", async () => {
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
    const baseWorkspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(baseWorkspaceId);

    const created = useDocumentStore.getState().createWorkspace("Draft", { service, autosaveDelayMs: 5 });
    assert.equal(created, true);

    const createdWorkspaceId =
      useDocumentStore.getState().workspaceIndex.find((entry) => entry.title === "Draft")?.id ?? null;
    assert.ok(createdWorkspaceId);
    assert.equal(useDocumentStore.getState().activeWorkspaceId, createdWorkspaceId);
    assert.equal(useDocumentStore.getState().workspacesById[createdWorkspaceId]?.blocks.length, 0);

    const firstBlockCreated = useDocumentStore.getState().createBlockFromTemplate("basic_checklist", {
      service,
      autosaveDelayMs: 5,
    });
    assert.equal(firstBlockCreated, true);
    assert.equal(useDocumentStore.getState().workspacesById[createdWorkspaceId]?.blocks.length, 1);

    useDocumentStore.getState().selectWorkspace(baseWorkspaceId);
    assert.equal(useDocumentStore.getState().activeWorkspaceId, baseWorkspaceId);

    const renamed = useDocumentStore
      .getState()
      .renameWorkspace(createdWorkspaceId, "Renamed Draft", { service, autosaveDelayMs: 5 });
    assert.equal(renamed, true);
    assert.equal(
      useDocumentStore.getState().workspaceIndex.find((entry) => entry.id === createdWorkspaceId)?.title,
      "Renamed Draft"
    );

    const styled = useDocumentStore
      .getState()
      .updateWorkspaceStyle(createdWorkspaceId, {
        background: "#101828",
        textColor: "#F8FAFC",
        accentStripe: {
          enabled: false,
          color: "#38BDF8",
        },
      }, { service, autosaveDelayMs: 5 });
    assert.equal(styled, true);
    assert.equal(
      useDocumentStore.getState().workspaceIndex.find((entry) => entry.id === createdWorkspaceId)?.style.background,
      "#101828"
    );

    const reordered = useDocumentStore
      .getState()
      .reorderWorkspaces(baseWorkspaceId, createdWorkspaceId, { service, autosaveDelayMs: 5 });
    assert.equal(reordered, true);
    assert.equal(useDocumentStore.getState().workspaceIndex[0]?.id, createdWorkspaceId);
    assert.equal(useDocumentStore.getState().workspaceIndex[1]?.id, baseWorkspaceId);

    const deleted = useDocumentStore.getState().deleteWorkspace(createdWorkspaceId, { service, autosaveDelayMs: 5 });
    assert.equal(deleted, true);
    assert.equal(useDocumentStore.getState().workspaceIndex.length, 1);
    assert.equal(useDocumentStore.getState().workspaceIndex[0]?.id, baseWorkspaceId);
    assert.equal(useDocumentStore.getState().activeWorkspaceId, baseWorkspaceId);

    await wait(20);
    assert.equal(calls.length, 1);
    assert.equal(useDocumentStore.getState().saveStatus, "saved");
    assert.equal(useHistoryStore.getState().canUndo, true);
  });

  test("creates blocks from each supported template through the store", async () => {
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
    const templates: Array<"basic_checklist" | "bulleted_list" | "numbered_list"> = [
      "basic_checklist",
      "bulleted_list",
      "numbered_list",
    ];

    for (const templateType of templates) {
      const created = useDocumentStore
        .getState()
        .createBlockFromTemplate(templateType, { service, autosaveDelayMs: 5 });
      assert.equal(created, true);
    }

    await wait(20);

    const activeWorkspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(activeWorkspaceId);
    const workspace = useDocumentStore.getState().workspacesById[activeWorkspaceId];
    assert.ok(workspace);
    assert.equal(workspace.blocks.length, 4);
    assert.deepEqual(
      workspace.blocks.map((block) => block.blockType),
      ["basic_checklist", "basic_checklist", "bulleted_list", "numbered_list"]
    );
    assert.equal(calls.length, 1);
    assert.equal(useDocumentStore.getState().saveStatus, "saved");
  });

  test("debounces autosave after committed changes and after undo/redo", async () => {
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
    assert.equal(useHistoryStore.getState().canUndo, true);
    assert.equal(useDocumentStore.getState().dirty, true);
    assert.equal(calls.length, 0);

    await wait(20);
    assert.equal(calls.length, 1);
    assert.equal(useDocumentStore.getState().dirty, false);
    assert.equal(useDocumentStore.getState().saveStatus, "saved");

    const undoOk = await useDocumentStore.getState().undo({ service, autosaveDelayMs: 5 });
    assert.equal(undoOk, true);
    assert.equal(useDocumentStore.getState().dirty, true);
    await wait(20);
    assert.equal(calls.length, 2);
    assert.equal(useDocumentStore.getState().dirty, false);

    const redoOk = await useDocumentStore.getState().redo({ service, autosaveDelayMs: 5 });
    assert.equal(redoOk, true);
    assert.equal(useDocumentStore.getState().dirty, true);
    await wait(20);
    assert.equal(calls.length, 3);
    assert.equal(useDocumentStore.getState().saveStatus, "saved");
    assert.equal(useDocumentStore.getState().dirty, false);
  });

  test("preserves undo history and retry path after autosave failure", async () => {
    const service = await createMemoryStorageService();
    let attempts = 0;

    service.saveAppData = async (document) => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("save failed");
      }

      return createSavedOutcome(document);
    };

    await useDocumentStore.getState().initializeAppData(service);
    const baseSnapshot = snapshotFromStore();
    const changedSnapshot = structuredClone(baseSnapshot);
    changedSnapshot.workspaceIndex = changedSnapshot.workspaceIndex.map((workspace) => ({
      ...workspace,
      title: `${workspace.title} updated`,
    }));

    const committed = useDocumentStore
      .getState()
      .commitDocumentSnapshot(changedSnapshot, "drag", { service, autosaveDelayMs: 5 });

    assert.equal(committed, true);
    await wait(20);
    assert.equal(useDocumentStore.getState().saveStatus, "error");
    assert.equal(useDocumentStore.getState().dirty, true);
    assert.equal(useDocumentStore.getState().saveError?.message, "save failed");
    assert.equal(useHistoryStore.getState().canUndo, true);

    const retryOk = await useDocumentStore.getState().retrySave(service);
    assert.equal(retryOk, true);
    assert.equal(useDocumentStore.getState().saveStatus, "saved");
    assert.equal(useDocumentStore.getState().dirty, false);
    assert.equal(useHistoryStore.getState().canUndo, true);
  });
});
