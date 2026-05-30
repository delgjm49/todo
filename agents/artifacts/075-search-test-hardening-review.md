# Artifact: 075 Search Test Hardening — Review

**Type:** review
**Feature:** 075-search-test-hardening
**Author:** Review
**Date:** 2026-05-30
**Status:** review-pass

---

## Verdict

**PASS WITH NOTES** — All four acceptance criteria are met, the implementation
change is clean and correctly typed, and verification (`npm run test`,
`npm run lint`, `npm run build`) was independently re-run green and is
deterministic across repeated isolated runs. One non-blocking test-hygiene
observation is recorded under Notes; it is explicitly deferred (fixing it cleanly
risks expanding the timer/harness surface this dispatch is scoped to avoid).

## Scope checked

Reviewed the three changed files against the dispatch scope and acceptance
criteria. Review is read-only on implementation/test files; no edits made to them.

### AC1 — checkbox / bullet / numbered exclusion explicitly tested ✅
`src/tests/unit/searchDocuments.test.ts`:
- `excludes checkbox boolean values from searchable text` — sets `done` (checkbox)
  to `value: true`, queries `"true"`, asserts `totalMatches === 0`.
- `excludes bullet and numbered marker string values from searchable text` —
  populates `bullet`/`numbered` cells with string values containing the query and
  asserts `totalMatches === 0`, proving exclusion is by column **type**
  (`bullet`/`numbered` are not in `SEARCHABLE_CELL_TYPES`), not by value shape.
- `excludes formatting and id metadata from searchable text` — queries a token
  that only exists inside `format.textColor` and a row id, both `totalMatches === 0`.

These map directly to `SEARCHABLE_CELL_TYPES = {text, date, time, dropdown}` in
`searchDocuments.ts:8` and the `stringifyCell` string-only guard.

### AC2 — deterministic multi-block / multi-row ordering ✅
`orders matches deterministically across multiple workspaces, blocks, rows, and
columns` builds an intentionally out-of-order fixture (workspace order 2 before 1,
block order 2 before 1, row order 3 before 1, column order 2 before 1) and asserts
the full result id sequence. I hand-traced it against the implementation
(workspace-order → block-order → `getRowsInDisplayOrder` →
`getVisibleColumnsInDisplayOrder`) and the expected array is correct. This closes
the prior "ordering only covered at workspace/column level" gap.

### AC3 — pending rAF / fallback cleanup tightened + tested ✅
`src/hooks/useSearchNavigation.ts` now tracks the scheduled `requestAnimationFrame`
handle (and the non-rAF fallback `setTimeout`) in the same handle list as the row
and flash timeouts, using a typed discriminated union
(`{kind:"timeout"} | {kind:"animationFrame"}`), and `clearPendingSearchNavigation`
cancels both kinds before scheduling a new navigation. This is the real fix for
the audit note: previously a stale pending rAF was never cancelled. The fallback
`setTimeout(selectAndScroll, 0)` is now also tracked/cleared.

`src/tests/unit/searchNavigation.test.ts` adds a non-DOM fake-rAF test
(`clears pending requestAnimationFrame navigation before scheduling the next
result`) that stubs `requestAnimationFrame`/`cancelAnimationFrame`, fires two
navigations, runs only the un-cancelled callbacks, and asserts (a) the stale frame
id `1` was cancelled and (b) the selection reflects the **second** navigation
target. Node-safe via the existing `typeof document` / `typeof requestAnimationFrame`
guards — no jsdom/Testing Library introduced, honoring the dispatch constraint.

### AC4 — test / lint / build pass ✅
See Verification.

## Quality

- The discriminated union is the right shape; `cancelAnimationFrame` is guarded by
  `typeof … === "function"` for the node path (best-effort cancel when absent —
  acceptable).
- No production behavior change beyond the cleanup; matcher, capping, and read-only
  navigation invariants from dispatch 074 are untouched.
- Tests are pure `node:test`/`node:assert`, consistent with the project's
  non-jsdom unit convention.

## Notes (deferred, non-blocking)

- **N1 — leftover real timer in the new rAF test.** The new
  `clears pending requestAnimationFrame…` test drives the second navigation through
  a real `setTimeout(rowTimeout, 300)` (the destination result carries a `rowId`),
  which fires ~300ms later and mutates `useUiStore.searchFlashRowId` after the test
  body returns. Because the runner uses `isolation: "none"`/`concurrency: 1`, that
  timer overlaps the following async test. I verified this is currently
  **deterministic**: the leaked timer fires strictly before the next test's own
  300ms timer (same delay, scheduled earlier), so the final flash value is correct
  — full suite green and 6/6 green in isolated repeat runs. Tightening it (e.g.
  stubbing `setTimeout` or draining timers) would edge toward the timer/harness
  expansion this dispatch is scoped to avoid, so it is deferred rather than required.

## Verification (independently re-run by Review)

- command: `npm run test`
  - shell used: zsh on macOS (actual environment shell)
  - result: **passed** — `# tests 453 / # pass 453 / # fail 0 / # suites 63`, exit 0.
- command: `npm run lint` (`eslint . --ext .ts,.tsx,.js,.cjs --max-warnings=0`)
  - shell used: zsh on macOS
  - result: **passed** — exit 0, no errors/warnings.
- command: `npm run build` (`vite build`)
  - shell used: zsh on macOS
  - result: **passed** — exit 0, built in ~1s (118 modules).
- additional: compiled `searchNavigation.test.js` re-run 6× in isolation —
  `# pass 2 / # fail 0` every run (determinism check for N1). No flakiness observed.
- No unrelated/pre-existing failures observed.

## Routing

No required fixes. **review-pass → Main.** N1 is an optional, explicitly-deferred
test-hygiene note for Main/Plan to consider if the timer test surface is revisited.
```

**Verdict: PASS WITH NOTES → Main.**
