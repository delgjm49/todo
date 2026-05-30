# Plan: Post-MVP Backlog Planning

## Overview
Full planned v1 and release-readiness validation are complete, so the next product decision should choose a first post-MVP feature that adds visible value without disturbing the now-stable storage, CI, and desktop packaging baseline. After comparing search, archive/completed views, import/export, and richer date/time pickers, the recommended first post-MVP implementation dispatch is a small global search slice.

The recommended slice is intentionally read-only: add a search affordance, search across already-loaded local document state, show grouped results, and navigate to a selected match. This gives broad user value, exercises existing in-memory architecture well, and avoids the data-model and filesystem risk of archive or import/export as the first post-MVP change.

## Candidate Comparison

| Candidate | User Value | Implementation Complexity | Data / Model Impact | Test Impact | Release Risk | Planning Notes |
|-----------|------------|---------------------------|---------------------|-------------|--------------|----------------|
| Search | High: helps users find tasks, notes, dates, dropdown values, blocks, and workspaces once the app contains many workspaces/blocks. | Medium: needs query matching, result grouping, UI affordance, result navigation/highlighting. The current app already loads all workspace documents in memory, which keeps this small. | None for the first slice if queries/history are not persisted. It can derive all results from `workspaceIndex` and `workspacesById`. | Unit tests for matching/ranking/result extraction; component tests for panel state; integration/e2e smoke for query → result → navigation. | Low/Medium: mostly additive and read-only, with limited interaction risk around navigation/highlight. | Best first post-MVP choice because it is useful immediately and does not require schema changes. |
| Archive/completed views | Medium/High: improves long-term task hygiene and lets users review or hide done work. | Medium/High: requires clear semantics for “completed” vs “archived,” view filters, restore paths, and interactions with checkbox automation. | Likely schema change if archive state is persisted per row/block; current “completed” is derived from checked checkbox columns with `strikeoutRowWhenChecked`, not a universal row status. | Domain tests for completion/archive semantics; storage/migration tests; UI tests for view filtering and restore. | Medium/High: risks hiding data accidentally or conflating completed with archived. | Valuable, but should come after Main/user decides the task lifecycle model. |
| Import/export | High for backup/portability and user trust. | High: requires file picker/platform boundary, export bundle format, validation, conflict handling, restore/import UX, and failure recovery. | Potentially none for pure export; import/restore touches all persisted document shapes and must respect schema version/recovery rules. | Heavy: serialization round trips, invalid import handling, partial failure handling, integration/e2e coverage. | High: any bug can cause data loss, overwrite confusion, or broken recovery expectations. | Important post-MVP, but not the safest first dispatch after stabilizing CI. |
| Richer date/time pickers | Medium: improves existing date/time cell UX and reduces invalid entry friction. | Medium: UI component work plus keyboard/mouse behavior; can stay local to date/time cells if native inputs/popovers are used. | None if existing string/null cell payloads remain canonical. | Component tests for picker commit/cancel/validation; existing alert/sort tests should be re-run. | Low/Medium: narrow scope, but picker edge cases can be fiddly. | Good second candidate if the user is actively using reminders; narrower value than search. |

## Recommendation

Start post-MVP product work with **Search MVP**.

### Recommended First Slice

Add a lightweight global search that:

- opens from the top bar via a compact search field or button-triggered panel;
- searches the already-loaded local document state across:
  - workspace titles;
  - block titles;
  - text cells;
  - date/time cell displayed strings;
  - dropdown selected values;
- groups results by workspace and block;
- shows enough context to identify the row/cell match;
- selecting a result switches to the workspace and highlights or scrolls to the matching row/cell when possible;
- persists no search history and performs no file/storage writes.

### Why Search First

- It solves a broad discovery problem created by the app’s core model: many workspaces, blocks, and rows.
- The current architecture is favorable: `documentStore` eagerly loads all workspace documents, so a first search slice can be a pure derived view rather than a new index or persistence feature.
- It is mostly additive and read-only, minimizing release risk after the project just achieved green Windows CI.
- It creates useful UI/navigation patterns that later features can reuse, especially archive views and completed-row filtering.

## Prerequisites

- Main/user should confirm whether search should be a persistent top-bar field or an on-demand panel. Recommendation: start with an on-demand top-bar button/panel to limit layout churn.
- Main/user should confirm result scope for the first dispatch. Recommendation: include workspace titles, block titles, text/date/time/dropdown values; defer checkbox state, formatting text, and fuzzy matching.
- No storage migration is required for the recommended slice.

## Files to Create/Modify for a Future Implementation Dispatch

| Action | Path | Description |
|--------|------|-------------|
| Create | `src/domain/search/searchDocuments.ts` | Pure helper that searches workspace index and workspace documents and returns typed result records. |
| Create | `src/domain/search/searchTypes.ts` | Result/query types such as match kind, workspace/block/row/cell identifiers, labels, and snippets. |
| Create | `src/components/search/SearchPanel.tsx` | Compact UI for query entry and grouped result display. |
| Create | `src/components/search/SearchResultItem.tsx` | Small result row component with workspace/block/context labels. |
| Modify | `src/components/layout/TopBar.tsx` | Add search trigger and host the search panel/popover. |
| Modify | `src/stores/uiStore.ts` | Add minimal transient state if needed: search panel open/closed and current query. Keep it non-persisted. |
| Modify | `src/hooks/useAlertNavigation.ts` or create `src/hooks/useSearchNavigation.ts` | Reuse or mirror the alert navigation pattern to switch workspace and flash/scroll to a result target. |
| Modify | `src/components/row/RowView.tsx` | Support search-result flash/highlight if not reusable through existing alert highlight state. |
| Create | `src/tests/unit/searchDocuments.test.ts` | Unit coverage for query matching, grouping metadata, empty queries, and supported cell types. |
| Create/Modify | `src/tests/unit/searchPanel.test.tsx` | Component tests for panel rendering, no-results state, and result selection. |
| Modify | `src/tests/e2e/smoke.spec.ts` | Optional small smoke extension: create/search/select a row without weakening existing smoke coverage. |

## Implementation Steps for the Future Dispatch

### Step 1: Define search result contracts
- Add typed result shapes for workspace, block, row, and cell matches.
- Include identifiers needed to navigate: `workspaceId`, optional `blockId`, optional `rowId`, optional `columnId`.
- Include display fields: workspace title, block title, column label, row/cell snippet, and match kind.
- **Verify**: Typecheck passes and result types can represent all recommended scopes without `any`.

### Step 2: Implement pure document search
- Search case-insensitively by trimmed substring match.
- Return no results for blank queries.
- Search workspace titles, block titles, text cells, nullable date/time/dropdown string values.
- Do not search formatting, internal ids, checkbox booleans, bullet/numbered marker values, or hidden implementation metadata in the first slice.
- Keep ordering predictable: workspace order → block order → row order → column order.
- Cap displayed result count in the UI or return enough metadata for the UI to cap, e.g. first 50 matches.
- **Verify**: Unit tests cover matching, non-matching, case-insensitivity, ordering, blank query, and mixed cell types.

### Step 3: Add search UI shell
- Add a `Search` control to `TopBar`.
- Open a compact panel/popover with an input, result count, grouped results, no-results state, and keyboard-safe close behavior.
- Keep the panel local/transient; do not persist query history.
- **Verify**: Component tests confirm opening, typing, result rendering, and closing behavior.

### Step 4: Wire results to navigation/highlight
- On result selection, switch the active workspace when needed.
- If the match targets a row/cell, scroll or highlight using the existing alert-navigation/highlight pattern where practical.
- If exact cell scrolling is too large for the first slice, highlight the row and document cell-level scroll as deferred.
- **Verify**: Integration/component tests confirm a selected result changes active workspace and sets a visible highlight target.

### Step 5: Add verification coverage and preserve release gates
- Add unit and component tests for the new logic/UI.
- Optionally extend Playwright smoke only if it remains stable and fast.
- Run the standard verification suite for the implementation dispatch:
  - `npm run test`
  - `npm run lint`
  - `npm run build`
  - `npm run test:e2e` when Playwright browsers are available in the environment
- **Verify**: Existing autosave/storage behavior is unaffected; search creates no writes and does not mark the document dirty.

## Data / Storage Changes

None for the recommended first slice.

Search should be derived from the in-memory `documentStore` state. Do not add schema fields, search indexes, persisted search history, or migration logic in the first dispatch.

Future search enhancements that may require additional decisions:

- persisted recent searches;
- saved filters;
- indexed search for very large datasets;
- search settings such as case sensitivity or completed-row inclusion.

## UI Specifications

- Entry point: top bar `Search` button or compact input. Recommendation: a button that opens a panel to avoid crowding the existing `+ Block`, Undo/Redo, Inspector, Settings, and save status controls.
- Panel states:
  - closed;
  - open with empty query and short hint;
  - open with grouped results;
  - open with no results;
  - loading is not required because search is local/synchronous for v1 scale.
- Result grouping:
  - group by workspace;
  - show block title when available;
  - show result kind (`Workspace`, `Block`, `Cell`) and snippet.
- Interaction:
  - click result to navigate;
  - `Escape` closes panel;
  - first slice may defer full keyboard result navigation if mouse-first UX remains acceptable.
- Visual treatment:
  - reuse existing panel/menu styling;
  - keep highlight subtle and time-limited, consistent with alert target flash.

## Out of Scope for the First Search Dispatch

- Fuzzy search or ranking beyond stable document order.
- Full-text indexing or persisted search cache.
- Search/replace.
- Filtering by completed/archived status.
- Persisted recent searches.
- Import/export integration.
- A standalone search route/screen.
- Searching hidden metadata, internal ids, style values, or backup files.

## Risks and Mitigations

- **Risk: result navigation becomes larger than expected.** Mitigate by accepting workspace switch plus row highlight first; defer exact cell focus if needed.
- **Risk: top bar crowding.** Mitigate with an on-demand panel and compact trigger rather than a permanently wide input.
- **Risk: ambiguous row snippets for multi-cell rows.** Mitigate by displaying block title, column label, and the matched cell snippet.
- **Risk: search accidentally mutates document state or triggers autosave.** Mitigate by keeping search as pure derived state and adding tests/QA checks that dirty/save state does not change after search.

## Acceptance Criteria for the Future Implementation Dispatch

- [ ] User can open a search panel from the top bar.
- [ ] Blank queries show guidance and do not produce noisy results.
- [ ] Queries match workspace titles, block titles, text cells, date cells, time cells, and dropdown values case-insensitively.
- [ ] Results are grouped or labeled clearly enough to identify workspace/block context.
- [ ] Selecting a result navigates to the correct workspace and visibly highlights the target row/cell or block.
- [ ] Search does not persist data, mutate documents, mark the document dirty, or trigger autosave.
- [ ] Unit tests cover pure search matching and result ordering.
- [ ] Component/integration coverage confirms the search panel and result selection behavior.
- [ ] Standard verification commands pass for the implementation dispatch.

## Deferred Follow-Up Candidates

1. **Richer date/time pickers** — good second dispatch if reminder usability is a priority; keep the existing string/null storage contract.
2. **Archive/completed views** — requires a separate product decision about row lifecycle, archive persistence, and restore behavior.
3. **Import/export** — important for trust and portability but should wait until Main/user explicitly scope backup/export versus full import/restore to avoid data-loss risk.

## Estimated Complexity

- Recommended Search MVP slice: **Medium**
- Estimated file count for future implementation: **8–11 files**
- Expected data/storage migration: **None**
