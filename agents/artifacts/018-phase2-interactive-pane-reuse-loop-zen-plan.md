# Plan: Phase 2 Interactive Pane Reuse Loop Zen

## Overview
Tiny artifact-only dispatch to validate that dispatch-auto Phase 2 interactive mode reuses the already-running Dev pane/session for the second Dev turn in a same-dispatch Review → Dev loop. Workers create and update disposable marker/complete artifacts but touch no app source, tests, config, or scripts.

## Prerequisites
- None. This is a self-contained meta-workflow smoke test.

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Create | `agents/artifacts/018-phase2-interactive-pane-reuse-loop-zen-marker.md` | Disposable marker tracking loop state |
| Create (second pass) | `agents/artifacts/018-phase2-interactive-pane-reuse-loop-zen-complete.md` | Second-pass complete artifact with verification |
| Create | `agents/artifacts/018-phase2-interactive-pane-reuse-loop-zen-review.md` | Review artifact (first and second pass) |

## Implementation Steps

### Required Route
`Main → Plan → Dev → Review → Dev → Review → Main`

### Step 1: First Dev Pass
- **File**: `agents/artifacts/018-phase2-interactive-pane-reuse-loop-zen-marker.md`
- Create the marker file with the exact single line:
  ```
  phase2-reuse-loop-zen-state: first-pass
  ```
- Do NOT create a complete artifact in this pass.
- **Verify**: Run `grep -q 'phase2-reuse-loop-zen-state: first-pass' agents/artifacts/018-phase2-interactive-pane-reuse-loop-zen-marker.md`

### Step 2: First Review Pass (intentional loop)
- **File**: `agents/artifacts/018-phase2-interactive-pane-reuse-loop-zen-review.md`
- Verify the marker contains `phase2-reuse-loop-zen-state: first-pass`
- **Intentionally return to Dev** with `State = needs-dev-fix`
- Instruct Dev to update the marker to:
  ```
  phase2-reuse-loop-zen-state: second-pass
  ```

### Step 3: Second Dev Pass
- **File**: `agents/artifacts/018-phase2-interactive-pane-reuse-loop-zen-marker.md` (modify)
- Update the marker line to:
  ```
  phase2-reuse-loop-zen-state: second-pass
  ```
- **File**: `agents/artifacts/018-phase2-interactive-pane-reuse-loop-zen-complete.md` (create)
- Create the complete artifact with:
  - Summary of both Dev passes
  - Files changed (marker created + updated, complete created)
  - Deviations from plan (none, if followed exactly)
  - Verification: marker grep, `git diff --check`, `git diff --name-only`
- **Verify**: 
  - `grep -q 'phase2-reuse-loop-zen-state: second-pass' agents/artifacts/018-phase2-interactive-pane-reuse-loop-zen-marker.md`
  - `git diff --check`
  - `git diff --name-only` (confirm only `agents/artifacts/` and `docs/SESSIONS.md` changed)

### Step 4: Second Review Pass (final)
- **File**: `agents/artifacts/018-phase2-interactive-pane-reuse-loop-zen-review.md` (update)
- Verify marker now contains `phase2-reuse-loop-zen-state: second-pass`
- Verify complete artifact documents both passes
- Return `State = review-pass` to Main

## Data / Storage Changes
None.

## UI Specifications
None.

## Acceptance Criteria
- [ ] First Dev writes marker with exact line `phase2-reuse-loop-zen-state: first-pass`
- [ ] First Review writes/updates review artifact and returns `State = needs-dev-fix` to Dev
- [ ] Second Dev updates marker to `phase2-reuse-loop-zen-state: second-pass` and creates complete artifact
- [ ] Second Review returns `State = review-pass` to Main
- [ ] Channel audit trail follows `Main → Plan → Dev → Review → Dev → Review → Main`
- [ ] No app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, or external script changes by workers
- [ ] All created artifacts are under `agents/artifacts/`

## Estimated Complexity
- Small
- 4 artifact files (marker, complete, review — some created, some updated)
