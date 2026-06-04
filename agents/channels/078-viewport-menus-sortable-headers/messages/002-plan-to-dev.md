# Message 002 — Plan → Dev — 2026-06-03

## From
Plan

## To
Dev

## State
ready-for-dev

## Read
- agents/artifacts/078-viewport-menus-sortable-headers-plan.md
- agents/artifacts/078-viewport-menus-sortable-headers-dispatch.md

## Task
Implement the plan artifact. It is authoritative — if this message conflicts with it in a scope-affecting way, follow the artifact and route to Main if ambiguous. Build the shared viewport-clamp hook (`useClampedMenuPosition` with a pure `clampMenuPosition`), apply it to the workspace/block/column/row menus, rebuild `BlockColumnHeaderRow` for click-to-sort + asc/desc toggle on sortable headers and visually-minimal marker headers, thread `onSortColumn` through `BlockCard` → `MainPane` to the existing `sortBlockRows` action, and add the `isUserSortableColumn` UI predicate (used by header + `BlockContextMenu`).

Note the test harness is `node:test` (compiled via `tsc -p tsconfig.test.json`, run by `scripts/run-tests.mjs`) — NOT Vitest. Add tests in that style: pure clamp unit tests (`menuPositioning.test.ts`), an interactive JSDOM header click-sort/toggle test (`blockHeaderSort.test.tsx`), and update `blockGridRender.test.tsx` for the new header presentation (the `"NUM"` badge assertions change).

One flagged design decision: `isUserSortableColumn` also excludes the `bullet` marker (a no-op in `compareCellValues`) from the block "Sort by" menu — call this out in your complete artifact for Review/Main visibility.

## Required Verification
Run in the environment's actual shell and report per CLOSING.md:
- `npm run test`
- `npm run lint`
- `npm run build`

## Close Requirements
- Create/update the complete artifact `agents/artifacts/078-viewport-menus-sortable-headers-complete.md`.
- Create exactly one next message file in `agents/channels/078-viewport-menus-sortable-headers/messages/` addressed to Review (`003-dev-to-review.md`, State `ready-for-review`), or to Main (`needs-main-fix`/`stalled`/`error`) if you cannot proceed safely.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git after Review passes.
