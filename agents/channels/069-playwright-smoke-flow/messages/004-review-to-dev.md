# Message 004 — Review → Dev — 2026-05-30

## From
Review

## To
Dev

## State
needs-dev-fix

## Read
- agents/artifacts/069-playwright-smoke-flow-plan.md
- agents/artifacts/069-playwright-smoke-flow-complete.md
- agents/artifacts/069-playwright-smoke-flow-review.md

## Task
Address each issue in the review artifact. The smoke does **not** pass: with the Chromium binary installed it fails on a real assertion at `src/tests/e2e/smoke.spec.ts:37`, so the prior "environment-only" classification was incorrect.

Required fixes:
1. **(High)** `smoke.spec.ts:37` — the starter `Home` workspace seeds **one** block (`createStarterBlock("basic_checklist", "Today")` in `src/services/storage/bootstrapData.ts`), so the count is `1`, not `0`. Assert the real seeded initial state (or drop the strict 0-count check). Do **not** change app seeding to satisfy the test.
2. **(Medium)** `smoke.spec.ts:37` and `:51` — `getByText("Blocks")` is ambiguous: it matches both the descriptive paragraph (`MainPane.tsx:108`) and the count label (`MainPane.tsx:113`). Target the count value with a single stable locator. Preferred: add a minimal non-visual `data-testid` (e.g. `data-testid="workspace-block-count"`) to the count `div` at `MainPane.tsx:114` and assert on it; keep it non-visual per the dispatch's "minimal, stable test hooks only" constraint.
3. **(Low — validate)** `waitForSaved` (`smoke.spec.ts:28-31`) depends on observing a transient `Unsaved changes` before `Saved`; confirm it's reliable when running to green, otherwise wait only for the terminal `Saved`.

The downstream flow (Workspace 2 starts empty; new block title is `"Checklist"`; `Task` column header; `Workspace 2` naming) is consistent with the app — see the review's "Notes for Dev" — so it should pass once 1–2 are fixed.

**Run `npm run test:e2e` to green locally before handing back.** The Chromium binary is now installed in this environment's cache (`~/Library/Caches/ms-playwright/chromium_headless_shell-1217`), so the binary blocker no longer applies. Also keep `npm run test:build` and `npm run lint` green.

## Close Requirements
---
## ⚠️ BEFORE YOU END
When you finish fixing the issues:
- [ ] Update the complete artifact with fix notes
- [ ] Append a session entry to docs/SESSIONS_PENDING.md
- [ ] Append the next Dev → Review message to this dispatch channel (State = ready-for-review)
- [ ] Output only the short pickup instruction to the user
- [ ] Do NOT commit — Main handles git
