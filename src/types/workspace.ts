import type { Block } from "./block";
import type { WorkspaceId } from "../domain/ids";
import type { WorkspaceStyle } from "./formatting";

export interface WorkspaceAlertSummary {
  count: number;
  note?: string;
  blockId?: string;
  rowId?: string;
  columnId?: string;
}

export interface WorkspaceIndexEntry {
  id: WorkspaceId;
  title: string;
  order: number;
  style: WorkspaceStyle;
  alertSummary?: WorkspaceAlertSummary | null;
}

export interface WorkspaceDocument {
  id: WorkspaceId;
  blocks: Block[];
}
