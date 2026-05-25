# Complete: Hotkey Layer

## Summary

Implemented a centralized `useHotkeys` hook that registers a single `keydown` listener on `document` to dispatch standard desktop shortcuts (undo/redo, clipboard, select-all, delete, escape, enter) to existing store actions. The hook uses focus-based context routing: when an editable element (`input` / `textarea` / `contenteditable`) has focus, most shortcuts are suppressed so that cell-level `onKeyDown` handlers or native browser behavior take precedence. The hook is mounted once in `AppShell` and requires no React context or provider.

## Files Changed

| Action | Path | Notes |
|--------|------|-------|
| Created | `src/hooks/useHotkeys.ts` | Centralized hotkey hook — all shortcut routing logic |
| Modified | `src/components/layout/AppShell.tsx` | Mount `useHotkeys()` call at top of component |
| Created | `src/tests/unit/useHotkeys.test.tsx` | 20 unit tests covering all shortcut families |

## Deviations from Plan

- **Test file named `.tsx` instead of `.ts`**: The plan specified `src/tests/unit/useHotkeys.test.ts`, but the file uses JSX (to render the `<HotkeysHarness />` test component). TypeScript's compiler requires `.tsx` extension when JSX is present. The test runner handles `.tsx` files correctly per the existing `textCellClipboard.test.tsx` precedent.
- **No `vi.spyOn` usage**: The plan suggested using `vi.spyOn` on store methods, but the project uses Node.js `node:test` (not Vitest) for unit tests. Direct store method replacement (swap, assert, restore) was used instead, following the same pattern as `rowClipboardActions.test.ts`.
- **Ctrl+A deferred per plan**: The dispatch listed `Ctrl+A → select all rows`, but the plan correctly identified that multi-row selection does not exist yet. The hook prevents browser select-all in block context (`event.preventDefault()`) but does not implement row multi-select. This matches the plan's scope reduction.

## Open Questions

(None)

## Verification

- **command**: `npx tsc -p tsconfig.test.json --noEmit`
  - **shell used**: zsh (actual environment shell)
  - **result**: Passed — zero errors
  - **failure surface**: N/A
  - **checkpoint-scoped or unrelated repo-state**: Scoped to new and modified files
  - **was this the actual shell provided by the environment**: Yes

- **command**: `npm run test`
  - **shell used**: zsh (actual environment shell)
  - **result**: Passed — 237 tests across 31 suites, 0 failures
  - **failure surface**: N/A
  - **checkpoint-scoped or unrelated repo-state**: All 20 new `useHotkeys` tests passed; pre-existing act() warnings in `TypeSpecificColumnSettings` tests are unrelated
  - **was this the actual shell provided by the environment**: Yes

- **command**: `npm run lint`
  - **shell used**: zsh (actual environment shell)
  - **result**: Passed — zero warnings (max-warnings=0)
  - **failure surface**: N/A
  - **checkpoint-scoped or unrelated repo-state**: Includes new files
  - **was this the actual shell provided by the environment**: Yes

## Known Issues

- **Delete clears selection after deletion**: The `Delete` shortcut calls `clearSelection()` immediately after `deleteRowFromBlock`. This matches the plan but note that if the row was in a multi-row block and other rows remain, the user's selection is lost. This is consistent with the single-row selection model — a future multi-select ticket may need to refine this behavior.
- **Ctrl+V paste when clipboard is empty**: The shortcut calls `pasteRows()` regardless of whether clipboard data exists. The store action itself returns `false` and makes no changes if clipboard is empty, so this is safe but includes a no-op event dispatch. No user-visible issue.
