# Plan: Alert Navigation and Highlight

## Overview

Build alert navigation and highlight behavior so that clicking a workspace with active alerts automatically navigates to the alert target row, scrolls it into view, and applies a brief visual flash. This is the final piece of the alerts epic (053→054→055→056): evaluation, scheduling, dock indicators, and now actionable navigation.

The implementation centers on a new `useAlertNavigation` hook that watches `activeWorkspaceId` changes, validates the alert target, sets UI selection, scrolls DOM elements into view, and triggers a transient flash animation on the target row. A module-level `Set` provides session deduplication so the same unresolved alert is not re-flashed on repeated workspace selections.

## Prerequisites

- TICKET-053 domain evaluation (`evaluateRow`, `evaluateWorkspace`) — merged
- TICKET-054 `useAlertScheduler` hook populates `alertSummary` on workspace index entries — merged
- TICKET-055 `AlertBadge` in `WorkspaceCard` renders dock indicator — merged
- `WorkspaceAlertSummary` type has `blockId?`, `rowId?`, `columnId?` fields — confirmed in `src/types/workspace.ts`
- `uiStore` has `selectRow`, `selectCell`, `clearSelection` — confirmed
- `documentStore` has `updateWorkspaceAlertSummary` — confirmed
- DOM elements carry `data-testid` attributes: `block-card-${blockId}` on BlockCard, `row-${rowId}` on row divs

## Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Create | `src/hooks/useAlertNavigation.ts` | Main coordination hook: watch workspace changes, validate target, select, scroll, flash |
| Modify | `src/stores/uiStore.ts` | Add `alertFlashRowId` transient state + setter/clearer |
| Modify | `src/components/row/RowView.tsx` | Apply flash animation class when row matches `alertFlashRowId` |
| Modify | `tailwind.config.ts` | Add `alertFlash` keyframes + animation |
| Modify | `src/styles/globals.css` | Add `--color-warning` CSS variable (if missing) |
| Modify | `src/components/layout/AppShell.tsx` | Mount `useAlertNavigation()` |
| Create | `src/tests/unit/alertNavigation.test.ts` | Unit tests for navigation, scroll, flash, dedup, edge cases |

## Implementation Steps

### Step 1: Add `warning` color to theme (if missing)

The `AlertBadge` (TICKET-055) uses `text-warning`, `bg-warning/20`, etc., but `warning` is not currently in the Tailwind config's `colors` object. Verify whether this color resolves. If not, add it:

- **File**: `src/styles/globals.css` — add `--color-warning: #fbbf24;` to `:root`
- **File**: `tailwind.config.ts` — add `warning: "var(--color-warning)"` to `theme.extend.colors`
- **Verify**: AlertBadge in LeftDock renders with visible amber/yellow styling

### Step 2: Add flash keyframe animation to Tailwind config

- **File**: `tailwind.config.ts`
- Add to `theme.extend`:
  ```ts
  keyframes: {
    alertFlash: {
      '0%': { boxShadow: '0 0 0 0 rgba(251, 191, 36, 0)' },
      '15%': { boxShadow: '0 0 0 3px rgba(251, 191, 36, 0.4)' },
      '50%': { boxShadow: '0 0 0 3px rgba(251, 191, 36, 0.25)' },
      '100%': { boxShadow: '0 0 0 0 rgba(251, 191, 36, 0)' },
    },
  },
  animation: {
    alertFlash: 'alertFlash 2.5s ease-out forwards',
  },
  ```
- The animation uses a `box-shadow` pulse rather than `ring-*` utilities so it doesn't conflict with existing ring styles on selected/drop-target rows. The 2.5s duration stays within the 2–3 second spec window.
- **Verify**: Manually adding `animate-alertFlash` to a row element in dev tools shows a visible amber ring pulse

### Step 3: Add `alertFlashRowId` to uiStore

- **File**: `src/stores/uiStore.ts`
- Add to `UiStoreState` interface:
  ```ts
  alertFlashRowId: RowId | null;
  setAlertFlashRowId: (rowId: RowId | null) => void;
  ```
- Add to store implementation:
  ```ts
  alertFlashRowId: null,
  setAlertFlashRowId: (rowId) => set({ alertFlashRowId: rowId }),
  ```
- This is transient UI state — not persisted, not part of undo history. The hook sets it, the RowView reads it, and the hook clears it after the animation completes.
- **Verify**: In a test, call `setAlertFlashRowId("row-1")`, confirm state is `"row-1"`, call with `null`, confirm cleared.

### Step 4: Apply flash animation in RowView

- **File**: `src/components/row/RowView.tsx`
- Subscribe to `alertFlashRowId` from uiStore:
  ```ts
  const alertFlashRowId = useUiStore((state) => state.alertFlashRowId);
  ```
- On the row's outer `<div>`, add the animation class conditionally:
  ```tsx
  className={`... ${alertFlashRowId === row.id ? "animate-alertFlash" : ""}`}
  ```
- No `onAnimationEnd` handler needed — the hook manages the timeout for clearing `alertFlashRowId`. The `forwards` fill mode ensures the animation ends cleanly at `boxShadow: none`.
- **Verify**: Setting `alertFlashRowId` to a valid row ID causes that row to pulse with the amber ring animation

### Step 5: Create `useAlertNavigation` hook

- **File**: `src/hooks/useAlertNavigation.ts`

**Module-level state:**
```ts
const flashedAlertKeys = new Set<string>();
```
Key format: `"${workspaceId}:${blockId}:${rowId}"` — tracks which alert targets have already been flashed during this app session.

**Export a `resetFlashedAlerts()` function** for testing purposes (clears the Set).

**Hook body:**
```ts
export function useAlertNavigation(): void {
  const activeWorkspaceId = useDocumentStore((state) => state.activeWorkspaceId);

  useEffect(() => {
    if (!activeWorkspaceId) return;

    const state = useDocumentStore.getState();
    const entry = state.workspaceIndex.find((e) => e.id === activeWorkspaceId);
    if (!entry?.alertSummary) return;

    const { blockId, rowId, columnId } = entry.alertSummary;
    if (!blockId || !rowId) return;  // count-only summary — open normally

    // Deduplication check
    const key = `${activeWorkspaceId}:${blockId}:${rowId}`;
    if (flashedAlertKeys.has(key)) return;

    // Validate target exists
    const workspace = state.workspacesById[activeWorkspaceId];
    if (!workspace) return;

    const block = workspace.blocks.find((b) => b.id === blockId);
    if (!block) {
      // Target block no longer exists — clear alert summary
      state.updateWorkspaceAlertSummary(activeWorkspaceId, null);
      return;
    }

    const row = block.rows.find((r) => r.id === rowId);
    if (!row) {
      // Target row no longer exists — clear alert summary
      state.updateWorkspaceAlertSummary(activeWorkspaceId, null);
      return;
    }

    // Set UI selection to the target row (or cell if columnId exists)
    if (columnId) {
      useUiStore.getState().selectCell(activeWorkspaceId, blockId, rowId, columnId);
    } else {
      useUiStore.getState().selectRow(activeWorkspaceId, blockId, rowId);
    }

    // Mark as flashed (before async operations)
    flashedAlertKeys.add(key);

    // Wait one frame for React to render, then scroll and flash
    requestAnimationFrame(() => {
      const blockEl = document.querySelector(`[data-testid="block-card-${blockId}"]`);
      if (blockEl) {
        blockEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      // Slight delay to let block scroll settle, then scroll to row
      setTimeout(() => {
        const rowEl = document.querySelector(`[data-testid="row-${rowId}"]`);
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }

        // Trigger flash animation
        useUiStore.getState().setAlertFlashRowId(rowId);

        // Clear flash after animation completes
        setTimeout(() => {
          useUiStore.getState().setAlertFlashRowId(null);
        }, 2600); // slightly longer than the 2.5s animation
      }, 300);
    });
  }, [activeWorkspaceId]);
}
```

**Key design decisions:**
- **`requestAnimationFrame`** ensures the DOM has updated after the workspace change before we query for elements
- **Two-phase scroll**: first scroll the block into view (coarse positioning), then after a brief delay scroll the row into view (fine positioning within the block's content area). The 300ms delay lets the smooth scroll settle.
- **`behavior: "smooth"`** per the dispatch constraint
- **Dedup before async ops**: Add the key to `flashedAlertKeys` synchronously to prevent race conditions if the effect fires twice quickly
- **Clear flash via timeout**: 2600ms (slightly longer than the 2.5s CSS animation) ensures the class is removed after the animation completes
- **Missing target clears alert**: If the block or row was deleted since the alert was evaluated, silently clear the summary so the badge disappears

**Verify**: Select a workspace with alerts → target row is selected, scrolled into view, and flashes. Select the same workspace again → no re-flash.

### Step 6: Mount in AppShell

- **File**: `src/components/layout/AppShell.tsx`
- Add import: `import { useAlertNavigation } from "../../hooks/useAlertNavigation.js";`
- Call `useAlertNavigation();` alongside existing `useHotkeys()` and `useAlertScheduler()` calls
- **Verify**: App starts without errors

### Step 7: Write unit tests

- **File**: `src/tests/unit/alertNavigation.test.ts`
- Use the same test runner/framework pattern as `alertScheduler.test.ts` (Vitest)

**Test cases:**

1. **Navigation to alert target — sets row selection**: Set up store with workspace containing alertSummary with `blockId`/`rowId`. Simulate `activeWorkspaceId` change. Assert `uiStore.selection` is `{ kind: "row", ... }`.

2. **Navigation to alert target — sets cell selection when columnId present**: Same setup but alertSummary includes `columnId`. Assert selection is `{ kind: "cell", ... }`.

3. **Scroll into view — block element**: Mock `document.querySelector` and `scrollIntoView`. Verify `scrollIntoView` is called on the block element with `{ behavior: "smooth", block: "start" }`.

4. **Scroll into view — row element**: Same, verify `scrollIntoView` called on row element with `{ behavior: "smooth", block: "nearest" }`.

5. **Flash application**: Verify `setAlertFlashRowId` is called with the target `rowId`.

6. **Flash removal after timeout**: Advance timers past 2600ms. Verify `setAlertFlashRowId(null)` is called.

7. **Session deduplication — no re-flash**: Navigate to workspace with alerts (triggers flash). Navigate away. Navigate back to same workspace. Assert flash does NOT trigger again.

8. **Missing block clears summary**: Set up workspace with alertSummary pointing to a non-existent `blockId`. Trigger navigation. Assert `updateWorkspaceAlertSummary` is called with `null`.

9. **Missing row clears summary**: Block exists but `rowId` does not. Assert summary cleared.

10. **Count-only summary (no blockId/rowId) — no navigation**: Set up alertSummary with `count > 0` but no `blockId`/`rowId`. Assert no selection change, no scroll, no flash.

11. **No alertSummary — no navigation**: Workspace has `alertSummary: null`. Assert no action.

12. **Flash class in RowView**: Render RowView with `alertFlashRowId` matching a row. Assert the row element has class `animate-alertFlash`.

13. **No flash class when not matching**: Render RowView with `alertFlashRowId` set to a different row ID. Assert the matching row does NOT have the class.

- **Verify**: `npm run test` passes with all new tests green

## Data / Storage Changes

None. All new state (`alertFlashRowId`, `flashedAlertKeys`) is transient — it exists only in memory for the current session and is not persisted.

## UI Specifications

### Visual flash
- A 2.5-second amber `box-shadow` pulse on the target row
- Matches the `warning` color family used by the AlertBadge
- Uses CSS `@keyframes` + Tailwind `animate-*` utility — no JS animation libraries

### Scroll behavior
- Smooth scroll (`behavior: "smooth"`)
- Two-phase: block scrolled to top of MainPane, then row scrolled to nearest visible position within the block

### Selection
- Row is selected (highlighted with existing `bg-accent/5` selection style) in addition to the flash
- If the alert summary includes `columnId`, the cell is selected instead

### Component hierarchy (unchanged)
```
AppShell
├── LeftDock → WorkspaceCard (click → selectWorkspace)
├── MainPane
│   └── BlockCard
│       └── RowView (reads alertFlashRowId, applies animate-alertFlash)
└── useAlertNavigation() [new hook]
```

## Acceptance Criteria

- [ ] When a workspace with alerts is selected, the UI selection is set to the alert target row (and optionally column)
- [ ] The target block/row is scrolled into the visible viewport
- [ ] The target row receives a temporary visual flash/highlight that fades after 2–3 seconds
- [ ] The same unresolved alert target is not re-flashed during the same app session
- [ ] If the alert target no longer exists, the alert summary is cleared and no error occurs
- [ ] If the alert summary has no `blockId`/`rowId`, the workspace opens normally without scroll/flash
- [ ] Tests cover: navigation to target, scroll behavior, flash application/removal, deduplication, missing target
- [ ] `npm run test` passes (including new tests)
- [ ] `npm run lint` passes

## Estimated Complexity

- **Medium**
- 7 files (2 new, 5 modifications)
- Core complexity is in the `useAlertNavigation` hook's timing coordination (rAF + timeouts for scroll/flash sequencing)
