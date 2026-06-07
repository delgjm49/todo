# Message 003 — Dev → Review — 2026-06-07

## From
Dev

## To
Review

## State
ready-for-review

## Read
- agents/artifacts/086-hide-completed-rows-dispatch.md
- agents/artifacts/086-hide-completed-rows-plan.md
- agents/artifacts/086-hide-completed-rows-complete.md

## Task
Review the hide-completed-rows implementation against the plan artifact. The implementation adds a per-block `hideCompletedRows: boolean` preference (default `false`) and a derived view filter that hides rows completed by the existing checkbox completion predicate. The toggle is accessible from the block header (count badge) and the block context menu. All verification commands have been run; see the complete artifact for details.

## Key Files
- **Type**: `src/types/block.ts` — `hideCompletedRows: boolean` added
- **Domain helpers**: `src/domain/rows/completedRowFilter.ts` — `filterCompletedRows`, `countCompletedRows`
- **Store action**: `src/stores/documentStore.ts` — `toggleBlockHideCompletedRows`
- **Storage**: `src/services/storage/storageSchemas.ts` — normalization via `toBoolean`
- **Row rendering**: `src/components/row/RowView.tsx` — filter applied; empty-state message when all rows hidden
- **Block header toggle**: `src/components/block/BlockCard.tsx` — `onToggleHideCompletedRows` prop, button with `aria-pressed`
- **Context menu**: `src/components/block/BlockContextMenu.tsx` — "Hide/Show completed rows" menu item
- **Wiring**: `src/components/layout/MainPane.tsx` — store action wired to both components
- **Tests**:
  - `src/tests/unit/completedRowFilter.test.ts` — pure filter/count coverage
  - `src/tests/unit/documentStore.test.ts` — store action toggle/autosave
  - `src/tests/unit/storage.test.ts` — normalization (absent, true, invalid)
  - `src/tests/integration/saveLoadRoundtrip.integration.test.ts` — round-trip

## Verification Results
- `npm run test`: 533 pass, 1 fail (pre-existing `updateTimeCellValue triggers alert re-evaluation`)
- `npm run lint`: Pass
- `npm run build`: Pass
- `npm run test:e2e`: Smoke test passes; 2 pre-existing ux-fixes failures

## Scope Boundaries
- No row archive/lifecycle fields added
- No `STORAGE_SCHEMA_VERSION` bump
- No workspace-level completed view
- No search/alert/clipboard behavior changes

## Close Requirements
- Create/update `agents/artifacts/086-hide-completed-rows-review.md` with review findings.
- Append a concise Review session entry to `docs/SESSIONS_PENDING.md`.
- Create exactly one next message file:
  - `004-review-to-main.md` with `State = review-pass` if everything passes.
  - `004-review-to-dev.md` with `State = needs-dev-fix` if fixable issues are found.
  - `004-review-to-main.md` with `State = needs-main-fix`, `stalled`, or `error` if Main intervention is required.
- Do not commit; Main handles git operations.
