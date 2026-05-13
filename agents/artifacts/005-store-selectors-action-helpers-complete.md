# Complete: TICKET-013 Store Selectors and Action Helpers

## Summary
Implemented a focused pure selector/helper layer for document and selection lookups.

## Changes
- Added `src/domain/document/documentSelectors.ts` with pure helpers for:
  - active workspace entry/document lookup
  - explicit workspace context lookup
  - block, visible column, display-order row, and cell lookup
  - non-throwing `resolveSelectionTarget` for `none`, block, column, row, and cell selections
- Added `src/tests/unit/documentSelectors.test.ts` covering:
  - valid active/workspace/entity lookups
  - visible-column semantics
  - valid selection resolution for all selection kinds
  - stale/missing workspace, block, column, row, and cell selections
- Updated `eslint.config.js` to ignore the local `.pi` harness directory so project lint is not affected by generated agent-support files.

## Notes
- No persisted JSON shapes changed.
- No store action behavior changed.
- No UI behavior changed; component adoption was left out to keep this ticket behavior-neutral.
- Missing selected cell objects resolve as `{ status: "missing", reason: "cell" }`.

## Verification
- `npm run typecheck` — PASS
- `npm run test` — PASS (139/139 tests; existing React act warnings still print)
- `npm run build` — PASS
- `npm run lint` — PASS
