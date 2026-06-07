import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  DEFAULT_SETTINGS,
  STORAGE_SCHEMA_VERSION,
  createMemoryStorageBackend,
  createStarterBlock,
  createStorageService,
  validateSettingsFile,
  validateWorkspaceFile,
} from "../../services/storage/index.js";
import { resolveCellFormatting } from "../../domain/formatting/resolveCellFormatting.js";
import type { Settings } from "../../types/settings.js";
import type { WorkspaceDocument, WorkspaceIndexEntry } from "../../types/workspace.js";

function parseJson(text: string | null): unknown {
  assert.ok(text);
  return JSON.parse(text);
}

describe("storage schemas", () => {
  test("normalizes persisted workspace cells without a redundant type field", () => {
    const validated = validateWorkspaceFile({
      schemaVersion: STORAGE_SCHEMA_VERSION,
      id: "ws_test",
      blocks: [
        {
          id: "block_test",
          workspaceId: "ws_test",
          title: "Test",
          blockType: "basic_checklist",
          order: 0,
          collapsed: false,
          hideCompletedRows: false,
          border: {},
          sort: null,
          format: {},
          columns: [
            {
              id: "col_check",
              type: "checkbox",
              label: "",
              order: 0,
              width: 44,
              visible: true,
              settings: {
                strikeoutRowWhenChecked: true,
                moveCheckedRowsToBottom: false,
              },
              format: {},
            },
            {
              id: "col_text",
              type: "text",
              label: "Task",
              order: 1,
              width: 240,
              visible: true,
              settings: {},
              format: {},
            },
          ],
          rows: [
            {
              id: "row_1",
              order: 0,
              format: {},
              cells: {
                col_check: {
                  value: false,
                  type: "checkbox",
                  format: {},
                },
                col_text: {
                  value: "Task one",
                  type: "text",
                  format: {},
                },
              },
            },
          ],
        },
      ],
    });

    const row = validated.value.blocks[0]?.rows[0];
    assert.ok(row);
    assert.deepEqual(row.cells.col_check, { value: false, format: {} });
    assert.deepEqual(row.cells.col_text, { value: "Task one", format: {} });
    assert.equal("type" in row.cells.col_check, false);
  });

  test("normalizes absent hideCompletedRows to false", () => {
    // Simulate a legacy document without hideCompletedRows
    const raw = {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      id: "ws_test",
      blocks: [
        {
          id: "block_test",
          workspaceId: "ws_test",
          title: "Test",
          blockType: "basic_checklist",
          order: 0,
          collapsed: false,
          border: {},
          sort: null,
          format: {},
          columns: [],
          rows: [],
        },
      ],
    };

    const legacyValidated = validateWorkspaceFile(raw);
    const normalized = legacyValidated.value.blocks[0];
    assert.ok(normalized);
    assert.equal(normalized.hideCompletedRows, false);
  });

  test("normalizes hideCompletedRows: true correctly", () => {
    const validated = validateWorkspaceFile({
      schemaVersion: STORAGE_SCHEMA_VERSION,
      id: "ws_test",
      blocks: [
        {
          id: "block_test",
          workspaceId: "ws_test",
          title: "Test",
          blockType: "basic_checklist",
          order: 0,
          collapsed: false,
          hideCompletedRows: true,
          border: {},
          sort: null,
          format: {},
          columns: [],
          rows: [],
        },
      ],
    });

    const normalized = validated.value.blocks[0];
    assert.ok(normalized);
    assert.equal(normalized.hideCompletedRows, true);
  });

  test("normalizes invalid hideCompletedRows to false", () => {
    const validated = validateWorkspaceFile({
      schemaVersion: STORAGE_SCHEMA_VERSION,
      id: "ws_test",
      blocks: [
        {
          id: "block_test",
          workspaceId: "ws_test",
          title: "Test",
          blockType: "basic_checklist",
          order: 0,
          collapsed: false,
          hideCompletedRows: "not-a-boolean",
          border: {},
          sort: null,
          format: {},
          columns: [],
          rows: [],
        },
      ],
    });

    const normalized = validated.value.blocks[0];
    assert.ok(normalized);
    assert.equal(normalized.hideCompletedRows, false);
  });

  test("accepts a valid settings document", () => {
    const validated = validateSettingsFile({
      schemaVersion: STORAGE_SCHEMA_VERSION,
      settings: {
        theme: "dark",
        defaults: {
          fontFamily: "Segoe UI",
          fontSize: 14,
          textColor: "#F3F4F6",
          cellBackground: "#111827",
          blockBorderColor: "#374151",
          blockBorderWidth: 1,
          workspaceAccentEnabled: true,
          workspaceBackground: "#1F2937",
          workspaceTextColor: "#F9FAFB",
          workspaceAccentColor: "#60A5FA",
        },
      },
    });

    assert.equal(validated.issues.length, 0);
    assert.equal(validated.value.settings.theme, "dark");
  });
});

describe("storage service", () => {
  test("bootstraps starter workspace data on first load", async () => {
    const service = await createStorageService(createMemoryStorageBackend());
    const appData = await service.loadAppData();

    assert.equal(appData.workspaceIndex.length, 1);
    assert.equal(appData.workspaces.length, 1);
    assert.equal(appData.workspaces[0]?.blocks.length, 1);
    assert.equal(appData.workspaces[0]?.blocks[0]?.columns.length, 2);
  });

  test("recovers a settings file from backup when the primary file is invalid", async () => {
    const backend = createMemoryStorageBackend();
    const service = await createStorageService(backend);
    const initial = await service.loadAppData();

    assert.ok(service.paths);

    await backend.writeText(service.paths.settingsFile, "{");
    await backend.writeText(
      service.paths.settingsBackupFile,
      JSON.stringify({
        schemaVersion: STORAGE_SCHEMA_VERSION,
        settings: initial.settings,
      })
    );

    const recovered = await service.loadAppData();
    assert.equal(recovered.settings.theme, initial.settings.theme);

    const restoredPrimary = await backend.readText(service.paths.settingsFile);
    assert.match(restoredPrimary ?? "", /"schemaVersion": 1/);
  });

  test("recovers a workspace index file from backup when the primary file is invalid", async () => {
    const backend = createMemoryStorageBackend();
    const service = await createStorageService(backend);
    const initial = await service.loadAppData();

    assert.ok(service.paths);

    await backend.writeText(service.paths.workspaceIndexFile, "{");
    await backend.writeText(
      service.paths.workspaceIndexBackupFile,
      JSON.stringify({
        schemaVersion: STORAGE_SCHEMA_VERSION,
        workspaces: initial.workspaceIndex,
      })
    );

    const recovered = await service.loadAppData();
    assert.equal(recovered.workspaceIndex.length, initial.workspaceIndex.length);

    const restoredPrimary = await backend.readText(service.paths.workspaceIndexFile);
    assert.match(restoredPrimary ?? "", /"schemaVersion": 1/);
  });

  test("returns partial save semantics when saveAppData fails after some writes", async () => {
    const backend = createMemoryStorageBackend();
    const service = await createStorageService(backend);
    const loaded = await service.loadAppData();
    const paths = service.paths;

    assert.ok(paths);

    const workspaceId = loaded.workspaces[0]?.id;
    assert.ok(workspaceId);

    backend.rename = async (fromPath: string, toPath: string) => {
      if (toPath === paths.workspaceIndexFile) {
        throw new Error("index rename failed");
      }

      const fromText = await backend.readText(fromPath);
      if (fromText === null) {
        throw new Error(`Missing file: ${fromPath}`);
      }
      await backend.writeText(toPath, fromText);
      await backend.remove(fromPath);
    };

    const outcome = await service.saveAppData({
      settings: loaded.settings,
      workspaceIndex: loaded.workspaceIndex,
      workspacesById: loaded.workspaces.reduce<Record<string, WorkspaceDocument>>(
        (accumulator, workspace) => {
          accumulator[workspace.id] = workspace;
          return accumulator;
        },
        {}
      ),
      activeWorkspaceId: loaded.activeWorkspaceId,
      loadedWorkspaceIds: loaded.workspaces.map((workspace) => workspace.id),
      dirty: true,
      lastSaveAt: null,
    });

    assert.equal(outcome.persistenceState, "partial");
    assert.equal(outcome.persisted.workspaceIds.includes(workspaceId), true);
    assert.equal(outcome.persisted.workspaceIndex, false);
    assert.equal(outcome.persisted.settings, false);
    assert.equal(outcome.error?.stage, "workspace-index");
  });

  test("coerces outgoing payloads to canonical persisted shapes on save", async () => {
    const backend = createMemoryStorageBackend();
    const service = await createStorageService(backend);
    const loaded = await service.loadAppData();
    const paths = service.paths;

    assert.ok(paths);
    const workspace = loaded.workspaces[0];
    assert.ok(workspace);

    const malformedSettings = {
      theme: "violet",
      defaults: {
        fontFamily: 123,
        fontSize: -2,
        textColor: "not-a-color",
        cellBackground: "#111827",
        blockBorderColor: "also-not-a-color",
        blockBorderWidth: -5,
        workspaceAccentEnabled: "yes",
      },
    } as unknown as Settings;

    const malformedWorkspaceIndex = [
      {
        id: "ws_home",
        title: 123,
        order: -7,
        style: {
          background: "bad-color",
          textColor: "also-bad",
          accentStripe: {
            enabled: "maybe",
            color: "still-bad",
          },
        },
      },
    ] as unknown as WorkspaceIndexEntry[];

    const markerBlock = createStarterBlock("bulleted_list", "Notes");
    const markerColumnId = markerBlock.columns[0]?.id;
    const textColumnId = markerBlock.columns[1]?.id;
    const markerRow = markerBlock.rows[0];
    assert.ok(markerColumnId);
    assert.ok(textColumnId);
    assert.ok(markerRow);

    markerRow.cells[markerColumnId] = {
      value: "should be null",
      format: {},
      type: "redundant",
    } as unknown as (typeof markerRow.cells)[string];
    markerRow.cells[textColumnId] = {
      value: 123,
      format: {},
      type: "redundant",
    } as unknown as (typeof markerRow.cells)[string];

    const malformedWorkspace: WorkspaceDocument = {
      id: "ws_marker",
      blocks: [markerBlock],
    };

    await service.saveSettings(malformedSettings);
    await service.saveWorkspaceIndex(malformedWorkspaceIndex);
    await service.saveWorkspace(malformedWorkspace);

    const settingsRaw = parseJson(await backend.readText(paths.settingsFile));
    const indexRaw = parseJson(await backend.readText(paths.workspaceIndexFile));
    const workspaceRaw = parseJson(await backend.readText(paths.workspaceFile("ws_marker")));

    const settingsSnapshot = settingsRaw as {
      schemaVersion: number;
      settings: { theme: string; defaults: { fontSize: number } };
    };
    const indexSnapshot = indexRaw as {
      schemaVersion: number;
      workspaces: Array<{
        title: string;
        style: { background: string; accentStripe: { enabled: boolean } };
      }>;
    };
    const workspaceSnapshot = workspaceRaw as {
      schemaVersion: number;
      id: string;
      blocks: Array<{
        workspaceId: string;
        rows: Array<{
          cells: Record<
            string,
            {
              value: unknown;
              format: Record<string, unknown>;
              type?: string;
            }
          >;
        }>;
      }>;
    };

    assert.equal(settingsSnapshot.schemaVersion, STORAGE_SCHEMA_VERSION);
    assert.equal(settingsSnapshot.settings.theme, DEFAULT_SETTINGS.theme);
    assert.equal(settingsSnapshot.settings.defaults.fontSize, DEFAULT_SETTINGS.defaults.fontSize);

    assert.equal(indexSnapshot.schemaVersion, STORAGE_SCHEMA_VERSION);
    assert.equal(indexSnapshot.workspaces[0]?.title, "Home");
    assert.equal(indexSnapshot.workspaces[0]?.style.background, "#1F2937");
    assert.equal(indexSnapshot.workspaces[0]?.style.accentStripe.enabled, true);

    assert.equal(workspaceSnapshot.schemaVersion, STORAGE_SCHEMA_VERSION);
    assert.equal(workspaceSnapshot.id, "ws_marker");
    assert.equal(workspaceSnapshot.blocks[0]?.workspaceId, "ws_marker");
    assert.equal(workspaceSnapshot.blocks[0]?.rows[0]?.cells[markerColumnId].value, null);
    assert.equal(workspaceSnapshot.blocks[0]?.rows[0]?.cells[markerColumnId].type, undefined);
    assert.equal(workspaceSnapshot.blocks[0]?.rows[0]?.cells[textColumnId].value, "");
    assert.equal(workspaceSnapshot.blocks[0]?.rows[0]?.cells[textColumnId].type, undefined);
    assert.deepEqual(
      Object.keys(workspaceSnapshot.blocks[0]?.rows[0]?.cells[markerColumnId] ?? {}).sort(),
      ["format", "value"]
    );
  });
});

describe("formatting coercion", () => {
  test("preserves valid sparse formatting at block, column, row, and cell levels", () => {
    const validated = validateWorkspaceFile({
      schemaVersion: STORAGE_SCHEMA_VERSION,
      id: "ws_fmt",
      blocks: [
        {
          id: "block_fmt",
          workspaceId: "ws_fmt",
          title: "Formatting",
          blockType: "basic_checklist",
          order: 0,
          collapsed: false,
          hideCompletedRows: false,
          border: {},
          sort: null,
          format: {
            fontFamily: "Arial",
            fontSize: 16,
            bold: true,
            textColor: "#111111",
            borderColor: "#222222",
            borderWidth: 2,
            edges: ["top", "bottom"],
          },
          columns: [
            {
              id: "col_text",
              type: "text",
              label: "Task",
              order: 0,
              width: 200,
              visible: true,
              settings: {},
              format: {
                fontSize: 18,
                italic: true,
                backgroundColor: "#333333",
                borderWidth: 1,
                edges: ["left"],
              },
            },
          ],
          rows: [
            {
              id: "row_1",
              order: 0,
              format: {
                underline: true,
                textColor: "#444444",
                borderColor: "#555555",
                borderWidth: 3,
                edges: ["right"],
              },
              cells: {
                col_text: {
                  value: "Do it",
                  format: {
                    bold: false,
                    fontSize: 20,
                    backgroundColor: "#666666",
                    borderWidth: 4,
                    edges: ["top", "left"],
                  },
                },
              },
            },
          ],
        },
      ],
    });

    const block = validated.value.blocks[0];
    assert.ok(block);
    assert.equal(block.format.fontFamily, "Arial");
    assert.equal(block.format.fontSize, 16);
    assert.equal(block.format.bold, true);
    assert.equal(block.format.textColor, "#111111");
    assert.equal(block.format.borderColor, "#222222");
    assert.equal(block.format.borderWidth, 2);
    assert.deepEqual(block.format.edges, ["top", "bottom"]);

    const column = block.columns[0];
    assert.ok(column);
    assert.equal(column.format.fontSize, 18);
    assert.equal(column.format.italic, true);
    assert.equal(column.format.backgroundColor, "#333333");
    assert.equal(column.format.borderWidth, 1);
    assert.deepEqual(column.format.edges, ["left"]);

    const row = block.rows[0];
    assert.ok(row);
    assert.equal(row.format.underline, true);
    assert.equal(row.format.textColor, "#444444");
    assert.equal(row.format.borderColor, "#555555");
    assert.equal(row.format.borderWidth, 3);
    assert.deepEqual(row.format.edges, ["right"]);

    const cell = row.cells.col_text;
    assert.ok(cell);
    assert.ok(cell.format);
    assert.equal(cell.format.bold, false);
    assert.equal(cell.format.fontSize, 20);
    assert.equal(cell.format.backgroundColor, "#666666");
    assert.equal(cell.format.borderWidth, 4);
    assert.deepEqual(cell.format.edges, ["top", "left"]);
  });

  test("normalizes malformed formatting values without corrupting valid siblings", () => {
    const validated = validateWorkspaceFile({
      schemaVersion: STORAGE_SCHEMA_VERSION,
      id: "ws_bad",
      blocks: [
        {
          id: "block_bad",
          workspaceId: "ws_bad",
          title: "Bad",
          blockType: "basic_checklist",
          order: 0,
          collapsed: false,
          hideCompletedRows: false,
          border: {},
          sort: null,
          format: {
            fontFamily: "",
            fontSize: "large",
            bold: "true",
            textColor: "not-a-color",
            backgroundColor: 123,
            borderWidth: -2,
            borderColor: "bad-color",
            edges: ["top", "diagonal", "top", "left"],
            italic: true,
          },
          columns: [
            {
              id: "col_text",
              type: "text",
              label: "Task",
              order: 0,
              width: 200,
              visible: true,
              settings: {},
              format: {
                fontSize: -1,
                borderWidth: Number.NaN,
                underline: true,
                borderColor: "#0000ff",
              },
            },
          ],
          rows: [
            {
              id: "row_1",
              order: 0,
              format: {
                fontSize: Number.NaN,
                backgroundColor: 123,
                borderWidth: Infinity,
                textColor: "#00ff00",
                edges: ["diagonal", "top"],
              },
              cells: {
                col_text: {
                  value: 123,
                  format: {
                    textColor: "bad-color",
                    fontSize: Number.NaN,
                    bold: true,
                    borderWidth: 2,
                  },
                },
              },
            },
          ],
        },
      ],
    });

    const block = validated.value.blocks[0];
    assert.ok(block);
    assert.equal("fontFamily" in block.format, false);
    assert.equal("fontSize" in block.format, false);
    assert.equal("bold" in block.format, false);
    assert.equal("textColor" in block.format, false);
    assert.equal("backgroundColor" in block.format, false);
    assert.equal("borderWidth" in block.format, false);
    assert.equal("borderColor" in block.format, false);
    assert.equal(block.format.italic, true);
    assert.deepEqual(block.format.edges, ["top", "left"]);

    const column = block.columns[0];
    assert.ok(column);
    assert.equal("fontSize" in column.format, false);
    assert.equal("borderWidth" in column.format, false);
    assert.equal(column.format.underline, true);
    assert.equal(column.format.borderColor, "#0000ff");

    const row = block.rows[0];
    assert.ok(row);
    assert.equal("fontSize" in row.format, false);
    assert.equal("backgroundColor" in row.format, false);
    assert.equal("borderWidth" in row.format, false);
    assert.equal(row.format.textColor, "#00ff00");
    assert.deepEqual(row.format.edges, ["top"]);

    const cell = row.cells.col_text;
    assert.ok(cell);
    assert.equal(cell.value, "");
    assert.ok(cell.format);
    assert.equal("textColor" in cell.format, false);
    assert.equal("fontSize" in cell.format, false);
    assert.equal(cell.format.bold, true);
    assert.equal(cell.format.borderWidth, 2);
  });
});

describe("formatting persistence round-trip", () => {
  test("save/load round-trip preserves formatting overrides at all levels", async () => {
    const backend = createMemoryStorageBackend();
    const service = await createStorageService(backend);
    const loaded = await service.loadAppData();
    const workspace = loaded.workspaces[0];
    assert.ok(workspace);
    const block = workspace.blocks[0];
    assert.ok(block);
    const column = block.columns[0];
    assert.ok(column);
    const row = block.rows[0];
    assert.ok(row);
    const cell = row.cells[column.id];
    assert.ok(cell);

    block.format = {
      fontFamily: "Georgia",
      fontSize: 16,
      textColor: "#aabbcc",
      borderWidth: 2,
      borderColor: "#ddeeff",
      edges: ["top", "bottom"],
    };

    column.format = {
      fontSize: 18,
      italic: true,
      backgroundColor: "#112233",
      borderWidth: 1,
      borderColor: "#445566",
      edges: ["left"],
    };

    row.format = {
      underline: true,
      textColor: "#778899",
      borderWidth: 3,
      borderColor: "#aabbcc",
      edges: ["right"],
    };

    cell.format = {
      bold: false,
      fontSize: 20,
      backgroundColor: "#ddeeff",
      borderWidth: 4,
      borderColor: "#001122",
      edges: ["top", "left"],
    };

    await service.saveWorkspace(workspace);

    const reloaded = await service.loadAppData();
    const reloadedWorkspace = reloaded.workspaces.find((w) => w.id === workspace.id);
    assert.ok(reloadedWorkspace);
    const reloadedBlock = reloadedWorkspace.blocks[0];
    assert.ok(reloadedBlock);
    const reloadedColumn = reloadedBlock.columns[0];
    assert.ok(reloadedColumn);
    const reloadedRow = reloadedBlock.rows[0];
    assert.ok(reloadedRow);
    const reloadedCell = reloadedRow.cells[column.id];
    assert.ok(reloadedCell);

    assert.equal(reloadedBlock.format.fontFamily, "Georgia");
    assert.equal(reloadedBlock.format.fontSize, 16);
    assert.equal(reloadedBlock.format.textColor, "#aabbcc");
    assert.equal(reloadedBlock.format.borderWidth, 2);
    assert.equal(reloadedBlock.format.borderColor, "#ddeeff");
    assert.deepEqual(reloadedBlock.format.edges, ["top", "bottom"]);

    assert.equal(reloadedColumn.format.fontSize, 18);
    assert.equal(reloadedColumn.format.italic, true);
    assert.equal(reloadedColumn.format.backgroundColor, "#112233");
    assert.equal(reloadedColumn.format.borderWidth, 1);
    assert.equal(reloadedColumn.format.borderColor, "#445566");
    assert.deepEqual(reloadedColumn.format.edges, ["left"]);

    assert.equal(reloadedRow.format.underline, true);
    assert.equal(reloadedRow.format.textColor, "#778899");
    assert.equal(reloadedRow.format.borderWidth, 3);
    assert.equal(reloadedRow.format.borderColor, "#aabbcc");
    assert.deepEqual(reloadedRow.format.edges, ["right"]);

    assert.ok(reloadedCell.format);
    assert.equal(reloadedCell.format.bold, false);
    assert.equal(reloadedCell.format.fontSize, 20);
    assert.equal(reloadedCell.format.backgroundColor, "#ddeeff");
    assert.equal(reloadedCell.format.borderWidth, 4);
    assert.equal(reloadedCell.format.borderColor, "#001122");
    assert.deepEqual(reloadedCell.format.edges, ["top", "left"]);
  });

  test("persisted JSON contains canonical sparse formatting shapes", async () => {
    const backend = createMemoryStorageBackend();
    const service = await createStorageService(backend);
    const loaded = await service.loadAppData();
    const workspace = loaded.workspaces[0];
    assert.ok(workspace);
    const block = workspace.blocks[0];
    assert.ok(block);
    const column = block.columns[0];
    assert.ok(column);
    const row = block.rows[0];
    assert.ok(row);
    const cell = row.cells[column.id];
    assert.ok(cell);

    block.format = { fontSize: 14, textColor: "#ffffff" };
    column.format = { borderWidth: 1 };
    row.format = {};
    cell.format = { bold: true };

    await service.saveWorkspace(workspace);

    const paths = service.paths;
    assert.ok(paths);
    const raw = parseJson(await backend.readText(paths.workspaceFile(workspace.id)));
    const persisted = raw as {
      schemaVersion: number;
      blocks: Array<{
        format: Record<string, unknown>;
        columns: Array<{ format: Record<string, unknown> }>;
        rows: Array<{
          format: Record<string, unknown>;
          cells: Record<string, { format: Record<string, unknown> }>;
        }>;
      }>;
    };

    assert.equal(persisted.schemaVersion, STORAGE_SCHEMA_VERSION);
    assert.deepEqual(persisted.blocks[0]?.format, { fontSize: 14, textColor: "#ffffff" });
    assert.deepEqual(persisted.blocks[0]?.columns[0]?.format, { borderWidth: 1 });
    assert.deepEqual(persisted.blocks[0]?.rows[0]?.format, {});
    assert.deepEqual(persisted.blocks[0]?.rows[0]?.cells[column.id]?.format, { bold: true });
  });

  test("effective formatting after reload follows app defaults to cell precedence", async () => {
    const backend = createMemoryStorageBackend();
    const service = await createStorageService(backend);
    const loaded = await service.loadAppData();
    const workspace = loaded.workspaces[0];
    assert.ok(workspace);
    const block = workspace.blocks[0];
    assert.ok(block);
    const column = block.columns[0];
    assert.ok(column);
    const row = block.rows[0];
    assert.ok(row);
    const cell = row.cells[column.id];
    assert.ok(cell);

    block.format = { fontSize: 16, textColor: "#111111", borderWidth: 2 };
    column.format = { fontSize: 18, textColor: "#222222", borderColor: "#333333" };
    row.format = { fontSize: 20, backgroundColor: "#444444", edges: ["top"] };
    cell.format = { textColor: "#555555", borderWidth: 4, edges: ["left", "bottom"] };
    // edges are canonicalized to top, right, bottom, left order on save/load

    await service.saveWorkspace(workspace);

    const reloaded = await service.loadAppData();
    const reloadedWorkspace = reloaded.workspaces.find((w) => w.id === workspace.id);
    assert.ok(reloadedWorkspace);
    const reloadedBlock = reloadedWorkspace.blocks[0];
    assert.ok(reloadedBlock);
    const reloadedColumn = reloadedBlock.columns[0];
    assert.ok(reloadedColumn);
    const reloadedRow = reloadedBlock.rows[0];
    assert.ok(reloadedRow);
    const reloadedCell = reloadedRow.cells[column.id];
    assert.ok(reloadedCell);

    const resolved = resolveCellFormatting(
      loaded.settings.defaults,
      reloadedBlock.format,
      reloadedColumn.format,
      reloadedRow.format,
      reloadedCell.format
    );

    assert.equal(resolved.fontSize, 20); // row wins (cell doesn't define it)
    assert.equal(resolved.textColor, "#555555"); // cell wins
    assert.equal(resolved.backgroundColor, "#444444"); // row wins
    assert.equal(resolved.borderColor, "#333333"); // column wins
    assert.equal(resolved.borderWidth, 4); // cell wins
    assert.deepEqual(resolved.edges, ["bottom", "left"]); // cell wins

    // App defaults remain for keys not overridden anywhere
    assert.equal(resolved.fontFamily, DEFAULT_SETTINGS.defaults.fontFamily);
  });
});
