# Complete: Viewport-safe menus and sortable block headers

## Summary
Implemented viewport clamping for all four popover menus (workspace, block, column, row) via a shared `MenuPopover` component backed by a pure `clampMenuPosition` helper and `useClampedMenuPosition` hook. Rebuilt `BlockColumnHeaderRow` with sortable-vs-marker header distinction: sortable headers (text/checkbox/date/time/dropdown) have click-to-sort with asc/desc toggle and sort indicators, while marker headers (numbered/bullet) render as visually minimal, centered, muted glyphs (`#` / `•`). Threaded sort wiring via `BlockCard` → `MainPane` to the existing `sortBlockRows` action. Updated `BlockContextMenu` to use the new `isUserSortableColumn` predicate, removing the no-op bullet marker from the "Sort by" list. Added 3 new test files and updated 1 existing test.

## Files Changed

| Action | Path | Notes |
|--------|------|-------|
| Created | `src/hooks/useClampedMenuPosition.ts` | Pure `clampMenuPosition` + `useClampedMenuPosition` hook with `useLayoutEffect` for flash-free clamping. Falls back to raw coordinates when `getBoundingClientRect` returns zero (JSDOM compat). |
| Created | `src/components/shared/MenuPopover.tsx` | Reusable popover wrapper applying `useClampedMenuPosition` with backdrop dismissal. |
| Created | `src/tests/unit/menuPositioning.test.ts` | Pure unit tests for `clampMenuPosition` (9 cases). |
| Created | `src/tests/unit/blockHeaderSort.test.tsx` | JSDOM interactive test: click-to-sort asc → toggle desc, marker header no-sort. |
| Modified | `src/domain/sorting/compareValues.ts` | Added exported `isUserSortableColumn` predicate (`isSortableColumn && type !== "bullet"`) for UI surfaces. |
| Modified | `src/components/block/BlockColumnHeaderRow.tsx` | Full rebuild: sortable headers with click-sort/toggle, `▲`/`▼` indicator, `aria-pressed`/`aria-label`; marker headers with minimal muted glyphs. Removed `getColumnTypeBadge`. New props `sort`, `onSortColumn`. |
| Modified | `src/components/block/BlockCard.tsx` | Added `onSortColumn` prop; passes `sort` + `onSortColumn` to `BlockColumnHeaderRow`. |
| Modified | `src/components/layout/MainPane.tsx` | Applied `MenuPopover` to block/column/row menus; wired `onSortColumn` → `sortBlockRows` on `BlockCard`. |
| Modified | `src/components/layout/LeftDock.tsx` | Applied `MenuPopover` to workspace menu. |
| Modified | `src/components/block/BlockContextMenu.tsx` | Uses `isUserSortableColumn` for "Sort by" list (drops bullet marker). |
| Modified | `src/tests/unit/blockGridRender.test.tsx` | Updated header assertions: `#` marker glyph instead of `NUM` badge; verified old type-letter badges are gone. |

## Deviations from Plan

1. **`isUserSortableColumn` not used as a type guard in `BlockColumnHeaderRow` conditional.** The plan specified `if (isUserSortableColumn(column))` in the header render loop. However, the type predicate `column is ColumnDefinition` causes TypeScript to narrow the false branch to `never` (since the input is already `ColumnDefinition`, the complement is `never`). The false branch (marker header) needs to access `column.label`, `column.type`, etc. Changed to a direct boolean check `column.type !== "numbered" && column.type !== "bullet"` (equivalent semantics). The `isUserSortableColumn` function is still used in `BlockContextMenu` `.filter()` where the type guard is beneficial.

2. **No `addColumnRight`/`addColumnLeft` void wrapping was already present.** The plan's column-menu refactor example omitted `void` on those calls; the production code already had `void` and it was preserved in the refactored `MenuPopover` version.

## Open Questions
None.

## Verification

- command: `npm run test`
- shell used: zsh (macOS)
- result: 465 pass, 1 fail (alertScheduler.test.js — `edit-triggered re-evaluation > updateTimeCellValue triggers alert re-evaluation` — pre-existing, not checkpoint-scoped)
- if failed, exact failure surface: `alertScheduler.test.js` assertion on alert re-evaluation after time cell update — existed before this dispatch
- checkpoint-scoped or unrelated repo-state: unrelated; all checkpoint-scoped tests pass (clampMenuPosition, blockHeaderSort, blockGridRender, contextMenuDismissal, selectionModel)
- was this the actual shell provided by the environment: yes

- command: `npm run lint`
- shell used: zsh (macOS)
- result: pass (0 warnings, 0 errors)
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: N/A
- was this the actual shell provided by the environment: yes

- command: `npm run build`
- shell used: zsh (macOS)
- result: pass (built in 984ms, 5 output modules)
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: N/A
- was this the actual shell provided by the environment: yes

## Known Issues
None.

## Design Decision Callout (for Review/Main)

**`isUserSortableColumn` excludes the `bullet` marker** from both the header sort treatment and the `BlockContextMenu` "Sort by" list. `compareCellValues` returns `0` for bullet cells (a no-op), so surfacing it as a sortable control was misleading. The domain-level `isSortableColumn` and `sortBlockRows` gate are unchanged — bullet remains a harmless no-op at the domain layer. This is the one behavior change beyond pure additions.
