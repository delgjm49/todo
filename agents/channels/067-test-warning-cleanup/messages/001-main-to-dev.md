# Message 001 — Main → Dev — 2026-05-26

## From
Main

## To
Dev

## State
ready-for-dev

## Read
- agents/artifacts/067-test-warning-cleanup-dispatch.md
- agents/artifacts/066-unit-test-ci-fixes-review.md
- agents/artifacts/066-unit-test-ci-fixes-dev.md

## Task
Implement the focused test-warning cleanup described in the dispatch. Write Dev notes to `agents/artifacts/067-test-warning-cleanup-dev.md`, then append exactly one next message to this channel addressed to Review.

## Context
Dispatch 066 fixed the two CI-blocking unit tests and Review passed it, but the full JS suite still printed unrelated pre-existing React/JSDOM warning/error noise. The full suite passes today, so this is a test-quality/flakiness cleanup task, not a product feature.

Expected areas from the 066 review/dev notes:
- `LeftDock`
- `AlertIntegrationHarness`
- `AlertNavigationHarness`
- `SettingsPage`
- indirect `SaveStatusIndicator` renders inside integration harnesses

Keep the work narrow. Prefer explicit `act(...)`/awaited render and event flush fixes in tests/harnesses. Do not add broad global warning suppression. Do not change product behavior unless you stop and route back with justification.

## Close Requirements
- Create `agents/artifacts/067-test-warning-cleanup-dev.md` with summary, files changed, deviations, and verification results.
- Create exactly one next message file in `agents/channels/067-test-warning-cleanup/messages/`, addressed to Review.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git after Review passes.
