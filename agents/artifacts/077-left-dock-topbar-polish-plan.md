# Plan: Left dock and top-bar polish

- Dispatch ID: 077
- Feature slug: left-dock-topbar-polish
- Date: 2026-05-31
- Author role: Plan

> **Channel note (read first):** message `002-plan-to-dev.md` is immutable and its
> one-line recap says the reorder fix is "calling preventDefault." That recap is
> **superseded by this plan.** `preventDefault` is already present in both
> `WorkspaceCard.onDrop` and `LeftDock`'s `onDragOver`. The reorder failure is a
> runtime DOM-drag issue centered on `WorkspaceCard`'s draggable root being a
> `<button>` (see Root-Cause Findings #1). Follow this artifact, and verify the fix
> in the running app — JSDOM cannot prove a drag-and-drop fix.

## Overview

Polish the primary navigation shell from live QA: make the app shell/left dock a
fixed-height rail where only the workspace list scrolls, give Settings a single
bottom gear entry, simplify the top bar (remove `+ Block` and the duplicate Settings
control, turn Undo/Redo into icon buttons with tooltips, replace the Search trigger
with an always-visible input), keep add-block template buttons available in the
workspace canvas after blocks exist, and fix the left-dock workspace drag reorder so
it completes and persists. The store action `reorderWorkspaces` and its debounced
persistence already work and are covered by tests (`documentStore.test.ts:155`); the
failure is in the DOM drag layer of `WorkspaceCard`.

## Root-Cause Findings (verified against current code)

1. **Reorder "starts but never completes" — the draggable root is a `<button>`.**
   The block reorder path (not reported as broken) and the workspace path use
   *identical* handler wiring; the only structural difference is the root element:
   - `WorkspaceCard.tsx` root is `<button draggable onClick={onSelect} …>` (line 31),
     with `onDragStart={onDragStart}` (45), `onDragOver={onDragOver}` (44),
     `onDrop={(e) => { e.preventDefault(); onDrop(); }}` (46–49).
   - `BlockCard.tsx` root is `<article draggable={!isEditing} …>` (line 88) with the
     **same** `onDragStart={onDragStart}` (96), `onDragOver` (95), and
     `onDrop` (97–100) wiring.
   - So `preventDefault` is already correct, and **neither** card sets
     `dataTransfer` in `dragstart`. The differentiator is that the workspace card's
     draggable/drop target is a native `<button>` (a form control with its own
     pointer/activation behavior), which makes the HTML5 drag→drop handshake
     unreliable (drag can start — the `opacity-50` "dragging" state shows — while the
     `drop` event never fires), whereas the block card uses a non-button element.
   - The store action `reorderWorkspaces` (documentStore.tsx ≈ line 1172) already
     reorders + reindexes + `commitSnapshot(…, "drag")`, which schedules the debounced
     autosave (`DEFAULT_AUTOSAVE_DELAY_MS = 250ms`). So persistence is automatic once
     the drop fires. **The fix must make the drop fire.**
   - *This is a runtime-DOM diagnosis, not provable from static reading alone.* The
     fix below is calibrated to the strongest evidence (the `<button>` root) plus a
     cheap, spec-correct hardening (`setData`/`effectAllowed`), and Dev must confirm
     it in the running app.

2. **Dock is not fixed-height — the shell grows past the viewport.** The dock list
   region already has the correct classes: `LeftDock` line 47 is
   `mt-4 min-h-0 flex-1 overflow-y-auto pr-1`. It never scrolls because nothing
   bounds its height: `AppShell` root `<main>` is `grid min-h-screen …` (grows) and
   `LeftDock` `<aside>` is `flex min-h-screen …` (grows). With no `h-screen` ceiling,
   the page body becomes the scroller and `flex-1`/`min-h-0` never engage. Fix: bound
   the shell to the viewport so the existing scroll region activates.

3. **Settings has no gear icon.** `LeftDock` footer (lines 83–92) is a plain text
   button "Settings" plus a helper paragraph — already at the bottom, but no icon and
   no `aria-label`/`title`. Needs a gear (inline SVG) + accessible label/tooltip.

4. **Top bar has the controls to remove/convert.** `TopBar.tsx`: a Search toggle
   button + popover (lines 54–67), a `+ Block` toggle + `BlockTemplateMenu` popover
   (lines 68–86), text `Undo`/`Redo` buttons (lines 87–100), an `Inspector On/Off`
   toggle (line 101, **keep**), a `Settings` button (line 102, **remove**), and
   `SaveStatusIndicator` (keep).

5. **Canvas add-block only in empty state.** `MainPane.tsx`: the template buttons
   (`BLOCK_TEMPLATES.map`, lines 126–137) render only when `blocks.length === 0`.

6. **Test harness exists (correction).** `@testing-library/react ^16.2.0` and
   `jsdom ^25.0.1` are installed, but suites run under **`node:test`** via
   `scripts/run-tests.mjs` (`npm test` = `tsc -p tsconfig.test.json` then the
   runner), with manual `new JSDOM(...)` setup (see `workspaceCard.test.tsx`). DOM
   component tests are supported — but JSDOM does **not** implement
   `DataTransfer`/`DragEvent` robustly, so a full drag→drop reorder cannot be unit
   tested; and text-input DOM tests proved fragile in dispatch 074.

## Files to Create / Modify

| File | Change |
|------|--------|
| `src/components/workspace/WorkspaceCard.tsx` | **Bug fix.** Change the draggable root from `<button>` to a non-button element — `<div role="button" tabIndex={0}>` — preserving styling, `onClick={onSelect}`, `onContextMenu`, and adding `onKeyDown` (Enter/Space → `onSelect`) for a11y. In `onDragStart`, also set `event.dataTransfer.effectAllowed = "move"` and `event.dataTransfer.setData("text/plain", entry.id)` before `onDragStart()` (spec-correct hardening). Keep `onDrop`/`onDragOver`/`onDragEnd` and the `onDragStart: () => void` prop. |
| `src/components/layout/AppShell.tsx` | Bound the shell to the viewport: root `<main>` `min-h-screen` → `h-screen overflow-hidden`. |
| `src/components/layout/LeftDock.tsx` | `<aside>` `min-h-screen` → `h-full`; add `shrink-0` to the header card, the "+ Workspace" row, and the footer so the existing `min-h-0 flex-1 overflow-y-auto` list is the only scroller. Add a gear inline-SVG + `aria-label="Settings"`/`title="Settings"` to the Settings button. |
| `src/components/layout/MainPane.tsx` | Add `overflow-y-auto` to the `<section>` (line 101) so the canvas scrolls internally now that the shell is viewport-bounded. Render the add-block template buttons after the block list when `blocks.length > 0` (extract the existing button group into a small local helper used by both branches). |
| `src/components/layout/TopBar.tsx` | Remove the `+ Block` toggle+popover (and `createBlockFromTemplate`, `blockMenuOpen`, `blockMenuRef`). Remove the `Settings` button (and the `showSettingsScreen` selector). Replace the Search toggle+popover with an always-visible `<SearchPanel />` inline in the right cluster. Convert Undo/Redo to icon buttons (inline SVG + `aria-label` + `title`), preserving `disabled`/`onClick`. Keep the Inspector toggle and `SaveStatusIndicator`. Simplify/remove the now-unneeded pointerdown effect. |
| `src/components/search/SearchPanel.tsx` | Refactor from `onClose`-driven popover to a self-contained always-visible input + results dropdown. Keep all search logic (`searchDocuments`, grouping, `useSearchNavigation`, flash). Manage the dropdown open state internally (show when query non-empty), with its own click-outside (pointerdown) and Escape-to-clear. Drop the `onClose` prop. |
| `src/tests/unit/workspaceCard.test.tsx` | Update for the root element change (the "renders … without breaking other content" test queries `document.querySelector("button")`; switch to `[role="button"]` or the card text). Where practical, add a `dragstart` test asserting `dataTransfer.setData`/`effectAllowed` are invoked. |
| `src/tests/unit/documentStore.test.ts` *(or a focused new file)* | Add/extend a reorder **persistence round-trip** test (see Test Plan). |

No new runtime dependencies. Do **not** add an icon library (see Architectural
Decisions).

## Implementation Steps

### Step 1 — Fix the reorder bug (`WorkspaceCard.tsx`)
- Change the draggable root element from `<button … type="button">` to:
  ```tsx
  <div
    role="button"
    tabIndex={0}
    aria-pressed={active}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); }
    }}
    /* keep existing className, style, onClick={onSelect}, onContextMenu */
    draggable
    onDragEnd={onDragEnd}
    onDragOver={onDragOver}
    onDragStart={(event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", entry.id);
      onDragStart();
    }}
    onDrop={(event) => { event.preventDefault(); onDrop(); }}
  >
  ```
  Keep all inner markup, the accent stripe div, the alert badge, and the existing
  Tailwind classes. Remove the `type="button"` attribute (not valid on a div). Update
  the `onDragOver` prop type if needed (`DragEvent<HTMLDivElement>`).
- Rationale: removing the native `<button>` from the drag/drop path is the
  highest-probability fix; the `setData`/`effectAllowed` additions are the
  spec-correct way to start a drag and improve cross-engine reliability.
- **Verify (required, runtime):** run the app (Tauri MCP / `verify` or `run` skill)
  and confirm that dragging a workspace onto another reorders the dock and that the
  order **persists after reload**. If reorder still fails with the `<div>` root,
  report the exact behavior back via the channel before further changes.

### Step 2 — Bound the shell to the viewport
- `AppShell.tsx`: root `<main>` `min-h-screen` → `h-screen overflow-hidden`.
- `LeftDock.tsx`: `<aside>` `min-h-screen` → `h-full`; add `shrink-0` to the header
  card (line 28), the add-workspace row (line 36), and the footer (line 83). Leave the
  list container's `min-h-0 flex-1 overflow-y-auto` as-is.
- `MainPane.tsx`: add `overflow-y-auto` to the outer `<section>` (line 101) so canvas
  content scrolls internally rather than clipping.
- **Verify:** with many workspaces, only the dock's workspace list scrolls; the dock
  header/footer (incl. Settings) stay pinned; the canvas scrolls independently; no
  whole-page scrollbar.
- **Fallback** if internal canvas scroll is awkward: instead of bounding `<main>`,
  make only the dock viewport-bounded via `sticky top-0 h-screen` on the `<aside>`
  and leave `AppShell`/`MainPane` untouched. Prefer the bounded-shell approach.

### Step 3 — Settings gear at the bottom (`LeftDock.tsx`)
- Keep the Settings button in the footer; add a small inline-SVG gear icon and an
  accessible label/tooltip: `aria-label="Settings"`, `title="Settings"`. Keep
  `onClick={() => showSettingsScreen()}` and the bottom placement (icon + "Settings"
  label is fine). The helper paragraph may stay or be trimmed.

### Step 4 — Simplify the top bar (`TopBar.tsx`)
- Remove the `+ Block` toggle button and its `BlockTemplateMenu` popover; remove
  `createBlockFromTemplate`, `blockMenuOpen`, and `blockMenuRef`.
- Remove the `Settings` `ToolbarButton`; remove the `showSettingsScreen` selector.
  Keep `inspectorOpen`/`toggleInspector` for the Inspector toggle (still in scope).
- Replace the Search toggle button + popover wrapper with `<SearchPanel />` rendered
  directly in the right cluster (always visible). Remove `searchPanelOpen`,
  `searchPanelRef`, and the `pointerdown` effect (its remaining consumers are gone;
  SearchPanel owns its own outside-click now).
- Convert Undo/Redo to icon buttons: small inline `<svg>` (undo = counter-clockwise
  arrow, redo = clockwise arrow), `aria-hidden` on the svg; button keeps
  `type="button"`, `onClick={() => void undo()}` / `redo`, `disabled={!canUndo}` /
  `disabled={!canRedo}`, existing disabled styling, plus `aria-label`/`title`
  ("Undo"/"Redo"). Either extend `ToolbarButton` to accept `icon`+`title` or add a
  small local `IconButton`.
- Right-cluster order: search input → Undo → Redo → Inspector toggle →
  `SaveStatusIndicator`.

### Step 5 — Always-visible search (`SearchPanel.tsx`)
- Remove the `onClose` prop. Render the `<input>` always (sized for the top bar, e.g.
  `w-56`–`w-72`) inside a `relative` container.
- Render the results dropdown (`absolute` below the input) only when
  `query.trim().length > 0`; when blank, render nothing.
- Preserve search behavior exactly: `searchDocuments({ query, workspaceIndex,
  workspacesById })`, `groupByWorkspace`, `SearchResultItem`, and
  `useSearchNavigation`. On select: `navigateToSearchResult(selected)` then
  `setQuery("")` to collapse the dropdown.
- Outside-click + Escape: add a `containerRef` + a `pointerdown` window listener that
  clears the query (collapsing results) when clicking outside the container; add
  `onKeyDown` so Escape clears the query (and blurs).
- Do not touch `domain/search/*`, `useSearchNavigation`, `uiStore.searchFlashRowId`,
  or `RowView` flash wiring.

### Step 6 — Persistent canvas add-block (`MainPane.tsx`)
- Extract the empty-state template button group (lines 126–137) into a small local
  helper (e.g. `AddBlockTemplateButtons` calling `createBlockFromTemplate`).
- Render it in the empty state (unchanged behavior) AND below the block list in the
  non-empty branch (e.g. a `mt-4`/`mt-6` wrapper after the `space-y-4` list).
- **Verify:** after adding blocks, the "Add …" template buttons remain visible in the
  canvas and still create blocks.

### Step 7 — Tests (see Test Plan).

## Test Plan

- **Required — reorder persistence round-trip** (`documentStore.test.ts`, or a new
  `src/tests/unit/...` file following the same `node:test` + `createMemoryStorageService`
  pattern): create a doc with ≥3 workspaces; call
  `reorderWorkspaces(source, target, { service, autosaveDelayMs: 5 })`; assert the
  in-memory `workspaceIndex` id order is the expected reordered order; wait for the
  autosave; re-`initializeAppData(service)` (or load via the service) and assert the
  persisted order matches. This is the authoritative coverage for "reorder persists
  after reload/storage round-trip." The existing test at `documentStore.test.ts:155`
  only asserts the call returns `true`; strengthen it or add a dedicated test that
  asserts order + persistence.
- **Required — update `workspaceCard.test.tsx` for the root change.** The
  "renders … without breaking other content" test (≈ line 347) queries
  `document.querySelector("button")`; update it to `[role="button"]` (or assert on the
  card text) so it passes with the new `<div role="button">` root.
- **Where practical — `WorkspaceCard` dragstart contract** (`workspaceCard.test.tsx`,
  reuse the JSDOM harness): fire a `dragstart` whose event carries a stub
  `dataTransfer` ({ `setData` spy, settable `effectAllowed` }) and assert
  `setData("text/plain", entry.id)` and `effectAllowed = "move"` were invoked. If
  JSDOM cannot carry a usable `dataTransfer`/`DragEvent`, document that limitation in
  the complete artifact and rely on the store round-trip test + the **required
  runtime verification** in Step 1 (a full drag→drop reorder cannot be unit tested
  here).
- **Do not** attempt a brittle text-input DOM test for the new always-visible
  `SearchPanel` input — dispatch 074 hit JSDOM input-polyfill pollution there; the
  existing `searchDocuments`/`searchNavigation` unit tests still cover the preserved
  search pipeline since the refactor leaves it unchanged.
- Re-run the full suite to catch regressions from the WorkspaceCard prop/root change
  and any TopBar/MainPane structure tests.

## Data / Storage Changes

None. No JSON shape change, no migration. `reorderWorkspaces` already produces a new
document with reordered+reindexed `workspaceIndex` and schedules the debounced
`saveAll`, so the on-disk order updates automatically once a drop completes.

## UI Specifications

- **Shell/dock:** viewport-bounded (`h-screen overflow-hidden` root). Dock header
  (brand card), add-workspace row, and footer are `shrink-0`; only the workspace list
  (`min-h-0 flex-1 overflow-y-auto`) scrolls. Settings is the single bottom entry: a
  gear (inline SVG) + "Settings" label with `aria-label`/`title`.
- **Top bar:** left = current workspace title. Right cluster = always-visible search
  input → Undo icon button → Redo icon button → Inspector toggle → save status. No
  `+ Block`, no Settings here. Undo/Redo are inline-SVG icon buttons with hover
  `title` tooltips and preserved disabled states.
- **Search:** always-visible input. Empty query → no dropdown. Non-empty query →
  dropdown with guidance/no-results/grouped results (unchanged from Search MVP).
  Select → navigate + row flash + clear query. Outside-click and Escape collapse it.
- **Canvas:** empty state shows the template buttons (unchanged); non-empty state
  shows the block list with the template buttons also available below it; the canvas
  scrolls internally.

## Acceptance Criteria

- [ ] The left dock remains fixed-height inside the app viewport and only the
      workspace list scrolls when there are many workspaces.
- [ ] Settings is fixed at the bottom of the left nav with a gear icon and no
      duplicate top-right Settings control remains.
- [ ] The universal top-bar `+ Block` control is removed.
- [ ] Workspace-canvas add-block template buttons remain available after blocks
      already exist.
- [ ] Search is available as an always-visible top-bar input while preserving
      existing Search MVP navigation/highlight behavior.
- [ ] Undo and Redo are icon buttons with hover tooltips, preserve disabled states,
      and invoke the existing actions.
- [ ] Dragging workspaces in the left dock reorders them reliably (**confirmed in the
      running app**, not just unit tests).
- [ ] Reordered workspaces persist after reload/storage round-trip.
- [ ] Reorder persistence has unit coverage (round-trip); `workspaceCard.test.tsx` is
      updated for the root change; the dragstart contract is covered where JSDOM allows.
- [ ] `npm run test`, `npm run lint`, and `npm run build` pass.

## Dependencies / Prerequisites

- None. All work is within existing components, the existing `documentStore`, and the
  existing `node:test` suite. No new packages.

## Architectural Decisions (flag to Main — not yet in TECH_SPEC)

1. **Icon buttons use inline SVG, not an icon library.** No icon dependency exists
   (`lucide-react`/`@heroicons` absent) and the codebase already uses unicode/SVG
   glyphs inline. Undo/Redo and the Settings gear use inline `<svg>` with
   `aria-label`/`title`, avoiding a new dependency.
2. **WorkspaceCard draggable root becomes `<div role="button">`.** A native
   `<button>` is the only material difference from the working block-drag path and is
   an unreliable HTML5 drag/drop target; switching to a `role="button"` div with
   keyboard handling preserves a11y while fixing the handshake. The `setData`/
   `effectAllowed` additions are spec-correct hardening. Because this is a runtime-DOM
   fix that JSDOM cannot fully prove, **runtime verification is a required acceptance
   gate** for the reorder criterion.
3. **Reorder index parity is a flagged note, not a required change.**
   `reorderWorkspaces` inserts at the raw `targetIndex` while `reorderBlocks` adjusts
   (`sourceIndex < targetIndex ? targetIndex - 1 : targetIndex`). This is a minor
   drop-position nuance, not the reported bug. Dev/Review may optionally align them,
   but only if it does not break the existing reorder test's expected order.

## Verification Commands (Dev and Review must run)

- `npm run test` — `tsc -p tsconfig.test.json` then `scripts/run-tests.mjs`
  (`node:test`), including the new reorder round-trip test.
- `npm run lint` — `eslint . --ext .ts,.tsx,.js,.cjs --max-warnings=0`. (Note from
  074: a parallel Playwright run can race on a missing `test-results/` dir — if that
  surfaces, `mkdir -p test-results` and rerun; it is environment noise.)
- `npm run build` — `vite build`. (`test:build` already type-checks the test project;
  `npm run typecheck` is available too.)
- `npm run test:e2e` — `playwright test`, **when Playwright browsers are available**;
  otherwise record it as skipped/unavailable in the complete artifact.
- **Runtime reorder check (required for the drag fix):** launch the app and confirm a
  workspace drag reorders and persists across reload.

Report each command with the actual shell used (Mac = zsh, Windows = PowerShell),
pass/fail, and the exact failure surface if any.
