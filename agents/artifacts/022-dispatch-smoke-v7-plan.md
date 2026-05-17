# Plan: Smoke v7 — Phase 3 Spool-Format Dispatch Test

## Overview
Run a minimal artifact-only dispatch through the new Phase 3 spool-format channel system to validate end-to-end operation. The channel uses a `messages/` directory with individual numbered files instead of a single legacy channel document. The route follows the forced-loop pattern: `Main → Plan → Dev → Review → Dev → Review → Main`.

## Prerequisites
- Dispatch artifact exists at `agents/artifacts/022-dispatch-smoke-v7-dispatch.md`.
- Spool channel directory exists at `agents/channels/022-dispatch-smoke-v7/messages/`.
- `001-main-to-plan.md` exists with `## To = Plan` and `State = ready-for-plan`.

## ⚠️ Spool-Format Warning for All Workers

This is the **first spool-format dispatch**. Workers MUST understand the differences vs legacy single-file channels:

- **Messages are individual files** in `agents/channels/022-dispatch-smoke-v7/messages/`, not sections appended to a single `.md` file.
- **Pickup instructions** use the **directory path**: `pickup agents/channels/022-dispatch-smoke-v7/` (trailing slash, no `.md` extension).
- **Each agent creates exactly one new file** with the **next sequential number**. Never modify an existing file.
- **File naming pattern**: `NNN-from-to.md` (e.g., `002-plan-to-dev.md`, `003-dev-to-review.md`).
- **Routing is determined** by the `## To` field of the latest message file, not the human's spoken role.
- **Allowed next filenames** are declared in the pickup prompt (e.g., `next=002` specifies `messages/002-plan-to-dev.md` or `messages/002-plan-to-main.md`).

## Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Create | `agents/artifacts/022-dispatch-smoke-v7-plan.md` | This plan artifact |
| Create | `agents/channels/022-dispatch-smoke-v7/messages/002-plan-to-dev.md` | Plan → Dev channel message |
| Create | `agents/artifacts/022-dispatch-smoke-v7-marker.md` | Dev marker with pass state (First Pass) |
| Create | `agents/artifacts/022-dispatch-smoke-v7-marker.md` | Updated marker (Second Pass — same file, content changed) |
| Create | `agents/artifacts/022-dispatch-smoke-v7-complete.md` | Verification results documenting both Dev passes |
| Create | `agents/channels/022-dispatch-smoke-v7/messages/003-dev-to-review.md` | Dev → Review (First Pass) |
| Create | `agents/channels/022-dispatch-smoke-v7/messages/004-review-to-dev.md` | Review → Dev (intentional return) |
| Create | `agents/channels/022-dispatch-smoke-v7/messages/005-dev-to-review.md` | Dev → Review (Second Pass) |
| Create | `agents/channels/022-dispatch-smoke-v7/messages/006-review-to-main.md` | Review → Main (final pass) |
| Modify | `docs/SESSIONS.md` | Each agent appends a session entry |

## Implementation Steps

### Step 1: Plan creates plan artifact and appends `002-plan-to-dev.md` (this step, first)
- Write this plan artifact to `agents/artifacts/022-dispatch-smoke-v7-plan.md`.
- Append `agents/channels/022-dispatch-smoke-v7/messages/002-plan-to-dev.md` with:
  - `## From = Plan`
  - `## To = Dev`
  - `State = ready-for-dev`
  - `## Read` includes the plan artifact and the dispatch artifact.
  - `## Task` instructs Dev to implement the first-pass and second-pass steps below.
  - `## Close Requirements` includes: update SESSIONS.md, append next message file, do not commit.
- Update `docs/SESSIONS.md` with a Plan session entry.
- **Verify**: Confirm both files exist on disk.
- Output short pickup instruction to user: `pickup agents/channels/022-dispatch-smoke-v7/`.

### Step 2: First-pass Dev writes marker with `smoke-v7-state: first-pass`
- Create `agents/artifacts/022-dispatch-smoke-v7-marker.md` containing exactly:
  ```text
  smoke-v7-state: first-pass
  ```
- Append `agents/channels/022-dispatch-smoke-v7/messages/003-dev-to-review.md` with:
  - `## From = Dev`
  - `## To = Review`
  - `State = ready-for-review`
  - `## Read` includes the plan artifact, this marker.
  - `## Task` instructs Review to intentionally return to Dev.
- Update `docs/SESSIONS.md` with a Dev session entry.
- **Verify**: Confirm marker file has exact line `smoke-v7-state: first-pass`.

### Step 3: First-pass Review intentionally returns to Dev
- Read the latest message from disk: should be `003-dev-to-review.md` with `## To = Review`.
- Determine active role from the `## To` field.
- Note the required intentional return — even if everything is correct, return to Dev.
- Append `agents/channels/022-dispatch-smoke-v7/messages/004-review-to-dev.md` with:
  - `## From = Review`
  - `## To = Dev`
  - `State = needs-dev-fix`
  - `## Task` instructs Dev to update marker to `smoke-v7-state: second-pass` and create the complete artifact.
- Update `docs/SESSIONS.md` with a Review session entry.
- **Verify**: Confirm `004-review-to-dev.md` exists with correct state.

### Step 4: Second-pass Dev re-reads channel from disk
- **Re-read the channel from disk** (`agents/channels/022-dispatch-smoke-v7/messages/`) — explicitly ignore any cached/remembered state.
- Parse the latest message file: it should be `004-review-to-dev.md` with `## To = Dev` and `State = needs-dev-fix`.
- Recompute active role from the `## To` field of that message file.
- Update `agents/artifacts/022-dispatch-smoke-v7-marker.md` to contain exactly:
  ```text
  smoke-v7-state: second-pass
  ```
- Create `agents/artifacts/022-dispatch-smoke-v7-complete.md` with:
  - Summary noting both Dev passes.
  - Verification results (list files in `messages/`, check contents).
  - Known issues (none).
- Append `agents/channels/022-dispatch-smoke-v7/messages/005-dev-to-review.md` with:
  - `## From = Dev`
  - `## To = Review`
  - `State = ready-for-review`
  - `## Read` includes the updated marker, complete artifact.
  - `## Task` instructs Review to verify both passes.
- Update `docs/SESSIONS.md` with a Dev session entry.
- **Verify**: Confirm marker has `smoke-v7-state: second-pass`, complete artifact exists.

### Step 5: Second-pass Review verifies and passes
- Read the latest message from disk: should be `005-dev-to-review.md` with `## To = Review`.
- Verify:
  - Marker now contains `smoke-v7-state: second-pass`.
  - Complete artifact documents both Dev passes.
  - `messages/` directory has exactly these 6 files:
    1. `001-main-to-plan.md`
    2. `002-plan-to-dev.md`
    3. `003-dev-to-review.md`
    4. `004-review-to-dev.md`
    5. `005-dev-to-review.md`
    6. `006-review-to-main.md`
  - Each file has correct routing and valid `State` values.
- Append `agents/channels/022-dispatch-smoke-v7/messages/006-review-to-main.md` with:
  - `## From = Review`
  - `## To = Main`
  - `State = review-pass`
  - `## Task` confirms all smoke test criteria passed.
- Update `docs/SESSIONS.md` with a Review session entry.
- **Verify**: Confirm all 6 files present, routing correct.

## Data / Storage Changes
None. All artifacts are disposable and live under `agents/artifacts/`.

## UI Specifications
Not applicable — this is a meta-workflow smoke test.

## Acceptance Criteria
- [ ] Plan artifact exists at `agents/artifacts/022-dispatch-smoke-v7-plan.md` with spool-format warnings and explicit route steps.
- [ ] `002-plan-to-dev.md` appended with correct routing and state.
- [ ] First-pass Dev creates marker with `smoke-v7-state: first-pass` and appends `003-dev-to-review.md`.
- [ ] First-pass Review intentionally returns to Dev with `State = needs-dev-fix` via `004-review-to-dev.md`.
- [ ] Second-pass Dev re-reads channel from disk, parses latest message, updates marker to `smoke-v7-state: second-pass`, creates complete artifact, appends `005-dev-to-review.md`.
- [ ] Second-pass Review verifies both passes, confirms 6 files, returns `review-pass` via `006-review-to-main.md`.
- [ ] Channel `messages/` directory contains exactly 6 files with correct routing and no gaps.
- [ ] No app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, or external script changes are made by workers.

## Estimated Complexity
- Small (artifact-only, no app code changes)
- ~5 files created total across all agents
