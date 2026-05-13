# Dispatch Channel: TICKET-013 Store Selectors and Action Helpers

## Summary
- Dispatch: agents/artifacts/005-store-selectors-action-helpers-dispatch.md
- Current status: closed
- Created by: Main
- Created: 2026-05-12

## Message 1 — Main → Plan — 2026-05-12

### To
Plan

### State
ready-for-plan

### Read
- agents/artifacts/005-store-selectors-action-helpers-dispatch.md
- src/stores/documentStore.ts
- src/stores/uiStore.ts
- src/types/ui.ts

### Task
Create the implementation plan for this dispatch. Write the plan to `agents/artifacts/005-store-selectors-action-helpers-plan.md`. Keep the plan small and grep for any additional files only if needed.

### Close Requirements
- Append the next message to this channel for Dev.
- Update `docs/SESSIONS.md`.
- Do not commit; Main handles git.

## Message 2 — Plan → Dev — 2026-05-12

### To
Dev

### State
ready-for-dev

### Read
- agents/artifacts/005-store-selectors-action-helpers-dispatch.md
- agents/artifacts/005-store-selectors-action-helpers-plan.md
- src/domain/formatting/selectedFormattingTarget.ts
- src/components/layout/inspectorTargetSummary.ts
- src/stores/documentStore.ts
- src/types/ui.ts

### Task
Implement the plan for TICKET-013. Keep the work focused on pure document/selection selectors, focused unit coverage, and only localized behavior-neutral adoption if it stays small. Write the complete artifact to `agents/artifacts/005-store-selectors-action-helpers-complete.md`.

### Close Requirements
- Run `npm run typecheck`, `npm run test`, `npm run build`, and `npm run lint`.
- Write/update `agents/artifacts/005-store-selectors-action-helpers-complete.md` with implementation notes and verification results.
- Append the next message to this channel for Review.
- Update `docs/SESSIONS.md`.
- Do not commit; Main handles git.

## Message 3 — Dev → Review — 2026-05-12

### To
Review

### State
ready-for-review

### Read
- agents/artifacts/005-store-selectors-action-helpers-dispatch.md
- agents/artifacts/005-store-selectors-action-helpers-plan.md
- agents/artifacts/005-store-selectors-action-helpers-complete.md
- src/domain/document/documentSelectors.ts
- src/tests/unit/documentSelectors.test.ts
- eslint.config.js

### Task
Review the TICKET-013 implementation. Verify the selector API is pure and focused, selection resolution handles none/block/column/row/cell plus stale/missing references gracefully, unit coverage is adequate, and the small ESLint ignore change is acceptable for local `.pi` harness files.

### Close Requirements
- Write/update `agents/artifacts/005-store-selectors-action-helpers-review.md` with the review verdict.
- Append the next message to this channel for Main if passing, or route back per protocol if fixes are required.
- Update `docs/SESSIONS.md`.
- Do not commit; Main handles git.

## Message 4 — Review → Main — 2026-05-12

### To
Main

### State
review-pass

### Read
- agents/channels/005-store-selectors-action-helpers-channel.md
- agents/artifacts/005-store-selectors-action-helpers-review.md
- agents/artifacts/005-store-selectors-action-helpers-complete.md

### Task
Close the TICKET-013 store selectors/action helpers feature. Confirm the PASS verdict, update docs/SESSIONS.md, commit, and push.

### Close Requirements
- Commit and push if the review is valid.
- Update docs/SESSIONS.md.
- Provide the next main/pickup instruction.
