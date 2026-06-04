# Review: Viewport-safe menus and sortable block headers

## Plan Reviewed
- agents/artifacts/078-viewport-menus-sortable-headers-plan.md

## Complete Reviewed
- agents/artifacts/078-viewport-menus-sortable-headers-complete.md

## Findings

### Correctness
- ✅ Viewport clamping is correct. `clampMenuPosition` clamps left/top to `[margin, viewport - size - margin]` and floors `maxLeft/maxTop` at `margin` so menus larger than the viewport pin to the margin instead of going negative (`src/hooks/useClampedMenuPosition.ts:19-26`). `useClampedMenuPosition` measures in `useLayoutEffect` (pre-paint, no flash) and falls back to raw `(x, y)` when `getBoundingClientRect` returns a zero rect (JSDOM), which preserves the existing `contextMenuDismissal` tests.
- ✅ All four menus route through the shared `MenuPopover` (`src/components/shared/MenuPopover.tsx`): workspace (`LeftDock.tsx:102`), block/column/row (`MainPane.tsx:242,277,329`). Backdrop `z-40`/menu `z-50`, `stopPropagation` on the inner container, and all `data-testid`s (`workspace/block/column/row-menu-backdrop`) are preserved.
- ✅ Header click-to-sort + toggle is correct. `nextDir = isActive && direction === "asc" ? "desc" : "asc"` (`BlockColumnHeaderRow.tsx:80`) is logically equivalent to the plan's spec: first click / other column → `asc`; re-click active `asc` → `desc`; re-click active `desc` → `asc`. Verified by the interactive JSDOM test (`blockHeaderSort.test.tsx`) which asserts row order, `order` reindex `[0,1,2]`, `block.sort`, and `data-sort-direction`.
- ✅ Sort routes through the existing `sortBlockRows` action via `BlockCard → MainPane` (`MainPane.tsx:214-216`); no new sort mode, no schema change. Header click also calls `selectColumn`, preserving column-selection behavior that `selectionModel.test.tsx` depends on.
- ✅ Marker headers (numbered/bullet) are not presented as sortable: borderless/transparent muted chrome, centered `#`/`•` glyph, no sort indicator, no `data-sort-direction`, no `onSortColumn` call. Still a `<button>` so selection + right-click column menu keep working.
- ✅ `isUserSortableColumn = isSortableColumn && type !== "bullet"` (`compareValues.ts:24-26`) is applied in `BlockContextMenu` (`BlockContextMenu.tsx:26`), dropping the no-op bullet from the "Sort by" list — consistent with the header treatment. Domain `isSortableColumn` / `sortBlockRows` gate left unchanged (bullet stays a harmless no-op there).

### Completeness
- ✅ Every acceptance criterion in the plan is met (viewport clamping for all four menus, header alignment/overflow, click-to-sort, asc/desc toggle, minimal marker headers, numbered-header cleanup, one `"sort"` transaction preserved, new + updated tests).
- ✅ Deviation #1 in the complete artifact (using a direct `type !== "numbered" && type !== "bullet"` check in the header loop instead of the `isUserSortableColumn` type guard) is justified: a type guard whose predicate type equals the input type narrows the `else` branch to `never`. The direct check is exactly equivalent given the 7-member `ColumnType` union.
- ⚠️ Plan's UI spec said a sortable header with an empty label should show "a muted type glyph if label empty"; `getSortableGlyph` only returns a glyph for `checkbox` (`BlockColumnHeaderRow.tsx:7-10`). This is **unreachable in normal use**: `getDefaultColumnLabel` returns non-empty labels for text/date/time/dropdown ("Text"/"Date"/"Time"/"Status") and the only empty-default sortable type (checkbox) is handled with `☑`. It only manifests if a user manually blanks a non-checkbox sortable column's label. See note 2. Not documented as a deviation, but low impact.

### Quality
- ✅ Follows repo conventions: camelCase hook filename, PascalCase components, `.js` import specifiers, Tailwind classes consistent with surrounding code. `MenuPopover` is a clean single-source extraction over three near-duplicate wrappers. Dead `getColumnTypeBadge` helper removed.
- ✅ Accessibility uses `aria-pressed` + descriptive `aria-label` (not `aria-sort`, which would be invalid on this non-`columnheader` markup), matching the plan's decision.
- ⚠️ Minor cosmetic: the active-sort `aria-label` is built with `.filter(Boolean).join(" ")` producing a stray space before the comma — e.g. `"Sort by Task , currently ascending"` (`BlockColumnHeaderRow.tsx:63-67`). Screen-reader output stays intelligible. See note 1.

### Data Integrity
- ✅ No JSON read/write or storage paths changed. Sorting only reindexes `order` via the existing `sortRowsByColumn`/`sortBlockRows` path; row ids and cell payloads are preserved; one `"sort"` history transaction is recorded (unchanged domain logic).

## Issues Found

1. **[Severity: Low — non-blocking, deferred]** Active-sort `aria-label` has a stray space before the comma (`"Sort by Task , currently ascending"`).
   - File: `src/components/block/BlockColumnHeaderRow.tsx:63-67`
   - Fix (optional): build the suffix without an array join, e.g. append `${isActive ? \`, currently ${direction}ending\` : ""}` to `Sort by ${label || typeName}`.
   - Deferral reason: truly cosmetic; screen-reader output remains intelligible.

2. **[Severity: Low — non-blocking, deferred]** Empty-label sortable headers for date/time/dropdown/text render blank (no muted type glyph), unlike the plan's UI-spec wording.
   - File: `src/components/block/BlockColumnHeaderRow.tsx:7-10` (`getSortableGlyph` only covers `checkbox`).
   - Fix (optional): extend `getSortableGlyph` (or fall back to the type name) for empty-label non-checkbox sortable columns.
   - Deferral reason: unreachable via default flows — `getDefaultColumnLabel` yields non-empty labels for those types and checkbox is already handled; only occurs if a user deliberately clears a label. Main may queue a tiny follow-up if desired.

## Verification

Review reran all three required commands in the environment's actual shell.

- command: `npm run test`
- shell used: zsh (macOS)
- result: 466 tests, 465 pass, 1 fail
- if failed, exact failure surface: `alertScheduler.test.js` → `edit-triggered re-evaluation > updateTimeCellValue triggers alert re-evaluation` (`.test-dist/tests/unit/alertScheduler.test.js:286`)
- checkpoint-scoped or unrelated repo-state: **unrelated pre-existing**. `alertScheduler` source/test are not in this dispatch's diff (confirmed via `git diff --name-only`); all checkpoint-scoped tests pass: `block grid render` (ok 18), `block header sort` — asc/desc toggle + marker no-sort (ok 19), `clampMenuPosition — pure helper` 9 cases (ok 42), `contextMenuDismissal` block/column/row/workspace backdrops + block sort action, `selectionModel`.
- was this the actual shell provided by the environment: yes

- command: `npm run lint`
- shell used: zsh (macOS)
- result: pass (0 errors, 0 warnings; `--max-warnings=0`)
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: N/A
- was this the actual shell provided by the environment: yes

- command: `npm run build`
- shell used: zsh (macOS)
- result: pass (vite build, 119 modules transformed, built in ~1.1s)
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: N/A
- was this the actual shell provided by the environment: yes

## Out-of-Scope Working Tree Changes
None. Every dirty file is in-scope for this dispatch:
- Modified: `src/components/block/BlockCard.tsx`, `BlockColumnHeaderRow.tsx`, `BlockContextMenu.tsx`, `src/components/layout/LeftDock.tsx`, `MainPane.tsx`, `src/domain/sorting/compareValues.ts`, `src/tests/unit/blockGridRender.test.tsx` — all listed in the plan's Files to Create/Modify.
- Untracked (created per plan): `src/hooks/useClampedMenuPosition.ts`, `src/components/shared/MenuPopover.tsx`, `src/tests/unit/menuPositioning.test.ts`, `src/tests/unit/blockHeaderSort.test.tsx`.
- Process files: `docs/SESSIONS_PENDING.md` (worker append buffer), `agents/artifacts/078-*` (dispatch/plan/complete), `agents/channels/078-viewport-menus-sortable-headers/` (this dispatch channel).

## Final Verdict
**PASS WITH NOTES**

Implementation is correct, complete against all acceptance criteria, follows repo conventions, and `npm run test` / `npm run lint` / `npm run build` were rerun by Review with the expected results (the sole test failure is the pre-existing, unrelated `alertScheduler` case). The two findings above are non-blocking with explicit deferral reasons (one truly cosmetic aria-label spacing; one unreachable empty-label edge case prevented by default labels) — no required fixes and no re-review needed. Ready for Main. Main may optionally queue the two low-severity polish items.
