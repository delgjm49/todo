# Message 001 — Main → Dev — 2026-05-30

## From
Main

## To
Dev

## State
ready-for-dev

## Read
- agents/artifacts/068-windows-ci-tauri-unit-fixes-dispatch.md
- agents/artifacts/066-unit-test-ci-fixes-dispatch.md
- agents/artifacts/066-unit-test-ci-fixes-dev.md
- agents/artifacts/066-unit-test-ci-fixes-review.md
- agents/artifacts/067-test-warning-cleanup-dispatch.md
- agents/artifacts/067-test-warning-cleanup-dev.md
- agents/artifacts/067-test-warning-cleanup-review.md

## Task
Implement the focused Windows CI fixes described in the dispatch. Write Dev notes to `agents/artifacts/068-windows-ci-tauri-unit-fixes-dev.md`, then append exactly one next message to this channel addressed to Review.

## Context
The local full JS suite passing on macOS is not enough. Dispatches 066 and 067 both met that bar, but the canonical Tauri Windows CI workflow is still red on every push through `ac50ab6`.

Current blockers:
1. `src/tests/unit/textCellClipboard.test.tsx` still fails on Windows CI with React/JSDOM `TypeError: Cannot read properties of null (reading 'tag')` from `getNodeFromInstance` during native keyboard dispatch. The global `window.addEventListener("error", ...)` suppressor from dispatch 066 must be removed; do not replace it with another broad suppressor.
2. `src/tests/unit/alertScheduler.test.ts` now fails around suite line 251 / TestContext line 307 (`expected: true, actual: false`). Diagnose whether this is a stale assertion after dispatch 067's `useAlertNavigation` cleanup or a real product regression. If it is a real product regression, stop and route back to Main with the diagnosis rather than silently editing product behavior.

**Do not defer either failure.** If one cannot be fixed safely in Dev, route back with a concrete blocker/diagnosis.

## Required Verification
Report each command using the project verification format:
- `gh run view 26473302347 --log-failed`
- `gh run view 26468663874 --log-failed`
- `gh run view 26461215837 --log-failed`
- Targeted unit tests for `src/tests/unit/textCellClipboard.test.tsx` and `src/tests/unit/alertScheduler.test.ts`
- Full JS suite via the project `node --test` pipeline
- `npm run lint`

## Close Requirements
- Create `agents/artifacts/068-windows-ci-tauri-unit-fixes-dev.md` with summary, files changed, alertScheduler diagnosis, and verification results.
- Create exactly one next message file in `agents/channels/068-windows-ci-tauri-unit-fixes/messages/`, addressed to Review unless routing back to Main is required by the alertScheduler diagnosis.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git after Review passes and verifies Windows CI after push.
