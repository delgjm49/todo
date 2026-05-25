# Plan: Plain Text Clipboard for Text Cells

## Overview

TextCell renders a standard `<input type="text">` with a draft/commit pattern. Native browser behavior already provides working Ctrl+C, Ctrl+X, Ctrl+V, and Ctrl+A — the `onKeyDown` handler only intercepts Enter and Escape, and the `onChange` handler correctly captures paste results into the draft. No external clipboard interception exists (the row clipboard system is context-menu-driven through `uiStore` and does not touch text input events; the global hotkey layer is TICKET-052 and does not exist yet). This plan adds a small defensive guard to make non-interception explicit, and focused tests to lock down the behavior.

## Prerequisites

- None. TextCell and its commit path (`onCommit` / `documentStore.updateTextCellValue`) are already implemented.

## Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Modify | `src/components/cell/TextCell.tsx` | Add explicit early return for clipboard/select-all shortcuts in `onKeyDown` |
| Create | `src/tests/unit/textCellClipboard.test.tsx` | Focused clipboard behavior tests for TextCell |

## Implementation Steps

### Step 1: Add defensive guard in TextCell.onKeyDown

In `src/components/cell/TextCell.tsx`, add an early return at the **top** of `onKeyDown` (before the Enter/Escape checks) that lets clipboard and select-all shortcuts pass through to the browser without interference:

```ts
const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
  const mod = event.ctrlKey || event.metaKey;
  if (mod && (event.key === "c" || event.key === "x" || event.key === "v" || event.key === "a")) {
    return; // let native clipboard/select-all behavior through
  }

  if (event.key === "Enter") {
    // ... existing
  }
  // ... existing
};
```

This is a no-op today (the existing handler already falls through for these keys), but it makes the intent explicit and prevents regressions if more cases are added to `onKeyDown` in the future.

- **File**: `src/components/cell/TextCell.tsx`
- **Verify**: `npm run typecheck` passes; manual inspection confirms the guard is first in the handler.

### Step 2: Create textCellClipboard.test.tsx

Create `src/tests/unit/textCellClipboard.test.tsx` using the JSDOM + `node:test` + `react-dom/client` + `@testing-library/react` pattern from `rowEditing.test.tsx`. Render TextCell directly (not MainPane) for isolation and reliability.

#### Test cases:

1. **Ctrl+C/X/V/A keyboard events are not default-prevented**
   - Dispatch KeyboardEvent with ctrlKey=true for each shortcut key
   - Assert `event.defaultPrevented === false`

2. **Paste event followed by input change updates draft**
   - Fire `paste` event on the input
   - Fire `change` event with the pasted text value
   - Assert the input's value reflects the new draft

3. **Draft after paste commits on Enter**
   - Paste + change to set draft to new text
   - Fire Enter keydown
   - Assert `onCommit` was called with the pasted text

4. **Draft after paste commits on blur**
   - Paste + change to set draft to new text
   - Fire blur event
   - Assert `onCommit` was called with the pasted text

5. **Copy event does not modify draft**
   - Set input to a known value
   - Fire `copy` event
   - Assert input value is unchanged and `onCommit` was not called

6. **Cut event + resulting change updates draft**
   - Set input with known text
   - Fire `cut` event then `change` event with the post-cut value (empty or partial)
   - Fire Enter to commit
   - Assert `onCommit` was called with the post-cut value

7. **Clipboard events do not affect uiStore row clipboard state**
   - Import `useUiStore`, capture `clipboardPayload` before clipboard events
   - Fire paste/copy/cut events on the text cell input
   - Assert `useUiStore.getState().clipboardPayload` is unchanged (still null)

8. **Escape after paste reverts to original committed value**
   - Paste + change to set draft
   - Fire Escape keydown
   - Assert the input value reverts to the original `value` prop, not the pasted text

#### Test infrastructure notes:

- Use the JSDOM setup pattern from `rowEditing.test.tsx` (create JSDOM, install globals, createRoot, act-wrapped render)
- Render `<TextCell value={...} onCommit={onCommitSpy} />` directly
- Use `fireEvent` from `@testing-library/react` for paste/copy/cut/change/blur events
- Use native `KeyboardEvent` constructor for keyboard shortcut tests (to check `defaultPrevented`)
- Track `onCommit` calls with a simple spy function (array push)
- Import `useUiStore` from stores for the isolation assertion

- **File**: `src/tests/unit/textCellClipboard.test.tsx`
- **Verify**: `npm run test` passes with all new tests green.

### Step 3: Run all verification commands

Run and confirm all pass:
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run lint`

## Data / Storage Changes

None. No persistence or schema changes.

## UI Specifications

None. No visual changes — this ticket hardens existing behavior and adds test coverage.

## Acceptance Criteria

- [ ] Focused text cells support normal desktop copy/cut/paste of plain text (native behavior preserved by defensive guard)
- [ ] Pasted text appears in the controlled input draft and commits through the existing text-cell mutation path on Enter or blur
- [ ] Copy/cut/paste in text cells does not trigger or corrupt row clipboard state (`uiStore.clipboardPayload` unchanged)
- [ ] Existing row clipboard behavior remains intact (no changes to row clipboard code)
- [ ] No persistence/schema changes introduced
- [ ] Targeted tests cover text-cell clipboard behavior and pass reliably
- [ ] `npm run typecheck`, `npm run test`, `npm run build`, and `npm run lint` pass

## Estimated Complexity

- Small
- 2 files (1 modified, 1 created)
