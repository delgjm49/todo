# Implementation Plan: TICKET-013 Store Selectors and Action Helpers

## Goal
Add a small, pure selector/helper layer for common document lookups and selection resolution. Keep behavior unchanged while making future components/actions rely on shared, tested lookup helpers instead of repeated tree walking.

## Scope
- Add pure document lookup helpers for active workspace, workspace entry/document pairing, block, column, row, and cell targets.
- Add a selection resolution helper that accepts `Selection` plus document state and returns a typed resolved result or an explicit not-found/none result without throwing.
- Add focused unit tests for valid and stale/missing targets across all selection kinds.
- Optionally adopt the helper in one or two localized places that already duplicate the same lookups (`selectedFormattingTarget` and/or `inspectorTargetSummary`) if it stays small and behavior-neutral.

## Out of Scope
- UI/visual changes.
- Persisted JSON/schema changes.
- Store action behavior changes, autosave/history changes, or broad `documentStore` refactors.
- Checkbox automation or formatting feature expansion.

## Proposed Files
- Create `src/domain/document/documentSelectors.ts`.
- Create `src/tests/unit/documentSelectors.test.ts`.
- Optionally update:
  - `src/domain/formatting/selectedFormattingTarget.ts`
  - `src/components/layout/inspectorTargetSummary.ts`

## Selector API Shape
Implement pure helpers using existing types and display-order helpers:

- `selectActiveWorkspaceEntry(state): WorkspaceIndexEntry | null`
- `selectActiveWorkspaceDocument(state): WorkspaceDocument | null`
- `selectWorkspaceContext(state, workspaceId): { entry: WorkspaceIndexEntry | null; document: WorkspaceDocument | null }`
- `findBlockById(workspaceDocument, blockId): Block | null`
- `findColumnById(block, columnId): Column | null`
- `findRowById(block, rowId): Row | null`
- `findCellById(block, rowId, columnId): Cell | null`
- `resolveSelectionTarget(state, selection): SelectionResolution`

Use a narrow state input type instead of coupling helpers to the full Zustand store, e.g. `Pick<DocumentStoreState, "workspaceIndex" | "workspacesById" | "activeWorkspaceId">`, or a local structural type to avoid importing store runtime code.

Suggested `SelectionResolution` discriminated union:

```ts
type SelectionResolution =
  | { status: "none"; selection: Extract<Selection, { kind: "none" }> }
  | { status: "missing"; selection: Exclude<Selection, { kind: "none" }>; reason: "workspace" | "block" | "column" | "row" | "cell" }
  | { status: "resolved"; kind: "block"; workspaceEntry: WorkspaceIndexEntry | null; workspace: WorkspaceDocument; block: Block }
  | { status: "resolved"; kind: "column"; workspaceEntry: WorkspaceIndexEntry | null; workspace: WorkspaceDocument; block: Block; column: Column }
  | { status: "resolved"; kind: "row"; workspaceEntry: WorkspaceIndexEntry | null; workspace: WorkspaceDocument; block: Block; row: Row }
  | { status: "resolved"; kind: "cell"; workspaceEntry: WorkspaceIndexEntry | null; workspace: WorkspaceDocument; block: Block; row: Row; column: Column; cell: Cell | null };
```

For cell selections, missing row/column should return `status: "missing"`; a missing cell object may return a resolved cell target with `cell: null` only if the existing UI behavior can handle empty cells. If this creates ambiguity during implementation, prefer `reason: "cell"` for a missing cell and document that choice in the complete artifact.

## Implementation Steps
1. Add `src/domain/document/documentSelectors.ts` with type-only imports from app/domain types and pure lookup helpers.
2. Use `getVisibleColumnsInDisplayOrder` and `getRowsInDisplayOrder` so selector results match current display/selection semantics.
3. Implement `resolveSelectionTarget` as a non-throwing switch over `selection.kind`:
   - `none` returns `{ status: "none" }`.
   - Missing workspace/block/column/row/cell returns `{ status: "missing", reason }`.
   - Valid targets return `{ status: "resolved", kind, ...entities }`.
4. Add `documentSelectors.test.ts` with a small in-memory workspace fixture covering:
   - active workspace entry/document selection.
   - block, column, row, and cell lookup success.
   - `selection.kind === "none"`.
   - stale workspace, block, column, row, and cell selections.
   - ordering-sensitive row/column lookup if useful.
5. If adoption is small, refactor `selectedFormattingTarget.ts` to call `resolveSelectionTarget` and map resolved targets to direct/effective formatting. Preserve existing return values exactly (`null` for none/missing).
6. If still small, optionally refactor `inspectorTargetSummary.ts` to use `resolveSelectionTarget` for missing-target branching while preserving all existing summary strings.
7. Keep `documentStore.ts`, `uiStore.ts`, and persisted data shapes unchanged unless only type-only imports are required.

## Acceptance Checks for Dev
- New helpers are pure and do not subscribe to Zustand or mutate input data.
- Selection resolution explicitly handles `none`, block, column, row, cell, and stale/missing references without throwing.
- Existing inspector/formatting behavior remains unchanged if helper adoption occurs.
- Unit tests cover successful and stale/missing lookups.
- Run and report:
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
  - `npm run lint`
