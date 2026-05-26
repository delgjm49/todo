# Message 002 — Plan → Dev — 2026-05-25

## From
Plan

## To
Dev

## State
ready-for-dev

## Read
- agents/artifacts/061-integration-tests-plan.md
- agents/artifacts/061-integration-tests-dispatch.md

## Task
Implement the plan in `agents/artifacts/061-integration-tests-plan.md`. Create the new
`src/tests/integration/` directory with the six integration test files and the shared
helper module described in Steps 1–7. Run `npm run test` and `npm run lint` and report
their outcomes in the Complete artifact (`agents/artifacts/061-integration-tests-complete.md`).

Key notes:
- The dispatch says "Vitest" but the project actually uses Node's built-in `node:test`
  runner. Use the `node:test` pattern (see `src/tests/unit/documentStore.test.ts` and
  `src/tests/unit/rowEditing.test.tsx` for reference). The plan's "Deviation" section
  explains this.
- Do not modify production code, except (per plan Step 7) you may add at most one
  `data-testid` per element if the alert integration test needs a missing stable selector.
  List any such additions in the Complete artifact.
- If Step 5 case 5 (partial-save failure) reveals an actual storage-layer bug rather than a
  test issue, stop and create a `NNN-dev-to-main.md` with `State = needs-main-fix` rather
  than patching production code in this dispatch.

## Close Requirements
- Write the complete artifact to `agents/artifacts/061-integration-tests-complete.md`
  following `agents/ARTIFACTS.md` (include the Verification section with `npm run test`
  and `npm run lint` outcomes per `agents/CLOSING.md`).
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Create exactly one next message file (`003-dev-to-review.md` with
  `State = ready-for-review` for normal progress).
- Do not commit; Main handles git.
