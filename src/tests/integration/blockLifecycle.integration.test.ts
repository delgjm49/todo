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
import type { BlockType } from "../../types/block.js";

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("block lifecycle integration", () => {
  let backend: StorageBackend;

  beforeEach(async () => {
    resetAllStores();
    const harness = await createRealStorageService();
    backend = harness.backend;
    await useDocumentStore.getState().initializeAppData(harness.service);
  });

  test("create blocks from each template; types persist across reload", async () => {
    const wsId = getActiveWorkspaceId();

    for (const blockType of ["basic_checklist", "bulleted_list", "numbered_list"] as BlockType[]) {
      const created = useDocumentStore.getState().createBlockFromTemplate(blockType);
      assert.equal(created, true);
    }

    await flushAutosave();
    await reloadFromBackend(backend);

    const state = useDocumentStore.getState();
    const workspace = state.workspacesById[wsId];
    assert.ok(workspace);

    const blockTypes = workspace.blocks.map((b) => b.blockType);
    assert.ok(blockTypes.includes("basic_checklist"));
    assert.ok(blockTypes.includes("bulleted_list"));
    assert.ok(blockTypes.includes("numbered_list"));
    // Verify the starter block (basic_checklist from bootstrap) plus the 3 new ones
    assert.equal(workspace.blocks.length, 4);
  });

  test("rename, collapse, reorder persist across reload", async () => {
    const wsId = getActiveWorkspaceId();

    // Create two extra blocks
    useDocumentStore.getState().createBlockFromTemplate("bulleted_list");
    useDocumentStore.getState().createBlockFromTemplate("numbered_list");

    await flushAutosave();

    const state = useDocumentStore.getState();
    const workspace = state.workspacesById[wsId];
    assert.ok(workspace);

    // Blocks after create: [starter (basic_checklist), bulleted, numbered]
    const bulletedBlock = workspace.blocks.find((b) => b.blockType === "bulleted_list");
    const numberedBlock = workspace.blocks.find((b) => b.blockType === "numbered_list");
    const starterBlock = workspace.blocks.find((b) => b.blockType === "basic_checklist");
    assert.ok(bulletedBlock);
    assert.ok(numberedBlock);
    assert.ok(starterBlock);

    // Rename bulleted block
    useDocumentStore.getState().updateBlockTitle(wsId, bulletedBlock.id, "My Bullets");

    // Collapse numbered block
    useDocumentStore.getState().toggleBlockCollapsed(wsId, numberedBlock.id);

    // Reorder so numbered is first
    useDocumentStore.getState().reorderBlocks(wsId, numberedBlock.id, starterBlock.id);

    await flushAutosave();
    await reloadFromBackend(backend);

    const reloaded = useDocumentStore.getState();
    const reloadedWs = reloaded.workspacesById[wsId];
    assert.ok(reloadedWs);

    const renamed = reloadedWs.blocks.find((b) => b.id === bulletedBlock.id);
    assert.ok(renamed);
    assert.equal(renamed.title, "My Bullets");

    const collapsed = reloadedWs.blocks.find((b) => b.id === numberedBlock.id);
    assert.ok(collapsed);
    assert.equal(collapsed.collapsed, true);

    // numbered should be first
    assert.equal(reloadedWs.blocks[0]?.id, numberedBlock.id);
  });

  test("move block to another workspace updates workspaceId and survives reload", async () => {
    const wsId = getActiveWorkspaceId();

    // Create a second workspace and a block in primary
    useDocumentStore.getState().createBlockFromTemplate("bulleted_list");
    useDocumentStore.getState().createWorkspace("Second");

    const state = useDocumentStore.getState();
    const ws1 = state.workspacesById[wsId];
    assert.ok(ws1);
    const bulletedBlock = ws1.blocks.find((b) => b.blockType === "bulleted_list");
    assert.ok(bulletedBlock);

    const secondId = state.workspaceIndex.find((w) => w.title === "Second")?.id;
    assert.ok(secondId);

    // Move block to second workspace
    const moved = useDocumentStore.getState().moveBlockToWorkspace(wsId, bulletedBlock.id, secondId);
    assert.equal(moved, true);

    await flushAutosave();
    await reloadFromBackend(backend);

    const reloaded = useDocumentStore.getState();
    const reloadedWs1 = reloaded.workspacesById[wsId];
    const reloadedWs2 = reloaded.workspacesById[secondId];
    assert.ok(reloadedWs1);
    assert.ok(reloadedWs2);

    // Source workspace lost the block
    const stillInSource = reloadedWs1.blocks.some((b) => b.id === bulletedBlock.id);
    assert.equal(stillInSource, false);

    // Target workspace gained the block with correct workspaceId
    const inTarget = reloadedWs2.blocks.find((b) => b.id === bulletedBlock.id);
    assert.ok(inTarget);
    assert.equal(inTarget.workspaceId, secondId);
  });

  test("delete block persists across reload", async () => {
    const wsId = getActiveWorkspaceId();

    useDocumentStore.getState().createBlockFromTemplate("bulleted_list");

    const state = useDocumentStore.getState();
    const workspace = state.workspacesById[wsId];
    assert.ok(workspace);
    const bulletedBlock = workspace.blocks.find((b) => b.blockType === "bulleted_list");
    assert.ok(bulletedBlock);

    // Now delete it
    const deleted = useDocumentStore.getState().deleteBlock(wsId, bulletedBlock.id);
    assert.equal(deleted, true);

    await flushAutosave();
    await reloadFromBackend(backend);

    const reloaded = useDocumentStore.getState();
    const reloadedWs = reloaded.workspacesById[wsId];
    assert.ok(reloadedWs);
    const stillExists = reloadedWs.blocks.some((b) => b.id === bulletedBlock.id);
    assert.equal(stillExists, false);
  });

  test("block-level format applied via updateSelectedTextFormatting persists", async () => {
    const wsId = getActiveWorkspaceId();

    // Create a bulleted list block
    useDocumentStore.getState().createBlockFromTemplate("bulleted_list");

    const state = useDocumentStore.getState();
    const workspace = state.workspacesById[wsId];
    assert.ok(workspace);
    const bulletedBlock = workspace.blocks.find((b) => b.blockType === "bulleted_list");
    assert.ok(bulletedBlock);

    // Apply block-level formatting
    const formatted = useDocumentStore.getState().updateSelectedTextFormatting(
      { kind: "block", workspaceId: wsId, blockId: bulletedBlock.id },
      { bold: true, fontSize: 20 },
    );
    assert.equal(formatted, true);

    await flushAutosave();
    await reloadFromBackend(backend);

    const reloaded = useDocumentStore.getState();
    const reloadedWs = reloaded.workspacesById[wsId];
    assert.ok(reloadedWs);
    const reloadedBlock = reloadedWs.blocks.find((b) => b.id === bulletedBlock.id);
    assert.ok(reloadedBlock);
    assert.equal(reloadedBlock.format.bold, true);
    assert.equal(reloadedBlock.format.fontSize, 20);
  });
});
