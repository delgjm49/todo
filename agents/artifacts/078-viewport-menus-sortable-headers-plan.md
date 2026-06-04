# Plan: Viewport-safe menus and sortable block headers

## Overview
Make the four popover menus (workspace, block, column, row) clamp to the visible viewport so they never open partially off-screen, and upgrade block column headers so sortable columns can be clicked to sort (with re-click asc/desc toggling) while non-sortable marker columns (numbered, bullet) render as visually minimal, non-interactive-for-sort headers. All sort behavior routes through the existing `sortBlockRows` store action and `src/domain/sorting/` helpers — no new sort modes, no storage schema changes.

## Verified Current-State Facts
Confirmed from disk during reconnaissance:

**Menu positioning (no clamping today).** All four menus render in a `fixed z-50` element positioned at the raw click coordinates with no viewport math:
- Workspace menu: rendered inline in `src/components/layout/LeftDock.tsx:108-110` — `<div className="fixed z-50 w-56 …" style={{ left: \`${workspaceMenu.x}px\`, top: \`${workspaceMenu.y}px\` }}>`. Width is `w-56` (224px).
- Block menu: `src/components/layout/MainPane.tsx:245-249` — wrapper `<div className="fixed z-50" style={{ left, top }}>` around `BlockContextMenu` (width `w-80` = 320px, see `src/components/block/BlockContextMenu.tsx:29`).
- Column menu: `src/components/layout/MainPane.tsx:292-295` — same pattern around `ColumnContextMenu` (width `w-64` = 256px, `src/components/block/ColumnContextMenu.tsx:59`).
- Row menu: `src/components/layout/MainPane.tsx:356-359` — same pattern around `RowContextMenu` (width `w-64` = 256px, `src/components/row/RowContextMenu.tsx:15`).
- Each menu uses a `fixed inset-0 z-40` backdrop with `data-testid="<kind>-menu-backdrop"` that closes the menu on `pointerDown`. Menu coordinates come from the uiStore state shapes in `src/types/ui.ts:12-39` (`{ x, y, … }`), set by `openWorkspaceMenu/openBlockMenu/openColumnMenu/openRowMenu` in `src/stores/uiStore.ts:92-100`.
- There is **no** existing clamping/positioning hook or utility (`grep` for `innerWidth|getBoundingClientRect|clamp|visualViewport` in `src/` non-test returns nothing). `src/hooks/` holds only `useAlertNavigation`, `useAlertScheduler`, `useHotkeys`, `useSearchNavigation`, `useTheme` (camelCase hook filenames).

**Block column headers.** `src/components/block/BlockColumnHeaderRow.tsx`:
- Renders each visible column (`getVisibleColumnsInDisplayOrder`) as a `<button data-testid="column-header-${id}">` whose `onClick` calls `selectColumn(workspaceId, blockId, columnId)` and whose `onContextMenu` calls `onOpenColumnMenu(...)`.
- Each header shows `<span class="truncate …">{column.label || " "}</span>` plus a type-letter badge from `getColumnTypeBadge` returning `CHK/BLT/NUM/DATE/TIME/OPT/TXT`. There is **no** click-to-sort, no sort indicator, and marker columns (numbered/bullet, empty label, width 44) render the same bordered "button" chrome as real headers — this is the live-QA "noisy / looks like a sortable control" weirdness.
- Props today: `{ blockId, columns, onOpenColumnMenu, workspaceId }`. It does **not** receive `block.sort` or any sort callback.
- `BlockCard` (`src/components/block/BlockCard.tsx:180-185`) renders `BlockColumnHeaderRow` and has the full `block` in scope (so `block.sort` is available to thread down). The block header already has a "Sort" button and a "Menu" button (`BlockCard.tsx:134-167`) that both call `onOpenMenu` → open the same `BlockContextMenu` (which contains the "Sort by" asc/desc section). That menu path stays — header click-sort is additive.

**Sort domain + store (already implemented).**
- `src/domain/sorting/compareValues.ts`: `isSortableColumn(column)` returns true for the set `{text, checkbox, bullet, date, time, dropdown}` (numbered excluded). Note `compareCellValues` returns `0` for `bullet` (line 25-27) — bullet is in the "sortable" set but sorting it is a **no-op** (markers carry no comparable value).
- `src/domain/sorting/sortRows.ts`: `sortRowsByColumn(rows, columns, sort)` returns display-ordered, reindexed rows; preserves row ids/cells, only changes `order`.
- `src/stores/documentStore.ts:2069-2114` `sortBlockRows(workspaceId, blockId, columnId, direction, options)`: guards `settings`/`workspace`/`isSortableColumn`, sets `block.sort = { columnId, direction }`, reindexes rows via `sortRowsByColumn`, commits a `"sort"` history transaction. No-op (returns early) when sort + order already match.
- `BlockSort` type (`src/types/block.ts:8-11`): `{ columnId: ColumnId; direction: "asc" | "desc" }`. `block.sort: BlockSort | null`.
- `BlockContextMenu` (`src/components/block/BlockContextMenu.tsx:26`) lists sortable columns via `getVisibleColumnsInDisplayOrder(block.columns).filter(isSortableColumn)` — so today it lists the bullet marker as "sortable" (a no-op control) for bulleted-list blocks.

**Numbered marker cell alignment.** `src/components/cell/NumberedCell.tsx` renders `<span className="inline-block w-full text-center text-sm text-text">{value}.</span>` — centered. The current numbered header is left-aligned with a "NUM" badge, so header and cells don't visually align.

**Templates / column defaults.** `numbered` and `bullet` template columns have empty label + width 44 (`src/domain/templates/blockTemplates.ts:54-77`, `src/domain/columns/createColumn.ts:19-25`). `checkbox` is also empty-label width-44 but is genuinely sortable.

**Test harness (critical — NOT Vitest).** Tests run via `npm run test` = `tsc -p tsconfig.test.json` then `node scripts/run-tests.mjs`, which executes compiled `*.test.js` under `.test-dist/` using **`node:test`** + `node:assert/strict`. Component tests use either `react-dom/server` `renderToStaticMarkup` (e.g. `src/tests/unit/blockGridRender.test.tsx`) or a JSDOM + `react-dom/client` + `act` harness (e.g. `src/tests/unit/contextMenuDismissal.test.tsx`, `selectionModel.test.tsx`). New tests MUST follow this style — do **not** introduce Vitest/RTL.

**Existing tests that touch the changed surfaces (must keep green / update):**
- `src/tests/unit/blockGridRender.test.tsx:81-82` asserts the literal `"NUM"` badge string appears once and before `"Task"`. Removing the badge changes this — **this test must be updated** (see Step 7).
- `src/tests/unit/blockGridRender.test.tsx:84-110` asserts `column-header-col_num/col_text_b/col_check` testids exist and the block sort menu lists text+checkbox, excludes numbered. Keep the `column-header-${id}` testids and the menu's text/checkbox entries.
- `src/tests/unit/selectionModel.test.tsx:200-211` clicks `column-header-${textColumnId}` and asserts `selection.kind === "column"`. The header click must continue to call `selectColumn` so this stays valid.
- `src/tests/unit/contextMenuDismissal.test.tsx`: opens menus at small coordinates (x≤36) and asserts backdrop dismissal + the block sort-menu asc action (`sort-block_home-${textColumn.id}-asc`). Clamping at x≤36 within JSDOM's default 1024×768 viewport produces no movement, and the block-menu "Sort by" path is unchanged, so these stay green.

## Prerequisites
None. All domain/store pieces already exist; this is UI + a small pure helper + tests.

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Create | `src/hooks/useClampedMenuPosition.ts` | Pure `clampMenuPosition(...)` + `useClampedMenuPosition(x, y)` hook (ref + `useLayoutEffect` measure + clamp). |
| Create | `src/tests/unit/menuPositioning.test.ts` | `node:test` unit tests for the pure `clampMenuPosition`. |
| Create | `src/tests/unit/blockHeaderSort.test.tsx` | JSDOM interactive test: click-to-sort + asc/desc toggle on a sortable header; marker header does not sort. |
| Modify | `src/domain/sorting/compareValues.ts` | Add exported `isUserSortableColumn(column)` = `isSortableColumn(column) && column.type !== "bullet"` (UI-facing predicate). |
| Modify | `src/components/block/BlockColumnHeaderRow.tsx` | Sortable vs marker header rendering, click-to-sort/toggle, sort indicator, minimal marker styling, accessibility, drop noisy type badges. New props `sort`, `onSortColumn`. |
| Modify | `src/components/block/BlockCard.tsx` | Add `onSortColumn` prop; pass `block.sort` and `onSortColumn` to `BlockColumnHeaderRow`. |
| Modify | `src/components/layout/MainPane.tsx` | Wire `onSortColumn` → `sortBlockRows`; apply `useClampedMenuPosition` to block/column/row menu wrappers. |
| Modify | `src/components/layout/LeftDock.tsx` | Apply `useClampedMenuPosition` to the workspace menu element. |
| Modify | `src/components/block/BlockContextMenu.tsx` | Use `isUserSortableColumn` for the "Sort by" list (drops the no-op bullet marker for consistency with headers). |
| Modify | `src/tests/unit/blockGridRender.test.tsx` | Update header assertions to match the new marker/sortable header presentation. |

## Implementation Steps

### Step 1: Add the pure clamp helper + hook
- File: `src/hooks/useClampedMenuPosition.ts`.
- Export a **pure** function so it is unit-testable without a DOM:
  ```ts
  export interface ClampMenuInput {
    x: number; y: number;
    width: number; height: number;
    viewportWidth: number; viewportHeight: number;
    margin?: number; // default 8
  }
  export interface ClampedPosition { left: number; top: number; }

  export function clampMenuPosition(input: ClampMenuInput): ClampedPosition {
    const margin = input.margin ?? 8;
    const maxLeft = Math.max(margin, input.viewportWidth - input.width - margin);
    const maxTop = Math.max(margin, input.viewportHeight - input.height - margin);
    const left = Math.min(Math.max(input.x, margin), maxLeft);
    const top = Math.min(Math.max(input.y, margin), maxTop);
    return { left, top };
  }
  ```
- Export the hook:
  ```ts
  export function useClampedMenuPosition(x: number, y: number, margin = 8) {
    const ref = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<ClampedPosition>({ left: x, top: y });
    useLayoutEffect(() => {
      const el = ref.current;
      if (!el || typeof window === "undefined") { setPos({ left: x, top: y }); return; }
      const rect = el.getBoundingClientRect();
      setPos(clampMenuPosition({
        x, y, width: rect.width, height: rect.height,
        viewportWidth: window.innerWidth, viewportHeight: window.innerHeight, margin,
      }));
    }, [x, y, margin]);
    return { ref, left: pos.left, top: pos.top };
  }
  ```
- `useLayoutEffect` runs before paint, so clamping applies with no visible flash. In JSDOM `getBoundingClientRect()` returns zeros, so width/height are 0 → menus opened at small coordinates do not move (keeps existing menu tests green). Optionally also recompute on `window` resize (low priority; menus are transient — only add if trivial and it does not complicate the JSDOM tests).
- **Verify**: `npm run test:build` typechecks the new file.

### Step 2: Apply clamping in MainPane (block, column, row menus)
- File: `src/components/layout/MainPane.tsx`.
- Replace each inline `style={{ left: \`${menu.x}px\`, top: \`${menu.y}px\` }}` positioned wrapper with the hook output. Because hooks can't be called conditionally inside the `{menu && … ? (...) : null}` JSX, extract each positioned menu into a small inner component that always calls the hook, e.g. `BlockMenuPopover`, `ColumnMenuPopover`, `RowMenuPopover`, each receiving `x`, `y`, children, and an `onBackdropPointerDown`. Pattern:
  ```tsx
  function MenuPopover({ x, y, onDismiss, backdropTestId, children }: {...}) {
    const { ref, left, top } = useClampedMenuPosition(x, y);
    return (
      <>
        <div aria-hidden="true" className="fixed inset-0 z-40" data-testid={backdropTestId} onPointerDown={onDismiss} />
        <div ref={ref} className="fixed z-50" style={{ left: `${left}px`, top: `${top}px` }} onPointerDown={(e) => e.stopPropagation()}>
          {children}
        </div>
      </>
    );
  }
  ```
  Then render `{blockMenu && activeBlockMenuBlock ? <MenuPopover x={blockMenu.x} y={blockMenu.y} onDismiss={closeBlockMenu} backdropTestId="block-menu-backdrop"><BlockContextMenu …/></MenuPopover> : null}` (and likewise column/row). A single shared `MenuPopover` is preferred over three near-duplicates.
- Preserve all existing `data-testid` values (`block-menu-backdrop`, `column-menu-backdrop`, `row-menu-backdrop`) and the `stopPropagation` on the inner container.
- **Verify**: `npm run test` — `contextMenuDismissal.test.tsx` still passes (backdrops present, dismissal works, coordinates within viewport so no movement).

### Step 3: Apply clamping in LeftDock (workspace menu)
- File: `src/components/layout/LeftDock.tsx`.
- The workspace menu is the positioned element itself (it directly holds `w-56 … shadow-soft`). Extract it into an inner component (e.g. `WorkspaceMenuPopover`) that calls `useClampedMenuPosition(workspaceMenu.x, workspaceMenu.y)` and applies `ref` + clamped `left/top`, keeping the `w-56 rounded-xl border … shadow-soft` classes and the `workspace-menu-backdrop` testid + dismissal. Reuse the shared `MenuPopover` if it is exported from a shared module; otherwise a local extraction is fine (do not over-share across `layout/` and `block/`). Keep menu contents (Rename / Toggle accent / Accent color / Delete) unchanged.
- **Verify**: `npm run test` — `contextMenuDismissal.test.tsx` "workspace menu uses a backdrop …" passes.

### Step 4: Add the UI-facing sortable predicate
- File: `src/domain/sorting/compareValues.ts`.
- Add, next to `isSortableColumn`:
  ```ts
  // Columns a user can meaningfully sort by from the header/menu.
  // Excludes pure marker columns: `numbered` (already excluded by isSortableColumn)
  // and `bullet` (in the sortable set but compareCellValues is a no-op for it).
  export function isUserSortableColumn(column: ColumnDefinition | undefined): column is ColumnDefinition {
    return isSortableColumn(column) && column.type !== "bullet";
  }
  ```
- Do **not** change `isSortableColumn` itself or the `sortBlockRows` domain gate — bullet stays a harmless no-op at the domain level; this predicate only governs what the UI surfaces. (Design decision — see "Assumptions / Design Decisions".)
- **Verify**: `npm run test:build` typechecks.

### Step 5: Rebuild BlockColumnHeaderRow (sortable vs marker headers)
- File: `src/components/block/BlockColumnHeaderRow.tsx`.
- New props: add `sort: BlockSort | null` and `onSortColumn?: (columnId: ColumnId, direction: BlockSort["direction"]) => void` (import `BlockSort` from `../../types/block.js`). Keep existing `blockId`, `columns`, `onOpenColumnMenu`, `workspaceId`.
- For each visible column, branch on `isUserSortableColumn(column)`:
  - **Sortable header** (text / checkbox / date / time / dropdown):
    - Render a `<button data-testid="column-header-${id}">` styled as a sort control (keep the existing selected/hover affordance).
    - Content: the label when present (`column.label.trim()`); when empty, show a small muted type glyph so narrow sortable headers (e.g. checkbox) are not blank — e.g. checkbox → `☑`. Drop the `CHK/DATE/…` letter badge (this is the "noise" cleanup).
    - Active-sort indicator: when `sort?.columnId === column.id`, render a visible `▲` (asc) / `▼` (desc) glyph and set `data-sort-direction={sort.direction}` on the button. When not active, no indicator and no `data-sort-direction` attribute.
    - `onClick`: compute `nextDirection = sort?.columnId === column.id ? (sort.direction === "asc" ? "desc" : "asc") : "asc"`, then call `selectColumn(workspaceId, blockId, column.id)` (preserve selection) **and** `onSortColumn?.(column.id, nextDirection)`. First click on an unsorted/other column sorts ascending; re-click on the active column toggles.
    - `onContextMenu`: unchanged (`onOpenColumnMenu`).
    - Accessibility: set a descriptive `aria-label`, e.g. `Sort by ${labelOrType}${active ? \`, currently ${dir}ending\` : ""}`, and `aria-pressed={active}` to expose the active state with a valid button attribute. (Avoid `aria-sort` — it is only valid on `columnheader`/`gridcell` roles, which this non-table markup does not use.)
  - **Non-sortable marker header** (numbered / bullet — i.e. `!isUserSortableColumn`):
    - Render a minimal, centered, muted header cell. Keep it a `<button data-testid="column-header-${id}">` so column selection and the right-click column menu still work (needed for rename/change-type/delete and for `selectionModel`/dismissal tests), but drop the bordered "control" chrome and hover-as-sortable styling; use muted text and no active/selected sort affordance.
    - Content: a single muted centered glyph aligned with the cell column — numbered → `#`, bullet → `•` (matches `NumberedCell` centering). No type-letter badge, no sort indicator, no `data-sort-direction`.
    - `onClick`: `selectColumn(...)` only (no sort). `onContextMenu`: unchanged.
    - `aria-label`: the column label if present, else the human type name (`"Numbered"` / `"Bullet"`); `title` likewise. Do not mark it pressed/sortable.
- Keep `buildGridTemplate` and the grid wrapper unchanged (alignment/overflow already use `min-w-0` + `truncate` + 44px min track). Ensure the sortable label keeps `truncate min-w-0` and the indicator/badge is `shrink-0` so long labels overflow cleanly.
- Replace `getColumnTypeBadge` with a small `getMarkerGlyph(type)` (and optional `getSortableGlyph` for empty-label sortable columns) or inline equivalents; remove the now-unused badge helper.
- **Verify**: `npm run test:build`; visually confirm via Step 9 manual check.

### Step 6: Thread sort wiring through BlockCard → MainPane
- File: `src/components/block/BlockCard.tsx`:
  - Add prop `onSortColumn?: (columnId: ColumnId, direction: BlockSort["direction"]) => void` (import types as needed).
  - Pass `sort={block.sort}` and `onSortColumn={onSortColumn}` to `BlockColumnHeaderRow`.
- File: `src/components/layout/MainPane.tsx`:
  - On the `<BlockCard …>` render, add `onSortColumn={(columnId, direction) => { void sortBlockRows(block.workspaceId, block.id, columnId, direction); }}` (the `sortBlockRows` selector is already wired at `MainPane.tsx:47`).
- The block-header "Sort"/"Menu" buttons and the `BlockContextMenu` "Sort by" section remain unchanged and functional (additive change).
- **Verify**: `npm run test`; manual check in Step 9.

### Step 7: Align the block context menu sort list
- File: `src/components/block/BlockContextMenu.tsx`.
- Change `const sortableColumns = getVisibleColumnsInDisplayOrder(block.columns).filter(isSortableColumn);` to use `isUserSortableColumn`. Import it from `../../domain/sorting/compareValues.js`.
- Effect: bulleted-list blocks no longer show the bullet marker as a (no-op) sort option, matching the header treatment. Text/checkbox/date/time/dropdown options are unchanged. The "No sortable columns available." empty state still appears for marker-only blocks.
- **Verify**: `npm run test` — `blockGridRender.test.tsx` menu assertions (text+checkbox present, numbered absent) still hold; no existing test asserts a bullet option.

### Step 8: Unit tests — pure clamp helper
- File: `src/tests/unit/menuPositioning.test.ts` (`node:test` + `node:assert/strict`, no DOM).
- Import `clampMenuPosition` from `../../hooks/useClampedMenuPosition.js`.
- Cases:
  - Fully inside viewport → returned `left/top` equal input `x/y`.
  - Overflow right → `left === viewportWidth - width - margin`.
  - Overflow bottom → `top === viewportHeight - height - margin`.
  - Overflow both → both clamped.
  - `x`/`y` below `margin` → clamped up to `margin`.
  - Menu larger than viewport → clamped to `margin` (never negative).
- **Verify**: `npm run test` shows these passing.

### Step 9: Interactive test — header click-sort + toggle
- File: `src/tests/unit/blockHeaderSort.test.tsx`. Copy the JSDOM harness scaffolding from `src/tests/unit/contextMenuDismissal.test.tsx` (the `installDomGlobals`, `renderNode`, `dispatchClick`, `beforeEach/afterEach` reset pattern).
- Build a `basic_checklist` block via `createBlockTemplate` with a text column and 3 rows (`Zulu`, `Alpha`, `Mike`) like the existing sort test, seed the document/ui stores, render `<MainPane />` (so the real `onSortColumn` → `sortBlockRows` wiring is exercised), then:
  - Query `[data-testid="column-header-${textColumn.id}"]`, `click()` it, assert row order becomes `Alpha, Mike, Zulu`, `order` is `[0,1,2]`, and `block.sort === { columnId: textColumn.id, direction: "asc" }`, and the button now exposes `data-sort-direction="asc"`.
  - `click()` the same header again, assert order reverses to `Zulu, Mike, Alpha`, `block.sort.direction === "desc"`, and `data-sort-direction="desc"`.
  - Assert clicking a marker header (`column-header-${checkboxColumn.id}`… actually checkbox is sortable; use the numbered/bullet marker) does **not** set `data-sort-direction` and does not change `block.sort` from its prior value. (Use a `numbered_list` block, or add a numbered column, to get a true marker.)
- Note: viewport clamping movement is **not** reliably observable in JSDOM (`getBoundingClientRect` returns zeros), so clamping coverage lives in the pure `menuPositioning.test.ts`; do not assert pixel positions in JSDOM.
- **Verify**: `npm run test` shows the new file passing.

### Step 10: Update blockGridRender test for the new header presentation
- File: `src/tests/unit/blockGridRender.test.tsx`.
- Replace the `"NUM"` badge assertions (lines 81-82) with assertions matching the new marker header — e.g. the numbered header still renders `data-testid="column-header-col_num"`, renders its marker glyph (`#`) / `aria-label`, and appears before the `Task` header; assert the old `NUM/CHK/TXT` letter badges are gone. Keep the `column-header-*` testid assertions and the sort-menu assertions (text+checkbox present, numbered absent). Update the checkbox header expectation (empty label now shows the `☑` glyph) if asserted.
- **Verify**: `npm run test` — file passes with updated expectations.

### Step 11: Full verification
- Run, from the environment's actual shell (zsh on Mac / PowerShell on Windows):
  - `npm run test`
  - `npm run lint`
  - `npm run build`
- All three must pass. (`npm run test` already runs `tsc -p tsconfig.test.json` first, covering typecheck of test + source; `npm run typecheck` may also be run as a sanity check.)

## Data / Storage / Schema Changes
None. `BlockSort` and `block.sort` already exist and persist; `sortBlockRows` already records a `"sort"` history transaction. No JSON schema, migration, or storage-backend changes.

## UI Specifications
- **Menus (workspace / block / column / row):** open at the click point, then clamp so the full menu stays within the viewport minus an 8px margin; clamp left and top edges (never negative, never past the right/bottom edge). Backdrop dismissal, `stopPropagation`, z-index (backdrop `z-40`, menu `z-50`), and all `data-testid`s unchanged. No flash (clamp in `useLayoutEffect` before paint).
- **Sortable header** (text/checkbox/date/time/dropdown): looks like an interactive control; shows label (or a muted type glyph if label empty); shows `▲`/`▼` only when it is the active sort column; click sorts ascending first, re-click toggles asc↔desc; also selects the column; right-click opens the column menu. `aria-pressed` reflects active sort; `aria-label` describes the sort action/state.
- **Marker header** (numbered/bullet): visually minimal, centered, muted single glyph (`#` / `•`), aligned with the marker cells; no sort indicator, no control chrome, not presented as sortable; still selectable and right-clickable for column management.
- **States:** empty workspace / collapsed block unchanged. Block "Sort by" menu shows user-sortable columns (now excluding the bullet marker) or the existing "No sortable columns available." empty state.

## Assumptions / Design Decisions
1. **`isUserSortableColumn` excludes `bullet`** (in addition to numbered) for all UI sort surfaces — both the header click-sort treatment and the `BlockContextMenu` "Sort by" list. Rationale: `compareCellValues` is a no-op for bullet, so surfacing it as a sortable control is misleading and contradicts the "marker headers should not imply unsupported sorting" acceptance criterion. The domain `isSortableColumn` and `sortBlockRows` gate are left unchanged (bullet remains a harmless no-op there). This is a small, intentional change to the bulleted-list block's sort menu contents; no existing test asserts a bullet sort option. **Flagged for Review/Main** as the one behavior change beyond pure additions.
2. **Header click both sorts and selects.** Clicking a sortable header applies/toggles the sort and also calls `selectColumn`, preserving the existing column-selection behavior that `selectionModel.test.tsx` depends on. Verified the selection test only asserts `selection.kind === "column"`, which still holds.
3. **Clamp helper lives in `src/hooks/useClampedMenuPosition.ts`** (camelCase, matching existing hook filenames) and exports the pure `clampMenuPosition` for direct unit testing. Dev may split the pure function into a sibling module if preferred, but keep it importable by `node:test`.
4. **No `aria-sort`** is used because the header markup is plain `<div>`/`<button>` (no `table`/`grid`/`columnheader` roles); `aria-pressed` + descriptive `aria-label` is the accessible, valid choice for the existing pattern.
5. Marker glyphs `#` (numbered) and `•` (bullet) and `☑` (empty-label checkbox) are chosen for minimal, recognizable headers; Dev may substitute equivalent muted glyphs/icons if they fit the existing Tailwind styling better, as long as the marker headers read as non-interactive-for-sort and stay aligned with their cells.

## Acceptance Criteria
- [ ] Block popover/menu stays fully within the viewport when opened near any window edge.
- [ ] Workspace popover/menu stays fully within the viewport when opened near any window edge.
- [ ] Column/header popover/menu stays fully within the viewport when opened near any window edge.
- [ ] (Also) the row context menu clamps to the viewport (same shared mechanism).
- [ ] Block column headers have clean alignment, spacing, and overflow (labels truncate; indicators/badges `shrink-0`; marker headers minimal).
- [ ] Sortable headers can be clicked to sort by that column.
- [ ] Re-clicking the active sortable header toggles ascending/descending.
- [ ] Non-sortable marker headers (numbered, bullet) are visually minimal and are not presented as sortable controls.
- [ ] Numbered-list header presentation is cleaned up (centered muted marker aligned with cells; no stray badge/nbsp weirdness).
- [ ] Sorting still routes through `sortBlockRows` / `src/domain/sorting/` and records one `"sort"` history transaction; row ids and cell payloads are preserved.
- [ ] New tests: pure clamp unit tests + header click-sort/toggle interactive test; `blockGridRender.test.tsx` updated for the new header presentation.
- [ ] `npm run test`, `npm run lint`, and `npm run build` pass.

## Estimated Complexity
- **Medium.**
- ~10 files (3 created, 7 modified). Most risk is in `BlockColumnHeaderRow` markup + updating `blockGridRender.test.tsx`; the clamp work is mechanical with one shared hook/popover wrapper.
