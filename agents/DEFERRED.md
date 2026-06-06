# Deferred Follow-Ups

Tracked items that were reviewed, judged worth doing, but intentionally not done
in their originating dispatch. Produced by Review; triaged by the Hub; picked up
by Main. See agents/workflows/deferred-protocol.md.

---

## [open] 078-viewport-menus-sortable-headers — sort aria-label has stray space before comma
- Source: agents/artifacts/078-viewport-menus-sortable-headers-review.md
- Severity: low
- What: active-sort `aria-label` renders `"Sort by Task , currently ascending"` (stray space before the comma).
- Why deferred: truly cosmetic; screen-reader output remains intelligible.
- Suggested fix: build the suffix without an array join in `src/components/block/BlockColumnHeaderRow.tsx:63-67`, e.g. append `${isActive ? `, currently ${direction}ending` : ""}` to `Sort by ${label || typeName}`.
- Added: 2026-06-06 by Hub (backfilled from the 078 review, pre-ledger)

## [open] 078-viewport-menus-sortable-headers — empty-label sortable headers render no type glyph
- Source: agents/artifacts/078-viewport-menus-sortable-headers-review.md
- Severity: low
- What: empty-label sortable headers for date/time/dropdown/text render blank (no muted type glyph), unlike the plan's UI-spec wording. `getSortableGlyph` only covers `checkbox`.
- Why deferred: unreachable via default flows — `getDefaultColumnLabel` yields non-empty labels for those types and checkbox is already handled; only occurs if a user deliberately clears a label.
- Suggested fix: extend `getSortableGlyph` (or fall back to the type name) for empty-label non-checkbox sortable columns in `src/components/block/BlockColumnHeaderRow.tsx:7-10`.
- Added: 2026-06-06 by Hub (backfilled from the 078 review, pre-ledger)
