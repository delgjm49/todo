# Dispatch: Sortable-Header Polish Follow-Up

## What
Implement the two low-severity sortable-header polish notes deferred from dispatch 078 Review. This is a tiny direct-to-Dev follow-up: clean the active-sort aria label spacing and keep manually emptied sortable headers visibly identifiable.

## Why
Dispatch 078 correctly added viewport-safe menus and sortable block headers, but Review documented two optional polish items that are small, contained, and now explicitly queued. Fixing them improves accessibility polish and an edge-case empty-label visual state without changing sorting behavior or storage.

## Scope
- Fix the active-sort `aria-label` generated in `src/components/block/BlockColumnHeaderRow.tsx` so it no longer includes a stray space before the comma, e.g. prefer `Sort by Task, currently ascending` over `Sort by Task , currently ascending`.
- Add a fallback glyph/label for manually emptied non-checkbox sortable headers (`text`, `date`, `time`, `dropdown`) so the header is not visually blank.
- Preserve existing sortable-header behavior: clicking sortable headers selects the column and toggles sort; marker headers (`numbered`, `bullet`) remain minimal/non-sortable.
- Add targeted tests for both fixes, likely in `src/tests/unit/blockHeaderSort.test.tsx` or a narrowly scoped component/unit test.

**Out of scope:**
- Changing sort domain logic, persisted block sort schema, row ordering semantics, or context-menu sort behavior.
- Reopening viewport-clamped menu work from dispatch 078.
- Broad accessibility redesign beyond the two documented notes.

## Related Spec Sections
- `agents/artifacts/078-viewport-menus-sortable-headers-review.md` — PASS WITH NOTES, Issues Found #1 and #2
- `src/components/block/BlockColumnHeaderRow.tsx`
- `src/tests/unit/blockHeaderSort.test.tsx`
- `src/domain/sorting/compareValues.ts` only for reference; no domain change is expected

## Constraints
- Direct to Dev; no separate Plan artifact is required for this S-sized polish fix.
- Keep changes minimal and component-local unless tests require a small supporting helper.
- Do not alter marker header handling for numbered/bullet columns.
- Main handles final close/commit/push; queue mode is pre-authorized for auto-close.

## Acceptance Criteria
- [ ] Active sortable headers expose clean aria labels with no extra space before punctuation.
- [ ] Empty-label sortable `text`, `date`, `time`, and `dropdown` headers remain visibly identifiable via fallback text/glyph.
- [ ] Checkbox empty-label fallback behavior remains sensible.
- [ ] Marker headers (`numbered`, `bullet`) remain non-sortable and minimal.
- [ ] Targeted tests cover the aria-label formatting and empty-label fallback behavior.
- [ ] Standard verification passes: `npm run test`, `npm run lint`, and `npm run build`.
