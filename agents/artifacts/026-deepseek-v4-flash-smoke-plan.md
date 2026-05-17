# Plan: DeepSeek V4 Flash Interactive Smoke (Dispatch 026)

## Overview

Artifact-only Phase 3 interactive smoke to validate that the OpenRouter DeepSeek V4 Flash model override works correctly across Plan, Dev, and Review worker roles in a happy-path spool chain. No product implementation files may be touched.

## Prerequisites

- Dispatch artifact: `agents/artifacts/026-deepseek-v4-flash-smoke-dispatch.md` (ready)
- Channel: `agents/channels/026-deepseek-v4-flash-smoke/messages/001-main-to-plan.md` (consumed)
- Model override: `openrouter/deepseek/deepseek-v4-flash` set in `agents/orchestration.local.json` for Plan, Dev, Review in interactive mode (presumed active at session start)

## Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Create | `agents/artifacts/026-deepseek-v4-flash-smoke-plan.md` | This plan artifact (Plan) |
| Create | `agents/artifacts/026-deepseek-v4-flash-smoke-complete.md` | Dev completion artifact — summarizes the artifact-only smoke completion |
| Modify | `docs/SESSIONS.md` | Append-only entries per role; no edits to prior entries |
| Create | `agents/artifacts/026-deepseek-v4-flash-smoke-review.md` | Review artifact — confirms clean pass or flags issues |

## Implementation Steps

### Step 1: Plan creates plan artifact (this file)

- **Action**: Write `agents/artifacts/026-deepseek-v4-flash-smoke-plan.md`
- **File**: `agents/artifacts/026-deepseek-v4-flash-smoke-plan.md`
- **Verify**: File exists and describes the Dev and Review steps accurately

### Step 2: Plan routes to Dev

- **Action**: Create `agents/channels/026-deepseek-v4-flash-smoke/messages/002-plan-to-dev.md`
- **File**: `agents/channels/026-deepseek-v4-flash-smoke/messages/002-plan-to-dev.md`
- **Content**: Route Dev to create the complete artifact, append SESSIONS.md, and route to Review with `State = ready-for-review`
- **Verify**: File exists with correct naming and frontmatter

### Step 3: Dev creates complete artifact

- **Action**: Create `agents/artifacts/026-deepseek-v4-flash-smoke-complete.md`
- **File**: `agents/artifacts/026-deepseek-v4-flash-smoke-complete.md`
- **Content**: Summarize the artifact-only smoke completion; confirm no product code was touched
- **Verify**: File exists, no product code changes made

### Step 4: Dev appends SESSIONS.md entry

- **Action**: Append a Dev session entry to `docs/SESSIONS.md`
- **Verify**: Entry exists at the end of the file with correct format

### Step 5: Dev routes to Review

- **Action**: Create `agents/channels/026-deepseek-v4-flash-smoke/messages/003-dev-to-review.md`
- **File**: `agents/channels/026-deepseek-v4-flash-smoke/messages/003-dev-to-review.md`
- **Content**: Route to Review with `State = ready-for-review`
- **Verify**: File exists with correct naming

### Step 6: Review creates review artifact

- **Action**: Create `agents/artifacts/026-deepseek-v4-flash-smoke-review.md`
- **File**: `agents/artifacts/026-deepseek-v4-flash-smoke-review.md`
- **Content**: Confirm Dev artifact is correct, no product code was touched, chain integrity is intact
- **Verify**: File exists

### Step 7: Review appends SESSIONS.md entry

- **Action**: Append a Review session entry to `docs/SESSIONS.md`
- **Verify**: Entry exists at the end of the file

### Step 8: Review routes to Main

- **Action**: Create `agents/channels/026-deepseek-v4-flash-smoke/messages/004-review-to-main.md`
- **File**: `agents/channels/026-deepseek-v4-flash-smoke/messages/004-review-to-main.md`
- **Content**: Route to Main with `State = review-pass`
- **Verify**: File exists with correct naming

## Data / Storage Changes

None. This is an artifact-only smoke with no product data or storage layer changes.

## UI Specifications

Not applicable — no UI changes in this dispatch.

## Acceptance Criteria

- [ ] Plan creates plan artifact and routes to Dev via `002-plan-to-dev.md`
- [ ] Dev creates complete artifact and routes to Review via `003-dev-to-review.md`
- [ ] Review creates review artifact with `State = review-pass` and routes to Main via `004-review-to-main.md`
- [ ] All three worker sessions run on `openrouter/deepseek/deepseek-v4-flash` without invoking GPT models
- [ ] No product implementation files are created or modified
- [ ] `docs/SESSIONS.md` has exactly three new entries (Plan, Dev, Review)

## Estimated Complexity

- **Small** — artifact-only, no product code
- **Estimated file count**: 5 new files (1 plan, 1 complete, 1 review, 2 channel messages)
