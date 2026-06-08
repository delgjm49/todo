import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { useDocumentStore } from "../../stores/documentStore.js";
import {
  createRealStorageService,
  resetAllStores,
  flushAutosave,
} from "./helpers/integrationHarness.js";
import { createStorageService } from "../../services/storage/index.js";
import type { StorageBackend } from "../../services/storage/backends.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Re-initialize the document store from the same backend (simulate reload). */
async function reloadFromBackend(backend: StorageBackend): Promise<void> {
  const freshService = await createStorageService(backend);
  await useDocumentStore.getState().initializeAppData(freshService);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("workspace lifecycle integration", () => {
  let backend: StorageBackend;

  beforeEach(async () => {
    resetAllStores();
    const harness = await createRealStorageService();
    backend = harness.backend;
    await useDocumentStore.getState().initializeAppData(harness.service);
  });

  test("create → save → reload → list contains new workspace", async () => {
    const created = useDocumentStore.getState().createWorkspace("Project A");
    assert.equal(created, true);

    await flushAutosave();
    await reloadFromBackend(backend);

    const state = useDocumentStore.getState();
    const ws = state.workspaceIndex.find((w) => w.title === "Project A");
    assert.ok(ws, "Expected workspace 'Project A' to exist after reload");
    // Order should be 1 (after the default "Home" workspace at index 0)
    assert.equal(ws.order, 1);
    // The workspace should be in the index
    assert.ok(state.workspaceIndex.some((w) => w.id === ws.id));
  });

  test("rename persists and the renamed title comes back after reload", async () => {
    const state = useDocumentStore.getState();
    const homeId = state.workspaceIndex[0]?.id;
    assert.ok(homeId);

    const renamed = useDocumentStore.getState().renameWorkspace(homeId, "Renamed");
    assert.equal(renamed, true);

    await flushAutosave();
    await reloadFromBackend(backend);

    const reloaded = useDocumentStore.getState();
    const entry = reloaded.workspaceIndex.find((w) => w.id === homeId);
    assert.ok(entry);
    assert.equal(entry.title, "Renamed");
  });

  test("reorder persists across reload", async () => {
    const state = useDocumentStore.getState();
    const firstId = state.workspaceIndex[0]?.id;
    assert.ok(firstId);

    // Create a second workspace
    const created = useDocumentStore.getState().createWorkspace("Second");
    assert.equal(created, true);

    const state2 = useDocumentStore.getState();
    const secondId = state2.workspaceIndex.find((w) => w.title === "Second")?.id;
    assert.ok(secondId);

    // Reorder so second comes first
    const reordered = useDocumentStore.getState().reorderWorkspaces(secondId, firstId);
    assert.equal(reordered, true);

    await flushAutosave();
    await reloadFromBackend(backend);

    const reloaded = useDocumentStore.getState();
    assert.equal(reloaded.workspaceIndex[0]?.id, secondId);
  });

  test("downward reorder persists after insert-before-target fix", async () => {
    const state = useDocumentStore.getState();
    const firstId = state.workspaceIndex[0]?.id;
    assert.ok(firstId);

    // Create two more workspaces: [Home, Second, Third]
    const createdSecond = useDocumentStore.getState().createWorkspace("Second");
    assert.equal(createdSecond, true);

    const state2 = useDocumentStore.getState();
    const secondId = state2.workspaceIndex.find((w) => w.title === "Second")?.id;
    assert.ok(secondId);

    const createdThird = useDocumentStore.getState().createWorkspace("Third");
    assert.equal(createdThird, true);

    const state3 = useDocumentStore.getState();
    const thirdId = state3.workspaceIndex.find((w) => w.title === "Third")?.id;
    assert.ok(thirdId);
    assert.equal(state3.workspaceIndex[0]?.id, firstId);
    assert.equal(state3.workspaceIndex[1]?.id, secondId);
    assert.equal(state3.workspaceIndex[2]?.id, thirdId);

    // Downward: drag Home before Third → sourceIndex=0, targetIndex=2
    // insert-before-target: remove at 0 → [Second, Third], insertIndex = 0 < 2 ? 1 : 2 → 1 → [Second, Home, Third]
    const reordered = useDocumentStore.getState().reorderWorkspaces(firstId, thirdId);
    assert.equal(reordered, true);
    assert.equal(useDocumentStore.getState().workspaceIndex[1]?.id, firstId);

    await flushAutosave();
    await reloadFromBackend(backend);

    const reloaded = useDocumentStore.getState();
    assert.equal(reloaded.workspaceIndex[1]?.id, firstId, "Home should remain at index 1 after reload");
    assert.equal(reloaded.workspaceIndex[0]?.id, secondId, "Second should be at index 0 after reload");
    assert.equal(reloaded.workspaceIndex[2]?.id, thirdId, "Third should be at index 2 after reload");
  });

  test("style update persists across reload", async () => {
    const state = useDocumentStore.getState();
    const wsId = state.workspaceIndex[0]?.id;
    assert.ok(wsId);

    const updated = useDocumentStore.getState().updateWorkspaceStyle(wsId, {
      background: "#101828",
      accentStripe: { enabled: false, color: "#38BDF8" },
    });
    assert.equal(updated, true);

    await flushAutosave();
    await reloadFromBackend(backend);

    const reloaded = useDocumentStore.getState();
    const entry = reloaded.workspaceIndex.find((w) => w.id === wsId);
    assert.ok(entry);
    assert.equal(entry.style.background, "#101828");
    assert.equal(entry.style.accentStripe?.enabled, false);
    assert.equal(entry.style.accentStripe?.color, "#38BDF8");
  });

  test("delete persists across reload; deleting the last workspace creates a default replacement", async () => {
    const state = useDocumentStore.getState();
    // We start with one workspace ("Home"). Delete it.
    const homeId = state.workspaceIndex[0]?.id;
    assert.ok(homeId);

    const deleted = useDocumentStore.getState().deleteWorkspace(homeId);
    assert.equal(deleted, true);

    await flushAutosave();
    await reloadFromBackend(backend);

    const reloaded = useDocumentStore.getState();
    assert.equal(reloaded.workspaceIndex.length, 1);
    assert.equal(reloaded.workspaceIndex[0]?.title, "Home");
  });

  test("switching active workspace does not mark document dirty", async () => {
    const state = useDocumentStore.getState();
    const firstId = state.workspaceIndex[0]?.id;
    assert.ok(firstId);

    // Create a second workspace to switch between
    const created = useDocumentStore.getState().createWorkspace("Second");
    assert.equal(created, true);

    await flushAutosave();

    // Switch back to the first workspace
    useDocumentStore.getState().selectWorkspace(firstId);

    assert.equal(useDocumentStore.getState().dirty, false);
  });
});
