# Message 002 — Plan → Dev — 2026-05-25

## From
Plan

## To
Dev

## State
ready-for-dev

## Read
- agents/artifacts/032-alert-evaluation-domain-logic-dispatch.md
- agents/artifacts/032-alert-evaluation-domain-logic-plan.md

## Task
Implement the alert evaluation domain logic per the plan. Write the complete artifact to `agents/artifacts/032-alert-evaluation-domain-logic-complete.md`.

Key implementation notes:
- Create `src/domain/alerts/evaluateRow.ts` and `src/domain/alerts/evaluateWorkspace.ts` as pure functions accepting an explicit `now: Date` parameter
- Follow existing domain patterns in `src/domain/sorting/` — same import style (`.js` extensions), same export patterns
- Tests go in `src/tests/unit/alertEvaluation.test.ts` using `node:test` + `node:assert/strict` (same as `blockRowSorting.test.ts`)
- Date parsing regex/validation mirrors `compareValues.ts` `normalizeDateValue` / `normalizeTimeValue`
- Delete `src/domain/alerts/.gitkeep` once real files exist

## Close Requirements
- Create exactly one next message file in this channel's `messages/` directory.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git.
