# Plan: Dispatch Smoke Kimi Re-Review Loop

## Overview
Create a deliberately tiny, artifact-only smoke test that exercises the forced `Main → Plan → Dev → Review → Dev → Review → Main` dispatch route while Kimi K2.6/no-reasoning support is present in the dispatch-auto setup. The first Dev pass creates a disposable marker requiring review return; the first Review must intentionally route back to Dev; the Dev fix updates the marker for re-review; the second Review verifies the marker, audit trail, and any observable Kimi/no-reasoning launch evidence before returning PASS to Main.

## Prerequisites
- Use the active dispatch channel: `agents/channels/011-dispatch-smoke-kimi-re-review-channel.md`.
- Follow `agents/workflows/dispatch-channel-protocol.md`, especially the Mandatory Re-Review Rule and Review FAIL → Dev Requirement.
- Follow artifact formats in `agents/ARTIFACTS.md` and verification reporting rules in `agents/CLOSING.md`.
- Treat Kimi/no-reasoning dispatch-auto launch evidence as observational only: note it if visible from logs/context, but do not block if external logs are unavailable.
- Do not modify orchestration scripts, app source, tests, package files, lockfiles, Tauri config, or user-facing product docs.
- Do not commit; Main handles git operations.

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Create | `agents/artifacts/011-dispatch-smoke-kimi-re-review-marker.md` | Disposable marker artifact used to force and verify the Kimi/no-reasoning re-review smoke loop. |
| Create/Modify | `agents/artifacts/011-dispatch-smoke-kimi-re-review-complete.md` | Dev completion artifact. Initial pass records marker creation; fix pass records marker update, forced loop exercise, and any observable Kimi/no-reasoning launch evidence. |
| Create/Modify | `agents/artifacts/011-dispatch-smoke-kimi-re-review-review.md` | Review artifact. First Review records intentional FAIL/return to Dev; second Review records PASS after marker/audit-trail checks and any observable launch evidence. |
| Modify | `agents/channels/011-dispatch-smoke-kimi-re-review-channel.md` | Append each handoff message; update summary status as appropriate. |
| Modify | `docs/SESSIONS.md` | Append each worker session entry at close. |

## Implementation Steps
### Step 1: Initial Dev marker and completion artifact
- Create `agents/artifacts/011-dispatch-smoke-kimi-re-review-marker.md` with obvious disposable smoke-test content.
- Include this exact state line in the marker: `review-loop-state: first-review-required`.
- Include a short note in the marker that this dispatch validates the dispatch-auto Kimi K2.6/no-reasoning path.
- Create `agents/artifacts/011-dispatch-smoke-kimi-re-review-complete.md` using the Complete artifact format.
- Record that this is intentionally artifact-only and that no app source/test/config/package files were changed.
- If any dispatch-auto logs or launch metadata are directly visible in-session, note whether a Kimi/no-reasoning worker slot launched without a reasoning-definition failure. If not visible, state that external launch evidence was unavailable and non-blocking.
- Run lightweight verification only:
  - `test -f agents/artifacts/011-dispatch-smoke-kimi-re-review-marker.md`
  - `grep -q "review-loop-state: first-review-required" agents/artifacts/011-dispatch-smoke-kimi-re-review-marker.md`
  - `git diff --check`
- Report each verification command in the `agents/CLOSING.md` verification format.
- Update `docs/SESSIONS.md` with a Dev session entry.
- Append `Dev → Review` as the next channel message with `State = ready-for-review`.
- **Verify**: The marker exists, the complete artifact exists, and the channel audit trail is `Main → Plan → Dev → Review` ready.

### Step 2: First Review intentionally returns to Dev
- Read the dispatch, plan, complete artifact, marker, and channel.
- Confirm the marker contains `review-loop-state: first-review-required` and references Kimi/no-reasoning dispatch-auto validation.
- Create `agents/artifacts/011-dispatch-smoke-kimi-re-review-review.md` using the Review artifact format.
- The first Review must return a required fix by design, even if all files look correct.
- Review verdict must be `FAIL — Return to Dev`.
- Append `Review → Dev` with `State = needs-dev-fix`.
- Include the required Review FAIL → Dev close block verbatim under the channel message `### Close Requirements`:

```markdown
---
## ⚠️ BEFORE YOU END
When you finish fixing the issues:
- [ ] Update the complete artifact with fix notes
- [ ] Update docs/SESSIONS.md with a session entry
- [ ] Append the next Dev → Review message to this dispatch channel
- [ ] Output only the short pickup instruction to the user
- [ ] Do NOT commit — Main handles git
```

- Update `docs/SESSIONS.md` with a Review session entry explaining the forced return was intentional and part of the smoke test.
- **Verify**: The channel has a `Review → Dev` message with `State = needs-dev-fix` and the verbatim close block.

### Step 3: Dev fix updates marker for re-review
- Update `agents/artifacts/011-dispatch-smoke-kimi-re-review-marker.md`, changing the state line from `review-loop-state: first-review-required` to `review-loop-state: re-review-ready`.
- Update `agents/artifacts/011-dispatch-smoke-kimi-re-review-complete.md` with fix notes stating that the forced first Review → Dev loop was exercised and the marker is ready for re-review.
- Preserve or add a note about observable Kimi/no-reasoning dispatch-auto launch evidence if available; otherwise note that no external launch metadata was available to the Dev session.
- Run lightweight verification:
  - `grep -q "review-loop-state: re-review-ready" agents/artifacts/011-dispatch-smoke-kimi-re-review-marker.md`
  - `git diff --check`
- Report each verification command in the Complete artifact using the `agents/CLOSING.md` verification format.
- Update `docs/SESSIONS.md` with a Dev fix session entry.
- Append `Dev → Review` with `State = ready-for-re-review`.
- **Verify**: The marker state is `re-review-ready`, the complete artifact has fix notes, and the channel audit trail includes `... Review → Dev → Review`.

### Step 4: Second Review returns PASS to Main
- Re-read the dispatch, plan, complete artifact, marker, and full channel.
- Verify the marker contains `review-loop-state: re-review-ready`.
- Verify the channel audit trail shows `Main → Plan → Dev → Review → Dev → Review` before appending the final return to Main.
- Update `agents/artifacts/011-dispatch-smoke-kimi-re-review-review.md` with the second Review result.
- The second Review verdict should be `PASS` if the marker and audit trail are correct and no app source/test/package/Tauri files were modified.
- Record whether Kimi/no-reasoning dispatch-auto launch evidence was observable. Do not fail solely because external logs were unavailable, but do fail if visible evidence shows a worker launch failed due to missing `reasoning` configuration.
- Append `Review → Main` with `State = review-pass`.
- Update `docs/SESSIONS.md` with a Review session entry.
- **Verify**: The channel is ready for Main and, after the append, represents the full expected path `Main → Plan → Dev → Review → Dev → Review → Main`.

## Data / Storage Changes
None. This dispatch creates and updates markdown workflow artifacts only. No app JSON schema, persisted todo data, migration, or local storage behavior changes are in scope.

## UI Specifications
None. No UI or product behavior changes are in scope.

## Acceptance Criteria
- [ ] `agents/artifacts/011-dispatch-smoke-kimi-re-review-marker.md` is created during the first Dev pass with `review-loop-state: first-review-required` and a note that the dispatch validates the Kimi/no-reasoning dispatch-auto path.
- [ ] The first Review intentionally returns to Dev with `State = needs-dev-fix` and includes the required FAIL → Dev close block verbatim in the channel.
- [ ] The Dev fix pass updates the marker to `review-loop-state: re-review-ready` and records fix notes in the complete artifact.
- [ ] The second Review verifies the marker and channel audit trail, then returns to Main with `State = review-pass`.
- [ ] The channel audit trail shows `Main → Plan → Dev → Review → Dev → Review → Main` by the end of the cycle.
- [ ] Workers note any observable Kimi/no-reasoning dispatch-auto launch evidence, without modifying orchestration/scripts or blocking on unavailable external logs.
- [ ] `docs/SESSIONS.md` records each worker handoff.
- [ ] No app source, test, package, lockfile, Tauri config, orchestration script, or user-facing product documentation files are modified.

## Dependencies or Prerequisites
- The dispatch-auto/orchestrator setup that may launch Kimi K2.6 lives outside this repo or in local configuration; workers only observe evidence available to their sessions.
- The committed `agents/orchestration.json` includes a `kimi-k2.6` model preset without an explicit reasoning suffix, but this dispatch must not alter role assignments or presets.

## Estimated Complexity
- Small
- Expected file count: 4 workflow/artifact files touched per worker cycle (`marker`, `complete`, `review`, `channel`) plus `docs/SESSIONS.md` bookkeeping.
