# Plan: Dispatch-Auto Failure Retry Smoke

## Overview
This is a tiny artifact-only smoke test for the dispatch-auto workflow. It should exercise the simple route `Main → Plan → Dev → Review → Main` while avoiding all app source, app test, package/Tauri config, product documentation, orchestration config, dispatch-auto code, and external script changes.

## Prerequisites
- Continue from `agents/channels/012-dispatch-auto-failure-retry-smoke-channel.md` with the latest message addressed to Dev.
- Read the dispatch artifact and workflow docs listed in the channel before making changes.
- Do not commit or push; Main handles all git operations.

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Create | `agents/artifacts/012-dispatch-auto-failure-retry-smoke-marker.md` | Disposable marker proving Dev ran, containing `smoke-state: dev-complete`. |
| Create | `agents/artifacts/012-dispatch-auto-failure-retry-smoke-complete.md` | Dev completion artifact with changed-file notes and lightweight verification results. |
| Create | `agents/artifacts/012-dispatch-auto-failure-retry-smoke-review.md` | Review artifact confirming the smoke-test artifacts and route. |
| Modify | `agents/channels/012-dispatch-auto-failure-retry-smoke-channel.md` | Append Dev → Review, then Review → Main messages as the workflow advances. |
| Modify | `docs/SESSIONS.md` | Append required Dev and Review session entries. |

## Implementation Steps
### Step 1: Create the Dev marker artifact
- Create `agents/artifacts/012-dispatch-auto-failure-retry-smoke-marker.md`.
- Include the exact line `smoke-state: dev-complete`.
- Include a short note that the marker is disposable and exists only for this dispatch-auto smoke test.
- **Verify**: `grep -q "smoke-state: dev-complete" agents/artifacts/012-dispatch-auto-failure-retry-smoke-marker.md` succeeds.

### Step 2: Create the complete artifact
- Create `agents/artifacts/012-dispatch-auto-failure-retry-smoke-complete.md` using the Complete artifact format from `agents/ARTIFACTS.md`.
- Summarize that only disposable workflow artifacts were created.
- List changed files that Dev created or modified.
- Record no deviations from this plan unless something unexpected occurs.
- Record no open questions unless something blocks completion.
- Record verification using the exact reporting format from `agents/CLOSING.md`.
- **Verify**: the complete artifact exists and references the marker path.

### Step 3: Run lightweight Dev verification
- Run `grep -q "smoke-state: dev-complete" agents/artifacts/012-dispatch-auto-failure-retry-smoke-marker.md`.
- Run `git diff --check`.
- Optionally inspect changed paths with `git diff --name-only` to confirm the dispatch remains artifact/workflow-only.
- Record each command in the complete artifact using the `agents/CLOSING.md` verification reporting format, including shell used and whether the command was run in the actual shell provided by the environment.
- **Verify**: no app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, or external scripts were modified by Dev.

### Step 4: Close Dev session
- Append a Dev session entry to `docs/SESSIONS.md`.
- Append the next `Dev → Review` message to `agents/channels/012-dispatch-auto-failure-retry-smoke-channel.md` with `State = ready-for-review`.
- Include these Read paths for Review: dispatch, plan, complete, marker, dispatch-channel protocol, artifact spec, and closing protocol.
- In the Review task, instruct Review to confirm the marker/artifacts and verify that no disallowed file categories changed.
- Do not commit.

### Step 5: Review expectations
- Review should read the channel message and required artifacts, then create `agents/artifacts/012-dispatch-auto-failure-retry-smoke-review.md` using the Review artifact format.
- Review should confirm:
  - `agents/artifacts/012-dispatch-auto-failure-retry-smoke-marker.md` exists.
  - The marker contains `smoke-state: dev-complete`.
  - The complete artifact records lightweight verification.
  - The channel audit trail follows `Main → Plan → Dev → Review` before Review appends its result.
  - No app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, or external scripts were modified. `docs/SESSIONS.md`, this channel, and `agents/artifacts/012-*` smoke-test artifacts are allowed workflow changes.
- Review should run lightweight checks such as the marker grep and `git diff --check`; it may use `git diff --name-only` to inspect changed paths.
- If everything is correct, Review should append `Review → Main` with `State = review-pass` and preserve the simple route `Main → Plan → Dev → Review → Main`.

## Data / Storage Changes
None. This dispatch creates only disposable markdown artifacts under `agents/artifacts/` plus required workflow bookkeeping in the channel and `docs/SESSIONS.md`.

## UI Specifications
None. No app UI, app source, styles, or tests should be changed.

## Acceptance Criteria
- [ ] Dev creates `agents/artifacts/012-dispatch-auto-failure-retry-smoke-marker.md` with `smoke-state: dev-complete`.
- [ ] Dev creates `agents/artifacts/012-dispatch-auto-failure-retry-smoke-complete.md` and records lightweight verification results.
- [ ] Review creates `agents/artifacts/012-dispatch-auto-failure-retry-smoke-review.md`.
- [ ] The channel route remains `Main → Plan → Dev → Review → Main` unless dispatch-auto failure/retry recovery requires an explicitly documented Main re-route.
- [ ] No app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, or external scripts are modified by workers.
- [ ] Workers do not commit or push.

## Estimated Complexity
- Small.
- Expected worker-created files: 3 artifacts, plus required channel and `docs/SESSIONS.md` updates.
