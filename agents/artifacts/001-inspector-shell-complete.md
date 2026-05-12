# Complete: Inspector Shell and Target Summary

## Dispatch
- Channel: `agents/channels/001-inspector-shell-channel.md`
- Dispatch: `agents/artifacts/001-inspector-shell-dispatch.md`
- Plan: `agents/artifacts/001-inspector-shell-plan.md`
- Ticket: `TICKET-041: Build inspector shell and target summary`

## What was implemented

### New file: `src/components/layout/inspectorTargetSummary.ts`
A pure helper function `buildInspectorTargetSummary` that takes `{ selection, activeWorkspace, workspaceDocument }` and returns an `InspectorTargetSummary` with:
- `kind`: `"none" | "missing" | "block" | "column" | "row" | "cell"`
- `eyebrow`: short label like "Block selected", "No selection"
- `title`: primary display text (block title, "Row 3", column label, etc.)
- `description`: extended context string
- `details`: key-value pairs with contextual metadata (type, position, row count, etc.)

Handles all selection kinds including stale/missing targets gracefully with a `missing` kind that provides guidance to select another target.

Includes `getBlockTypeLabel` and `getColumnTypeLabel` helper functions for human-readable type labels.

### Updated file: `src/components/layout/InspectorShell.tsx`
- Replaced the placeholder "Selection" card that only showed "Nothing selected" / "Block selected" etc. with a proper "Target summary" card using `buildInspectorTargetSummary`.
- The target summary card shows: eyebrow label, title, description, and a detail list (label/value pairs).
- Added `workspacesById` subscription to resolve the active workspace document.
- Preserved the inspector card, workspace title card, and all workspace styling controls (background color, text color, accent stripe toggle, accent stripe color).
- Inspector toggle/open behavior in `AppShell` and `TopBar` is untouched.

### New file: `src/tests/unit/inspectorTargetSummary.test.ts`
Pure unit tests (no DOM rendering needed) covering:
1. no-selection summary with workspace context
2. no-selection without workspace (generic guidance)
3. block summary with title, type, position, row/column count
4. column summary with label, type, block context, position
5. row summary with position, block context, cell count
6. cell summary with row position and column label/type
7. stale block selection → missing target
8. stale column selection with missing block → missing target
9. stale column selection with missing column → missing target
10. stale row selection → missing target
11. stale cell selection → missing target
12. selection with no workspace document → missing target
13. block summary in multi-block workspace shows correct position
14. column with empty label shows "Untitled column"

## What was explicitly NOT implemented (out of scope)
- Text formatting controls (TICKET-042)
- Border formatting controls (TICKET-043)
- Formatting persistence (TICKET-044)
- Checkbox automation, sorting, clipboard, alerts, packaging
- Any mutation APIs beyond the existing workspace style controls

## Acceptance criteria status
- [x] Inspector has a visible target summary card
- [x] No-selection state is intentional, useful, and non-blank
- [x] Block selection shows a block summary including block title
- [x] Column selection shows a column summary including column label/type
- [x] Row selection shows a row summary including row position/context
- [x] Cell selection shows a cell summary including row position and column label/type
- [x] Existing inspector toggle/open behavior remains intact
- [x] Existing workspace styling controls still render
- [x] Unit tests cover no-selection, block, column, row, and cell summary behavior
- [x] Verification commands run and reported

## Verification results

### `npm run typecheck`
- command: `npm run typecheck`
- shell used: bash (Windows)
- result: PASS (exit code 0, no errors)

### `npm run test`
- command: `npm run test`
- shell used: bash (Windows)
- result: PASS (91/91 tests, 0 failures)
- All existing tests plus 14 new `buildInspectorTargetSummary` tests pass.

### `npm run build`
- command: `npm run build`
- shell used: bash (Windows)
- result: PASS (Vite build completed in 3.30s, 5 assets emitted)

### `npm run lint`
- command: `npm run lint`
- shell used: bash (Windows)
- result: PASS (exit code 0, no warnings or errors)

All results are checkpoint-scoped. No unrelated failures observed.