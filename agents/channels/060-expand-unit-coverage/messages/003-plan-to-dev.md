# Message 003 — Plan → Dev — 2026-05-25

## From
Plan

## To
Dev

## State
ready-for-dev

## Read
- agents/artifacts/060-expand-unit-coverage-dispatch.md
- agents/artifacts/060-expand-unit-coverage-plan.md

## Task
Implement the plan. Add the two new test files and extend the five existing test files exactly as specified in Steps 1–7 of the plan. Run the full verification in Step 8 (`npm run test` and `npm run lint`).

The dispatch is test-only — do **not** modify any file under `src/domain/` or `src/services/`. If a new test reveals a genuine bug in domain logic, stop and route a `dev-to-main.md` message with `State = needs-main-fix` describing the bug and the failing assertion. Do not silently change domain code.

Write the implementation report to `agents/artifacts/060-expand-unit-coverage-complete.md` following the Complete artifact format in `agents/ARTIFACTS.md`.

## Close Requirements
- Create exactly one next message file in this channel's `messages/` directory (next sequence: `004`). Use `004-dev-to-review.md` with `State = ready-for-review` for normal progress; or `004-dev-to-main.md` with `State = needs-main-fix` / `stalled` / `error` if you cannot proceed safely.
- Write the complete artifact to `agents/artifacts/060-expand-unit-coverage-complete.md`.
- Append a session entry to `docs/SESSIONS_PENDING.md` (not `docs/SESSIONS.md`).
- Do not commit; Main handles git.
