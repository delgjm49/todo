# Review: Sortable-Header Polish Follow-Up

## Plan Reviewed
- Direct-to-Dev dispatch: `agents/artifacts/081-sortable-header-polish-follow-up-dispatch.md`
- Deferred source notes: `agents/artifacts/078-viewport-menus-sortable-headers-review.md` Issues Found #1 and #2

## Complete Reviewed
- `agents/artifacts/081-sortable-header-polish-follow-up-complete.md`

## Findings

### Correctness
- ✅ Active sortable header aria labels are now built as a single template literal, producing `Sort by Task, currently ascending` without the prior stray space before the comma (`src/components/block/BlockColumnHeaderRow.tsx:63-64`).
- ✅ Empty-label sortable headers render visible fallback text through `getSortableGlyph`; checkbox remains the special `☑` glyph, while non-checkbox sortable types use `getColumnTypeName(type)` (`src/components/block/BlockColumnHeaderRow.tsx:7-9`, `src/components/block/BlockColumnHeaderRow.tsx:91`). This covers `text`, `date`, `time`, and `dropdown` through the same shared branch.
- ✅ Marker headers remain excluded from user-sortable handling by the direct numbered/bullet check and continue to render minimal marker glyphs through `getMarkerGlyph` (`src/components/block/BlockColumnHeaderRow.tsx:56`, `src/components/block/BlockColumnHeaderRow.tsx:123`).

### Completeness
- ✅ All dispatch acceptance criteria are met: active-sort aria-label spacing fixed, empty-label sortable fallback visible, checkbox fallback preserved, marker headers unchanged, targeted tests added, and standard verification passes.
- ✅ The new aria-label test directly renders an active sorted header and asserts the exact clean label string (`src/tests/unit/blockHeaderSort.test.tsx:297-321`).
- ✅ The new empty-label fallback test directly renders a blank text column, asserts visible `Text` fallback content, and checks the clean `Sort by Text` aria label (`src/tests/unit/blockHeaderSort.test.tsx:324-348`). The implementation's shared helper covers the other non-checkbox sortable types without duplicating tests for each type.

### Quality
- ✅ The implementation is minimal and component-local, with no sort-domain, persistence, or menu behavior changes.
- ✅ Tests reuse the existing JSDOM/render helpers in `blockHeaderSort.test.tsx` and passed locally, avoiding unverified React/jsdom assumptions.
- ✅ No leftover debug code or unrelated refactor was introduced.

### Data Integrity
- ✅ No JSON storage, schema, migration, or persistence paths changed.

## Issues Found
None.

## Verification

- command: `npm run test`
- shell used: bash (Pi harness on macOS)
- result: pass — 502 tests, 502 pass, 0 fail
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped and full-suite pass; includes the two new targeted header tests
- was this the actual shell provided by the environment: yes

- command: `npm run lint`
- shell used: bash (Pi harness on macOS)
- result: pass — ESLint completed with `--max-warnings=0`
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped pass
- was this the actual shell provided by the environment: yes

- command: `npm run build`
- shell used: bash (Pi harness on macOS)
- result: pass — Vite built successfully, 120 modules transformed, built in 969ms
- if failed, exact failure surface: N/A
- checkpoint-scoped or unrelated repo-state: checkpoint-scoped pass
- was this the actual shell provided by the environment: yes

## Out-of-Scope Working Tree Changes
None unexpected.

Observed dirty files before Review close were all in-scope for dispatch 081:
- `src/components/block/BlockColumnHeaderRow.tsx` — implementation file for both requested polish fixes.
- `src/tests/unit/blockHeaderSort.test.tsx` — targeted tests for the requested fixes.
- `agents/artifacts/081-sortable-header-polish-follow-up-dispatch.md` and `agents/artifacts/081-sortable-header-polish-follow-up-complete.md` — dispatch/Dev artifacts for this channel.
- `agents/channels/081-sortable-header-polish-follow-up/messages/001-main-to-dev.md` and `agents/channels/081-sortable-header-polish-follow-up/messages/002-dev-to-review.md` — existing immutable channel messages for this dispatch.
- `docs/SESSIONS_PENDING.md` — worker append buffer containing Main/Dev entries for this dispatch.

This review artifact, the Review session entry, and the `003-review-to-main.md` channel message are expected in-scope Review outputs.

## Final Verdict
**PASS — Work is complete and correct. Ready for Main.**
