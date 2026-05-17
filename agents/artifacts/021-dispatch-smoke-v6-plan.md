# Plan: Dispatch Smoke v6 — Pickup Hardening for Reused Interactive Workers

## Overview

Tiny artifact-only dispatch to validate dispatch-auto pickup hardening for reused interactive worker sessions. The core test objective is ensuring the second Dev pass **re-reads the channel from disk**, ignores stale remembered channel state from its first turn, recomputes its active role from the latest channel message addressed to Dev, and appends a fresh `Dev → Review` message — addressing the suspected stale-context root cause that stalled Dispatch Smoke v5 (020).

## Prerequisites

- `agents/channels/021-dispatch-smoke-v6-channel.md` exists with the first `Main → Plan` message (already done).
- `agents/artifacts/021-dispatch-smoke-v6-dispatch.md` exists and has been read.

## Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Create | `agents/artifacts/021-dispatch-smoke-v6-plan.md` | This plan |
| Create | `agents/artifacts/021-dispatch-smoke-v6-marker.md` | Disposable marker created by Dev |
| Create | `agents/artifacts/021-dispatch-smoke-v6-complete.md` | Complete artifact created by second Dev pass |
| Create | `agents/artifacts/021-dispatch-smoke-v6-review.md` | Review artifact created by Review |
| Modify | `agents/channels/021-dispatch-smoke-v6-channel.md` | Appended by Plan, Dev, Review per workflow |
| Modify | `docs/SESSIONS.md` | Updated by Plan, Dev, Review per workflow |

## Required Route

```
Main → Plan → Dev → Review → Dev → Review → Main
```

Exactly 6 `## Message` blocks (not counting the initial `Main → Plan` which is already present). No pre-populated messages beyond the existing Message 1.

## Implementation Steps

### Step 1: Plan (this session)
- Create this plan artifact at `agents/artifacts/021-dispatch-smoke-v6-plan.md`.
- Append `Plan → Dev` message to the dispatch channel with `State = ready-for-dev`.
- Update `docs/SESSIONS.md` with a Plan session entry.
- Do not commit.

### Step 2: First Dev pass
- **Read the channel from disk**: `agents/channels/021-dispatch-smoke-v6-channel.md`. Parse the latest message addressed to Dev (should be the `Plan → Dev` message from Step 1).
- Create the marker at `agents/artifacts/021-dispatch-smoke-v6-marker.md` with the exact line:
  ```
  smoke-v6-state: first-pass
  ```
- **Verify**: `grep -F 'smoke-v6-state: first-pass' agents/artifacts/021-dispatch-smoke-v6-marker.md`.
- Run lightweight artifact verification (marker grep, `git diff --check`, `git diff --name-only` to confirm no app/tooling files changed).
- Append a `Dev → Review` message to the dispatch channel with `State = ready-for-review`.
- Update `docs/SESSIONS.md` with a Dev session entry.
- **Do not modify** app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, or external scripts.

### Step 3: First Review pass
- Read the channel from disk. Parse the latest message (should be `Dev → Review`).
- Verify the marker contains `smoke-v6-state: first-pass`.
- Create/review `agents/artifacts/021-dispatch-smoke-v6-review.md` with the findings.
- **Intentionally return `FAIL — Return to Dev`** with `State = needs-dev-fix`, even though everything is correct. Instruct Dev to:
  - Re-read the channel from disk (do not rely on remembered state from the first pass).
  - Parse the latest message — identify the `Review → Dev` message with `State = needs-dev-fix`.
  - Recompute active role from the `### To` field.
  - Update the marker to `smoke-v6-state: second-pass`.
  - Create the complete artifact at `agents/artifacts/021-dispatch-smoke-v6-complete.md`.
  - Append a **fresh** `Dev → Review` message.
- Append the `Review → Dev` message to the dispatch channel with the required FAIL → Dev close block (per protocol).
- Update `docs/SESSIONS.md` with a Review session entry.
- Do not commit.

### Step 4: Second Dev pass — ⚠️ KEY TEST OBJECTIVE
- **Must re-read the channel from disk** (`agents/channels/021-dispatch-smoke-v6-channel.md`). Do NOT rely on any cached/remembered channel state from the first Dev pass. This is the primary behavior being validated.
- **Parse the latest message** — identify that the most recent `## Message` block is `Review → Dev` with `State = needs-dev-fix`.
- **Recompute active role** from that message's `### To` field (which should be `Dev`). The task described in that message tells Dev what to do next.
- Update the marker to:
  ```
  smoke-v6-state: second-pass
  ```
- Create the complete artifact at `agents/artifacts/021-dispatch-smoke-v6-complete.md` containing:
  - Summary of both Dev passes.
  - Confirmation that marker progressed first-pass → second-pass.
  - **Verification results** using the canonical reporting form: marker grep, `git diff --check`, `git diff --name-only`.
- Append a **fresh** `Dev → Review` message to the dispatch channel with `State = ready-for-review`. This must be a separate new `## Message` block appended after the existing `Review → Dev` message — not a modification or re-use of the first Dev's `Dev → Review` message.
- Update `docs/SESSIONS.md` with a Dev session entry.
- Do not commit.

#### Concrete steps to avoid stale context
1. `cat agents/channels/021-dispatch-smoke-v6-channel.md` to get the full file from disk.
2. Count existing `## Message` headings to determine the next message number.
3. Parse the last `### To`, `### State`, `### Task` blocks from the file content.
4. If the latest `### To` is `Dev` and `### State` is `needs-dev-fix`, you are on the second Dev pass.
5. Follow the instructions in `### Task` — do not re-execute the first-pass task.

### Step 5: Second Review pass
- Read the channel from disk. Parse the latest message (should be the second `Dev → Review` with `State = ready-for-review`).
- Verify the marker now contains `smoke-v6-state: second-pass`.
- Verify the complete artifact documents both Dev passes (first-pass marker creation and second-pass marker update + complete artifact).
- Verify the channel audit trail has exactly 6 distinct `## Message` blocks:
  1. Main → Plan (already present)
  2. Plan → Dev (from Step 1)
  3. Dev → Review (from Step 2)
  4. Review → Dev (from Step 3)
  5. Dev → Review (from Step 4 — fresh, separate message)
  6. Review → Main (this step)
- Confirm no message was pre-populated or duplicated. All 6 messages are distinct.
- Return `State = review-pass` to Main.
- Update `docs/SESSIONS.md` with a Review session entry.
- Do not commit.

## Stale-Context Warning for Dev

**The primary failure mode under test is stale channel context on reused Dev pickup.** Dispatch Smoke v5 stalled because the second Dev pass remembered its first-turn state and failed to detect that the channel had moved on. To avoid this:

- **Always re-read the channel file from disk** using `cat` or `read`. Do not rely on what you remember from earlier turns.
- **Parse the latest message** from the file content, not from memory.
- **Recompute your active role** from the `### To` field of the latest message.
- **Verify you have the right message number** by counting `## Message` headings in the file.
- If in doubt, re-read the file again before appending your handoff message.

## Data / Storage Changes

None. This is artifact-only.

## UI Specifications

N/A — artifact-only smoke test.

## Acceptance Criteria

- [ ] Plan writes `agents/artifacts/021-dispatch-smoke-v6-plan.md` and appends `Plan → Dev` to the channel.
- [ ] First Dev creates marker with exact line `smoke-v6-state: first-pass` and appends `Dev → Review`.
- [ ] First Review intentionally returns `FAIL — Return to Dev` with `State = needs-dev-fix`.
- [ ] **Second Dev re-reads channel from disk**, parses latest `Review → Dev` message, recomputes role, updates marker to `smoke-v6-state: second-pass`, creates `agents/artifacts/021-dispatch-smoke-v6-complete.md`, and appends a **fresh** `Dev → Review` message (separate from the first `Dev → Review`).
- [ ] Second Review verifies the marker, complete artifact, channel audit trail (exactly 6 distinct messages), and returns `State = review-pass` to Main.
- [ ] No app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, or external script changes are made by workers.

## Estimated Complexity

- **Small**
- **File count**: up to 4 new artifacts (plan, marker, complete, review) + channel/SESSIONS updates
