# Deferred Follow-Ups

Tracked items that were reviewed, judged worth doing, but intentionally not done
in their originating dispatch. Produced by Review; triaged by the Hub; picked up
by Main. See agents/workflows/deferred-protocol.md.

---

## [done] 078-viewport-menus-sortable-headers — sort aria-label has stray space before comma
- Source: agents/artifacts/078-viewport-menus-sortable-headers-review.md
- Severity: low
- What: active-sort `aria-label` renders `"Sort by Task , currently ascending"` (stray space before the comma).
- Why deferred: truly cosmetic; screen-reader output remains intelligible.
- Suggested fix: build the suffix without an array join in `src/components/block/BlockColumnHeaderRow.tsx:63-67`, e.g. append `${isActive ? `, currently ${direction}ending` : ""}` to `Sort by ${label || typeName}`.
- Added: 2026-06-06 by Hub (backfilled from the 078 review, pre-ledger)
- Resolved: 2026-06-06 by dispatch 081 (`agents/artifacts/081-sortable-header-polish-follow-up-review.md`)

## [done] 086-hide-completed-rows — missing integration test for checkbox → hide → show flow
- Source: agents/artifacts/086-hide-completed-rows-review.md
- Severity: low
- What: `src/tests/integration/rowCellEditing.integration.test.ts` was not extended with a test covering "check a strikeout-enabled checkbox hides the row when hideCompletedRows is true, and unchecking reveals it", as the plan recommended.
- Why deferred: pure filter logic and save/reload round-trip are already covered; the integration UX test adds confidence but the behavior is verified correct through other layers.
- Suggested fix: add a test in `rowCellEditing.integration.test.ts` that sets `hideCompletedRows: true`, checks a strikeout-enabled checkbox, and asserts the row is no longer visible; then toggles the preference off and asserts the row is visible again.
- Added: 2026-06-07 by Review
- Resolved: 2026-06-08 by dispatch 087 (`agents/artifacts/087-test-cleanup-deferred-086-review.md`)

## [done] 086-hide-completed-rows — missing explicit template default assertion
- Source: agents/artifacts/086-hide-completed-rows-review.md
- Severity: low
- What: `src/tests/unit/blockTemplates.test.ts` was not updated with an assertion that `createBlockTemplate` returns `hideCompletedRows: false`, as the plan recommended.
- Why deferred: template default is implicitly verified through store and storage tests; a direct assertion is a trivial addition suitable for a cleanup pass.
- Suggested fix: add `assert.equal(result.hideCompletedRows, false)` to an existing template test in `blockTemplates.test.ts`.
- Added: 2026-06-07 by Review
- Resolved: 2026-06-08 by dispatch 087 (`agents/artifacts/087-test-cleanup-deferred-086-review.md`)

## [done] 086-hide-completed-rows — missing UI rendering test for filtered rows
- Source: agents/artifacts/086-hide-completed-rows-review.md
- Severity: low
- What: `src/tests/unit/rowEditing.test.tsx` was not extended with a test that renders RowView with `hideCompletedRows: true` and verifies completed rows are hidden, as the plan recommended.
- Why deferred: static rendering correctness follows from the tested `filterCompletedRows` function being called in RowView; a dedicated rendering test would add confidence but is not blocking.
- Suggested fix: add a test in `rowEditing.test.tsx` that renders a block with one completed row and `hideCompletedRows: true`, then asserts the completed row is not in the rendered output.
- Added: 2026-06-07 by Review
- Resolved: 2026-06-08 by dispatch 087 (`agents/artifacts/087-test-cleanup-deferred-086-review.md`)

## [done] 078-viewport-menus-sortable-headers — empty-label sortable headers render no type glyph
- Source: agents/artifacts/078-viewport-menus-sortable-headers-review.md
- Severity: low
- What: empty-label sortable headers for date/time/dropdown/text render blank (no muted type glyph), unlike the plan's UI-spec wording. `getSortableGlyph` only covers `checkbox`.
- Why deferred: unreachable via default flows — `getDefaultColumnLabel` yields non-empty labels for those types and checkbox is already handled; only occurs if a user deliberately clears a label.
- Suggested fix: extend `getSortableGlyph` (or fall back to the type name) for empty-label non-checkbox sortable columns in `src/components/block/BlockColumnHeaderRow.tsx:7-10`.
- Added: 2026-06-06 by Hub (backfilled from the 078 review, pre-ledger)
- Resolved: 2026-06-06 by dispatch 081 (`agents/artifacts/081-sortable-header-polish-follow-up-review.md`)
