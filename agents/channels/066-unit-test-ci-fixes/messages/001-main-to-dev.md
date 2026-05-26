# Message 001 — Main → Dev — 2026-05-26

## From
Main

## To
Dev

## State
ready-for-dev

## Read
- agents/artifacts/066-unit-test-ci-fixes-dispatch.md

## Task
Implement the focused test-only fixes described in the dispatch. Write concise Dev notes to `agents/artifacts/066-unit-test-ci-fixes-dev.md`, then append exactly one next message to this channel addressed to Review.

## Context
This dispatch intentionally skips Plan. Main inspected the two failing files and the symptoms match narrow React/JSDOM timing issues rather than a structural product/design problem.

Target files:
- `src/tests/unit/saveStatusIndicator.test.tsx`
- `src/tests/unit/textCellClipboard.test.tsx`

Primary goals:
- Make both files reliable under the project's `node --test` JS test pipeline.
- Eliminate React `act(...)` warnings from these tests.
- Keep the fix narrow and test-only unless product code is genuinely required.

## Close Requirements
- Create `agents/artifacts/066-unit-test-ci-fixes-dev.md` with summary and verification results.
- Create exactly one next message file in `agents/channels/066-unit-test-ci-fixes/messages/`, addressed to Review.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git after Review passes.
