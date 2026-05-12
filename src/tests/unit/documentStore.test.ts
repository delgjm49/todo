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
});
