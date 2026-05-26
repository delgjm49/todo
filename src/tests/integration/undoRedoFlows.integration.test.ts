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

async function reloadFromBackend(backend: StorageBackend): Promise<void> {
  const freshService = await createStorageService(backend);
  await useDocumentStore.getState().initializeAppData(freshService);
}

function getActiveWorkspaceId(): string {
  const state = useDocumentStore.getState();
  const id = state.activeWorkspaceId ?? state.workspaceIndex[0]?.id;
  assert.ok(id, "No active workspace found");
  return id;
}

function getStarterBlockInfo(wsId: string) {
  const state = useDocumentStore.getState();
  const workspace = state.workspacesById[wsId];
  assert.ok(workspace);
  const block = workspace.blocks[0];
  assert.ok(block, "No starter block found");
  const textCol = block.columns.find((c) => c.type === "text");
  assert.ok(textCol, "No text column");
  const row = block.rows[0];
  assert.ok(row, "No starter row");
  return {
    blockId: block.id,
    textColumnId: textCol.id,
    starterRowId: row.id,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("undo/redo integration", () => {
  let backend: StorageBackend;

  beforeEach(async () => {
    resetAllStores();
    const harness = await createRealStorageService();
    backend = harness.backend;
    await useDocumentStore.getState().initializeAppData(harness.service);
  });

  test("undo a cell edit → state reverts and autosave fires the reverted state", async () => {
    const wsId = getActiveWorkspaceId();
    const { blockId, textColumnId, starterRowId } = getStarterBlockInfo(wsId);

    // Edit the text cell
    const edited = useDocumentStore.getState().updateTextCellValue(
      wsId, blockId, starterRowId, textColumnId, "Edited value",
    );
    assert.equal(edited, true);

    // Let autosave persist the edited value
    await flushAutosave();

    // Undo — should revert to original (empty string)
    const undone = useDocumentStore.getState().undo();
    assert.equal(undone, true);

    // Let autosave persist the reverted state
    await flushAutosave();
    await reloadFromBackend(backend);

    const reloaded = useDocumentStore.getState();
    const block = reloaded.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(block);
    const row = block.rows.find((r) => r.id === starterRowId);
    assert.ok(row);
    // Should be the pre-edit value
    assert.equal(row.cells[textColumnId]?.value, "");
  });

  test("redo restores the change and autosave fires again", async () => {
    const wsId = getActiveWorkspaceId();
    const { blockId, textColumnId, starterRowId } = getStarterBlockInfo(wsId);

    // Edit text cell
    useDocumentStore.getState().updateTextCellValue(
      wsId, blockId, starterRowId, textColumnId, "Edited value",
    );
    await flushAutosave();

    // Undo
    useDocumentStore.getState().undo();
    await flushAutosave();

    // Redo
    const redone = useDocumentStore.getState().redo();
    assert.equal(redone, true);

    await flushAutosave();
    await reloadFromBackend(backend);

    const reloaded = useDocumentStore.getState();
    const block = reloaded.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(block);
    const row = block.rows.find((r) => r.id === starterRowId);
    assert.ok(row);
    // Should be the edited value again
    assert.equal(row.cells[textColumnId]?.value, "Edited value");
  });

  test("undo across mixed flows walks back one at a time", async () => {
    const wsId = getActiveWorkspaceId();
    const { blockId, textColumnId, starterRowId } = getStarterBlockInfo(wsId);

    // Step 1: Rename workspace
    useDocumentStore.getState().renameWorkspace(wsId, "Renamed WS");
    // Step 2: Create a block
    useDocumentStore.getState().createBlockFromTemplate("bulleted_list");

    const stateAfterCreate = useDocumentStore.getState();
    const bulletedBlock = stateAfterCreate.workspacesById[wsId]?.blocks.find(
      (b) => b.blockType === "bulleted_list",
    );
    assert.ok(bulletedBlock);

    // Step 3: Edit a cell
    useDocumentStore.getState().updateTextCellValue(
      wsId, blockId, starterRowId, textColumnId, "Cell edit",
    );
    // Step 4: Apply a format
    useDocumentStore.getState().updateSelectedTextFormatting(
      { kind: "block", workspaceId: wsId, blockId },
      { italic: true },
    );

    // Now undo four times, checking state after each step

    // Undo 1: reverts format (italic removed)
    let result = useDocumentStore.getState().undo();
    assert.equal(result, true);
    let state = useDocumentStore.getState();
    let block = state.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(block);
    // Format should be gone (or at least italic false/undefined)
    // But the block format could still have other keys; just check italic
    assert.equal(block.format.italic, undefined);
    // Cell edit should still be present
    let row = block.rows.find((r) => r.id === starterRowId);
    assert.ok(row);
    assert.equal(row.cells[textColumnId]?.value, "Cell edit");

    // Undo 2: reverts cell edit
    result = useDocumentStore.getState().undo();
    assert.equal(result, true);
    state = useDocumentStore.getState();
    block = state.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(block);
    row = block.rows.find((r) => r.id === starterRowId);
    assert.ok(row);
    assert.equal(row.cells[textColumnId]?.value, "");
    // Bulleted block should still exist
    const bulletedExists = state.workspacesById[wsId]?.blocks.some(
      (b) => b.id === bulletedBlock.id,
    );
    assert.equal(bulletedExists, true);

    // Undo 3: reverts block creation
    result = useDocumentStore.getState().undo();
    assert.equal(result, true);
    state = useDocumentStore.getState();
    const bulletedGone = state.workspacesById[wsId]?.blocks.some(
      (b) => b.id === bulletedBlock.id,
    );
    assert.equal(bulletedGone, false);
    // Workspace rename should still be in effect
    const wsEntry = state.workspaceIndex.find((w) => w.id === wsId);
    assert.ok(wsEntry);
    assert.equal(wsEntry.title, "Renamed WS");

    // Undo 4: reverts workspace rename
    result = useDocumentStore.getState().undo();
    assert.equal(result, true);
    state = useDocumentStore.getState();
    const wsEntryAfter = state.workspaceIndex.find((w) => w.id === wsId);
    assert.ok(wsEntryAfter);
    // Should be back to original title
    assert.notEqual(wsEntryAfter.title, "Renamed WS");
  });

  test("canUndo/canRedo flags track correctly through an undo/redo sequence", async () => {
    const wsId = getActiveWorkspaceId();
    const { blockId, textColumnId, starterRowId } = getStarterBlockInfo(wsId);

    // Initially: canUndo = false, canRedo = false
    assert.equal(useDocumentStore.getState().canUndo, false);
    assert.equal(useDocumentStore.getState().canRedo, false);

    // Commit a change
    useDocumentStore.getState().updateTextCellValue(
      wsId, blockId, starterRowId, textColumnId, "New value",
    );

    // After commit: canUndo = true, canRedo = false
    assert.equal(useDocumentStore.getState().canUndo, true);
    assert.equal(useDocumentStore.getState().canRedo, false);

    // Undo
    useDocumentStore.getState().undo();

    // After undo: canUndo = false (only one snapshot), canRedo = true
    assert.equal(useDocumentStore.getState().canUndo, false);
    assert.equal(useDocumentStore.getState().canRedo, true);

    // Redo
    useDocumentStore.getState().redo();

    // After redo: canUndo = true, canRedo = false
    assert.equal(useDocumentStore.getState().canUndo, true);
    assert.equal(useDocumentStore.getState().canRedo, false);

    // Commit another change
    useDocumentStore.getState().renameWorkspace(wsId, "New Name");

    // After new commit: canUndo = true (2 snapshots), canRedo = false (future cleared)
    assert.equal(useDocumentStore.getState().canUndo, true);
    assert.equal(useDocumentStore.getState().canRedo, false);
  });

  test("history is preserved across an autosave failure (retry path works)", async () => {
    const wsId = getActiveWorkspaceId();
    const { blockId, textColumnId, starterRowId } = getStarterBlockInfo(wsId);

    // Make a change that creates a history entry
    const edited = useDocumentStore.getState().updateTextCellValue(
      wsId, blockId, starterRowId, textColumnId, "Persist me",
    );
    assert.equal(edited, true);

    // Now sabotage the save to simulate failure
    // The store's saveAll is called by autosave; we can intercept the backend
    const originalSaveAppData = backend.writeText.bind(backend);
    let failSaves = true;
    backend.writeText = async (path: string, contents: string) => {
      if (failSaves) {
        throw new Error("Simulated write failure");
      }
      return originalSaveAppData(path, contents);
    };

    // Trigger a save (e.g., by flushing autosave with a short wait)
    await flushAutosave(500);

    // The save should have failed
    const stateAfterFail = useDocumentStore.getState();
    assert.ok(
      stateAfterFail.saveStatus === "error" || stateAfterFail.saveStatus === "partial",
      `Expected error/partial but got ${stateAfterFail.saveStatus}`,
    );

    // canUndo should still be true (history is preserved despite save failure)
    assert.equal(stateAfterFail.canUndo, true);

    // Stop failing saves
    failSaves = false;
    backend.writeText = originalSaveAppData;

    // Retry the save
    const retried = await useDocumentStore.getState().retrySave();
    assert.equal(retried, true);

    // After retry, save should be successful
    const stateAfterRetry = useDocumentStore.getState();
    assert.equal(stateAfterRetry.saveStatus, "saved");

    // Reload from backend to confirm persistence
    await reloadFromBackend(backend);

    const reloaded = useDocumentStore.getState();
    const block = reloaded.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(block);
    const row = block.rows.find((r) => r.id === starterRowId);
    assert.ok(row);
    assert.equal(row.cells[textColumnId]?.value, "Persist me");
  });
});
