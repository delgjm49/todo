import { createId, type WorkspaceId } from "../ids.js";
import type { Block, BlockType } from "../../types/block.js";
import type { ColumnDefinition } from "../../types/column.js";
import type { Row } from "../../types/row.js";

export interface BlockTemplateDefinition {
  type: BlockType;
  label: string;
  title: string;
}

export interface CreateBlockTemplateOptions {
  title?: string;
  blockId?: string;
  order?: number;
}

export const BLOCK_TEMPLATES: BlockTemplateDefinition[] = [
  { type: "basic_checklist", label: "Checklist", title: "Checklist" },
  { type: "bulleted_list", label: "Bullet List", title: "Bullet List" },
  { type: "numbered_list", label: "Numbered List", title: "Numbered List" },
];

function getTemplateDefinition(blockType: BlockType): BlockTemplateDefinition {
  return BLOCK_TEMPLATES.find((template) => template.type === blockType) ?? BLOCK_TEMPLATES[0];
}

function createTemplateColumns(blockType: BlockType): ColumnDefinition[] {
  if (blockType === "bulleted_list") {
    return [
      {
        id: createId("column"),
        type: "bullet",
        label: "",
        order: 0,
        width: 44,
        visible: true,
        settings: {},
        format: {},
      },
      {
        id: createId("column"),
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
        id: createId("column"),
        type: "numbered",
        label: "",
        order: 0,
        width: 44,
        visible: true,
        settings: {},
        format: {},
      },
      {
        id: createId("column"),
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
      id: createId("column"),
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
      id: createId("column"),
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

function createTemplateRow(columns: ColumnDefinition[]): Row {
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
    id: createId("row"),
    order: 0,
    format: {},
    cells,
  };
}

export function createBlockTemplate(
  blockType: BlockType,
  workspaceId: WorkspaceId,
  options: CreateBlockTemplateOptions = {}
): Block {
  const columns = createTemplateColumns(blockType);
  const definition = getTemplateDefinition(blockType);

  return {
    id: options.blockId ?? createId("block"),
    workspaceId,
    title: options.title ?? definition.title,
    blockType,
    order: options.order ?? 0,
    collapsed: false,
    hideCompletedRows: false,
    border: {
      borderWidth: 1,
      borderColor: "#374151",
      edges: ["top", "right", "bottom", "left"],
    },
    sort: null,
    format: {},
    columns,
    rows: [createTemplateRow(columns)],
  };
}

export function getBlockTemplateLabel(blockType: BlockType): string {
  return getTemplateDefinition(blockType).label;
}
