# Plan: Dispatch Smoke v5

## Overview
A tiny artifact-only meta-workflow smoke test to validate the current dispatch-auto system end-to-end. The work is limited to disposable artifacts under `agents/artifacts/` and required workflow bookkeeping (channel messages, SESSIONS.md). The route explicitly requires a forced `Review → Dev` loop so the full `Main → Plan → Dev → Review → Dev → Review → Main` chain is exercised.

## Prerequisites
- Channel `agents/channels/020-dispatch-smoke-v5-channel.md` exists with `Message 1 — Main → Plan`
- Dispatch `agents/artifacts/020-dispatch-smoke-v5-dispatch.md` exists with scope and constraints

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Create | `agents/artifacts/020-dispatch-smoke-v5-marker.md` | Disposable marker artifact for Dev passes |
| Create | `agents/artifacts/020-dispatch-smoke-v5-complete.md` | Dev complete artifact with verification |
| Create | `agents/artifacts/020-dispatch-smoke-v5-review.md` | Review artifact |
| Modify | `agents/channels/020-dispatch-smoke-v5-channel.md` | Append messages per workflow |
| Modify | `docs/SESSIONS.md` | Append session entry per close requirements |

## Implementation Steps

### Step 1: First Dev Pass
- **File**: `agents/artifacts/020-dispatch-smoke-v5-marker.md`
- Create the marker file with the exact single line:
  ```text
  smoke-v5-state: first-pass
  ```
- **Verify**: Confirm `grep -Fx 'smoke-v5-state: first-pass' agents/artifacts/020-dispatch-smoke-v5-marker.md` succeeds.
- Do **not** modify app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, or external scripts.

### Step 2: First Review Pass (Intentional Return to Dev)
- **File**: `agents/artifacts/020-dispatch-smoke-v5-review.md`
- Verify the marker contains `smoke-v5-state: first-pass`.
- **Intentionally** return `FAIL — Return to Dev` with `State = needs-dev-fix`, even if everything else is correct.
- Instruct Dev to update the marker to `smoke-v5-state: second-pass`.

### Step 3: Second Dev Pass
- **File**: `agents/artifacts/020-dispatch-smoke-v5-marker.md`
- Update the marker from `smoke-v5-state: first-pass` to:
  ```text
  smoke-v5-state: second-pass
  ```
- **File**: `agents/artifacts/020-dispatch-smoke-v5-complete.md`
- Create the complete artifact with:
  - Summary: what was built (both Dev passes)
  - Files changed
  - Fix notes documenting the forced Review → Dev loop
  - Verification section with results from: `grep -Fx 'smoke-v5-state: second-pass' agents/artifacts/020-dispatch-smoke-v5-marker.md`
- **Verify**: Confirm the marker now contains the second-pass line.

### Step 4: Second Review Pass (Final)
- **File**: `agents/artifacts/020-dispatch-smoke-v5-review.md`
- Update the review artifact with:
  - Re-review findings confirming marker has `smoke-v5-state: second-pass`
  - Verification of complete artifact
  - Verdict: **PASS** — return to Main with `State = review-pass`

## Data / Storage Changes
None. This is an artifact-only smoke test.

## UI Specifications
None.

## Acceptance Criteria
- [ ] Plan writes `agents/artifacts/020-dispatch-smoke-v5-plan.md` with tiny artifact-only plan
- [ ] First Dev creates marker with exact line `smoke-v5-state: first-pass`
- [ ] First Review intentionally returns `FAIL — Return to Dev` with `State = needs-dev-fix`
- [ ] Second Dev updates marker to `smoke-v5-state: second-pass` and creates `agents/artifacts/020-dispatch-smoke-v5-complete.md`
- [ ] Second Review returns `State = review-pass` to Main
- [ ] Channel audit trail follows `Main → Plan → Dev → Review → Dev → Review → Main`
- [ ] No app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, or external script changes are made by workers

## Estimated Complexity
- **Small** (artifact-only, ~5 disposable file creates/updates, no code changes)
