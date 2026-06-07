import type { BlockId, ColumnId, WorkspaceId } from "../domain/ids";
import type { BlockFormatting, BorderFormatting } from "./formatting";
import type { ColumnDefinition } from "./column";
import type { Row } from "./row";

export type BlockType = "basic_checklist" | "bulleted_list" | "numbered_list";

export interface BlockSort {
  columnId: ColumnId;
  direction: "asc" | "desc";
}

export type BlockBorder = BorderFormatting;

export interface Block {
  id: BlockId;
  workspaceId: WorkspaceId;
  title: string;
  blockType: BlockType;
  order: number;
  collapsed: boolean;
  hideCompletedRows: boolean;
  border: BlockBorder;
  sort: BlockSort | null;
  format: BlockFormatting;
  columns: ColumnDefinition[];
  rows: Row[];
}
