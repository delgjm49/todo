# Complete: Sortable-Header Polish Follow-Up

## Summary
Implemented both low-severity polish items deferred from dispatch 078 Review. Fixed the active-sort `aria-label` to remove the stray space before the comma, and extended the empty-label fallback so that manually emptied non-checkbox sortable headers render a muted type-name glyph instead of nothing. Added two targeted unit tests covering both behaviors; all standard verification passes.

## Files Changed
| Action | Path | Notes |
|--------|------|-------|
| Modified | `src/components/block/BlockColumnHeaderRow.tsx` | Two changes: `getSortableGlyph` now returns `getColumnTypeName(type)` for non-checkbox sortable types; `ariaLabel` is now built with a template literal instead of array join |
| Modified | `src/tests/unit/blockHeaderSort.test.tsx` | Added imports for `BlockColumnHeaderRow`, `BlockSort`, `ColumnDefinition`; added two new tests in `"BlockColumnHeaderRow aria-label and empty-label fallback"` describe block |

## Deviations from Plan
None. Both fixes are exactly as described in the dispatch and the referenced 078 Review notes.

## Open Questions
None.

## Verification

- command: `npm run test`
- shell used: zsh (macOS)
- result: 502 tests, 502 pass, 0 fail
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: All pass including the 2 new targeted tests. The pre-existing `alertScheduler` failure noted in review 078 is no longer present (resolved by a prior session).
- was this the actual shell provided by the environment: yes

- command: `npm run lint`
- shell used: zsh (macOS)
- result: pass (0 errors, 0 warnings; `--max-warnings=0`)
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: N/A
- was this the actual shell provided by the environment: yes

- command: `npm run build`
- shell used: zsh (macOS)
- result: pass (vite build, 120 modules transformed, built in ~982ms)
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: N/A
- was this the actual shell provided by the environment: yes

## Known Issues
None.
