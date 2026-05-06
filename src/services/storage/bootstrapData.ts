import type { AppDefaults } from "../../types/settings";
import type { Block, BlockType } from "../../types/block";
import type { ColumnDefinition } from "../../types/column";
import type { Row } from "../../types/row";
import type { Settings } from "../../types/settings";
import type { WorkspaceDocument, WorkspaceIndexEntry } from "../../types/workspace";

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

function createStarterColumns(blockType: BlockType): ColumnDefinition[] {
  if (blockType === "bulleted_list") {
    return [
      {
        id: "col_bullet",
        type: "bullet",
        label: "",
        order: 0,
        width: 44,
        visible: true,
        settings: {},
        format: {},
      },
      {
        id: DEFAULT_TEXT_COLUMN_ID,
        type: "text",
        label: "Item",
        order: 1,
        width: 420,
        visible: true,
        settings: {},
        format: {},
      },
    ];
  }

  if (blockType === "numbered_list") {
    return [
      {
        id: "col_numbered",
        type: "numbered",
        label: "",
        order: 0,
        width: 44,
        visible: true,
        settings: {},
        format: {},
      },
      {
        id: DEFAULT_TEXT_COLUMN_ID,
        type: "text",
        label: "Item",
        order: 1,
        width: 420,
        visible: true,
        settings: {},
        format: {},
      },
    ];
  }

  return [
    {
      id: DEFAULT_CHECK_COLUMN_ID,
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
      id: DEFAULT_TEXT_COLUMN_ID,
      type: "text",
      label: "Task",
      order: 1,
      width: 420,
      visible: true,
      settings: {},
      format: {},
    },
  ];
}

function createStarterRow(columns: ColumnDefinition[]): Row {
  const cells = columns.reduce<Row["cells"]>((accumulator, column) => {
    if (column.type === "checkbox") {
      accumulator[column.id] = { value: false, format: {} };
      return accumulator;
    }

    if (column.type === "bullet" || column.type === "numbered") {
      accumulator[column.id] = { value: null, format: {} };
      return accumulator;
    }

    accumulator[column.id] = { value: "", format: {} };
    return accumulator;
  }, {});

  return {
    id: DEFAULT_ROW_ID,
    order: 0,
    format: {},
    cells,
  };
}

export function createStarterBlock(
  blockType: BlockType = "basic_checklist",
  title = "Today"
): Block {
  const columns = createStarterColumns(blockType);

  return {
    id: DEFAULT_BLOCK_ID,
    workspaceId: DEFAULT_WORKSPACE_ID,
    title,
    blockType,
    order: 0,
    collapsed: false,
    border: {
      borderWidth: 1,
      borderColor: "#374151",
      edges: ["top", "right", "bottom", "left"],
    },
    sort: null,
    format: {},
    columns,
    rows: [createStarterRow(columns)],
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
