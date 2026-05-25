# Review: Hotkey Layer

## Summary

Reviewed the centralized `useHotkeys` hook implementation against the plan and dispatch. The implementation is correct, complete, and follows project conventions. All verification commands pass.

## Plan Compliance

- [x] All steps in the plan were addressed
- [x] All acceptance criteria are met
- [x] No scope creep (extra features not in the plan)
- [x] Deviations are documented and reasonable

### Acceptance Criteria Status

| Criterion | Status | Notes |
|-----------|--------|-------|
| `useHotkeys` hook exists and exported | PASS | `src/hooks/useHotkeys.ts` |
| Hook mounted in `AppShell` | PASS | Line 9 of `AppShell.tsx` |
| Ctrl+Z triggers undo (not editing) | PASS | Tested |
| Ctrl+Y / Ctrl+Shift+Z triggers redo | PASS | Tested |
| Ctrl+C/X/V trigger clipboard actions (row selected, not editing) | PASS | Tested |
| Ctrl+A prevents browser select-all in block context | PASS | Tested |
| Delete removes selected row (not editing) | PASS | Tested |
| Escape closes menus → inspector → clears selection | PASS | Priority-order tested |
| All shortcuts suppressed when editing | PASS | Tested |
| Existing cell editing unchanged | PASS | Hook uses `event.defaultPrevented` guard and focus detection |
| Unit tests cover all shortcut families | PASS | 20 tests |
| `npm run test` passes | PASS | 237/237 |
| `npm run lint` passes | PASS | Zero warnings |

### Deviations Reviewed

1. **Test file `.tsx` instead of `.ts`**: Correct — file contains JSX (`<HotkeysHarness />`). Precedent exists with `textCellClipboard.test.tsx`.
2. **No `vi.spyOn`**: Correct — project uses Node.js `node:test`, not Vitest's runner. Store method replacement pattern matches existing tests.
3. **Ctrl+A deferred**: Correct — multi-row selection does not exist. `preventDefault()` only is the right scope reduction.

## Code Correctness

- [x] TypeScript compiles without errors
- [x] No logic errors
- [x] Event listener lifecycle is correct (add on mount, remove on cleanup)
- [x] Focus detection is sound: checks `input`, `textarea`, and `isContentEditable`
- [x] Modifier detection correctly uses `ctrlKey && !altKey && !metaKey` (Windows-first)
- [x] `event.defaultPrevented` guard prevents double-handling with cell-level handlers
- [x] Escape priority chain (menus → inspector → selection) is correctly ordered
- [x] Store access via `.getState()` (not subscriptions) is correct for event-driven usage

## Completeness

- [x] All planned shortcuts implemented
- [x] Focus-based suppression works
- [x] Hook cleanup on unmount verified by test
- [x] No missing edge cases within dispatch scope

## Quality

- [x] File naming follows conventions (`useHotkeys.ts` — camelCase hook)
- [x] Imports organized
- [x] No leftover debug code or console.logs
- [x] Clean conditional structure in the handler
- [x] Test file is well-organized with clear section headers and helper functions

## Data Integrity

N/A — no new storage or JSON read/write paths. The hook only calls existing store actions.

## Test Risk

- Tests use JSDOM + React 18 `createRoot` + `act()` for realistic mounting
- Focus/blur behavior is tested via `focusInput` helper
- All 20 tests pass locally (confirmed by running `npm run test`)
- No `attachEvent`/`detachEvent` warnings
- Pre-existing `act()` warnings in `TypeSpecificColumnSettings` are unrelated to this dispatch

## Verification

- **command**: `npm run test`
  - **shell used**: zsh (actual environment shell)
  - **result**: Passed — 237 tests across 31 suites, 0 failures
  - **failure surface**: N/A
  - **checkpoint-scoped or unrelated repo-state**: All 20 new `useHotkeys` tests passed; pre-existing act() warnings in TypeSpecificColumnSettings are unrelated
  - **was this the actual shell provided by the environment**: Yes

- **command**: `npm run lint`
  - **shell used**: zsh (actual environment shell)
  - **result**: Passed — zero warnings (max-warnings=0)
  - **failure surface**: N/A
  - **checkpoint-scoped or unrelated repo-state**: Includes new files
  - **was this the actual shell provided by the environment**: Yes

- **command**: `npx tsc -p tsconfig.test.json --noEmit`
  - **shell used**: zsh (actual environment shell)
  - **result**: Passed — zero errors
  - **failure surface**: N/A
  - **checkpoint-scoped or unrelated repo-state**: Scoped to new and modified files
  - **was this the actual shell provided by the environment**: Yes

## Verdict

**PASS**

Work is complete and correct. The implementation faithfully follows the plan, all acceptance criteria are met, all verification commands pass, and the code is clean and well-tested. Ready for Main to close.
