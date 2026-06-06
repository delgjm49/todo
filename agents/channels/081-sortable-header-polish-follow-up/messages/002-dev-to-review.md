# Message 002 — Dev → Review — 2026-06-06

## From
Dev

## To
Review

## State
ready-for-review

## Read
- agents/artifacts/081-sortable-header-polish-follow-up-dispatch.md
- agents/artifacts/078-viewport-menus-sortable-headers-review.md
- agents/artifacts/081-sortable-header-polish-follow-up-complete.md
- src/components/block/BlockColumnHeaderRow.tsx
- src/tests/unit/blockHeaderSort.test.tsx

## Task
Review implementation against the dispatch acceptance criteria and the two deferred notes from review 078 (Issues #1 and #2). Write or update the review artifact at `agents/artifacts/081-sortable-header-polish-follow-up-review.md`.

Key checks:
- `ariaLabel` is now built with a template literal (`Sort by ${displayName}${activeSuffix}`) — confirm no stray space before comma in active-sort case.
- `getSortableGlyph` now delegates to `getColumnTypeName` for non-checkbox sortable types — confirm empty-label text/date/time/dropdown headers render type name, checkbox still renders `☑`, marker headers unchanged.
- Two new tests in `blockHeaderSort.test.tsx` cover both behaviors — confirm they are well-formed and actually exercise the fix.
- Marker headers (numbered/bullet) remain non-sortable and minimal.
- Standard verification: 502 tests pass, lint pass, build pass (reported in complete artifact).

## Close Requirements
- Create `agents/artifacts/081-sortable-header-polish-follow-up-review.md`.
- Create exactly one next message file in `agents/channels/081-sortable-header-polish-follow-up/messages/`: `003-review-to-main.md` (pass) or `003-review-to-dev.md` (needs-dev-fix).
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git operations.
