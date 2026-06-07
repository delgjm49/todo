import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createMemoryStorageService } from "../../services/storage/index.js";
import { createColumn } from "../../domain/columns/createColumn.js";
import type { AppDocumentSnapshot } from "../../types/app.js";
import { useDocumentStore } from "../../stores/documentStore.js";
import { useHistoryStore } from "../../stores/historyStore.js";
import {
  STOCK_DARK_WORKSPACE_BACKGROUND,
  STOCK_DARK_WORKSPACE_TEXT_COLOR,
  STOCK_DARK_WORKSPACE_ACCENT_COLOR,
  STOCK_LIGHT_WORKSPACE_BACKGROUND,
  STOCK_LIGHT_WORKSPACE_TEXT_COLOR,
  STOCK_LIGHT_WORKSPACE_ACCENT_COLOR,
} from "../../domain/defaults/themeDefaultColors.js";

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

  test("reorders workspaces and persists the order across reload", async () => {
    const service = await createMemoryStorageService();

    await useDocumentStore.getState().initializeAppData(service);
    const firstWorkspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(firstWorkspaceId);

    assert.equal(useDocumentStore.getState().createWorkspace("Second", { service, autosaveDelayMs: 5 }), true);
    const secondWorkspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(secondWorkspaceId);
    assert.equal(useDocumentStore.getState().createWorkspace("Third", { service, autosaveDelayMs: 5 }), true);
    const thirdWorkspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(thirdWorkspaceId);

    const reordered = useDocumentStore
      .getState()
      .reorderWorkspaces(thirdWorkspaceId, firstWorkspaceId, { service, autosaveDelayMs: 5 });
    assert.equal(reordered, true);
    assert.deepEqual(
      useDocumentStore.getState().workspaceIndex.map((workspace) => workspace.id),
      [thirdWorkspaceId, firstWorkspaceId, secondWorkspaceId]
    );
    assert.deepEqual(
      useDocumentStore.getState().workspaceIndex.map((workspace) => workspace.order),
      [0, 1, 2]
    );

    await wait(20);
    assert.equal(useDocumentStore.getState().saveStatus, "saved");

    await useDocumentStore.getState().initializeAppData(service);
    assert.deepEqual(
      useDocumentStore.getState().workspaceIndex.map((workspace) => workspace.id),
      [thirdWorkspaceId, firstWorkspaceId, secondWorkspaceId]
    );
    assert.deepEqual(
      useDocumentStore.getState().workspaceIndex.map((workspace) => workspace.order),
      [0, 1, 2]
    );
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

  test("supports block title edit, collapse, reorder, move, and delete flows", async () => {
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
    const primaryWorkspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(primaryWorkspaceId);

    const createdWorkspace = useDocumentStore.getState().createWorkspace("Archive", { service, autosaveDelayMs: 5 });
    assert.equal(createdWorkspace, true);
    const secondaryWorkspaceId =
      useDocumentStore.getState().workspaceIndex.find((entry) => entry.title === "Archive")?.id ?? null;
    assert.ok(secondaryWorkspaceId);

    useDocumentStore.getState().selectWorkspace(primaryWorkspaceId);

    const createdBullet = useDocumentStore.getState().createBlockFromTemplate("bulleted_list", {
      service,
      autosaveDelayMs: 5,
    });
    const createdNumbered = useDocumentStore.getState().createBlockFromTemplate("numbered_list", {
      service,
      autosaveDelayMs: 5,
    });

    assert.equal(createdBullet, true);
    assert.equal(createdNumbered, true);

    const initialBlocks = useDocumentStore.getState().workspacesById[primaryWorkspaceId]?.blocks ?? [];
    assert.equal(initialBlocks.length, 3);
    const starterBlockId = initialBlocks[0]?.id;
    const bulletBlockId = initialBlocks.find((block) => block.blockType === "bulleted_list")?.id;
    const numberedBlockId = initialBlocks.find((block) => block.blockType === "numbered_list")?.id;
    assert.ok(starterBlockId);
    assert.ok(bulletBlockId);
    assert.ok(numberedBlockId);

    const renamed = useDocumentStore
      .getState()
      .updateBlockTitle(primaryWorkspaceId, bulletBlockId, "Reference Notes", { service, autosaveDelayMs: 5 });
    assert.equal(renamed, true);

    const collapsed = useDocumentStore
      .getState()
      .toggleBlockCollapsed(primaryWorkspaceId, bulletBlockId, { service, autosaveDelayMs: 5 });
    assert.equal(collapsed, true);
    assert.equal(
      useDocumentStore
        .getState()
        .workspacesById[primaryWorkspaceId]?.blocks.find((block) => block.id === bulletBlockId)?.collapsed,
      true
    );

    const reordered = useDocumentStore
      .getState()
      .reorderBlocks(primaryWorkspaceId, numberedBlockId, starterBlockId, { service, autosaveDelayMs: 5 });
    assert.equal(reordered, true);
    assert.deepEqual(
      useDocumentStore.getState().workspacesById[primaryWorkspaceId]?.blocks.map((block) => block.id),
      [numberedBlockId, starterBlockId, bulletBlockId]
    );
    assert.deepEqual(
      useDocumentStore.getState().workspacesById[primaryWorkspaceId]?.blocks.map((block) => block.order),
      [0, 1, 2]
    );

    const reorderedDownward = useDocumentStore
      .getState()
      .reorderBlocks(primaryWorkspaceId, numberedBlockId, bulletBlockId, { service, autosaveDelayMs: 5 });
    assert.equal(reorderedDownward, true);
    assert.deepEqual(
      useDocumentStore.getState().workspacesById[primaryWorkspaceId]?.blocks.map((block) => block.id),
      [starterBlockId, numberedBlockId, bulletBlockId]
    );
    assert.deepEqual(
      useDocumentStore.getState().workspacesById[primaryWorkspaceId]?.blocks.map((block) => block.order),
      [0, 1, 2]
    );

    const moved = useDocumentStore
      .getState()
      .moveBlockToWorkspace(primaryWorkspaceId, bulletBlockId, secondaryWorkspaceId, { service, autosaveDelayMs: 5 });
    assert.equal(moved, true);
    assert.deepEqual(
      useDocumentStore.getState().workspacesById[primaryWorkspaceId]?.blocks.map((block) => block.id),
      [starterBlockId, numberedBlockId]
    );
    const movedBlock = useDocumentStore.getState().workspacesById[secondaryWorkspaceId]?.blocks[0];
    assert.equal(movedBlock?.id, bulletBlockId);
    assert.equal(movedBlock?.workspaceId, secondaryWorkspaceId);
    assert.equal(movedBlock?.title, "Reference Notes");
    assert.equal(movedBlock?.order, 0);

    const deleted = useDocumentStore
      .getState()
      .deleteBlock(secondaryWorkspaceId, bulletBlockId, { service, autosaveDelayMs: 5 });
    assert.equal(deleted, true);
    assert.equal(useDocumentStore.getState().workspacesById[secondaryWorkspaceId]?.blocks.length, 0);

    await wait(20);
    assert.equal(calls.length, 1);
    assert.equal(useDocumentStore.getState().saveStatus, "saved");
    assert.equal(useHistoryStore.getState().canUndo, true);
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

  test("supports base cell edits and row add/insert/delete flows", async () => {
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
    const checkboxColumn = block.columns.find((column) => column.type === "checkbox");
    const baseRowId = block.rows[0]?.id;
    assert.ok(textColumn);
    assert.ok(checkboxColumn);
    assert.ok(baseRowId);

    const textEdited = useDocumentStore
      .getState()
      .updateTextCellValue(workspaceId, block.id, baseRowId, textColumn.id, "Prepare report", {
        service,
        autosaveDelayMs: 5,
      });
    assert.equal(textEdited, true);
    assert.equal(
      useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows[0]?.cells[textColumn.id]?.value,
      "Prepare report"
    );

    const checkboxToggled = useDocumentStore
      .getState()
      .toggleCheckboxCellValue(workspaceId, block.id, baseRowId, checkboxColumn.id, {
        service,
        autosaveDelayMs: 5,
      });
    assert.equal(checkboxToggled, true);
    assert.equal(
      useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows[0]?.cells[checkboxColumn.id]?.value,
      true
    );

    const added = useDocumentStore
      .getState()
      .appendRowToBlock(workspaceId, block.id, { service, autosaveDelayMs: 5 });
    assert.equal(added, true);
    const addedRows = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows ?? [];
    assert.equal(addedRows.length, 2);
    const insertedRowId = addedRows[1]?.id;
    assert.ok(insertedRowId);
    assert.equal(addedRows[1]?.cells[textColumn.id]?.value, "");
    assert.equal(addedRows[1]?.cells[checkboxColumn.id]?.value, false);

    const insertedAbove = useDocumentStore
      .getState()
      .insertRowInBlock(workspaceId, block.id, insertedRowId, "above", { service, autosaveDelayMs: 5 });
    assert.equal(insertedAbove, true);
    const rowsAfterInsert = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows ?? [];
    assert.equal(rowsAfterInsert.length, 3);
    assert.equal(rowsAfterInsert[0]?.id, baseRowId);
    assert.notEqual(rowsAfterInsert[1]?.id, insertedRowId);
    assert.equal(rowsAfterInsert[2]?.id, insertedRowId);
    assert.deepEqual(
      rowsAfterInsert.map((row) => row.order),
      [0, 1, 2]
    );

    const rowToDelete = rowsAfterInsert[1]?.id;
    assert.ok(rowToDelete);
    const deleted = useDocumentStore
      .getState()
      .deleteRowFromBlock(workspaceId, block.id, rowToDelete, { service, autosaveDelayMs: 5 });
    assert.equal(deleted, true);
    const rowsAfterDelete = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows ?? [];
    assert.equal(rowsAfterDelete.length, 2);
    assert.equal(rowsAfterDelete.some((row) => row.id === rowToDelete), false);
    assert.deepEqual(
      rowsAfterDelete.map((row) => row.order),
      [0, 1]
    );

    await wait(20);
    assert.equal(calls.length, 1);
    assert.equal(useDocumentStore.getState().saveStatus, "saved");
    assert.equal(useHistoryStore.getState().canUndo, true);
  });

  test("preserves row order when checkbox auto-move is disabled", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);
    const workspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(workspaceId);

    const block = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0];
    assert.ok(block);
    const checkboxColumn = block.columns.find((column) => column.type === "checkbox");
    assert.ok(checkboxColumn);
    const firstRowId = block.rows[0]?.id;
    assert.ok(firstRowId);

    assert.equal(useDocumentStore.getState().appendRowToBlock(workspaceId, block.id, { service, autosaveDelayMs: 5 }), true);
    assert.equal(useDocumentStore.getState().appendRowToBlock(workspaceId, block.id, { service, autosaveDelayMs: 5 }), true);

    const beforeToggle = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows ?? [];
    const toggled = useDocumentStore
      .getState()
      .toggleCheckboxCellValue(workspaceId, block.id, firstRowId, checkboxColumn.id, { service, autosaveDelayMs: 5 });

    assert.equal(toggled, true);
    const afterToggle = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows ?? [];
    assert.deepEqual(afterToggle.map((row) => row.id), beforeToggle.map((row) => row.id));
    assert.equal(afterToggle.find((row) => row.id === firstRowId)?.cells[checkboxColumn.id]?.value, true);
  });

  test("moves checked rows to the bottom for the toggled checkbox column", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);
    const workspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(workspaceId);

    const block = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0];
    assert.ok(block);
    const checkboxColumn = block.columns.find((column) => column.type === "checkbox");
    assert.ok(checkboxColumn);

    assert.equal(useDocumentStore.getState().appendRowToBlock(workspaceId, block.id, { service, autosaveDelayMs: 5 }), true);
    assert.equal(useDocumentStore.getState().appendRowToBlock(workspaceId, block.id, { service, autosaveDelayMs: 5 }), true);

    const rows = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows ?? [];
    const firstRowId = rows[0]?.id;
    const secondRowId = rows[1]?.id;
    const thirdRowId = rows[2]?.id;
    assert.ok(firstRowId);
    assert.ok(secondRowId);
    assert.ok(thirdRowId);

    useDocumentStore.setState({
      workspacesById: {
        ...structuredClone(useDocumentStore.getState().workspacesById),
        [workspaceId]: {
          ...structuredClone(useDocumentStore.getState().workspacesById[workspaceId]),
          blocks: [
            {
              ...structuredClone(useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]),
              columns: useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.columns.map((column) =>
                column.id === checkboxColumn.id
                  ? {
                      ...structuredClone(column),
                      settings: { strikeoutRowWhenChecked: false, moveCheckedRowsToBottom: true },
                    }
                  : structuredClone(column)
              ) ?? [],
              rows: rows.map((row) =>
                row.id === secondRowId
                  ? {
                      ...structuredClone(row),
                      cells: {
                        ...structuredClone(row.cells),
                        [checkboxColumn.id]: { value: true, format: {} },
                      },
                    }
                  : structuredClone(row)
              ),
            },
          ],
        },
      },
    });

    const toggledTrue = useDocumentStore
      .getState()
      .toggleCheckboxCellValue(workspaceId, block.id, firstRowId, checkboxColumn.id, { service, autosaveDelayMs: 5 });
    assert.equal(toggledTrue, true);
    let afterToggle = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows ?? [];
    assert.deepEqual(afterToggle.map((row) => row.id), [thirdRowId, firstRowId, secondRowId]);
    assert.deepEqual(afterToggle.map((row) => row.order), [0, 1, 2]);
    assert.equal(afterToggle.find((row) => row.id === firstRowId)?.cells[checkboxColumn.id]?.value, true);

    const toggledFalse = useDocumentStore
      .getState()
      .toggleCheckboxCellValue(workspaceId, block.id, firstRowId, checkboxColumn.id, { service, autosaveDelayMs: 5 });
    assert.equal(toggledFalse, true);
    afterToggle = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows ?? [];
    assert.deepEqual(afterToggle.map((row) => row.id), [thirdRowId, firstRowId, secondRowId]);
    assert.deepEqual(afterToggle.map((row) => row.order), [0, 1, 2]);
    assert.equal(afterToggle.find((row) => row.id === firstRowId)?.cells[checkboxColumn.id]?.value, false);
    assert.equal(afterToggle.find((row) => row.id === secondRowId)?.cells[checkboxColumn.id]?.value, true);
  });

  test("applies auto-move using only the toggled checkbox column", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);
    const workspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(workspaceId);

    const block = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0];
    assert.ok(block);
    const checkboxColumn = block.columns.find((column) => column.type === "checkbox");
    assert.ok(checkboxColumn);
    const secondCheckboxId = "col_reviewed";

    assert.equal(useDocumentStore.getState().appendRowToBlock(workspaceId, block.id, { service, autosaveDelayMs: 5 }), true);
    assert.equal(useDocumentStore.getState().appendRowToBlock(workspaceId, block.id, { service, autosaveDelayMs: 5 }), true);

    const rows = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows ?? [];
    const firstRowId = rows[0]?.id;
    const secondRowId = rows[1]?.id;
    const thirdRowId = rows[2]?.id;
    assert.ok(firstRowId);
    assert.ok(secondRowId);
    assert.ok(thirdRowId);

    useDocumentStore.setState({
      workspacesById: {
        ...structuredClone(useDocumentStore.getState().workspacesById),
        [workspaceId]: {
          ...structuredClone(useDocumentStore.getState().workspacesById[workspaceId]),
          blocks: [
            {
              ...structuredClone(useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]),
              columns: [
                ...block.columns.map((column) => ({
                  ...structuredClone(column),
                  settings:
                    column.id === checkboxColumn.id
                      ? { strikeoutRowWhenChecked: false, moveCheckedRowsToBottom: true }
                      : structuredClone(column.settings),
                })),
                {
                  id: secondCheckboxId,
                  type: "checkbox" as const,
                  label: "Reviewed",
                  order: block.columns.length,
                  width: 96,
                  visible: true,
                  settings: { strikeoutRowWhenChecked: false, moveCheckedRowsToBottom: true },
                  format: {},
                },
              ],
              rows: rows.map((row) => ({
                ...structuredClone(row),
                cells: {
                  ...structuredClone(row.cells),
                  [checkboxColumn.id]: {
                    value: row.id === firstRowId,
                    format: {},
                  },
                  [secondCheckboxId]: {
                    value: row.id === secondRowId,
                    format: {},
                  },
                },
              })),
            },
          ],
        },
      },
    });

    const toggled = useDocumentStore
      .getState()
      .toggleCheckboxCellValue(workspaceId, block.id, thirdRowId, secondCheckboxId, { service, autosaveDelayMs: 5 });
    assert.equal(toggled, true);

    const afterToggle = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows ?? [];
    assert.deepEqual(afterToggle.map((row) => row.id), [firstRowId, secondRowId, thirdRowId]);
    assert.equal(afterToggle.find((row) => row.id === firstRowId)?.cells[checkboxColumn.id]?.value, true);
    assert.equal(afterToggle.find((row) => row.id === thirdRowId)?.cells[secondCheckboxId]?.value, true);
  });

  test("persists date, time, and dropdown cell edits", async () => {
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
    const baseRowId = block.rows[0]?.id;
    assert.ok(baseRowId);

    const dateColumnId = "col_date";
    const timeColumnId = "col_time";
    const dropdownColumnId = "col_dropdown";

    const extendedColumns = [
      ...block.columns,
      {
        id: dateColumnId,
        type: "date" as const,
        label: "Due",
        order: block.columns.length,
        width: 120,
        visible: true,
        settings: { alertsEnabled: false },
        format: {},
      },
      {
        id: timeColumnId,
        type: "time" as const,
        label: "At",
        order: block.columns.length + 1,
        width: 80,
        visible: true,
        settings: { alertsEnabled: false },
        format: {},
      },
      {
        id: dropdownColumnId,
        type: "dropdown" as const,
        label: "Status",
        order: block.columns.length + 2,
        width: 120,
        visible: true,
        settings: { options: ["Open", "Done"] },
        format: {},
      },
    ];

    const extendedRows = block.rows.map((row) => ({
      ...structuredClone(row),
      cells: {
        ...structuredClone(row.cells),
        [dateColumnId]: { value: null, format: {} },
        [timeColumnId]: { value: null, format: {} },
        [dropdownColumnId]: { value: null, format: {} },
      },
    }));

    useDocumentStore.setState({
      workspacesById: {
        ...structuredClone(useDocumentStore.getState().workspacesById),
        [workspaceId]: {
          ...structuredClone(workspace),
          blocks: workspace.blocks.map((b) =>
            b.id === block.id
              ? { ...structuredClone(b), columns: extendedColumns, rows: extendedRows }
              : structuredClone(b)
          ),
        },
      },
    });

    const dateEdited = useDocumentStore
      .getState()
      .updateDateCellValue(workspaceId, block.id, baseRowId, dateColumnId, "2026-05-11", {
        service,
        autosaveDelayMs: 5,
      });
    assert.equal(dateEdited, true);
    assert.equal(
      useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows[0]?.cells[dateColumnId]?.value,
      "2026-05-11"
    );

    const dateCleared = useDocumentStore
      .getState()
      .updateDateCellValue(workspaceId, block.id, baseRowId, dateColumnId, null, {
        service,
        autosaveDelayMs: 5,
      });
    assert.equal(dateCleared, true);
    assert.equal(
      useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows[0]?.cells[dateColumnId]?.value,
      null
    );

    const timeEdited = useDocumentStore
      .getState()
      .updateTimeCellValue(workspaceId, block.id, baseRowId, timeColumnId, "14:30", {
        service,
        autosaveDelayMs: 5,
      });
    assert.equal(timeEdited, true);
    assert.equal(
      useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows[0]?.cells[timeColumnId]?.value,
      "14:30"
    );

    const dropdownEdited = useDocumentStore
      .getState()
      .updateDropdownCellValue(workspaceId, block.id, baseRowId, dropdownColumnId, "Done", {
        service,
        autosaveDelayMs: 5,
      });
    assert.equal(dropdownEdited, true);
    assert.equal(
      useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows[0]?.cells[dropdownColumnId]?.value,
      "Done"
    );

    const dropdownCleared = useDocumentStore
      .getState()
      .updateDropdownCellValue(workspaceId, block.id, baseRowId, dropdownColumnId, null, {
        service,
        autosaveDelayMs: 5,
      });
    assert.equal(dropdownCleared, true);
    assert.equal(
      useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows[0]?.cells[dropdownColumnId]?.value,
      null
    );

    await wait(20);
    assert.equal(calls.length, 1);
    assert.equal(useDocumentStore.getState().saveStatus, "saved");
  });

  test("reorders rows within a block and persists", async () => {
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

    const added = useDocumentStore.getState().appendRowToBlock(workspaceId, block.id, { service, autosaveDelayMs: 5 });
    assert.equal(added, true);

    const rows = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows ?? [];
    assert.equal(rows.length, 2);
    const firstRowId = rows[0]?.id;
    const secondRowId = rows[1]?.id;
    assert.ok(firstRowId);
    assert.ok(secondRowId);

    const reordered = useDocumentStore
      .getState()
      .reorderRows(workspaceId, block.id, secondRowId, firstRowId, { service, autosaveDelayMs: 5 });
    assert.equal(reordered, true);

    const rowsAfterReorder = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows ?? [];
    assert.equal(rowsAfterReorder.length, 2);
    assert.equal(rowsAfterReorder[0]?.id, secondRowId);
    assert.equal(rowsAfterReorder[1]?.id, firstRowId);
    assert.deepEqual(rowsAfterReorder.map((row) => row.order), [0, 1]);

    await wait(20);
    assert.equal(calls.length, 1);
    assert.equal(useDocumentStore.getState().saveStatus, "saved");
    assert.equal(useHistoryStore.getState().canUndo, true);
  });

  test("sorts block rows through the document store with metadata and undo history", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);
    const workspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(workspaceId);

    const block = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0];
    assert.ok(block);
    const textColumn = block.columns.find((column) => column.type === "text");
    const checkboxColumn = block.columns.find((column) => column.type === "checkbox");
    const baseRow = block.rows[0];
    assert.ok(textColumn);
    assert.ok(checkboxColumn);
    assert.ok(baseRow);

    const seededRows = [
      {
        ...structuredClone(baseRow),
        id: "row_charlie",
        order: 0,
        format: { backgroundColor: "#111111" },
        cells: {
          [checkboxColumn.id]: { value: true, format: { italic: true } },
          [textColumn.id]: { value: "Charlie", format: { bold: true } },
        },
      },
      {
        ...structuredClone(baseRow),
        id: "row_alpha",
        order: 1,
        format: { backgroundColor: "#222222" },
        cells: {
          [checkboxColumn.id]: { value: false, format: { italic: false } },
          [textColumn.id]: { value: "Alpha", format: { bold: false } },
        },
      },
      {
        ...structuredClone(baseRow),
        id: "row_bravo",
        order: 2,
        format: { backgroundColor: "#333333" },
        cells: {
          [checkboxColumn.id]: { value: false, format: { underline: true } },
          [textColumn.id]: { value: "Bravo", format: { textColor: "#abcdef" } },
        },
      },
    ];

    useDocumentStore.setState({
      workspacesById: {
        ...structuredClone(useDocumentStore.getState().workspacesById),
        [workspaceId]: {
          ...structuredClone(useDocumentStore.getState().workspacesById[workspaceId]),
          blocks: [
            {
              ...structuredClone(block),
              sort: null,
              rows: seededRows,
            },
          ],
        },
      },
      canUndo: false,
      canRedo: false,
    });
    useHistoryStore.getState().initializeHistory(snapshotFromStore());

    const beforeRows = structuredClone(useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows ?? []);
    const sorted = useDocumentStore
      .getState()
      .sortBlockRows(workspaceId, block.id, textColumn.id, "asc", { service, autosaveDelayMs: 5 });
    assert.equal(sorted, true);

    const sortedBlock = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0];
    assert.ok(sortedBlock);
    assert.deepEqual(sortedBlock.rows.map((row) => row.id), ["row_alpha", "row_bravo", "row_charlie"]);
    assert.deepEqual(sortedBlock.rows.map((row) => row.order), [0, 1, 2]);
    assert.deepEqual(sortedBlock.sort, { columnId: textColumn.id, direction: "asc" });
    assert.equal(useHistoryStore.getState().past.length, 1);
    assert.equal(useHistoryStore.getState().canUndo, true);

    for (const sortedRow of sortedBlock.rows) {
      const beforeRow = beforeRows.find((row) => row.id === sortedRow.id);
      assert.ok(beforeRow);
      assert.deepEqual(sortedRow.cells, beforeRow.cells);
      assert.deepEqual(sortedRow.format, beforeRow.format);
    }

    const undoOk = useDocumentStore.getState().undo({ service, autosaveDelayMs: 5 });
    assert.equal(undoOk, true);
    const undoBlock = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0];
    assert.deepEqual(undoBlock?.rows.map((row) => row.id), ["row_charlie", "row_alpha", "row_bravo"]);
    assert.equal(undoBlock?.sort, null);

    const redoOk = useDocumentStore.getState().redo({ service, autosaveDelayMs: 5 });
    assert.equal(redoOk, true);
    const redoBlock = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0];
    assert.deepEqual(redoBlock?.rows.map((row) => row.id), ["row_alpha", "row_bravo", "row_charlie"]);
    assert.deepEqual(redoBlock?.sort, { columnId: textColumn.id, direction: "asc" });
  });

  test("rejects missing and unsupported sort columns without committing history", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);
    const workspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(workspaceId);

    const block = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0];
    assert.ok(block);
    const numberedColumn = createColumn("numbered", { id: "col_numbered", order: block.columns.length });
    const rows = block.rows.map((row) => ({
      ...structuredClone(row),
      cells: {
        ...structuredClone(row.cells),
        [numberedColumn.id]: { value: null, format: {} },
      },
    }));

    useDocumentStore.setState({
      workspacesById: {
        ...structuredClone(useDocumentStore.getState().workspacesById),
        [workspaceId]: {
          ...structuredClone(useDocumentStore.getState().workspacesById[workspaceId]),
          blocks: [{ ...structuredClone(block), columns: [...block.columns, numberedColumn], rows }],
        },
      },
      canUndo: false,
      canRedo: false,
    });
    useHistoryStore.getState().initializeHistory(snapshotFromStore());

    assert.equal(
      useDocumentStore.getState().sortBlockRows(workspaceId, block.id, "missing_column", "asc", {
        service,
        autosaveDelayMs: 5,
      }),
      false
    );
    assert.equal(
      useDocumentStore.getState().sortBlockRows(workspaceId, block.id, numberedColumn.id, "desc", {
        service,
        autosaveDelayMs: 5,
      }),
      false
    );
    assert.equal(useHistoryStore.getState().past.length, 0);
    assert.equal(useHistoryStore.getState().canUndo, false);
    assert.equal(useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.sort, null);
  });

  test("commits metadata-changing stable marker sorts and skips exact repeat no-ops", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);
    const workspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(workspaceId);

    const block = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0];
    assert.ok(block);
    const bulletColumn = createColumn("bullet", { id: "col_bullet", order: 0 });
    const textColumns = block.columns.map((column) => ({ ...structuredClone(column), order: column.order + 1 }));
    const rows = block.rows.map((row) => ({
      ...structuredClone(row),
      cells: {
        ...structuredClone(row.cells),
        [bulletColumn.id]: { value: null, format: { textColor: "#ffffff" } },
      },
    }));

    useDocumentStore.setState({
      workspacesById: {
        ...structuredClone(useDocumentStore.getState().workspacesById),
        [workspaceId]: {
          ...structuredClone(useDocumentStore.getState().workspacesById[workspaceId]),
          blocks: [{ ...structuredClone(block), columns: [bulletColumn, ...textColumns], rows, sort: null }],
        },
      },
      canUndo: false,
      canRedo: false,
    });
    useHistoryStore.getState().initializeHistory(snapshotFromStore());

    const firstSort = useDocumentStore
      .getState()
      .sortBlockRows(workspaceId, block.id, bulletColumn.id, "asc", { service, autosaveDelayMs: 5 });
    assert.equal(firstSort, true);
    assert.deepEqual(useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.sort, {
      columnId: bulletColumn.id,
      direction: "asc",
    });
    assert.equal(useHistoryStore.getState().past.length, 1);

    const repeatSort = useDocumentStore
      .getState()
      .sortBlockRows(workspaceId, block.id, bulletColumn.id, "asc", { service, autosaveDelayMs: 5 });
    assert.equal(repeatSort, false);
    assert.equal(useHistoryStore.getState().past.length, 1);
  });

  test("supports column rename, add, delete, move, change type, and settings flows", async () => {
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
    assert.ok(textColumn);

    const renamed = useDocumentStore
      .getState()
      .renameColumn(workspaceId, block.id, textColumn.id, "Task name", { service, autosaveDelayMs: 5 });
    assert.equal(renamed, true);
    assert.equal(
      useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.columns.find((c) => c.id === textColumn.id)
        ?.label,
      "Task name"
    );

    const addedRight = useDocumentStore
      .getState()
      .addColumnRight(workspaceId, block.id, textColumn.id, "date", { service, autosaveDelayMs: 5 });
    assert.equal(addedRight, true);
    const columnsAfterAdd = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.columns ?? [];
    assert.equal(columnsAfterAdd.length, block.columns.length + 1);
    const newDateColumn = columnsAfterAdd.find((c) => c.type === "date" && c.id !== textColumn.id);
    assert.ok(newDateColumn);
    const rowsAfterAdd = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows ?? [];
    assert.ok(rowsAfterAdd.every((row) => newDateColumn.id in row.cells));

    const movedLeft = useDocumentStore
      .getState()
      .moveColumnLeft(workspaceId, block.id, newDateColumn.id, { service, autosaveDelayMs: 5 });
    assert.equal(movedLeft, true);
    const columnsAfterMove = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.columns ?? [];
    const dateIndex = columnsAfterMove.findIndex((c) => c.id === newDateColumn.id);
    const textIndex = columnsAfterMove.findIndex((c) => c.id === textColumn.id);
    assert.ok(dateIndex < textIndex);

    const changedType = useDocumentStore
      .getState()
      .changeColumnType(workspaceId, block.id, newDateColumn.id, "checkbox", { service, autosaveDelayMs: 5 });
    assert.equal(changedType, true);
    const changedColumn = useDocumentStore
      .getState()
      .workspacesById[workspaceId]?.blocks[0]?.columns.find((c) => c.id === newDateColumn.id);
    assert.equal(changedColumn?.type, "checkbox");
    assert.equal(
      useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows[0]?.cells[newDateColumn.id]?.value,
      false
    );

    const settingsUpdated = useDocumentStore
      .getState()
      .updateColumnSettings(workspaceId, block.id, newDateColumn.id, { moveCheckedRowsToBottom: true }, {
        service,
        autosaveDelayMs: 5,
      });
    assert.equal(settingsUpdated, true);
    assert.equal(
      (
        useDocumentStore
          .getState()
          .workspacesById[workspaceId]?.blocks[0]?.columns.find((c) => c.id === newDateColumn.id)
          ?.settings as { moveCheckedRowsToBottom?: boolean }
      )?.moveCheckedRowsToBottom,
      true
    );

    const deleted = useDocumentStore
      .getState()
      .deleteColumn(workspaceId, block.id, newDateColumn.id, { service, autosaveDelayMs: 5 });
    assert.equal(deleted, true);
    const columnsAfterDelete = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.columns ?? [];
    assert.equal(columnsAfterDelete.some((c) => c.id === newDateColumn.id), false);
    assert.equal(
      useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows[0]?.cells[newDateColumn.id],
      undefined
    );

    await wait(20);
    assert.equal(calls.length, 1);
    assert.equal(useDocumentStore.getState().saveStatus, "saved");
    assert.equal(useHistoryStore.getState().canUndo, true);
  });

  test("applies block formatting and resets it", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);
    const workspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(workspaceId);

    const block = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0];
    assert.ok(block);

    const blockSelection = {
      kind: "block" as const,
      workspaceId,
      blockId: block.id,
    };

    const applied = useDocumentStore
      .getState()
      .updateSelectedTextFormatting(blockSelection, { bold: true, fontSize: 20 }, { service, autosaveDelayMs: 5 });
    assert.equal(applied, true);
    assert.equal(useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.format.bold, true);
    assert.equal(useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.format.fontSize, 20);
    assert.equal(useHistoryStore.getState().canUndo, true);

    const reset = useDocumentStore
      .getState()
      .updateSelectedTextFormatting(blockSelection, { bold: undefined }, { service, autosaveDelayMs: 5 });
    assert.equal(reset, true);
    assert.equal(
      useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.format.bold,
      undefined
    );
    assert.equal(useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.format.fontSize, 20);
  });

  test("applies column formatting without altering other columns", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);
    const workspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(workspaceId);

    const block = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0];
    assert.ok(block);
    const textColumn = block.columns.find((c) => c.type === "text");
    const checkboxColumn = block.columns.find((c) => c.type === "checkbox");
    assert.ok(textColumn);
    assert.ok(checkboxColumn);

    const columnSelection = {
      kind: "column" as const,
      workspaceId,
      blockId: block.id,
      columnId: textColumn.id,
    };

    const applied = useDocumentStore
      .getState()
      .updateSelectedTextFormatting(columnSelection, { textColor: "#ff0000" }, { service, autosaveDelayMs: 5 });
    assert.equal(applied, true);
    assert.equal(
      useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.columns.find((c) => c.id === textColumn.id)
        ?.format.textColor,
      "#ff0000"
    );
    assert.equal(
      useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.columns.find((c) => c.id === checkboxColumn.id)
        ?.format.textColor,
      undefined
    );
  });

  test("applies row formatting without altering row order or cells", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);
    const workspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(workspaceId);

    const block = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0];
    assert.ok(block);
    const rowId = block.rows[0]?.id;
    assert.ok(rowId);

    const rowSelection = {
      kind: "row" as const,
      workspaceId,
      blockId: block.id,
      rowId,
    };

    const applied = useDocumentStore
      .getState()
      .updateSelectedTextFormatting(rowSelection, { backgroundColor: "#eeeeee" }, { service, autosaveDelayMs: 5 });
    assert.equal(applied, true);
    assert.equal(
      useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows[0]?.format.backgroundColor,
      "#eeeeee"
    );
    const textColumn = block.columns.find((c) => c.type === "text");
    assert.ok(textColumn);
    assert.equal(useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows[0]?.cells[textColumn.id]?.value, "");
  });

  test("applies cell formatting without changing cell value", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);
    const workspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(workspaceId);

    const block = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0];
    assert.ok(block);
    const rowId = block.rows[0]?.id;
    const textColumnId = block.columns.find((c) => c.type === "text")?.id;
    assert.ok(rowId);
    assert.ok(textColumnId);

    const cellSelection = {
      kind: "cell" as const,
      workspaceId,
      blockId: block.id,
      rowId,
      columnId: textColumnId,
    };

    const applied = useDocumentStore
      .getState()
      .updateSelectedTextFormatting(cellSelection, { italic: true, textColor: "#0000ff" }, { service, autosaveDelayMs: 5 });
    assert.equal(applied, true);
    const cell = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows[0]?.cells[textColumnId];
    assert.equal(cell?.format?.italic, true);
    assert.equal(cell?.format?.textColor, "#0000ff");
    assert.equal(cell?.value, "");

    const reset = useDocumentStore
      .getState()
      .updateSelectedTextFormatting(cellSelection, { italic: undefined, textColor: undefined }, { service, autosaveDelayMs: 5 });
    assert.equal(reset, true);
    const cellAfterReset = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows[0]?.cells[textColumnId];
    assert.equal(cellAfterReset?.format, undefined);
    assert.equal(cellAfterReset?.value, "");
  });

  test("returns false for none selection and does not commit", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);

    const result = useDocumentStore
      .getState()
      .updateSelectedTextFormatting({ kind: "none" }, { bold: true }, { service, autosaveDelayMs: 5 });
    assert.equal(result, false);
    assert.equal(useHistoryStore.getState().canUndo, false);
  });

  test("returns false for stale selection and does not commit", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);
    const workspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(workspaceId);

    const result = useDocumentStore.getState().updateSelectedTextFormatting(
      { kind: "block" as const, workspaceId, blockId: "nonexistent" },
      { bold: true },
      { service, autosaveDelayMs: 5 }
    );
    assert.equal(result, false);
    assert.equal(useHistoryStore.getState().canUndo, false);
  });

  test("applies block border formatting and resets one property", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);
    const workspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(workspaceId);

    const block = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0];
    assert.ok(block);

    const blockSelection = {
      kind: "block" as const,
      workspaceId,
      blockId: block.id,
    };

    const applied = useDocumentStore
      .getState()
      .updateSelectedBorderFormatting(blockSelection, { borderWidth: 4, borderColor: "#ff0000", edges: ["top", "bottom"] }, { service, autosaveDelayMs: 5 });
    assert.equal(applied, true);
    assert.equal(useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.format.borderWidth, 4);
    assert.equal(useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.format.borderColor, "#ff0000");
    assert.deepEqual(useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.format.edges, ["top", "bottom"]);
    assert.equal(useHistoryStore.getState().canUndo, true);

    const reset = useDocumentStore
      .getState()
      .updateSelectedBorderFormatting(blockSelection, { borderColor: undefined }, { service, autosaveDelayMs: 5 });
    assert.equal(reset, true);
    assert.equal(
      useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.format.borderColor,
      undefined
    );
    assert.equal(useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.format.borderWidth, 4);
  });

  test("applies column border formatting without altering other columns", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);
    const workspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(workspaceId);

    const block = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0];
    assert.ok(block);
    const textColumn = block.columns.find((c) => c.type === "text");
    const checkboxColumn = block.columns.find((c) => c.type === "checkbox");
    assert.ok(textColumn);
    assert.ok(checkboxColumn);

    const columnSelection = {
      kind: "column" as const,
      workspaceId,
      blockId: block.id,
      columnId: textColumn.id,
    };

    const applied = useDocumentStore
      .getState()
      .updateSelectedBorderFormatting(columnSelection, { edges: ["left"] }, { service, autosaveDelayMs: 5 });
    assert.equal(applied, true);
    assert.deepEqual(
      useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.columns.find((c) => c.id === textColumn.id)
        ?.format.edges,
      ["left"]
    );
    assert.equal(
      useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.columns.find((c) => c.id === checkboxColumn.id)
        ?.format.edges,
      undefined
    );
  });

  test("applies row border formatting without altering row order or cells", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);
    const workspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(workspaceId);

    const block = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0];
    assert.ok(block);
    const rowId = block.rows[0]?.id;
    assert.ok(rowId);

    const rowSelection = {
      kind: "row" as const,
      workspaceId,
      blockId: block.id,
      rowId,
    };

    const applied = useDocumentStore
      .getState()
      .updateSelectedBorderFormatting(rowSelection, { borderWidth: 2 }, { service, autosaveDelayMs: 5 });
    assert.equal(applied, true);
    assert.equal(
      useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows[0]?.format.borderWidth,
      2
    );
    const textColumn = block.columns.find((c) => c.type === "text");
    assert.ok(textColumn);
    assert.equal(useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows[0]?.cells[textColumn.id]?.value, "");
  });

  test("applies cell border formatting without changing cell value", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);
    const workspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(workspaceId);

    const block = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0];
    assert.ok(block);
    const rowId = block.rows[0]?.id;
    const textColumnId = block.columns.find((c) => c.type === "text")?.id;
    assert.ok(rowId);
    assert.ok(textColumnId);

    const cellSelection = {
      kind: "cell" as const,
      workspaceId,
      blockId: block.id,
      rowId,
      columnId: textColumnId,
    };

    const applied = useDocumentStore
      .getState()
      .updateSelectedBorderFormatting(cellSelection, { borderColor: "#00ff00", edges: ["top"] }, { service, autosaveDelayMs: 5 });
    assert.equal(applied, true);
    const cell = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows[0]?.cells[textColumnId];
    assert.equal(cell?.format?.borderColor, "#00ff00");
    assert.deepEqual(cell?.format?.edges, ["top"]);
    assert.equal(cell?.value, "");

    const reset = useDocumentStore
      .getState()
      .updateSelectedBorderFormatting(cellSelection, { borderColor: undefined, edges: undefined }, { service, autosaveDelayMs: 5 });
    assert.equal(reset, true);
    const cellAfterReset = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0]?.rows[0]?.cells[textColumnId];
    assert.equal(cellAfterReset?.format, undefined);
    assert.equal(cellAfterReset?.value, "");
  });

  test("returns false for none selection via border formatting", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);

    const result = useDocumentStore
      .getState()
      .updateSelectedBorderFormatting({ kind: "none" }, { borderWidth: 2 }, { service, autosaveDelayMs: 5 });
    assert.equal(result, false);
    assert.equal(useHistoryStore.getState().canUndo, false);
  });

  test("returns false for stale selection via border formatting", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);
    const workspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(workspaceId);

    const result = useDocumentStore.getState().updateSelectedBorderFormatting(
      { kind: "block" as const, workspaceId, blockId: "nonexistent" },
      { borderWidth: 2 },
      { service, autosaveDelayMs: 5 }
    );
    assert.equal(result, false);
    assert.equal(useHistoryStore.getState().canUndo, false);
  });

  test("persists formatting across store re-initialization after autosave", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);
    const workspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(workspaceId);

    const block = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0];
    assert.ok(block);
    const textColumn = block.columns.find((c) => c.type === "text");
    const checkboxColumn = block.columns.find((c) => c.type === "checkbox");
    assert.ok(textColumn);
    assert.ok(checkboxColumn);
    const rowId = block.rows[0]?.id;
    assert.ok(rowId);

    const blockApplied = useDocumentStore
      .getState()
      .updateSelectedTextFormatting(
        { kind: "block", workspaceId, blockId: block.id },
        { fontFamily: "Courier New", fontSize: 22, bold: true },
        { service, autosaveDelayMs: 5 }
      );
    assert.equal(blockApplied, true);

    const columnApplied = useDocumentStore
      .getState()
      .updateSelectedBorderFormatting(
        { kind: "column", workspaceId, blockId: block.id, columnId: textColumn.id },
        { borderWidth: 3, borderColor: "#ff00ff", edges: ["top"] },
        { service, autosaveDelayMs: 5 }
      );
    assert.equal(columnApplied, true);

    const rowApplied = useDocumentStore
      .getState()
      .updateSelectedTextFormatting(
        { kind: "row", workspaceId, blockId: block.id, rowId },
        { italic: true, textColor: "#00ffff" },
        { service, autosaveDelayMs: 5 }
      );
    assert.equal(rowApplied, true);

    const cellApplied = useDocumentStore
      .getState()
      .updateSelectedBorderFormatting(
        { kind: "cell", workspaceId, blockId: block.id, rowId, columnId: textColumn.id },
        { borderWidth: 5, edges: ["left", "bottom"] },
        { service, autosaveDelayMs: 5 }
      );
    assert.equal(cellApplied, true);

    await wait(20);

    await useDocumentStore.getState().initializeAppData(service);

    const reloadedBlock = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0];
    assert.ok(reloadedBlock);
    assert.equal(reloadedBlock.format.fontFamily, "Courier New");
    assert.equal(reloadedBlock.format.fontSize, 22);
    assert.equal(reloadedBlock.format.bold, true);

    const reloadedColumn = reloadedBlock.columns.find((c) => c.id === textColumn.id);
    assert.ok(reloadedColumn);
    assert.equal(reloadedColumn.format.borderWidth, 3);
    assert.equal(reloadedColumn.format.borderColor, "#ff00ff");
    assert.deepEqual(reloadedColumn.format.edges, ["top"]);

    const reloadedRow = reloadedBlock.rows.find((r) => r.id === rowId);
    assert.ok(reloadedRow);
    assert.equal(reloadedRow.format.italic, true);
    assert.equal(reloadedRow.format.textColor, "#00ffff");

    const reloadedCell = reloadedRow.cells[textColumn.id];
    assert.ok(reloadedCell);
    assert.ok(reloadedCell.format);
    assert.equal(reloadedCell.format.borderWidth, 5);
    assert.deepEqual(reloadedCell.format.edges, ["bottom", "left"]);
    assert.equal(reloadedCell.value, "");

    assert.equal(reloadedBlock.columns.length, block.columns.length);
    assert.equal(reloadedBlock.rows.length, block.rows.length);
    assert.equal(reloadedBlock.rows[0]?.cells[checkboxColumn.id]?.value, false);
  });

  test("updateColumnSettings persists dropdown options and overwrites on subsequent calls", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);
    const workspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(workspaceId);

    const block = useDocumentStore.getState().workspacesById[workspaceId]?.blocks[0];
    assert.ok(block);

    const textColumn = block.columns.find((c) => c.type === "text");
    assert.ok(textColumn);

    const addedRight = useDocumentStore
      .getState()
      .addColumnRight(workspaceId, block.id, textColumn.id, "dropdown", { service, autosaveDelayMs: 5 });
    assert.equal(addedRight, true);

    const dropdownColumn = useDocumentStore
      .getState()
      .workspacesById[workspaceId]?.blocks[0]?.columns.find((c) => c.type === "dropdown" && c.id !== textColumn.id);
    assert.ok(dropdownColumn);

    const firstUpdate = useDocumentStore
      .getState()
      .updateColumnSettings(workspaceId, block.id, dropdownColumn.id, { options: ["A", "B"] }, {
        service,
        autosaveDelayMs: 5,
      });
    assert.equal(firstUpdate, true);
    const firstColumn = useDocumentStore
      .getState()
      .workspacesById[workspaceId]?.blocks[0]?.columns.find((c) => c.id === dropdownColumn.id);
    assert.deepEqual(
      (firstColumn?.settings as { options?: string[] })?.options,
      ["A", "B"]
    );

    const secondUpdate = useDocumentStore
      .getState()
      .updateColumnSettings(workspaceId, block.id, dropdownColumn.id, { options: ["A", "B", "C"] }, {
        service,
        autosaveDelayMs: 5,
      });
    assert.equal(secondUpdate, true);
    const secondColumn = useDocumentStore
      .getState()
      .workspacesById[workspaceId]?.blocks[0]?.columns.find((c) => c.id === dropdownColumn.id);
    assert.deepEqual(
      (secondColumn?.settings as { options?: string[] })?.options,
      ["A", "B", "C"]
    );

    await wait(20);
  });
});

describe("light-mode default workspace creation", () => {
  test("new workspace in light mode with stock dark defaults gets light workspace colors", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);

    // Switch theme to light
    useDocumentStore.getState().updateSettings({ theme: "light" }, { service, autosaveDelayMs: 5 });

    // Verify stock dark defaults are still persisted (not auto-rewritten)
    const settings = useDocumentStore.getState().settings;
    assert.ok(settings);
    assert.equal(settings.defaults.workspaceBackground, STOCK_DARK_WORKSPACE_BACKGROUND);
    assert.equal(settings.defaults.workspaceTextColor, STOCK_DARK_WORKSPACE_TEXT_COLOR);
    assert.equal(settings.defaults.workspaceAccentColor, STOCK_DARK_WORKSPACE_ACCENT_COLOR);

    // Create a new workspace — should use light effective defaults
    useDocumentStore.getState().createWorkspace("Light Test", { service, autosaveDelayMs: 5 });

    const newEntry = useDocumentStore
      .getState()
      .workspaceIndex.find((entry) => entry.title === "Light Test");
    assert.ok(newEntry);
    assert.equal(newEntry.style.background, STOCK_LIGHT_WORKSPACE_BACKGROUND);
    assert.equal(newEntry.style.textColor, STOCK_LIGHT_WORKSPACE_TEXT_COLOR);
    assert.equal(newEntry.style.accentStripe?.color, STOCK_LIGHT_WORKSPACE_ACCENT_COLOR);
  });

  test("new workspace in light mode with custom defaults uses custom colors unchanged", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);

    const state = useDocumentStore.getState();
    assert.ok(state.settings);

    useDocumentStore.getState().updateSettings({
      theme: "light",
      defaults: {
        ...state.settings.defaults,
        workspaceBackground: "#101828",
        workspaceTextColor: "#F8FAFC",
        workspaceAccentColor: "#38BDF8",
      },
    }, { service, autosaveDelayMs: 5 });

    useDocumentStore.getState().createWorkspace("Custom Light", { service, autosaveDelayMs: 5 });

    const newEntry = useDocumentStore
      .getState()
      .workspaceIndex.find((entry) => entry.title === "Custom Light");
    assert.ok(newEntry);
    assert.equal(newEntry.style.background, "#101828");
    assert.equal(newEntry.style.textColor, "#F8FAFC");
    assert.equal(newEntry.style.accentStripe?.color, "#38BDF8");
  });

  test("deleting the last workspace in light mode creates a readable light replacement", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);

    // Switch to light mode
    useDocumentStore.getState().updateSettings({ theme: "light" }, { service, autosaveDelayMs: 5 });

    // Get the only workspace id
    const workspaceId = useDocumentStore.getState().workspaceIndex[0]?.id;
    assert.ok(workspaceId);

    // Delete it — replacement should use light defaults
    useDocumentStore.getState().deleteWorkspace(workspaceId, { service, autosaveDelayMs: 5 });

    const index = useDocumentStore.getState().workspaceIndex;
    assert.equal(index.length, 1);
    const replacement = index[0];
    assert.ok(replacement);
    assert.equal(replacement.title, "Home");
    assert.equal(replacement.style.background, STOCK_LIGHT_WORKSPACE_BACKGROUND);
    assert.equal(replacement.style.textColor, STOCK_LIGHT_WORKSPACE_TEXT_COLOR);
    assert.equal(replacement.style.accentStripe?.color, STOCK_LIGHT_WORKSPACE_ACCENT_COLOR);
  });

  test("toggleBlockHideCompletedRows toggles the block preference and autosaves", async () => {
    const service = await createMemoryStorageService();
    await useDocumentStore.getState().initializeAppData(service);

    const workspaceId = useDocumentStore.getState().activeWorkspaceId;
    assert.ok(workspaceId);

    const workspace = useDocumentStore.getState().workspacesById[workspaceId];
    assert.ok(workspace);
    const blockId = workspace.blocks[0]?.id;
    assert.ok(blockId);

    // Default should be false
    assert.equal(
      useDocumentStore.getState().workspacesById[workspaceId]?.blocks.find((b) => b.id === blockId)?.hideCompletedRows,
      false
    );

    // Toggle on
    const toggledOn = useDocumentStore
      .getState()
      .toggleBlockHideCompletedRows(workspaceId, blockId, { service, autosaveDelayMs: 5 });
    assert.equal(toggledOn, true);
    assert.equal(
      useDocumentStore.getState().workspacesById[workspaceId]?.blocks.find((b) => b.id === blockId)?.hideCompletedRows,
      true
    );

    // Toggle back off
    const toggledOff = useDocumentStore
      .getState()
      .toggleBlockHideCompletedRows(workspaceId, blockId, { service, autosaveDelayMs: 5 });
    assert.equal(toggledOff, true);
    assert.equal(
      useDocumentStore.getState().workspacesById[workspaceId]?.blocks.find((b) => b.id === blockId)?.hideCompletedRows,
      false
    );

    // Missing block returns false
    const missing = useDocumentStore
      .getState()
      .toggleBlockHideCompletedRows(workspaceId, "nonexistent", { service, autosaveDelayMs: 5 });
    assert.equal(missing, false);
  });
});
