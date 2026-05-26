# Message 001 — Main → Plan — 2026-05-25

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/artifacts/060-expand-unit-coverage-dispatch.md

## Task
Create the implementation plan for this dispatch. Write the plan to `agents/artifacts/060-expand-unit-coverage-plan.md`.

## Context
The codebase already has 30+ unit test files covering 348+ tests. Existing domain tests include:
- alertEvaluation.test.ts, alertScheduler.test.ts
- blockTemplates.test.ts, blockRowSorting.test.ts
- checkboxAutomation.test.ts
- formattingHelpers.test.ts, formattingPatch.test.ts, formattingToBorderStyle.test.ts
- columnHelpers.test.ts, rowHelpers.test.ts
- documentStore.test.ts, documentSelectors.test.ts
- historyStore.test.ts, uiStore.test.ts
- storage.test.ts

The Plan agent should audit these existing tests against the domain modules in `src/domain/` and identify specific gaps — functions, branches, or edge cases that lack coverage. Focus on high-risk pure logic (formatting merge, sorting comparators, alert evaluation, validation, template creation).

## Close Requirements
- Create exactly one next message file in this channel's `messages/` directory.
- Append a session entry to `docs/SESSIONS_PENDING.md`.
- Do not commit; Main handles git.
