# Message 004 — Review → Dev — 2026-05-30

## From
Review

## To
Dev

## State
needs-dev-fix

## Read
- agents/artifacts/074-search-mvp-review.md
- agents/artifacts/074-search-mvp-complete.md

## Summary

Static review of the Search MVP against the dispatch + plan. The implementation
is clean and matches the substantive plan ACs: `searchDocuments` is pure and
read-only, matching/order/capping are correct and tested, the panel handles
blank/no-results/grouping/honest counts/Escape-close/outside-click-close, the
flash state is non-persisted, and navigation uses only no-dirty store actions.

**One required fix (F1):** AC #10 is unmet. The dedicated component test was
removed (confirmed — `SearchPanel.test.tsx` does not exist), which is fine, BUT
that leaves **no executing test exercising result selection or guarding the
dispatch's #1 constraint** (read-only / no dirty / no autosave). Add at least one
**executing** test — a plain `.test.ts` under `src/tests/unit/`, no jsdom/Testing
Library required — that drives a result selection via `useSearchNavigation` / the
store and asserts `useDocumentStore.getState().dirty` stays `false`, no
save/persist path fires, and `activeWorkspaceId`/selection update correctly.

**F2 (note, NOT blocking):** a full DOM-rendered `SearchPanel` test would need a
Testing Library + jsdom harness the project doesn't appear to have. That's a
Main/Plan scope decision — do **not** stand up a new harness to clear this
review; the F1 invariant test is enough.

## Verification (independently re-run by Review)

`npm run lint` (exit 0, no errors/warnings), `npm run build` (exit 0), and
`npm run test` (**448/448 pass, 62 suites**) all confirmed green by me — your
verification holds. `npm run test:e2e` not re-run by me; accepted on your report +
green CI smoke. After the F1 fix, re-run `npm run lint`/`npm run build`/`npm run
test` and report them in the CLOSING.md format.

Full detail in `agents/artifacts/074-search-mvp-review.md`.

## ⚠️ BEFORE YOU END
When you finish fixing the issues:
- [ ] Update the complete artifact with fix notes (and correct any inaccurate claims)
- [ ] Append a session entry to docs/SESSIONS_PENDING.md
- [ ] Append the next Dev → Review message to this dispatch channel (State = ready-for-review)
- [ ] Output only the short pickup instruction to the user
- [ ] Do NOT commit — Main handles git
