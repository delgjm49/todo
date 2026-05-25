# Plan: Autosave Debounce and Dirty-State UX

## Overview

Add a polished save status indicator to the top bar and verify that every document mutation path correctly marks dirty and schedules autosave. The store layer already handles all the plumbing (`saveAll`, `scheduleAutosave`, `dirty`, `saveStatus`, `retrySave`); this ticket surfaces that state to the user and confirms the pipeline is coherent. The existing `<span>` in `TopBar.tsx` (lines 77-83) will be replaced with a dedicated `SaveStatusIndicator` component.

## Prerequisites

- None. All store infrastructure is in place.

## Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Create | `src/components/layout/SaveStatusIndicator.tsx` | Save status indicator component |
| Modify | `src/components/layout/TopBar.tsx` | Replace inline `<span>` with `SaveStatusIndicator` |
| Create | `src/tests/unit/saveStatusIndicator.test.tsx` | Indicator rendering tests for all states + retry interaction |
| Create | `src/tests/unit/dirtyStateCoherence.test.ts` | Dirty flag / autosave coherence tests across mutation paths |

## Implementation Steps

### Step 1: Create `SaveStatusIndicator` component

**File:** `src/components/layout/SaveStatusIndicator.tsx`

Create a component that subscribes to `saveStatus`, `dirty`, and `retrySave` from `useDocumentStore` and renders the appropriate indicator.

Display logic (evaluated top-to-bottom, first match wins):

| Condition | Label | Style |
|-----------|-------|-------|
| `saveStatus === "saving"` | `Saving…` | `text-textMuted animate-pulse` — no border/pill, just subtle pulsing text |
| `saveStatus === "error"` | `Save failed · Retry` | `text-danger` — render as `<button>` with `hover:underline focus-visible:underline focus-visible:outline-none`, calls `retrySave()` on click |
| `saveStatus === "partial"` | `Partially saved · Retry` | `text-warning` — same `<button>` pattern as error |
| `dirty === true` (saveStatus is `"idle"`) | `Unsaved changes` | `text-textMuted` — plain text, no emphasis |
| `saveStatus === "saved"` or `"idle"` with `!dirty` | `Saved` | `text-textMuted/60` — dimmed to stay out of the way |
| `saveStatus === "loading"` | (render nothing / empty fragment) | Not shown during hydration |

Implementation details:
- The component is a pure presentational component that reads from the store.
- Error/partial states render a `<button type="button">` for keyboard accessibility (focusable, Enter/Space activates).
- Use `text-xs font-medium` for all states to match existing top bar text sizing.
- No pill/border styling — just text to keep it subtle and lightweight, replacing the current pill `<span>`.
- The `retrySave` call is async; wrap in `void retrySave()` (fire-and-forget, the store manages status transitions).

### Step 2: Integrate `SaveStatusIndicator` into `TopBar`

**File:** `src/components/layout/TopBar.tsx`

1. Remove the `saveStatus` and `dirty` selector imports from the TopBar component (lines 12-13 — these are now internal to `SaveStatusIndicator`).
2. Remove the inline `<span>` indicator (lines 77-83).
3. Import and render `<SaveStatusIndicator />` in its place, inside the existing `<div className="flex items-center gap-2">` toolbar group.

The result is a cleaner TopBar that delegates save feedback to the new component.

- **Verify:** The TopBar should render the `SaveStatusIndicator` in the same position as the old `<span>`. Visual appearance changes from a bordered pill to plain text.

### Step 3: Dirty/save coherence audit (no code changes expected)

**Audit methodology:** Trace every public method on `DocumentStoreState` that mutates document data and verify it either (a) calls `commitSnapshot()` or (b) manually calls `markDirty(true)` / `setDirtyState()` + `scheduleAutosave()`.

**Audit findings (verified by reading documentStore.ts):**

All 30+ mutation methods that modify user-authored document state go through `commitSnapshot()`, which sets `dirty: true` via `setCommittedSnapshot()` and calls `scheduleAutosave()`. These include: workspace CRUD (`createWorkspace`, `renameWorkspace`, `deleteWorkspace`, `updateWorkspaceStyle`, `reorderWorkspaces`), block CRUD (`createBlockFromTemplate`, `updateBlockTitle`, `toggleBlockCollapsed`, `reorderBlocks`, `moveBlockToWorkspace`, `deleteBlock`), row CRUD (`appendRowToBlock`, `insertRowInBlock`, `deleteRowFromBlock`, `reorderRows`, `sortBlockRows`), cell edits (`updateTextCellValue`, `toggleCheckboxCellValue`, `updateDateCellValue`, `updateTimeCellValue`, `updateDropdownCellValue`), column CRUD (`renameColumn`, `moveColumnLeft`, `moveColumnRight`, `addColumnLeft`, `addColumnRight`, `deleteColumn`, `changeColumnType`, `updateColumnSettings`), formatting (`updateSelectedTextFormatting`, `updateSelectedBorderFormatting`), clipboard (`cutRows`, `pasteRows`).

Additional paths with manual dirty/autosave handling:
- `updateSettings()` — calls `markDirty(true)` + `scheduleAutosave()` directly (correct, bypasses history since settings changes aren't undoable per current design)
- `updateDocumentTransaction()` — calls `setDirtyState(set)` which sets `dirty: true` (correct, called during live transactions like typing)
- `commitDocumentTransaction()` — calls `setCommittedSnapshot(…, true)` + `scheduleAutosave()` (correct)

Correctly excluded from dirty marking:
- `selectWorkspace()` / `setActiveWorkspaceId()` — UI-only selection change, not a data mutation
- `copyRows()` — writes to `uiStore` clipboard, no document state change
- `updateWorkspaceAlertSummary()` — derived state, calls `scheduleAutosave()` (persists alert summaries) but doesn't mark dirty (correct — alert summaries are recomputed on load, not user-authored data)

**Undo/redo save interaction (verified):**
- Both `undo()` and `redo()` call `setCommittedSnapshot(set, nextSnapshot, true)` which sets `dirty: true`, and then call `scheduleAutosave()`. This correctly handles the case where a user undoes a change that was already saved — the undone state differs from what's on disk, so dirty is correct, and autosave re-persists.
- The `true` second arg to `setCommittedSnapshot` is the `dirty` parameter, so dirty is always true after undo/redo regardless of prior state.

**Conclusion:** No code changes required. All mutation paths are coherent. Document this finding in the complete artifact.

### Step 4: Write tests

#### 4a. `src/tests/unit/saveStatusIndicator.test.tsx`

Test the `SaveStatusIndicator` component renders correctly for each state. Use the same JSDOM test pattern as existing tests (e.g., `src/tests/unit/themeModeSwitching.test.tsx`).

Test cases:
1. **Renders "Saved" when `saveStatus=saved` and `dirty=false`** — assert text content is "Saved", no button element present.
2. **Renders "Saving…" when `saveStatus=saving`** — assert text content includes "Saving", element has the `animate-pulse` class.
3. **Renders "Unsaved changes" when `dirty=true` and `saveStatus=idle`** — assert text content is "Unsaved changes".
4. **Renders "Save failed · Retry" when `saveStatus=error`** — assert text content includes "Save failed" and "Retry", element is a `<button>`.
5. **Renders "Partially saved · Retry" when `saveStatus=partial`** — assert text content includes "Partially saved" and "Retry", element is a `<button>`.
6. **Retry button calls `retrySave` on click** — set `saveStatus=error`, simulate click on the retry button, assert `retrySave` was called.
7. **Renders nothing when `saveStatus=loading`** — assert the component renders null/empty.

Use `useDocumentStore.setState()` to set up each test's initial state. Render via `@testing-library/react` or the project's existing test DOM rendering pattern — follow whichever pattern `themeModeSwitching.test.tsx` uses.

#### 4b. `src/tests/unit/dirtyStateCoherence.test.ts`

Test that mutation methods correctly set `dirty=true` and that autosave fires. Use the same test pattern as `documentStore.test.ts`.

Test cases:
1. **Cell edit sets dirty and triggers autosave** — init store, edit a text cell value, assert `dirty === true`, wait for autosave timer, assert `saveStatus === "saved"`.
2. **Undo sets dirty and triggers autosave** — init store, make a change, wait for save (saved), undo, assert `dirty === true`, wait for autosave, assert `saveStatus === "saved"`.
3. **Redo sets dirty and triggers autosave** — same as undo but redo after undoing.
4. **updateSettings sets dirty and triggers autosave** — init store, call `updateSettings`, assert `dirty === true`, wait, assert saved.
5. **selectWorkspace does NOT set dirty** — init store with saved state, call `selectWorkspace`, assert `dirty === false`.

Use `createMemoryStorageService()` and short `autosaveDelayMs` (5ms) with `wait()` helper, same pattern as existing `documentStore.test.ts`.

### Step 5: Verify

- Run `npm run test` — all tests pass including new ones.
- Run `npm run lint` — no lint errors.

## Data / Storage Changes

None. No changes to JSON schema, storage format, or persistence logic.

## UI Specifications

**Component hierarchy:**
```
TopBar
  └─ SaveStatusIndicator (replaces existing <span>)
```

**Visual states:**
- **Saved**: Dim muted text (`text-textMuted/60`), reads "Saved". Blends into background.
- **Saving**: Muted text with Tailwind `animate-pulse`, reads "Saving…". Subtle attention without distraction.
- **Unsaved changes**: Normal muted text (`text-textMuted`), reads "Unsaved changes". Slightly more visible than Saved.
- **Save failed**: Danger-colored text (`text-danger`), reads "Save failed · Retry". Rendered as a `<button>` for keyboard access. Underline on hover/focus.
- **Partially saved**: Warning-colored text (`text-warning`), reads "Partially saved · Retry". Same `<button>` pattern as error.
- **Loading**: Nothing rendered (hydration is brief and transient).

**Positioning:** Same location as current indicator — rightmost item in the top bar's toolbar `flex` group.

**Accessibility:** Error/partial retry is a `<button>` element with visible focus style (`focus-visible:underline`). All text is readable at `text-xs` size.

## Acceptance Criteria

- [ ] Top bar shows a save status indicator reflecting `saveStatus` + `dirty` state
- [ ] Indicator states: Saved (dim), Saving (subtle pulse), Unsaved changes, Save failed (with retry), Partially saved (with retry)
- [ ] Retry affordance calls `retrySave()` when clicked or activated via keyboard
- [ ] All document mutation paths correctly mark dirty and schedule autosave (audit documented, no code fix needed)
- [ ] Undo/redo set dirty=true and re-schedule autosave (verified, no code fix needed)
- [ ] Tests cover: indicator rendering per state, retry interaction, dirty transitions on mutation, dirty transitions on undo/redo, non-mutation paths don't set dirty
- [ ] `npm run test` passes (including new tests)
- [ ] `npm run lint` passes

## Estimated Complexity

- **Small**
- 4 files touched (2 created, 2 modified)
