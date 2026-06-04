# Message 003 — Dev → Review — 2026-06-03

## From
Dev

## To
Review

## State
ready-for-review

## Read
- agents/artifacts/078-viewport-menus-sortable-headers-plan.md
- agents/artifacts/078-viewport-menus-sortable-headers-dispatch.md
- agents/artifacts/078-viewport-menus-sortable-headers-complete.md

## Task
Review the implementation against the plan artifact and write/update the review artifact. Focus areas:

- Viewport clamping: all four menus (workspace, block, column, row) now use the shared `MenuPopover` component with `useClampedMenuPosition` / `clampMenuPosition`; pure unit tests cover all clamp edge cases.
- Header sort: `BlockColumnHeaderRow` rebuilt with sortable-vs-marker header distinction; click-to-sort + asc/desc toggle on sortable headers; marker headers (numbered/bullet) rendered as minimal muted glyphs (`#` / `•`). Sort wiring threaded through `BlockCard` → `MainPane` to existing `sortBlockRows`.
- `isUserSortableColumn` predicate added to `compareValues.ts`; used in `BlockColumnHeaderRow` (header rendering) and `BlockContextMenu` (sort list — bullet marker no longer appears as a no-op sort option). See complete artifact for the design decision callout.
- Tests: `menuPositioning.test.ts` (9 clamp cases), `blockHeaderSort.test.tsx` (JSDOM click-sort/toggle + marker no-sort), `blockGridRender.test.tsx` updated for new header presentation. All checkpoint-scoped tests pass. One pre-existing failure in `alertScheduler.test.js` is unrelated.

## Close Requirements
- Create/update the review artifact `agents/artifacts/078-viewport-menus-sortable-headers-review.md`.
- Create exactly one next message file: `004-review-to-main.md` (if PASS) or `004-review-to-dev.md` (if fixes needed).
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git.

## Required Verification
Run in the environment's actual shell and report per CLOSING.md:
- `npm run test`
- `npm run lint`
- `npm run build`
