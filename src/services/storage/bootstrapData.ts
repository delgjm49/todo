import type { AppDefaults } from "../../types/settings";
import type { Block, BlockType } from "../../types/block";
import type { Settings } from "../../types/settings";
import type { WorkspaceDocument, WorkspaceIndexEntry } from "../../types/workspace";
import { createBlockTemplate } from "../../domain/templates/blockTemplates.js";

export const STORAGE_SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
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
};

export const DEFAULT_WORKSPACE_ID = "ws_home";
export const DEFAULT_BLOCK_ID = "block_today";
export const DEFAULT_CHECK_COLUMN_ID = "col_check";
export const DEFAULT_TEXT_COLUMN_ID = "col_text";
export const DEFAULT_ROW_ID = "row_1";

export function createDefaultWorkspaceIndexEntry(): WorkspaceIndexEntry {
  return {
    id: DEFAULT_WORKSPACE_ID,
    title: "Home",
    order: 0,
    style: {
      background: "#1F2937",
      textColor: "#F9FAFB",
      accentStripe: {
        enabled: true,
        color: "#60A5FA",
      },
    },
    alertSummary: null,
  };
}

export function createStarterBlock(
  blockType: BlockType = "basic_checklist",
  title = "Today"
): Block {
  return {
    ...createBlockTemplate(blockType, DEFAULT_WORKSPACE_ID, {
      blockId: DEFAULT_BLOCK_ID,
      title,
      order: 0,
    }),
    workspaceId: DEFAULT_WORKSPACE_ID,
  };
}

export function createStarterWorkspaceDocument(): WorkspaceDocument {
  return {
    id: DEFAULT_WORKSPACE_ID,
    blocks: [createStarterBlock("basic_checklist", "Today")],
  };
}

export function createDefaultWorkspaceDocuments(): WorkspaceDocument[] {
  return [createStarterWorkspaceDocument()];
}

export function createDefaultWorkspaceIndex(): WorkspaceIndexEntry[] {
  return [createDefaultWorkspaceIndexEntry()];
}

export function createDefaultAppDefaults(): AppDefaults {
  return DEFAULT_SETTINGS.defaults;
}
