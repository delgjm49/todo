import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { useDocumentStore } from "../../stores/documentStore.js";
import {
  createRealStorageService,
  resetAllStores,
  flushAutosave,
} from "./helpers/integrationHarness.js";
import { createStorageService } from "../../services/storage/index.js";
import { filterCompletedRows } from "../../domain/rows/completedRowFilter.js";
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

/**
 * Return the IDs of the first block in the active workspace and its
 * checkbox + text columns (from the basic_checklist starter block).
 */
function getStarterBlockInfo(wsId: string): {
  blockId: string;
  checkboxColumnId: string;
  textColumnId: string;
  starterRowId: string;
} {
  const state = useDocumentStore.getState();
  const workspace = state.workspacesById[wsId];
  assert.ok(workspace);
  const block = workspace.blocks[0];
  assert.ok(block, "No starter block found");
  const checkboxCol = block.columns.find((c) => c.type === "checkbox");
  const textCol = block.columns.find((c) => c.type === "text");
  assert.ok(checkboxCol, "No checkbox column in starter block");
  assert.ok(textCol, "No text column in starter block");
  const row = block.rows[0];
  assert.ok(row, "No starter row");
  return {
    blockId: block.id,
    checkboxColumnId: checkboxCol.id,
    textColumnId: textCol.id,
    starterRowId: row.id,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("row and cell editing integration", () => {
  let backend: StorageBackend;

  beforeEach(async () => {
    resetAllStores();
    const harness = await createRealStorageService();
    backend = harness.backend;
    await useDocumentStore.getState().initializeAppData(harness.service);
  });

  test("append, insert above, insert below, delete; final row order persists", async () => {
    const wsId = getActiveWorkspaceId();
    const { blockId } = getStarterBlockInfo(wsId);

    // Append two rows
    useDocumentStore.getState().appendRowToBlock(wsId, blockId);
    useDocumentStore.getState().appendRowToBlock(wsId, blockId);

    // Get current rows
    let state = useDocumentStore.getState();
    let block = state.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(block);
    assert.equal(block.rows.length, 3); // starter + 2 appended

    const lastRow = block.rows[block.rows.length - 1];
    assert.ok(lastRow);

    // Insert a row above the last row
    useDocumentStore.getState().insertRowInBlock(wsId, blockId, lastRow.id, "above");

    state = useDocumentStore.getState();
    block = state.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(block);
    // After insert: should have 4 rows (3 + 1 inserted above)
    const insertedRowId = block.rows[2]?.id; // the one above the original last row
    assert.ok(insertedRowId);
    assert.notEqual(insertedRowId, lastRow.id);

    // Delete the inserted row
    useDocumentStore.getState().deleteRowFromBlock(wsId, blockId, insertedRowId);

    await flushAutosave();
    await reloadFromBackend(backend);

    const reloaded = useDocumentStore.getState();
    const reloadedBlock = reloaded.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(reloadedBlock);

    // Expect 3 rows: starter + two appended (inserted one was deleted)
    assert.equal(reloadedBlock.rows.length, 3);
    // Verify orders are contiguous 0, 1, 2
    const orders = reloadedBlock.rows.map((r) => r.order).sort((a, b) => a - b);
    assert.deepEqual(orders, [0, 1, 2]);
  });

  test("text cell edit persists across reload", async () => {
    const wsId = getActiveWorkspaceId();
    const { blockId, textColumnId, starterRowId } = getStarterBlockInfo(wsId);

    const updated = useDocumentStore.getState().updateTextCellValue(
      wsId, blockId, starterRowId, textColumnId, "Prepare report",
    );
    assert.equal(updated, true);

    await flushAutosave();
    await reloadFromBackend(backend);

    const reloaded = useDocumentStore.getState();
    const block = reloaded.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(block);
    const row = block.rows.find((r) => r.id === starterRowId);
    assert.ok(row);
    assert.equal(row.cells[textColumnId]?.value, "Prepare report");
  });

  test("checkbox toggle persists across reload", async () => {
    const wsId = getActiveWorkspaceId();
    const { blockId, checkboxColumnId, starterRowId } = getStarterBlockInfo(wsId);

    // Toggle on
    useDocumentStore.getState().toggleCheckboxCellValue(wsId, blockId, starterRowId, checkboxColumnId);

    await flushAutosave();
    await reloadFromBackend(backend);

    let reloaded = useDocumentStore.getState();
    let block = reloaded.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(block);
    let row = block.rows.find((r) => r.id === starterRowId);
    assert.ok(row);
    assert.equal(row.cells[checkboxColumnId]?.value, true);

    // Toggle off
    useDocumentStore.getState().toggleCheckboxCellValue(wsId, blockId, starterRowId, checkboxColumnId);

    await flushAutosave();
    await reloadFromBackend(backend);

    reloaded = useDocumentStore.getState();
    block = reloaded.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(block);
    row = block.rows.find((r) => r.id === starterRowId);
    assert.ok(row);
    assert.equal(row.cells[checkboxColumnId]?.value, false);
  });

  test("checkbox automation moveCheckedRowsToBottom reorders and survives reload", async () => {
    const wsId = getActiveWorkspaceId();
    const { blockId, checkboxColumnId, starterRowId } = getStarterBlockInfo(wsId);

    // Enable moveCheckedRowsToBottom on the checkbox column
    const settingsUpdated = useDocumentStore.getState().updateColumnSettings(
      wsId, blockId, checkboxColumnId, { moveCheckedRowsToBottom: true },
    );
    assert.equal(settingsUpdated, true);

    // Append a second row
    useDocumentStore.getState().appendRowToBlock(wsId, blockId);

    const state = useDocumentStore.getState();
    const block = state.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(block);
    const secondRow = block.rows.find((r) => r.id !== starterRowId);
    assert.ok(secondRow);

    // Toggle the first row's checkbox — it should auto-move to bottom
    useDocumentStore.getState().toggleCheckboxCellValue(wsId, blockId, starterRowId, checkboxColumnId);

    await flushAutosave();

    // Before reload, verify the starter row moved to the bottom position
    const beforeReload = useDocumentStore.getState();
    const beforeBlock = beforeReload.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(beforeBlock);
    const lastRowBefore = beforeBlock.rows[beforeBlock.rows.length - 1];
    assert.equal(lastRowBefore?.id, starterRowId);

    await reloadFromBackend(backend);

    const reloaded = useDocumentStore.getState();
    const reloadedBlock = reloaded.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(reloadedBlock);
    // The persisted order should preserve the auto-move: checked row at bottom
    const lastRowAfter = reloadedBlock.rows[reloadedBlock.rows.length - 1];
    assert.equal(lastRowAfter?.id, starterRowId);
    assert.equal(lastRowAfter?.cells[checkboxColumnId]?.value, true);
  });

  test("checkbox toggle hides and reveals completed rows when hideCompletedRows is enabled", async () => {
    const wsId = getActiveWorkspaceId();
    const { blockId, checkboxColumnId, starterRowId } = getStarterBlockInfo(wsId);

    // Enable hideCompletedRows
    const toggledOn = useDocumentStore.getState().toggleBlockHideCompletedRows(wsId, blockId);
    assert.equal(toggledOn, true);

    // Verify the preference stuck
    let block = useDocumentStore.getState().workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(block);
    assert.equal(block.hideCompletedRows, true);

    // Starter row should be visible before checking the checkbox (unchecked)
    let visibleRows = filterCompletedRows(block.rows, block.columns, block.hideCompletedRows);
    const starterRowVisible = visibleRows.some((r) => r.id === starterRowId);
    assert.equal(starterRowVisible, true);

    // Toggle the checkbox on (check it)
    useDocumentStore.getState().toggleCheckboxCellValue(wsId, blockId, starterRowId, checkboxColumnId);

    // Re-read block state and verify the row cell is checked
    block = useDocumentStore.getState().workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(block);
    assert.equal(block.rows[0]?.cells[checkboxColumnId]?.value, true);

    // The starter row should now be excluded by the filter
    visibleRows = filterCompletedRows(block.rows, block.columns, block.hideCompletedRows);
    const starterRowHidden = visibleRows.some((r) => r.id === starterRowId);
    assert.equal(starterRowHidden, false);

    // Toggle the checkbox off (uncheck)
    useDocumentStore.getState().toggleCheckboxCellValue(wsId, blockId, starterRowId, checkboxColumnId);

    // Re-read block state and verify the row cell is unchecked
    block = useDocumentStore.getState().workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(block);
    assert.equal(block.rows[0]?.cells[checkboxColumnId]?.value, false);

    // The starter row should be visible again after unchecking
    visibleRows = filterCompletedRows(block.rows, block.columns, block.hideCompletedRows);
    const starterRowVisibleAgain = visibleRows.some((r) => r.id === starterRowId);
    assert.equal(starterRowVisibleAgain, true);
  });

  test("date, time, dropdown cell edits persist across reload", async () => {
    const wsId = getActiveWorkspaceId();
    const { blockId, starterRowId } = getStarterBlockInfo(wsId);

    // Add date, time, dropdown columns to the starter block
    // We add right of the text column
    const state = useDocumentStore.getState();
    const block = state.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(block);
    const textCol = block.columns.find((c) => c.type === "text");
    assert.ok(textCol);

    useDocumentStore.getState().addColumnRight(wsId, blockId, textCol.id, "date");
    useDocumentStore.getState().addColumnRight(wsId, blockId, textCol.id, "time");
    useDocumentStore.getState().addColumnRight(wsId, blockId, textCol.id, "dropdown");

    // Get the new column IDs
    const state2 = useDocumentStore.getState();
    const block2 = state2.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(block2);
    const dateCol = block2.columns.find((c) => c.type === "date");
    const timeCol = block2.columns.find((c) => c.type === "time");
    const dropdownCol = block2.columns.find((c) => c.type === "dropdown");
    assert.ok(dateCol);
    assert.ok(timeCol);
    assert.ok(dropdownCol);

    // Edit each cell value
    useDocumentStore.getState().updateDateCellValue(wsId, blockId, starterRowId, dateCol.id, "2026-05-25");
    useDocumentStore.getState().updateTimeCellValue(wsId, blockId, starterRowId, timeCol.id, "14:30");
    useDocumentStore.getState().updateDropdownCellValue(wsId, blockId, starterRowId, dropdownCol.id, "Active");

    await flushAutosave();
    await reloadFromBackend(backend);

    let reloaded = useDocumentStore.getState();
    let reloadedBlock = reloaded.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(reloadedBlock);
    let row = reloadedBlock.rows.find((r) => r.id === starterRowId);
    assert.ok(row);
    assert.equal(row.cells[dateCol.id]?.value, "2026-05-25");
    assert.equal(row.cells[timeCol.id]?.value, "14:30");
    assert.equal(row.cells[dropdownCol.id]?.value, "Active");

    // Clear each cell (set null)
    useDocumentStore.getState().updateDateCellValue(wsId, blockId, starterRowId, dateCol.id, null);
    useDocumentStore.getState().updateTimeCellValue(wsId, blockId, starterRowId, timeCol.id, null);
    useDocumentStore.getState().updateDropdownCellValue(wsId, blockId, starterRowId, dropdownCol.id, null);

    await flushAutosave();
    await reloadFromBackend(backend);

    reloaded = useDocumentStore.getState();
    reloadedBlock = reloaded.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(reloadedBlock);
    row = reloadedBlock.rows.find((r) => r.id === starterRowId);
    assert.ok(row);
    assert.equal(row.cells[dateCol.id]?.value, null);
    assert.equal(row.cells[timeCol.id]?.value, null);
    assert.equal(row.cells[dropdownCol.id]?.value, null);
  });

  test("column add, rename, move, change type, delete all persist across reload", async () => {
    const wsId = getActiveWorkspaceId();
    const { blockId, textColumnId, starterRowId } = getStarterBlockInfo(wsId);

    // 1. Add a date column right of the text column
    useDocumentStore.getState().addColumnRight(wsId, blockId, textColumnId, "date");

    const stateCol = useDocumentStore.getState();
    const initialBlock = stateCol.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(initialBlock);
    const initialDateCol = initialBlock.columns.find((c) => c.type === "date");
    assert.ok(initialDateCol);

    // 2. Rename the date column
    useDocumentStore.getState().renameColumn(wsId, blockId, initialDateCol.id, "Due Date");

    // 3. Move date column left (before text column)
    useDocumentStore.getState().moveColumnLeft(wsId, blockId, initialDateCol.id);

    // 4. Change date column type to text
    useDocumentStore.getState().changeColumnType(wsId, blockId, initialDateCol.id, "text");

    // 5. Delete the original text column
    useDocumentStore.getState().deleteColumn(wsId, blockId, textColumnId);

    await flushAutosave();
    await reloadFromBackend(backend);

    const reloaded = useDocumentStore.getState();
    const reloadedBlock = reloaded.workspacesById[wsId]?.blocks.find((b) => b.id === blockId);
    assert.ok(reloadedBlock);

    // The original text column should be gone
    const textColGone = reloadedBlock.columns.find((c) => c.id === textColumnId);
    assert.equal(textColGone, undefined);

    // The date-turned-text column should exist with the new label
    const renamedCol = reloadedBlock.columns.find((c) => c.id === initialDateCol.id);
    assert.ok(renamedCol);
    assert.equal(renamedCol.label, "Due Date");
    assert.equal(renamedCol.type, "text");

    // Verify the row cells map was updated: old text column cell removed
    const row = reloadedBlock.rows.find((r) => r.id === starterRowId);
    assert.ok(row);
    assert.equal(row.cells[textColumnId], undefined);
    // The former date column's cell should have a text-type value
    assert.ok(row.cells[initialDateCol.id]);
  });
});
