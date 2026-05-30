import type { BlockId, ColumnId, RowId, WorkspaceId } from "../ids.js";
import type { WorkspaceDocument, WorkspaceIndexEntry } from "../../types/workspace.js";

export type SearchMatchKind = "workspace" | "block" | "cell";
export type SearchableCellType = "text" | "date" | "time" | "dropdown";

export interface SearchResult {
  id: string;
  kind: SearchMatchKind;
  workspaceId: WorkspaceId;
  blockId?: BlockId;
  rowId?: RowId;
  columnId?: ColumnId;
  workspaceTitle: string;
  blockTitle?: string;
  columnLabel?: string;
  cellType?: SearchableCellType;
  snippet: string;
  matchedText: string;
}

export interface SearchDocumentsOptions {
  query: string;
  workspaceIndex: WorkspaceIndexEntry[];
  workspacesById: Record<WorkspaceId, WorkspaceDocument>;
  maxResults?: number;
}

export interface SearchDocumentsResult {
  query: string;
  results: SearchResult[];
  totalMatches: number;
  capped: boolean;
}
