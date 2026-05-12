# Implementation Plan: Inspector Shell and Target Summary

## Dispatch
- Channel: `agents/channels/001-inspector-shell-channel.md`
- Dispatch: `agents/artifacts/001-inspector-shell-dispatch.md`
- Ticket: `TICKET-041: Build inspector shell and target summary`
- Role scope: Dev implementation plan only; do not add formatting controls or formatting persistence.

## Objective
Build a read-only, context-sensitive inspector shell that summarizes the active selection target from `uiStore.selection` and the current document state.

The inspector must keep the existing top-bar toggle/collapsible behavior and should preserve the existing workspace styling controls unless Dev intentionally moves them under a clearly labeled workspace section in the same inspector.

## In Scope
- Replace the current placeholder selection readout in `src/components/layout/InspectorShell.tsx` with an intentional target summary section.
- Summaries for:
  - no selection
  - block selection
  - column selection
  - row selection
  - cell selection
- Useful labels/details based on current workspace/document data:
  - block title/type/order
  - column label/type/order
  - row position/count context
  - cell row position plus column label/type
- Intentional no-selection state with guidance.
- Unit tests for no-selection, block, column, row, and cell summary behavior.

## Out of Scope
- Text formatting controls (`TICKET-042`).
- Border formatting controls (`TICKET-043`).
- Formatting persistence or mutation APIs (`TICKET-044`).
- Checkbox automation, sorting, clipboard, alerts, packaging, or new document mutations.
- New business rules for formatting resolution.

## Current Relevant State
- `InspectorShell.tsx` already renders the docked right panel and workspace styling controls.
- `AppShell.tsx` controls inspector visibility through `uiStore.inspectorOpen` and should not need structural changes.
- `uiStore.selection` already supports `none`, `block`, `column`, `row`, and `cell`.
- Selection interactions and visual states are covered in `src/tests/unit/selectionModel.test.tsx`.
- `MainPane.tsx` clears selection on active workspace changes.
- Block, column, row, and cell renderers already emit useful `data-testid` hooks.

## Recommended Design

### 1. Add a small inspector summary model
Implement target summary derivation as a pure helper so it can be tested without rendering the entire app shell.

Recommended location:
- `src/components/layout/inspectorTargetSummary.ts`

Suggested exported types/functions:

```ts
export type InspectorTargetSummary = {
  kind: "none" | "missing" | "block" | "column" | "row" | "cell";
  eyebrow: string;
  title: string;
  description: string;
  details: Array<{ label: string; value: string }>;
};

export function buildInspectorTargetSummary(args: {
  selection: Selection;
  activeWorkspace: WorkspaceIndexEntry | null;
  workspaceDocument: WorkspaceDocument | null;
}): InspectorTargetSummary;
```

Notes:
- `missing` is useful for stale selections where ids no longer resolve after edits/deletes; the UI should show a non-crashing fallback and guidance to select another target.
- Keep this helper read-only and deterministic.
- Use existing domain helpers for ordering:
  - `getVisibleColumnsInDisplayOrder`
  - `getRowsInDisplayOrder`

### 2. Summary content requirements

#### No selection
Example output:
- Eyebrow: `No selection`
- Title: `Select a block, column, row, or cell`
- Description: guidance that inspector details update based on the active target.
- Details can include active workspace title and block count if available.

#### Block selection
Example output:
- Eyebrow: `Block selected`
- Title: block title, e.g. `Today`
- Details:
  - `Type`: human label such as `Checklist`, `Bullet list`, `Numbered list`
  - `Position`: `Block 1 of 3`
  - `Rows`: row count
  - `Columns`: visible column count

#### Column selection
Example output:
- Eyebrow: `Column selected`
- Title: column label or fallback like `Untitled column`
- Details:
  - `Type`: column type label, e.g. `Text`, `Checkbox`, `Date`
  - `Block`: block title
  - `Position`: `Column 2 of 4`

#### Row selection
Example output:
- Eyebrow: `Row selected`
- Title: `Row 3`
- Details:
  - `Block`: block title
  - `Position`: `Row 3 of 10`
  - `Cells`: visible column count

#### Cell selection
Example output:
- Eyebrow: `Cell selected`
- Title: column label/fallback, e.g. `Task`
- Details:
  - `Block`: block title
  - `Row`: `Row 3 of 10`
  - `Column`: `Task (Text)`

### 3. Update `InspectorShell.tsx`
- Read `workspacesById` in addition to existing `workspaceIndex`, `activeWorkspaceId`, and `selection`.
- Resolve `workspaceDocument` for the active workspace.
- Render a clear target summary card near the top of the inspector.
- Keep the existing overall `aside` panel and workspace styling controls.
- Rename/reframe the current top card if helpful, for example:
  - top card: `Inspector`
  - summary card: `Target summary`
  - workspace style controls: `Workspace appearance`
- Remove the current placeholder `Selection` card that only says `Block selected`, `Cell selected`, etc.

### 4. Guardrails
- Do not add calls to document mutation actions except the already-existing workspace style controls.
- Do not add formatting buttons, color controls for selected blocks/rows/cells, or persistence fields.
- Do not change `uiStore.selection` shape unless absolutely necessary; current shape is sufficient.
- Handle missing/stale ids gracefully instead of throwing.
- Preserve inspector toggle behavior in `AppShell.tsx`/`TopBar.tsx`.

## Testing Plan

### Preferred unit tests
Add a new test file:
- `src/tests/unit/inspectorTargetSummary.test.ts`

Cover the pure helper directly:
1. no-selection summary includes useful guidance and active workspace context.
2. block summary includes selected block title and block context.
3. column summary includes selected column label/type and block context.
4. row summary includes row position/context.
5. cell summary includes row position and column label/type.
6. optional: stale/missing target returns a safe missing-target summary.

Use `createBlockTemplate(...)` to construct a small workspace document, matching patterns in `selectionModel.test.tsx`.

### Optional render smoke test
If inexpensive, add a small render test for `InspectorShell` that verifies the summary card appears for one selected target. Do not overbuild this if the pure helper tests cover the behavior well.

## Verification Required for Dev
Run and report all commands using the required verification format from `agents/CLOSING.md`:
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run lint`

Use the actual shell available in the environment.

## Expected Files Changed
Likely:
- `src/components/layout/InspectorShell.tsx`
- `src/components/layout/inspectorTargetSummary.ts` (new)
- `src/tests/unit/inspectorTargetSummary.test.ts` (new)
- `agents/artifacts/001-inspector-shell-complete.md` (new, by Dev)
- `docs/SESSIONS.md`
- `agents/channels/001-inspector-shell-channel.md`

## Dev Close Requirements
- Create `agents/artifacts/001-inspector-shell-complete.md` with implementation notes and verification results.
- Update `docs/SESSIONS.md` with a Dev session entry.
- Append the next `Dev → Review` message to `agents/channels/001-inspector-shell-channel.md` with `State = ready-for-review`.
- Do not commit; Main handles git operations.
