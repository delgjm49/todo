import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { useDocumentStore } from "../../stores/documentStore.js";
import { resolveCellFormatting } from "../../domain/formatting/resolveCellFormatting.js";
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
  const checkboxCol = block.columns.find((c) => c.type === "checkbox");
  assert.ok(textCol, "No text column");
  assert.ok(checkboxCol, "No checkbox column");
  return {
    blockId: block.id,
    textColumnId: textCol.id,
    checkboxColumnId: checkboxCol.id,
    starterRowId: block.rows[0]?.id,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("save/load round-trip integration", () => {
  let backend: StorageBackend;

  beforeEach(async () => {
    resetAllStores();
    const harness = await createRealStorageService();
    backend = harness.backend;
    await useDocumentStore.getState().initializeAppData(harness.service);
  });

  test("format overrides at every layer round-trip and resolve correctly", async () => {
    const wsId = getActiveWorkspaceId();
    const { blockId, textColumnId, starterRowId } = getStarterBlockInfo(wsId);

    // Apply block-level format
    useDocumentStore.getState().updateSelectedTextFormatting(
      { kind: "block", workspaceId: wsId, blockId },
      { fontFamily: "Georgia" },
    );

    // Apply column-level format
    useDocumentStore.getState().updateSelectedTextFormatting(
      { kind: "column", workspaceId: wsId, blockId, columnId: textColumnId },
      { textColor: "#FF0000" },
    );

    // Apply row-level format
    useDocumentStore.getState().updateSelectedTextFormatting(
      { kind: "row", workspaceId: wsId, blockId, rowId: starterRowId },
      { fontSize: 18 },
    );

    // Apply cell-level format
    useDocumentStore.getState().updateSelectedTextFormatting(
      { kind: "cell", workspaceId: wsId, blockId, rowId: starterRowId, columnId: textColumnId },
      { bold: true },
    );

    await flushAutosave();
    await reloadFromBackend(backend);

    const reloaded = useDocumentStore.getState();
    const block = reloaded.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(block);
    const row = block.rows.find((r) => r.id === starterRowId);
    assert.ok(row);

    // Verify each layer persisted
    assert.equal(block.format.fontFamily, "Georgia");
    const textColAfter = block.columns.find((c) => c.id === textColumnId);
    assert.ok(textColAfter);
    assert.equal(textColAfter.format.textColor, "#FF0000");
    assert.equal(row.format.fontSize, 18);
    assert.equal(row.cells[textColumnId]?.format?.bold, true);

    // Resolve cell formatting to verify precedence chain
    const appDefaults = reloaded.settings?.defaults;
    assert.ok(appDefaults);
    const resolved = resolveCellFormatting(
      appDefaults,
      block.format,
      textColAfter.format,
      row.format,
      row.cells[textColumnId]?.format,
    );
    // Cell format wins for bold
    assert.equal(resolved.bold, true);
    // Column format wins for textColor (cell has no textColor override)
    assert.equal(resolved.textColor, "#FF0000");
    // Row format wins for fontSize (cell has no fontSize)
    assert.equal(resolved.fontSize, 18);
    // Block format wins for fontFamily
    assert.equal(resolved.fontFamily, "Georgia");
  });

  test("sort metadata round-trips and rows stay in sorted order after reload", async () => {
    const wsId = getActiveWorkspaceId();
    const { blockId, textColumnId } = getStarterBlockInfo(wsId);

    // Append two more rows with different text values
    useDocumentStore.getState().appendRowToBlock(wsId, blockId);
    useDocumentStore.getState().appendRowToBlock(wsId, blockId);

    const state = useDocumentStore.getState();
    const block = state.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(block);
    // Set text values out of order on the three rows
    const rows = [...block.rows].sort((a, b) => a.order - b.order);
    assert.equal(rows.length, 3);
    useDocumentStore.getState().updateTextCellValue(wsId, blockId, rows[0].id, textColumnId, "Zebra");
    useDocumentStore.getState().updateTextCellValue(wsId, blockId, rows[1].id, textColumnId, "Apple");
    useDocumentStore.getState().updateTextCellValue(wsId, blockId, rows[2].id, textColumnId, "Mango");

    // Sort ascending
    useDocumentStore.getState().sortBlockRows(wsId, blockId, textColumnId, "asc");

    await flushAutosave();
    await reloadFromBackend(backend);

    const reloaded = useDocumentStore.getState();
    const reloadedBlock = reloaded.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(reloadedBlock);

    // Rows should be in ascending order: Apple, Mango, Zebra
    const displayRows = [...reloadedBlock.rows].sort((a, b) => a.order - b.order);
    assert.equal(displayRows.length, 3);
    // Check cell values in display order
    const cellValues = displayRows.map(
      (r) => r.cells[textColumnId]?.value,
    );
    assert.deepEqual(cellValues, ["Apple", "Mango", "Zebra"]);

    // Sort metadata should be preserved
    assert.ok(reloadedBlock.sort);
    assert.equal(reloadedBlock.sort.columnId, textColumnId);
    assert.equal(reloadedBlock.sort.direction, "asc");
  });

  test("column settings round-trip", async () => {
    const wsId = getActiveWorkspaceId();
    const { blockId, checkboxColumnId } = getStarterBlockInfo(wsId);

    // Set non-default settings on checkbox column
    useDocumentStore.getState().updateColumnSettings(
      wsId, blockId, checkboxColumnId,
      { strikeoutRowWhenChecked: false, moveCheckedRowsToBottom: true },
    );

    await flushAutosave();
    await reloadFromBackend(backend);

    const reloaded = useDocumentStore.getState();
    const block = reloaded.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(block);
    const checkboxCol = block.columns.find((c) => c.id === checkboxColumnId);
    assert.ok(checkboxCol);
    // Only check these fields if the column type supports them
    if (checkboxCol.type === "checkbox") {
      const settings = checkboxCol.settings as { strikeoutRowWhenChecked?: boolean; moveCheckedRowsToBottom?: boolean };
      assert.equal(settings.strikeoutRowWhenChecked, false);
      assert.equal(settings.moveCheckedRowsToBottom, true);
    }
  });

  test("workspace alert summary round-trips", async () => {
    const wsId = getActiveWorkspaceId();
    const { blockId, starterRowId, textColumnId } = getStarterBlockInfo(wsId);

    // Set a non-null alert summary
    useDocumentStore.getState().updateWorkspaceAlertSummary(wsId, {
      count: 2,
      blockId,
      rowId: starterRowId,
      columnId: textColumnId,
    });

    await flushAutosave();
    await reloadFromBackend(backend);

    const reloaded = useDocumentStore.getState();
    const entry = reloaded.workspaceIndex.find((w) => w.id === wsId);
    assert.ok(entry);
    assert.ok(entry.alertSummary);
    assert.equal(entry.alertSummary.count, 2);
    assert.equal(entry.alertSummary.blockId, blockId);
    assert.equal(entry.alertSummary.rowId, starterRowId);
    assert.equal(entry.alertSummary.columnId, textColumnId);
  });

  test("partial-save failure does not corrupt loadable state", async () => {
    const wsId = getActiveWorkspaceId();

    // Intercept the backend's rename to throw when it touches the workspace-index file.
    // The workspace-index file is "workspaces.json" inside the data dir.
    const originalRename = backend.rename.bind(backend);
    let failNextIndexSave = true;

    backend.rename = async (fromPath, toPath) => {
      if (failNextIndexSave && fromPath.includes("workspaces.json.tmp")) {
        throw new Error("Simulated storage failure on workspace-index write.");
      }
      return originalRename(fromPath, toPath);
    };

    // Capture the initial workspace title so we can verify it survived
    const initialState = useDocumentStore.getState();
    const originalTitle = initialState.workspaceIndex.find((w) => w.id === wsId)?.title;
    assert.ok(originalTitle);

    // Make a workspace change that triggers autosave
    const renamed = useDocumentStore.getState().renameWorkspace(wsId, "New Name");
    assert.equal(renamed, true);

    await flushAutosave(500); // extra time for save to complete/fail

    // The store should report an error because the workspace-index save failed
    const afterFailure = useDocumentStore.getState();
    assert.ok(
      afterFailure.saveStatus === "error" || afterFailure.saveStatus === "partial",
      `Expected error or partial, got ${afterFailure.saveStatus}`,
    );

    // Stop failing for subsequent saves
    failNextIndexSave = false;

    // Re-init from the same backend — the rename should NOT have persisted
    await reloadFromBackend(backend);

    const reloaded = useDocumentStore.getState();
    const entry = reloaded.workspaceIndex.find((w) => w.id === wsId);
    assert.ok(entry);
    // The workspace should still have its original title (the partial save didn't corrupt)
    assert.equal(entry.title, originalTitle);
  });
});
