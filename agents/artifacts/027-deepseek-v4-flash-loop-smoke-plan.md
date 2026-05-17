# Plan: DeepSeek V4 Flash Forced Loop Smoke

## Overview

Artifact-only Phase 3 interactive smoke test validating one forced `Review → Dev` loop on the OpenRouter DeepSeek V4 Flash model across all worker roles. The entire work consists of disposable marker/artifact files under `agents/artifacts/` and spool channel message files under `agents/channels/027-deepseek-v4-flash-loop-smoke/messages/`. No product code, tests, UI, storage, or Tauri configuration files may be touched.

## Prerequisites

- Dispatch 027 has been initialized: `messages/001-main-to-plan.md` exists with `## To = Plan`.
- Worker sessions will launch on `openrouter/deepseek/deepseek-v4-flash` (set in `agents/orchestration.local.json`).

## Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Create | `agents/artifacts/027-deepseek-v4-flash-loop-smoke-marker.md` | Loop state marker (first Dev pass sets `loop-state: first-pass`; second Dev pass updates to `loop-state: second-pass`) |
| Create | `agents/artifacts/027-deepseek-v4-flash-loop-smoke-complete.md` | Complete artifact (second Dev pass only) |
| Create | `agents/channels/027-deepseek-v4-flash-loop-smoke/messages/003-dev-to-review.md` | First Dev → Review handoff (first Dev pass) |
| Create | `agents/channels/027-deepseek-v4-flash-loop-smoke/messages/004-review-to-dev.md` | First Review → Dev handoff with `State = needs-dev-fix` |
| Create | `agents/channels/027-deepseek-v4-flash-loop-smoke/messages/005-dev-to-review.md` | Second Dev → Review handoff (second Dev pass) |
| Create | `agents/channels/027-deepseek-v4-flash-loop-smoke/messages/006-review-to-main.md` | Second Review → Main handoff with `State = review-pass` |
| Modify | `docs/SESSIONS.md` | Append session entries for each worker turn |

## Implementation Steps

### Step 1: First Dev Pass (Dev picks up from `002-plan-to-dev.md`)

- Dev re-reads `messages/002-plan-to-dev.md` from disk. Confirms `## To = Dev` and `State = ready-for-dev`.
- Dev reads the dispatch artifact and this plan.
- Dev creates `agents/artifacts/027-deepseek-v4-flash-loop-smoke-marker.md` with the **exact** line:

  ```text
  loop-state: first-pass
  ```

- Dev does **not** create the complete artifact yet.
- Dev appends this session entry to `docs/SESSIONS.md` (one line: `First Dev pass for Dispatch 027. Marker created with loop-state: first-pass.`)
- Dev creates `messages/003-dev-to-review.md` with:
  - `## From = Dev`
  - `## To = Review`
  - `## State = ready-for-review`
  - Explicit instruction to Review that this is the **first Review pass** and Review must route back to Dev per the dispatch's Forced Loop Semantics section 2, returning `State = needs-dev-fix`.
- Dev must not modify any product code, tests, UI, storage, or Tauri configuration files.
- Dev does not commit.

### Step 2: First Review Pass (Review picks up from `003-dev-to-review.md`)

- Review re-reads `messages/003-dev-to-review.md` from disk. Confirms `## To = Review` and `State = ready-for-review`.
- Review confirms the marker file contains exactly `loop-state: first-pass`.
- **Intentional forced loop**: Review returns `State = needs-dev-fix` to Dev, regardless of marker contents.
- Review creates `messages/004-review-to-dev.md` with:
  - `## From = Review`
  - `## To = Dev`
  - `## State = needs-dev-fix`
  - Instruction to Dev: update the marker to `loop-state: second-pass`, then create the complete artifact at `agents/artifacts/027-deepseek-v4-flash-loop-smoke-complete.md`, then route to Review via `005-dev-to-review.md`.
- Review does not write a review artifact yet (the final Review pass writes the review artifact).
- Review appends this session entry to `docs/SESSIONS.md`.
- Review does not commit.

### Step 3: Second Dev Pass (Dev picks up from `004-review-to-dev.md`)

- Dev re-reads `messages/004-review-to-dev.md` from disk. Confirms `## To = Dev` and `State = needs-dev-fix`.
- Dev updates the marker file to contain the **exact** line:

  ```text
  loop-state: second-pass
  ```

- Dev creates `agents/artifacts/027-deepseek-v4-flash-loop-smoke-complete.md` documenting the artifact-only loop completion. Format per `agents/ARTIFACTS.md`:

  ```markdown
  # Complete: DeepSeek V4 Flash Forced Loop Smoke

  ## Summary
  Artifact-only Phase 3 interactive smoke test validating one forced Review → Dev loop.

  ## Files Created
  | Action | Path | Notes |
  |--------|------|-------|
  | Created | agents/artifacts/027-deepseek-v4-flash-loop-smoke-marker.md | Loop marker, updated from `first-pass` to `second-pass` |
  | Created | agents/artifacts/027-deepseek-v4-flash-loop-smoke-complete.md | This file |
  | Created | agents/channels/027-deepseek-v4-flash-loop-smoke/messages/003-dev-to-review.md | First Dev → Review handoff |
  | Created | agents/channels/027-deepseek-v4-flash-loop-smoke/messages/004-review-to-dev.md | First Review → Dev (forced loop) |
  | Created | agents/channels/027-deepseek-v4-flash-loop-smoke/messages/005-dev-to-review.md | Second Dev → Review handoff |

  ## Deviations from Plan
  (None)

  ## Verification
  - command: grep 'loop-state:' agents/artifacts/027-deepseek-v4-flash-loop-smoke-marker.md
  - shell used: bash
  - result: loop-state: second-pass
  - checkpoint-scoped or unrelated repo-state: checkpoint-scoped
  ```

- Dev appends this session entry to `docs/SESSIONS.md`.
- Dev creates `messages/005-dev-to-review.md` with:
  - `## From = Dev`
  - `## To = Review`
  - `## State = ready-for-review`
  - Summary of the fix applied (marker updated to `second-pass`, complete artifact created).
- Dev must not modify any product code, tests, UI, storage, or Tauri configuration files.
- Dev does not commit.

### Step 4: Second Review Pass (Review picks up from `005-dev-to-review.md`)

- Review re-reads `messages/005-dev-to-review.md` from disk. Confirms `## To = Review` and `State = ready-for-review`.
- Review verifies:
  1. Marker file contains exactly `loop-state: second-pass` ✅
  2. Complete artifact exists at `agents/artifacts/027-deepseek-v4-flash-loop-smoke-complete.md` ✅
  3. No product code was modified (check `git diff --name-only`) ✅
- Review creates `agents/artifacts/027-deepseek-v4-flash-loop-smoke-review.md` with PASS verdict.
- Review appends this session entry to `docs/SESSIONS.md`.
- Review creates `messages/006-review-to-main.md` with:
  - `## From = Review`
  - `## To = Main`
  - `## State = review-pass`
- Review does not commit.

## Data / Storage Changes

None. This is an artifact-only smoke test with no data model or storage changes.

## UI Specifications

None. No UI components are created or modified.

## Acceptance Criteria

- [ ] All four worker turns (Plan, Dev×2, Review×2) launch as interactive Pi sessions on `openrouter/deepseek/deepseek-v4-flash`; no GPT model is invoked.
- [ ] Each turn produces exactly one valid next-message file matching its allowed filename.
- [ ] The forced Review → Dev loop occurs exactly once (route is exactly `Main → Plan → Dev → Review → Dev → Review → Main`).
- [ ] Loop marker transitions cleanly from `first-pass` to `second-pass`.
- [ ] Final route reaches Main with `State = review-pass`.
- [ ] No product code is changed.

## Estimated Complexity

- **Small** (artifact-only, no code changes)
- **Estimated file count**: 1 marker + 1 complete + 1 review + 4 channel messages = 7 new files (plus updated SESSIONS.md)
