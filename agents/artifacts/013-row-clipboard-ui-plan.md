# Plan: TICKET-050 Row Clipboard UI (Cut / Copy / Paste)

## Overview
Wire the existing TICKET-049 domain clipboard helpers (`serializeRowsForClipboard`, `deserializeRowsFromClipboardJson`, `mapClipboardRowsToBlock`) into real user interactions:

1. Add ephemeral row-clipboard state to `uiStore` (`clipboardPayload`, `clipboardOperation`, plus `rowMenu` position state).
2. Add three `documentStore` actions — `cutRows`, `copyRows`, `pasteRows` — that route through the domain helpers and `replaceBlockRows`-style snapshot commits used by existing row mutations.
3. Render a new `RowContextMenu` component (mirroring the `BlockContextMenu` / `ColumnContextMenu` pattern) and open it on right-click anywhere inside a block. When the click landed on a row, that row becomes the cut/copy target and the paste-above anchor; when the click landed on the block header or empty area, only Paste is enabled and inserts at the end of the block.
4. Cover the new store actions and menu rendering states with targeted node:test units.

Stay inside the explicit dispatch scope: no system clipboard, no keyboard hotkeys, no multi-row selection (single-row selection only for v1), no schema changes.

## Prerequisites
- TICKET-049 domain helpers already exist in `src/domain/clipboard/` and are exported via `src/domain/clipboard/index.ts`.
- `documentStore.insertRowInBlock` / `deleteRowFromBlock` already use `commitSnapshot(..., "formatting", options)` and `getRowsInDisplayOrder` / `replaceBlockRows` / `insertRowAtIndex` / `deleteRowById`. The new actions should follow that exact shape and reuse the same helpers so each operation produces a single undoable snapshot.
- `useUiStore.selection` is single-target (`{ kind: "row" | "cell", ... }`); the clipboard UI must work with the currently-selected row only.

## Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Modify | `src/types/ui.ts` | Add `RowContextMenuState`, `RowClipboardOperation`, and a `RowClipboardState` discriminated value (or two fields). |
| Modify | `src/stores/uiStore.ts` | Add `rowMenu`, `clipboardPayload`, `clipboardOperation` state and open/close/set/clear actions; reset row clipboard + row menu in `showSettingsScreen` cleanup. |
| Modify | `src/stores/documentStore.ts` | Add `cutRows`, `copyRows`, `pasteRows` action signatures to the interface and implement them in the store factory. |
| Create | `src/components/row/RowContextMenu.tsx` | Cut / Copy / Paste menu component matching `BlockContextMenu` styling and `MenuButton` pattern. |
| Modify | `src/components/row/RowView.tsx` | Add `onContextMenu` handlers on row containers and on a block-level container wrapper to open the row menu with the correct target row id (or `null` for end-of-block). |
| Modify | `src/components/layout/MainPane.tsx` | Render the new row menu with backdrop + positioning, wiring cut/copy/paste handlers (mirrors existing `BlockContextMenu` / `ColumnContextMenu` portal blocks). |
| Create | `src/tests/unit/rowClipboardActions.test.ts` | node:test coverage for `cutRows`, `copyRows`, `pasteRows`, including history undo, fresh ids, formatting preservation, paste-above vs end-of-block, and incompatible-target rejection. |
| Create | `src/tests/unit/rowContextMenu.test.tsx` | jsdom render test for `RowContextMenu` covering enabled/disabled states for Cut/Copy/Paste. |

No new domain files. No changes to persistence, settings, or storage services.

## Implementation Steps

### Step 1: Extend UI types
- In `src/types/ui.ts`, add:
  - `export type RowClipboardOperation = "cut" | "copy";`
  - `export interface RowContextMenuState { workspaceId: WorkspaceId; blockId: BlockId; targetRowId: RowId | null; x: number; y: number; }` — `targetRowId === null` means the menu was opened over the block header / empty area, so Paste should insert at the end of the block and Cut/Copy must be disabled.
- Re-export through `src/stores/uiStore.ts` imports as needed.
- **Verify**: `npm run typecheck` is clean and existing consumers of the file still compile.

### Step 2: Extend `uiStore`
- Import `InternalRowClipboardPayload` from `../domain/clipboard/index.js`.
- Add fields to `UiStoreState`:
  - `rowMenu: RowContextMenuState | null`
  - `clipboardPayload: InternalRowClipboardPayload | null`
  - `clipboardOperation: RowClipboardOperation | null`
- Add actions:
  - `openRowMenu(workspaceId, blockId, targetRowId, x, y)` — closes `workspaceMenu`, `blockMenu`, `columnMenu` and sets `rowMenu` so only one menu is open at a time (mirrors existing pattern).
  - `closeRowMenu()` — clears `rowMenu`.
  - `setRowClipboard(payload, operation)` — stores both fields together. Use a single setter to keep the two in lockstep.
  - `clearRowClipboard()` — sets both to `null` (used internally if cut’s commit fails so we don’t leak stale clipboard state).
- Update `showSettingsScreen` to also clear `rowMenu`, `clipboardPayload`, and `clipboardOperation` so the in-memory clipboard does not survive the screen change. Keep the initial state literal in sync (`rowMenu: null`, `clipboardPayload: null`, `clipboardOperation: null`).
- **Verify**: extend `src/tests/unit/uiStore.test.ts` only if its existing assertions touch the new fields; otherwise leave it and rely on the new clipboard action tests for coverage.

### Step 3: Add documentStore clipboard actions
Place the new actions next to `insertRowInBlock` / `deleteRowFromBlock` (around line 1512–1583) and add matching signatures to `DocumentStoreState`. Each action should:

- Read `state = get()` and bail early when `settings` or the target workspace/block is missing (matches existing pattern).
- Touch the document only when needed; if no doc mutation occurs, return `true` for copy (UI-only operation) without calling `commitSnapshot`.

#### 3a. `copyRows(workspaceId, blockId, rowIds, options?)`
- Locate the block; if it does not exist or none of `rowIds` are present, return `false`.
- Call `serializeRowsForClipboard(block, rowIds)`.
- On `{ ok: false }`, return `false` and do not touch uiStore.
- On `{ ok: true, payload }`, call `useUiStore.getState().setRowClipboard(structuredClone(payload), "copy")` and return `true`. No `commitSnapshot` — copy is non-mutating, so undo/redo state is unchanged. Document this explicitly in code-adjacent comments only if it is genuinely surprising; otherwise rely on tests.

#### 3b. `cutRows(workspaceId, blockId, rowIds, options?)`
- Serialize first via `serializeRowsForClipboard(block, rowIds)`. On failure (`reason === "no-rows"`), return `false`.
- Build a single `nextSnapshot` that removes the cut rows from the block using `updateBlockInWorkspace` + `getRowsInDisplayOrder` + `deleteRowById` (loop `deleteRowById` for each rowId, returning `null` from the updater when none of the rows existed so `commitSnapshot` skips).
- Call `commitSnapshot(set, get, nextSnapshot, "formatting", options)`. If `commitSnapshot` returns `false`, return `false` without touching the clipboard.
- Only after a successful commit, call `setRowClipboard(structuredClone(payload), "cut")`.
- Ordering matters: serializing **before** the delete guarantees the payload reflects the original cells/formatting; committing the delete **before** updating the clipboard means a failed history commit leaves both doc and clipboard unchanged.

#### 3c. `pasteRows(workspaceId, blockId, targetRowId, options?)`
- Read `state` and get `payload = useUiStore.getState().clipboardPayload`. Bail with `false` when payload is `null`.
- Locate target block. Compute the insertion index:
  - When `targetRowId` is non-null, find its position in `getRowsInDisplayOrder(block.rows)` and use that index (paste-above the right-clicked row). If the target row id is not found, return `false`.
  - When `targetRowId` is `null`, use `orderedRows.length` (paste at end).
- Compute `startOrder` from the surrounding rows so the new `order` values fit cleanly into `replaceBlockRows` — easiest path: insert with a placeholder order (e.g. `orderedRows.length`) and let `replaceBlockRows` normalize. Use the same approach as `insertRowInBlock`: rely on `insertRowAtIndex` + `replaceBlockRows` to renormalize order if it already does so; otherwise pass `startOrder: insertionIndex` to `mapClipboardRowsToBlock`. Verify against the existing helper before choosing.
- Call `mapClipboardRowsToBlock(payload, block, { startOrder, generateRowId: () => createId("row") })`.
  - The default `generateRowId` is already `() => createId("row")`; passing it explicitly keeps the call self-documenting and makes tests easy to override via `options` if we later need them.
- On `{ ok: false, reason: "incompatible-target" | "empty-payload" }`, return `false` and do not mutate either store.
- On `{ ok: true, rows: newRows }`, splice `newRows` into the block: use `insertRowAtIndex` iteratively or `[...orderedRows.slice(0, idx), ...newRows, ...orderedRows.slice(idx)]`, then `replaceBlockRows(block, merged)`.
- Build `nextSnapshot` exactly like `insertRowInBlock` and call `commitSnapshot(set, get, nextSnapshot, "formatting", options)`.
- Clipboard state is **not** cleared after paste — pasting is intentionally repeatable (matches the dispatch acceptance bullet that pasted rows have fresh ids, and is consistent with the constraint that clipboard is in-memory until explicitly replaced).

#### 3d. Interface and barrel
- Add the three action signatures to the `DocumentStoreState` interface near the existing row mutations.
- No new exports from `src/stores/index.ts` or barrels — the store is consumed directly.

- **Verify**: `npm run typecheck` and the new test file pass.

### Step 4: `RowContextMenu` component
- Create `src/components/row/RowContextMenu.tsx` exporting `RowContextMenu` and reusing the same outer container/`MenuButton` styling as `BlockContextMenu` (`w-64` is fine — the menu only has three actions).
- Props:
  - `canCutOrCopy: boolean` (true only when the menu was opened over a row, i.e. `targetRowId !== null`).
  - `canPaste: boolean` (clipboard payload non-null AND the domain `mapClipboardRowsToBlock` result against the current block would not be `incompatible-target`).
  - `onCut: () => void`, `onCopy: () => void`, `onPaste: () => void`.
- Render three `MenuButton`s with `disabled={!canX}` (extend the existing `MenuButton` in `BlockContextMenu` only if cleanly possible; otherwise inline a small disabled-aware variant here — do not duplicate the entire BlockContextMenu file).
- Add `data-testid="row-context-menu"` on the root and `data-testid="row-menu-cut" | "row-menu-copy" | "row-menu-paste"` on each button for tests.
- **Verify**: `RowContextMenu` snapshot/rendering test asserts disabled states for each combination of `(canCutOrCopy, canPaste)`.

### Step 5: Wire context menu into `RowView` and `MainPane`
- In `RowView.tsx`:
  - Subscribe to `openRowMenu` from `useUiStore`.
  - On each row element, add `onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); selectRow(workspaceId, block.id, row.id); openRowMenu(workspaceId, block.id, row.id, e.clientX, e.clientY); }}`.
  - Wrap the row list in a container that also handles `onContextMenu` for non-row areas (block header / empty area within the block). That handler should set `targetRowId: null` and skip the `selectRow` call. The simplest non-invasive option: leave `RowView` row-only and add the block-area `onContextMenu` at the `BlockCard` level instead. Confirm with `src/components/block/BlockCard.tsx` before committing — if it already has `onContextMenu` wiring for `openBlockMenu`, prefer attaching the row-menu fallback only to the header/footer subtree so `openBlockMenu` is not regressed.
- In `MainPane.tsx`:
  - Subscribe to `rowMenu`, `closeRowMenu`, and the new document store actions (`cutRows`, `copyRows`, `pasteRows`).
  - Resolve `activeRowMenuBlock` like `activeBlockMenuBlock` is resolved today.
  - Compute `canPaste` by reading `useUiStore.getState().clipboardPayload` and calling `mapClipboardRowsToBlock(payload, activeRowMenuBlock)` for a dry-run validity check (do not consume the result; just inspect `ok`). This keeps Paste disabled when the source columns are incompatible with the right-clicked block.
  - Render the new menu inside the same `<>` portal-style block used for `BlockContextMenu`, with its own backdrop (`data-testid="row-menu-backdrop"`) and `closeRowMenu()` on backdrop pointer-down.
  - Wire handlers:
    - `onCut`: `await cutRows(workspaceId, blockId, [targetRowId!]); closeRowMenu();`
    - `onCopy`: `copyRows(workspaceId, blockId, [targetRowId!]); closeRowMenu();`
    - `onPaste`: `pasteRows(workspaceId, blockId, targetRowId, ...); closeRowMenu();`
  - When `targetRowId` is `null`, the menu still mounts but Cut/Copy are disabled.
- Add the row menu to the workspace-change cleanup `useEffect` so the menu closes on workspace switch (mirrors the existing `closeBlockMenu` / `closeColumnMenu` calls).
- **Verify**: targeted typecheck + the existing `contextMenuDismissal.test.tsx` continues to pass (adjust it only if it asserts on the exact set of menus dismissed). Manually verify in the renderer that right-click on a row opens Cut/Copy/Paste, that Paste is disabled when the clipboard is empty, and that Paste re-enables after Copy.

### Step 6: Targeted unit tests

#### `src/tests/unit/rowClipboardActions.test.ts`
- Use the existing `node:test` + `node:assert/strict` style seen in `src/tests/unit/rowEditing.test.tsx` and `blockRowSorting.test.ts`.
- Build a fixture document with a single workspace containing two blocks: `blockA` (basic checklist, 2 columns: text + checkbox) and `blockB` (same shape, used for cross-block paste).
- Cases:
  1. `copyRows` stores a payload in `uiStore` with `clipboardOperation === "copy"` and leaves the document unchanged (snapshot pointer equal).
  2. `copyRows` against an empty row id list returns `false` and does not touch `uiStore`.
  3. `cutRows` removes the source rows in one snapshot, sets `clipboardOperation === "cut"`, and a single `undo()` restores the rows.
  4. `pasteRows` after a `copyRows` inserts new rows above the target row, gives them fresh ids (`createId("row")` shape), preserves row + cell formatting fields from the payload, and produces consecutive `order` values.
  5. `pasteRows` with `targetRowId: null` appends at end-of-block.
  6. `pasteRows` into an incompatible block (e.g. change `blockB`’s checkbox column type before paste) returns `false`, leaves the doc untouched, and leaves the clipboard untouched.
  7. `pasteRows` is repeatable: calling it twice produces two distinct sets of rows with unique ids.
  8. `cutRows` failure (no valid source rows) does not modify `uiStore.clipboardPayload`.

#### `src/tests/unit/rowContextMenu.test.tsx`
- Use the existing jsdom render pattern from `contextMenuDismissal.test.tsx` and `rowEditing.test.tsx`.
- Cases:
  1. When `canCutOrCopy === false`, the Cut and Copy buttons are present but disabled (assert via `aria-disabled` or `disabled` attribute on the button selected by `data-testid`).
  2. When `canPaste === false`, the Paste button is disabled.
  3. Clicking each enabled button fires the corresponding handler exactly once.
  4. The menu renders the documented `data-testid` markers so future integration tests can target it.

- **Verify**: `npm run test` passes for the new files in isolation and as part of the suite.

## Data / Storage Changes
None. The clipboard is held entirely in `uiStore` (in-memory) and is not part of any snapshot, autosave payload, or migration. Existing `AppDocumentSnapshot` schema is unchanged.

## UI Specifications
- Row right-click opens the new `RowContextMenu` near the cursor. Existing left-click row selection behavior is preserved.
- The menu shows three items in order: **Cut**, **Copy**, **Paste**.
- Cut/Copy are disabled unless the click landed on a row (i.e. `targetRowId !== null`).
- Paste is disabled unless `uiStore.clipboardPayload` is non-null AND the target block accepts the payload under `mapClipboardRowsToBlock` (`ok === true`).
- Paste insertion position: above the right-clicked row when `targetRowId !== null`; otherwise at the end of the block.
- Pasted rows always receive fresh ids via `createId("row")` (delegated to `mapClipboardRowsToBlock`).
- The menu closes after any action (success or failure) and when its backdrop is clicked, matching the existing block/column menus.
- Visual style matches `BlockContextMenu` (`rounded-xl border border-border bg-panel ... shadow-soft`, `MenuButton` rows).

## Acceptance Criteria
- [ ] Right-clicking a row opens a Cut / Copy / Paste menu near the cursor.
- [ ] Right-clicking the block header or empty block area opens the same menu with only Paste enabled (end-of-block fallback).
- [ ] `documentStore.copyRows` stores the serialized payload in `uiStore` without mutating the document.
- [ ] `documentStore.cutRows` removes the source rows and stores the payload as a single undoable `formatting` snapshot.
- [ ] `documentStore.pasteRows` inserts mapped rows above the target row (or at end-of-block when `targetRowId === null`), preserves row/cell formatting through the TICKET-049 payload, and produces fresh row ids.
- [ ] Cut/Copy actions are disabled in the menu when `targetRowId === null`.
- [ ] Paste is disabled when the clipboard is empty or the payload is incompatible with the target block.
- [ ] Undoing a cut restores the source rows; undoing a paste removes the pasted rows. Copy is a no-op for undo because it does not change the document.
- [ ] No persistence/schema changes (`src/services/storage/` and `src/types/app.ts` untouched).
- [ ] Unit tests cover `cutRows`, `copyRows`, `pasteRows`, paste-above vs end-of-block, repeatable paste, incompatible-target rejection, and `RowContextMenu` enabled/disabled rendering.
- [ ] Verification passes: `npm run typecheck`, `npm run test`, `npm run build`, `npm run lint`.

## Estimated Complexity
- Medium.
- Estimated touch: 1 new component, 1 modified store, 1 modified store-typed UI, 1 modified view, 1 modified layout, 2 new test files.
