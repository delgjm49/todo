# Plan: Phase 2 Interactive Pane Reuse Loop

## Overview
This is a tiny artifact-only meta-workflow test for dispatch-auto Phase 2 interactive mode. It must force exactly one Review → Dev loop so the orchestrator can validate reuse of the already-running Dev pane/session within the same dispatch.

## Prerequisites
- Follow the active channel `agents/channels/016-phase2-interactive-pane-reuse-loop-channel.md` exactly.
- Preserve the required route: `Main → Plan → Dev → Review → Dev → Review → Main`.
- Do not modify app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, external scripts, or make commits.

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Create | `agents/artifacts/016-phase2-interactive-pane-reuse-loop-marker.md` | Disposable marker proving first and second Dev passes. |
| Create/Modify | `agents/artifacts/016-phase2-interactive-pane-reuse-loop-complete.md` | Dev completion notes and lightweight verification results. |
| Create/Modify | `agents/artifacts/016-phase2-interactive-pane-reuse-loop-review.md` | Review findings for both passes. |
| Modify | `agents/channels/016-phase2-interactive-pane-reuse-loop-channel.md` | Append-only workflow messages; only the Summary status line may be updated as metadata. |
| Modify | `docs/SESSIONS.md` | Required append-only session entries. |

## Implementation Steps
### Step 1: First Dev pass — create first-pass marker
- Create `agents/artifacts/016-phase2-interactive-pane-reuse-loop-marker.md` with exactly this single line:

  ```text
  phase2-reuse-loop-state: first-pass
  ```

- Create or update `agents/artifacts/016-phase2-interactive-pane-reuse-loop-complete.md` with a brief first-pass summary and verification report.
- Run lightweight verification only, such as checking the marker content and `git diff --check`.
- Append the next `Dev → Review` message with `State = ready-for-review`.
- **Verify**: The marker file contains the exact first-pass line.

### Step 2: First Review pass — intentionally return to Dev
- Review the marker and complete artifact.
- Even if the first Dev pass is otherwise correct, intentionally write/update `agents/artifacts/016-phase2-interactive-pane-reuse-loop-review.md` with verdict `FAIL — Return to Dev`.
- Append the next `Review → Dev` message with `State = needs-dev-fix` requiring Dev to update the marker to exactly:

  ```text
  phase2-reuse-loop-state: second-pass
  ```

- Include the required Review FAIL → Dev close block from `agents/workflows/dispatch-channel-protocol.md` verbatim in the channel message.
- **Verify**: The channel route now includes `Main → Plan → Dev → Review → Dev`.

### Step 3: Second Dev pass — update marker and completion artifact
- Update `agents/artifacts/016-phase2-interactive-pane-reuse-loop-marker.md` to exactly this single line:

  ```text
  phase2-reuse-loop-state: second-pass
  ```

- Update `agents/artifacts/016-phase2-interactive-pane-reuse-loop-complete.md` with fix notes showing this was the second Dev pass and include lightweight verification results.
- Append the next `Dev → Review` message with `State = ready-for-review`.
- **Verify**: The marker file contains the exact second-pass line.

### Step 4: Second Review pass — pass to Main
- Verify the marker contains exactly `phase2-reuse-loop-state: second-pass`.
- Verify the complete artifact documents the second-pass update and verification.
- Verify no disallowed files were modified by workers.
- Write/update `agents/artifacts/016-phase2-interactive-pane-reuse-loop-review.md` with verdict `PASS`.
- Append the next `Review → Main` message with `State = review-pass`.
- **Verify**: The final audit trail is `Main → Plan → Dev → Review → Dev → Review → Main`.

## Data / Storage Changes
None. This dispatch creates disposable markdown artifacts only; no app data model, JSON storage, or migrations are involved.

## UI Specifications
None. No UI files or behavior should change.

## Acceptance Criteria
- [ ] First Dev creates `agents/artifacts/016-phase2-interactive-pane-reuse-loop-marker.md` with exact line `phase2-reuse-loop-state: first-pass`.
- [ ] First Review intentionally returns to Dev with `State = needs-dev-fix`, even if the first pass is otherwise correct.
- [ ] Second Dev updates the marker to exact line `phase2-reuse-loop-state: second-pass`.
- [ ] Second Dev writes/updates `agents/artifacts/016-phase2-interactive-pane-reuse-loop-complete.md` with fix notes and lightweight verification results.
- [ ] Second Review verifies the second-pass marker and returns `State = review-pass` to Main.
- [ ] The channel audit trail follows exactly `Main → Plan → Dev → Review → Dev → Review → Main`.
- [ ] Workers do not modify app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, external scripts, or make commits.

## Dependencies or Prerequisites
- The dispatch-auto orchestrator will run the next pickup from `agents/channels/016-phase2-interactive-pane-reuse-loop-channel.md`.
- Dev and Review should use the actual shell available in the environment for lightweight checks.

## Estimated Complexity
- Small
- 3 artifact files plus append-only channel/session updates
