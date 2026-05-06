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
