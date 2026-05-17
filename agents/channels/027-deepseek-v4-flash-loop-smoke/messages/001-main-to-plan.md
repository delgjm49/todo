# Message 001 — Main → Plan — 2026-05-17

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/workflows/dispatch-channel-protocol.md
- agents/artifacts/027-deepseek-v4-flash-loop-smoke-dispatch.md

## Task
Run the Plan role for Dispatch 027, a live artifact-only Phase 3 interactive smoke validating one forced Review → Dev loop on the OpenRouter DeepSeek V4 Flash model across all worker roles.

Plan the artifact-only Dev (×2) and Review (×2) steps per the dispatch's Forced Loop Semantics section. No product code, tests, UI, storage, or Tauri configuration may be touched in this dispatch.

Concretely:

1. Create `agents/artifacts/027-deepseek-v4-flash-loop-smoke-plan.md` describing the planned Dev and Review work, explicitly calling out:
   - First Dev creates the loop marker with `loop-state: first-pass` and routes to Review.
   - First Review intentionally returns `needs-dev-fix` to Dev and instructs Dev to flip the marker to `loop-state: second-pass` and create the complete artifact.
   - Second Dev updates the marker and writes the complete artifact, then routes to Review.
   - Second Review verifies and routes to Main with `review-pass`.

2. Create exactly one next channel message file:

   ```text
   agents/channels/027-deepseek-v4-flash-loop-smoke/messages/002-plan-to-dev.md
   ```

3. In that message, route Dev to perform the **first Dev pass** per the dispatch's Forced Loop Semantics section 1. Dev must create the loop marker with the exact line `loop-state: first-pass`, must not create the complete artifact yet, must append a Dev session entry to `docs/SESSIONS.md`, must avoid all product code changes, and must then route to Review via `003-dev-to-review.md` with `State = ready-for-review`. In Dev's message, instruct Dev to explicitly tell Review in `003-dev-to-review.md` that this is the **first Review pass** and Review must route back to Dev per the dispatch's Forced Loop Semantics section 2.

## Close Requirements
- Create exactly one next channel message file: `002-plan-to-dev.md`.
- Do not edit existing files under `agents/channels/027-deepseek-v4-flash-loop-smoke/messages/`.
- Do not commit; Main handles git operations.
- Do not modify product code, tests, UI, storage, or Tauri configuration.
