# Complete: Row Clipboard UI (Cut / Copy / Paste)

## Summary
Implemented `TICKET-050` row clipboard UI flows. Added ephemeral clipboard state (`clipboardPayload`, `clipboardOperation`) and row menu state (`rowMenu`) to `uiStore`. Added `cutRows`, `copyRows`, and `pasteRows` actions to `documentStore` that route through the existing `TICKET-049` domain clipboard helpers. Created `RowContextMenu` component and wired it into `RowView` (row-level right-click), `BlockCard` (block-area right-click fallback), and `MainPane` (menu rendering with backdrop and action handlers). Added 9 unit tests for store clipboard actions and 5 unit tests for the UI component.

## Files Changed
| Action | Path | Notes |
|--------|------|-------|
| Created | `src/components/row/RowContextMenu.tsx` | Cut / Copy / Paste menu with disabled states and data-testid markers |
| Created | `src/tests/unit/rowClipboardActions.test.ts` | 9 node:test cases covering copy, cut, paste, undo, end-of-block, incompatible-target, repeatable paste, and failure paths |
| Created | `src/tests/unit/rowContextMenu.test.tsx` | 5 jsdom cases covering enabled/disabled states and handler firing |
| Modified | `src/types/ui.ts` | Added `RowContextMenuState`, `RowClipboardOperation` types |
| Modified | `src/stores/uiStore.ts` | Added `rowMenu`, `clipboardPayload`, `clipboardOperation` fields; `openRowMenu`, `closeRowMenu`, `setRowClipboard`, `clearRowClipboard` actions; reset in `showSettingsScreen` |
| Modified | `src/stores/documentStore.ts` | Added `copyRows`, `cutRows`, `pasteRows` to interface and implementation; imports `serializeRowsForClipboard`, `mapClipboardRowsToBlock`, `useUiStore` |
| Modified | `src/components/row/RowView.tsx` | Added `onContextMenu` handler on each row div that selects the row and opens the row menu |
| Modified | `src/components/block/BlockCard.tsx` | Added `onOpenRowMenu` prop and `onContextMenu` on the row container for empty-area / header right-clicks |
| Modified | `src/components/layout/MainPane.tsx` | Subscribed to row menu + clipboard actions; computed `activeRowMenuBlock` and `canPaste`; rendered `RowContextMenu` portal with backdrop; passed `onOpenRowMenu` to `BlockCard`; added `closeRowMenu` to workspace-change cleanup |

## Deviations from Plan
- None. The implementation follows the plan closely. The `pasteRows` action uses `replaceBlockRows` to renormalize orders after splicing pasted rows, which matches the existing `insertRowInBlock` pattern.

## Open Questions
- None.

## Verification

- command: `npm run typecheck`
- shell used: zsh (macOS)
- result: Passed with no errors.
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped
- was this the actual shell provided by the environment: yes

- command: `npm run test`
- shell used: zsh (macOS)
- result: Passed — 187 tests, 0 failures. The existing React `act(...)` warnings in unrelated jsdom tests remain pre-existing.
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped
- was this the actual shell provided by the environment: yes

- command: `npm run build`
- shell used: zsh (macOS)
- result: Passed — Vite production build completed successfully.
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped
- was this the actual shell provided by the environment: yes

- command: `npm run lint`
- shell used: zsh (macOS)
- result: Passed with no errors or warnings.
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped
- was this the actual shell provided by the environment: yes

## Known Issues
- None.

## Fix Notes (Re-Review Round)
- **Issue**: Review found a mutual exclusion gap in `src/stores/uiStore.ts` — `openWorkspaceMenu`, `openBlockMenu`, and `openColumnMenu` did not clear `rowMenu`, which could cause two menus to render simultaneously.
- **Fix**: Added `rowMenu: null` to the `set()` calls in all three pre-existing menu openers so that opening any menu closes the row context menu. This mirrors the existing pattern where `openRowMenu` already clears `workspaceMenu`, `blockMenu`, and `columnMenu`.
- **Files changed in fix**: `src/stores/uiStore.ts` only.
- **Re-verification**: `npm run typecheck` ✓, `npm run test` (187/187) ✓, `npm run build` ✓, `npm run lint` ✓.
