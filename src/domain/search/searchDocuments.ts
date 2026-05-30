import { getVisibleColumnsInDisplayOrder } from "../columns/createColumn.js";
import { getRowsInDisplayOrder } from "../rows/reorderRows.js";
import type { ColumnType } from "../../types/column.js";
import type { PersistedCell } from "../../types/row.js";
import type { SearchDocumentsOptions, SearchDocumentsResult, SearchResult, SearchableCellType } from "./searchTypes.js";

const DEFAULT_MAX_RESULTS = 50;
const SEARCHABLE_CELL_TYPES = new Set<ColumnType>(["text", "date", "time", "dropdown"]);

export function searchDocuments(options: SearchDocumentsOptions): SearchDocumentsResult {
  const normalizedQuery = options.query.trim().toLocaleLowerCase();
  const maxResults = options.maxResults ?? DEFAULT_MAX_RESULTS;
  if (!normalizedQuery) return { query: options.query, results: [], totalMatches: 0, capped: false };

  const results: SearchResult[] = [];
  let totalMatches = 0;
  const add = (result: SearchResult) => {
    totalMatches += 1;
    if (results.length < maxResults) results.push(result);
  };

  const orderedWorkspaces = options.workspaceIndex
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => a.entry.order === b.entry.order ? a.index - b.index : a.entry.order - b.entry.order)
    .map(({ entry }) => entry);

  for (const entry of orderedWorkspaces) {
    const workspace = options.workspacesById[entry.id];
    const workspaceTitle = entry.title || "Untitled workspace";
    if (matches(workspaceTitle, normalizedQuery)) {
      add({ id: `workspace:${entry.id}`, kind: "workspace", workspaceId: entry.id, workspaceTitle, snippet: workspaceTitle, matchedText: workspaceTitle });
    }
    if (!workspace) continue;

    const orderedBlocks = workspace.blocks
      .map((block, index) => ({ block, index }))
      .sort((a, b) => a.block.order === b.block.order ? a.index - b.index : a.block.order - b.block.order)
      .map(({ block }) => block);

    for (const block of orderedBlocks) {
      const blockTitle = block.title || "Untitled block";
      if (matches(blockTitle, normalizedQuery)) {
        add({ id: `block:${entry.id}:${block.id}`, kind: "block", workspaceId: entry.id, blockId: block.id, workspaceTitle, blockTitle, snippet: blockTitle, matchedText: blockTitle });
      }
      const rows = getRowsInDisplayOrder(block.rows);
      const columns = getVisibleColumnsInDisplayOrder(block.columns);
      for (const row of rows) {
        for (const column of columns) {
          if (!SEARCHABLE_CELL_TYPES.has(column.type)) continue;
          const value = stringifyCell(row.cells[column.id]);
          if (!value || !matches(value, normalizedQuery)) continue;
          add({
            id: `cell:${entry.id}:${block.id}:${row.id}:${column.id}`,
            kind: "cell",
            workspaceId: entry.id,
            blockId: block.id,
            rowId: row.id,
            columnId: column.id,
            workspaceTitle,
            blockTitle,
            columnLabel: column.label || column.type,
            cellType: column.type as SearchableCellType,
            snippet: value,
            matchedText: value,
          });
        }
      }
    }
  }
  return { query: options.query, results, totalMatches, capped: totalMatches > results.length };
}

function matches(value: string, normalizedQuery: string): boolean {
  return value.toLocaleLowerCase().includes(normalizedQuery);
}

function stringifyCell(cell: PersistedCell | undefined): string | null {
  if (!cell || typeof cell.value !== "string") return null;
  const trimmed = cell.value.trim();
  return trimmed.length > 0 ? cell.value : null;
}
