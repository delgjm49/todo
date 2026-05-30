# Message 001 — Main → Dev — 2026-05-30

## From
Main

## To
Dev

## State
ready-for-dev

## Read
- agents/artifacts/070-playwright-e2e-ci-provisioning-dispatch.md
- agents/artifacts/069-playwright-smoke-flow-review.md
- .github/workflows/tauri-windows.yml
- playwright.config.js
- src/tests/e2e/smoke.spec.ts

## Task
Implement the focused workflow change described in the dispatch. Add Playwright Chromium provisioning and run `npm run test:e2e` in the existing Tauri Windows CI workflow. Write Dev notes to `agents/artifacts/070-playwright-e2e-ci-provisioning-complete.md`, then append exactly one next message to this channel addressed to Review.

## Context
Dispatch 069 closed TICKET-062 with a passing local smoke, but Review noted clean environments require Playwright Chromium (`npx playwright install chromium`). This follow-up should make CI enforce that smoke instead of relying on local/manual runs.

## Required Verification
Report each command using the project verification format:
- `npm run test:e2e`
- `npm run test:build`
- `npm run lint`

If local verification cannot prove GitHub Windows runner behavior, state that boundary and what must be confirmed after Main pushes.

## Close Requirements
- Create `agents/artifacts/070-playwright-e2e-ci-provisioning-complete.md`.
- Create exactly one next message file in `agents/channels/070-playwright-e2e-ci-provisioning/messages/`, addressed to Review unless Main triage is required.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git after Review passes.
