# Plan: Search MVP

## Overview
Build a read-only global Search MVP that opens from the top bar, searches the already-loaded in-memory document state, shows contextual grouped results, and navigates to the selected workspace/block/row/cell. The slice is intentionally additive: no JSON schema changes, no saved search history, no search index persistence, and no dirty/autosave side effects from opening, typing in, or selecting search results.

## Prerequisites
- No product or schema prerequisite is required; v1 eagerly loads `workspaceIndex` and `workspacesById`, which is enough for this MVP.
- Reuse existing document ordering helpers and highlight/navigation patterns where practical:
  - `src/domain/columns/createColumn.ts` (`getVisibleColumnsInDisplayOrder`)
  - `src/domain/rows/reorderRows.ts` (`getRowsInDisplayOrder`)
  - `src/hooks/useAlertNavigation.ts`
  - `src/components/row/RowView.tsx`
  - `tailwind.config.ts` (`animate-alertFlash`)
- Treat exact cell focusing as optional for this slice. Workspace switch plus block scroll/selection and row/cell selection with a row flash is acceptable.

## Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Create | `src/domain/search/searchTypes.ts` | Framework-free search result contracts, match kinds, query options, and capped-result metadata. |
| Create | `src/domain/search/searchDocuments.ts` | Pure case-insensitive search over `workspaceIndex` and `workspacesById`, preserving deterministic document order. |
| Create | `src/domain/search/index.ts` | Barrel export for search helpers/types. |
| Create | `src/components/search/SearchPanel.tsx` | Top-bar popover/panel with input, blank guidance, grouped/labeled results, no-results state, capped count text, and result click handling. |
| Create | `src/components/search/SearchResultItem.tsx` | Small presentational result row showing kind, workspace/block context, optional column label, and snippet. |
| Create | `src/hooks/useSearchNavigation.ts` | Transient navigation helper that selects the workspace/block/row/cell, scrolls the target into view after render, and flashes rows. |
| Modify | `src/components/layout/TopBar.tsx` | Add compact Search trigger, host the panel, close on outside click/Escape via the panel, and keep existing top-bar actions intact. |
| Modify | `src/stores/uiStore.ts` | Add non-persisted `searchFlashRowId` plus setter, or an equivalently scoped transient flash state. Do not put query/history in persisted state. |
| Modify | `src/components/row/RowView.tsx` | Apply existing `animate-alertFlash` when either the alert flash row or the search flash row matches the row. |
| Create | `src/tests/unit/searchDocuments.test.ts` | Unit tests for matching, exclusions, blank queries, case-insensitivity, ordering, and result capping. |
| Create | `src/tests/unit/searchPanel.test.tsx` | JSDOM/React component tests for opening/render states, result display, close behavior, selection/navigation, and dirty/autosave safety. |
| Modify | `src/tests/unit/uiStore.test.ts` | Add focused coverage for default/updated/cleared `searchFlashRowId` if the new field is added. |
| Modify (optional) | `src/tests/e2e/smoke.spec.ts` | Optional Playwright smoke extension for query → result → navigate if Chromium is available and the flow remains stable/fast. |

## Implementation Steps

### Step 1: Define search contracts
- Create `src/domain/search/searchTypes.ts`.
- Recommended exported types:
  - `SearchMatchKind = "workspace" | "block" | "cell"`.
  - `SearchableCellType = "text" | "date" | "time" | "dropdown"`.
  - `SearchResult` with `id`, `kind`, `workspaceId`, optional `blockId`, optional `rowId`, optional `columnId`, `workspaceTitle`, optional `blockTitle`, optional `columnLabel`, `snippet`, and `matchedText`.
  - `SearchDocumentsOptions` with `query`, `workspaceIndex`, `workspacesById`, and optional `maxResults` defaulting to 50.
  - `SearchDocumentsResult` with `query`, `results`, `totalMatches`, and `capped`.
- Use deterministic result ids derived from stable identifiers, e.g. `workspace:<workspaceId>`, `block:<workspaceId>:<blockId>`, `cell:<workspaceId>:<blockId>:<rowId>:<columnId>`.
- **Verify:** TypeScript compiles without `any`, and every result includes enough identifiers for navigation.

### Step 2: Implement pure in-memory search
- Create `src/domain/search/searchDocuments.ts` and export through `src/domain/search/index.ts`.
- Normalize matching with `query.trim().toLocaleLowerCase()` and a matching normalized candidate string. Return `{ results: [], totalMatches: 0, capped: false }` for blank queries.
- Iterate in stable document order:
  1. `workspaceIndex` sorted by `order` with original index as tie-breaker.
  2. Each workspace title.
  3. The workspace document's blocks sorted by `order` with original index as tie-breaker.
  4. Each block title.
  5. Rows via `getRowsInDisplayOrder(block.rows)`.
  6. Columns via `getVisibleColumnsInDisplayOrder(block.columns)`.
- For cell matches, include only `text`, `date`, `time`, and `dropdown` columns with a non-empty string value. Do not match checkbox booleans, bullet/numbered marker values, formatting fields, internal ids, alert metadata, or hidden implementation metadata.
- For date/time display strings, use the stored string as currently rendered by `DateCell`/`TimeCell`; do not introduce new formatting or validation behavior.
- Count all matches, but only retain the first `maxResults` in `results`; set `capped` when `totalMatches > results.length`.
- **Verify:** `src/tests/unit/searchDocuments.test.ts` covers:
  - blank/whitespace query returns no results;
  - case-insensitive workspace title, block title, text cell, date cell, time cell, and dropdown value matches;
  - checkbox, bullet, numbered, ids, and formatting values are excluded;
  - result order is workspace → block → row → column order;
  - capping reports `totalMatches` and `capped` correctly.

### Step 3: Add transient search navigation/highlight
- Create `src/hooks/useSearchNavigation.ts`.
- Return a function such as `navigateToSearchResult(result: SearchResult): void`.
- On selection:
  - call `useDocumentStore.getState().selectWorkspace(result.workspaceId)` for all result kinds; this existing action does not set dirty;
  - for workspace-only results, clear or leave selection unchanged per the least surprising UX, then close the panel;
  - for block results, schedule selection/scroll after render with `requestAnimationFrame` (and a short `setTimeout` if needed) so `MainPane`'s active-workspace cleanup cannot immediately clear the selection;
  - for cell results, select the cell when `rowId` and `columnId` are present, otherwise select the row/block as applicable;
  - scroll `[data-testid="block-card-${blockId}"]` with `{ behavior: "smooth", block: "start" }`, then `[data-testid="row-${rowId}"]` with `{ behavior: "smooth", block: "nearest" }` when a row exists;
  - set the new transient search row flash state, then clear it after roughly the existing alert flash duration (`2600ms`).
- Modify `src/stores/uiStore.ts` to add `searchFlashRowId: RowId | null` and `setSearchFlashRowId(rowId: RowId | null)`. This state is UI-only and must not touch document history, dirty state, storage, or autosave.
- Modify `src/components/row/RowView.tsx` so `animate-alertFlash` is applied when `alertFlashRowId === row.id || searchFlashRowId === row.id`.
- **Verify:** Unit/component tests assert that result navigation updates `activeWorkspaceId` and selection, sets/clears `searchFlashRowId`, calls `scrollIntoView` when DOM targets exist, and leaves `useDocumentStore.getState().dirty` unchanged.

### Step 4: Build the search panel UI
- Create `src/components/search/SearchPanel.tsx` and `src/components/search/SearchResultItem.tsx`.
- Keep `query` local to `SearchPanel` or `TopBar`; do not persist it and do not add search history.
- `SearchPanel` should:
  - focus the input when opened;
  - show a short blank-query hint such as "Search workspaces, blocks, and text/date/time/dropdown cells.";
  - show a no-results state for non-blank queries with zero results;
  - show result count text, including a cap message like "Showing first 50 of 83 results";
  - group or clearly label results by workspace/block context. A simple grouped render by workspace title is enough for this slice;
  - render each result as a button so mouse selection is straightforward;
  - close on Escape and after a result is selected;
  - include accessible labels/test ids such as `search-panel`, `search-input`, `search-result-${result.id}`, and `search-result-count`.
- Suggested visual treatment: a compact absolute panel anchored to the top bar, `w-[420px] max-h-[min(70vh,520px)] overflow-y-auto`, with existing `border-border`, `bg-panel`, `bg-panelMuted`, `shadow-soft`, `text-text`, and `text-textMuted` classes.
- **Verify:** Component tests cover blank guidance, no-results state, matching result rendering, grouped/context labels, capped count text, Escape close, and click-to-navigate/close.

### Step 5: Wire the panel into `TopBar`
- Modify `src/components/layout/TopBar.tsx`.
- Add a `Search` toolbar button near the left of the action cluster, before `+ Block`, to avoid disrupting current workspace labeling.
- Add `searchPanelOpen` local state and a `searchPanelRef`/outside-click effect similar to the existing block template menu. Do not introduce persisted UI state for open/query unless local state becomes impractical.
- Render `SearchPanel` in an absolute container anchored to the Search button or action cluster.
- Ensure the existing block menu outside-click behavior still works and that opening Search does not accidentally create blocks, save, mark dirty, or change selection until a result is chosen.
- **Verify:** Existing top-bar behavior remains intact, and Search can open/close repeatedly without leaking event listeners or leaving stale flash timers.

### Step 6: Add focused integration safety checks
- In `src/tests/unit/searchPanel.test.tsx`, initialize stores with a fixture document using direct `useDocumentStore.setState(...)` or `createMemoryStorageService()` plus direct fixture updates so test setup itself does not confuse dirty/autosave assertions.
- Include one test that records `saveAppData` calls after the fixture is clean, then opens Search, types a query, and selects a result. Assert:
  - `dirty` remains `false`;
  - no new `saveAppData` calls are made;
  - `activeWorkspaceId` changes only because of explicit result navigation;
  - selection points at the matched row/cell when available.
- Optional Playwright: extend `src/tests/e2e/smoke.spec.ts` only if it is stable in the local environment. A minimal extension can search for `Smoke task beta`, click the result, and assert the target text cell remains visible after navigation/reload. If Chromium is unavailable, report `npm run test:e2e` as unavailable with the exact Playwright browser error in the Complete artifact.
- **Verify:** New tests are deterministic under the existing `node:test` + JSDOM runner.

## Data / Storage Changes
None.

Do not add persisted search fields, schema migrations, storage-service changes, localStorage keys, JSON search indexes, or saved recent searches. Search derives from `documentStore.workspaceIndex` and `documentStore.workspacesById` only. Opening, typing, closing, and selecting search results must not call `markDirty`, `commitDocumentSnapshot`, `updateWorkspaceAlertSummary`, settings/workspace/block/cell mutation actions, or any storage write path.

## UI Specifications
- Entry point: compact `Search` button in the top-bar action cluster.
- Panel states:
  - closed;
  - open with blank query guidance;
  - open with grouped/labeled results;
  - open with no results;
  - open with capped results count when applicable.
- Search scope labels:
  - `Workspace` for workspace title matches;
  - `Block` for block title matches;
  - `Cell` for text/date/time/dropdown matches, with column label/type and snippet.
- Result context should always make location clear enough: workspace title, block title when available, and column label when available.
- Interactions:
  - click Search opens/closes the panel;
  - Escape closes the panel;
  - click result navigates and closes the panel;
  - full keyboard result navigation (arrow keys/Enter selection) may be deferred.
- Highlight/navigation:
  - workspace match: switch workspace;
  - block match: switch workspace, select block, scroll block into view;
  - cell match: switch workspace, select cell, scroll block/row into view, flash row using the existing alert flash animation style.

## Acceptance Criteria
- [ ] User can open a search panel from the top bar.
- [ ] Blank query shows guidance and returns/renders no noisy results.
- [ ] Queries match workspace titles, block titles, text cells, date cells, time cells, and dropdown values case-insensitively.
- [ ] Results are deterministic and follow workspace order → block order → row order → column order.
- [ ] Results are grouped or labeled clearly enough to identify workspace/block/cell context.
- [ ] Displayed results are capped with honest count metadata when total matches exceed the cap.
- [ ] Selecting a result navigates to the correct workspace and visibly selects/highlights the target block/row/cell when practical.
- [ ] Search does not persist data, mutate documents, mark the document dirty, create history entries, or trigger autosave.
- [ ] Unit tests cover pure search matching, supported cell types, exclusions, blank queries, case-insensitivity, result ordering, and capping.
- [ ] Component/integration tests cover panel rendering, blank/no-results states, result selection behavior, and dirty/autosave safety.
- [ ] Verification passes or is reported exactly in the required format.

## Verification Required for Dev
Dev must run and report each command in `agents/CLOSING.md` verification format (`command`, `shell used`, `result`, failure surface if any, checkpoint scope, and whether it was the actual shell):

- `npm run test`
- `npm run lint`
- `npm run build`
- `npm run test:e2e` when Playwright Chromium is available in the environment

If `npm run test:e2e` cannot run because Playwright Chromium is not installed/available, Dev must report the exact error and whether it is environment-only. Do not skip `npm run test`, `npm run lint`, or `npm run build` for shell-availability reasons; translate commands to the actual shell available.

## Dependencies or Prerequisites
- Existing app state must remain the single source of search data.
- Existing autosave/dirty tests must continue to pass.
- No Main clarification is required for the first slice because the dispatch explicitly allows workspace switch plus block/row highlight when exact cell focus is too large.

## Estimated Complexity
- Medium
- Estimated implementation footprint: 10-12 files
- Expected data/storage migration: None
