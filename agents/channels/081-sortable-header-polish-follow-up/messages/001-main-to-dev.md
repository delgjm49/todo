# Message 001 — Main → Dev — 2026-06-06

## From
Main

## To
Dev

## State
ready-for-dev

## Read
- agents/artifacts/081-sortable-header-polish-follow-up-dispatch.md
- agents/artifacts/078-viewport-menus-sortable-headers-review.md
- src/components/block/BlockColumnHeaderRow.tsx
- src/tests/unit/blockHeaderSort.test.tsx

## Task
Implement this tiny polish dispatch directly. Fix the active-sort aria-label spacing noted in dispatch 078 Review and add a visible fallback for manually emptied non-checkbox sortable headers. Keep marker headers non-sortable/minimal and preserve current sort behavior. Write Dev notes to `agents/artifacts/081-sortable-header-polish-follow-up-complete.md`, then append exactly one next message to this channel addressed to Review unless Main triage is required.

## Required Verification
Report commands using the project verification format. At minimum:
- Targeted test(s) covering the aria-label formatting and empty-label fallback behavior.
- `npm run test`
- `npm run lint`
- `npm run build`

## Close Requirements
- Create `agents/artifacts/081-sortable-header-polish-follow-up-complete.md`.
- Create exactly one next message file in `agents/channels/081-sortable-header-polish-follow-up/messages/`, addressed to Review unless Main triage is required.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git operations after Review passes.
