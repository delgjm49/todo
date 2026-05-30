# Artifact: 074 Search MVP — Review

**Type:** review
**Feature:** 074-search-mvp
**Author:** Review
**Date:** 2026-05-30
**Status:** review-pass (re-review round 2; round 1 was needs-dev-fix)

---

## Re-review (round 2, 2026-05-30) — PASS

Dev (message 005) fixed F1: added `src/tests/unit/searchNavigation.test.ts` and
refactored `useSearchNavigation.ts` to export a standalone
`navigateToSearchResult(result, timeoutHandles?)` that the hook now calls, so the
test drives the **same** path the UI uses (node-safe via `typeof document` /
`requestAnimationFrame` guards — no jsdom needed). The test asserts: workspace
switches, cell selected, flash set, **`dirty` stays `false`, `saveAll`/`retrySave`
never called** — exactly the F1 invariant. Verification independently re-run:
`npm run lint` exit 0 (no warnings), `npm run build` exit 0, `npm run test`
**449/449 pass, 63 suites**. F2 (DOM component-test harness) remains a deferred,
non-blocking note for Main/Plan. **Verdict: review-pass → Main.**

The round-1 findings below are retained for history.

---

## Verdict

**FAIL — Return to Dev (needs-dev-fix)**, on a single substantive gap:
acceptance criterion #10 (component/integration coverage) is unmet and the
dispatch's emphasized read-only/no-autosave constraint has **no executing
automated guard**. Everything else is clean and `npm run lint` / `npm run build`
/ `npm run test` were independently re-run green (see Verification).

## What I verified statically (reads succeeded)

The implementation matches the plan and dispatch on the substantive points:

- `src/domain/search/searchDocuments.ts` — pure, framework-free, read-only.
  Imports only ordering helpers + types; no store/React/storage imports. Blank
  query returns empty; matching is case-insensitive `includes`; iteration is
  workspace-order → block-order → row (`getRowsInDisplayOrder`) → column
  (`getVisibleColumnsInDisplayOrder`); only `text/date/time/dropdown` cells with
  non-empty string values match; capping counts all but retains `maxResults` and
  sets `capped`. ACs 2–6 satisfied.
- `src/domain/search/searchTypes.ts` / `index.ts` — clean, properly typed, no
  `any`.
- `src/components/search/SearchPanel.tsx` — focuses input on open, blank-query
  hint, no-results state, honest count text ("Showing first N of M results"),
  grouped-by-workspace results, **Escape closes** (`onKeyDown` → `onClose`),
  results rendered as buttons. AC 1 (open), and the dispatch's "Escape/close
  behavior should be sane" are met.
- `src/components/search/SearchResultItem.tsx` — presentational kind badge +
  column label + snippet + workspace/block breadcrumb. AC 5 (clear context).
- `src/hooks/useSearchNavigation.ts` — selects workspace then cell/row/block via
  `requestAnimationFrame`, scrolls block/row into view, sets `searchFlashRowId`
  and clears it after 2600ms, and clears prior timers on re-invocation (no stale
  timer leak). Uses only existing no-dirty actions. AC 7 (navigate/highlight).
- `src/components/layout/TopBar.tsx` — Search trigger + panel, outside-click
  close via existing pointerdown pattern, mutually exclusive with the block menu.
- `src/stores/uiStore.ts` — `searchFlashRowId` + setter added as **non-persisted**
  transient UI state.
- `src/components/row/RowView.tsx` — `animate-alertFlash` applied when
  `alertFlashRowId === row.id || searchFlashRowId === row.id`.
- Read-only invariant holds at code level: `documentStore.selectWorkspace` only
  sets `activeWorkspaceId` / clears selection (no `markDirty`/save); no search
  path calls a mutation or persistence action. AC 8.
- Tests present and read clean: `searchDocuments.test.ts` (blank, multi-type
  case-insensitive matches, exclusions of checkbox/marker/id/formatting, order,
  capping — 5 cases) and `uiStore.test.ts` search-flash set/clear case. AC 9.

## Finding

### F1 — required — no executing test guards the read-only/no-autosave invariant (AC #10)

The complete artifact states the dedicated `SearchPanel.test.tsx` was removed
(due to a JSDOM/React input-polyfill instability), and I confirmed the file does
not exist. That is honestly documented, but it leaves **AC #10 unmet**:

> "Component/integration tests cover panel rendering, no-results/blank states,
> and result selection behavior" — and per the dispatch, result selection must
> not mutate/dirty/autosave.

The existing tests cover the pure matcher and the flash flag, but **nothing
executing exercises result selection or asserts the read-only/no-autosave
guarantee** — which the dispatch explicitly flagged as the property to watch.

The complete artifact asked Review to decide whether this is acceptable. Decision:
**not acceptable as-is**, but it does **not** require standing up a DOM test
harness. Required:

- Add at least one **executing** test (a plain `.test.ts` under `src/tests/unit/`,
  no jsdom/Testing Library needed) that drives a result selection through
  `useSearchNavigation` / the store actions and asserts
  `useDocumentStore.getState().dirty` stays `false` and that no save/persist path
  is invoked, plus that `activeWorkspaceId`/selection update as expected. This
  satisfies the spirit of AC #10's selection coverage and the dispatch's #1
  constraint directly.

### F2 — note (Main/Plan scope decision, NOT blocking re-review)

A full DOM-rendered `SearchPanel` component test (render + type + click) needs a
Testing Library + jsdom harness. The plan assumed "the project's established
Testing Library setup," but the project does not appear to have one (I could not
fully confirm before the shell failed). Standing that up is plausibly out of
scope for this slice — flag to Main/Plan to decide whether to queue a UI-test
harness separately. Do **not** introduce a new harness just to clear this review;
the lightweight invariant test in F1 is sufficient.

## Verification (independently re-run by Review)

> The shell tooling was intermittently unstable this session, but I captured
> authoritative output via redirect-to-file. Results below are real.

- command: `npm run lint` (`eslint . --ext .ts,.tsx,.js,.cjs --max-warnings=0`)
  - result: **passed** — exit 0, no errors/warnings (note `--max-warnings=0`).
- command: `npm run build` (`vite build`)
  - result: **passed** — exit 0, built in ~1s.
- command: `npm run test` (`tsc test build + node --test`)
  - result: **passed** — `# tests 448 / # pass 448 / # fail 0 / # suites 62`, exit 0.
- command: `npm run test:e2e`
  - result: **not re-run by Review** (Playwright is slow and the shell was
    unstable). Dev reported 1/1 Chromium smoke; recent commits show CI Playwright
    smoke green incl. Windows. Accepted on that basis; not a blocker.

## Routing

F1 → **needs-dev-fix → Dev**. F2 is a note for Main/Plan and does not block
re-review. Dev must add the invariant test, re-run the verification commands, and
hand back `ready-for-review`.
