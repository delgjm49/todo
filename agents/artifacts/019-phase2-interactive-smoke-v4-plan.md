# Plan: Phase 2 Interactive Smoke v4

## Overview
A tiny artifact-only smoke test dispatch that validates the current dispatch-auto system end-to-end with `workerMode: "interactive"`. The test forces exactly one `Review → Dev` loop using disposable marker artifacts to validate the required route `Main → Plan → Dev → Review → Dev → Review → Main`.

## Prerequisites
- Dispatch artifact exists at `agents/artifacts/019-phase2-interactive-smoke-v4-dispatch.md`
- Channel exists at `agents/channels/019-phase2-interactive-smoke-v4-channel.md`
- `workerMode: "interactive"` is set in `agents/orchestration.json` (set by Main)

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Create | `agents/artifacts/019-phase2-interactive-smoke-v4-marker.md` | Disposable marker file (first Dev pass) |
| Modify | `agents/artifacts/019-phase2-interactive-smoke-v4-marker.md` | Update marker to second-pass state (second Dev pass) |
| Create | `agents/artifacts/019-phase2-interactive-smoke-v4-complete.md` | Complete artifact (second Dev pass) |
| Create | `agents/artifacts/019-phase2-interactive-smoke-v4-review.md` | Review artifact (first and second Review passes) |

## Implementation Steps

### Step 1: First Dev Pass — Create marker
- **File**: `agents/artifacts/019-phase2-interactive-smoke-v4-marker.md`
- Create the marker file with the exact content:
  ```markdown
  # Marker: Phase 2 Interactive Smoke v4
  
  smoke-v4-state: first-pass
  ```
- **Verify**: Confirm the file exists and contains exactly `smoke-v4-state: first-pass` on its own line.

### Step 2: First Review Pass — Return to Dev with `needs-dev-fix`
- **File**: `agents/artifacts/019-phase2-interactive-smoke-v4-review.md`
- Read the marker and verify it contains `smoke-v4-state: first-pass`.
- Create the review artifact documenting the finding.
- **Intentionally return FAIL — Return to Dev**, even if everything else is correct.
- Append a `Review → Dev` channel message with `State = needs-dev-fix`, instructing Dev to update the marker to `smoke-v4-state: second-pass` and create the complete artifact.
- Include the standard `⚠️ BEFORE YOU END` checklist in the close requirements.

### Step 3: Second Dev Pass — Update marker & create complete artifact
- Update the marker file so `smoke-v4-state: first-pass` becomes `smoke-v4-state: second-pass`.
- **File**: `agents/artifacts/019-phase2-interactive-smoke-v4-complete.md`
- Create the complete artifact documenting both Dev passes with verification results.
- Append a `Dev → Review` channel message with `State = ready-for-review`.

### Step 4: Second Review Pass — Verify marker & pass
- Read the marker and verify it now contains `smoke-v4-state: second-pass`.
- Read the complete artifact and verify it documents both Dev passes.
- Update the review artifact with the second-pass findings.
- Return **PASS** verdict in the review artifact.
- Append a `Review → Main` channel message with `State = review-pass`.

## Data / Storage Changes
No app storage changes. All artifacts are disposable markdown files under `agents/artifacts/`.

## UI Specifications
Not applicable — this is a workflow smoke test with no UI component.

## Acceptance Criteria
- [ ] Plan artifact exists at `agents/artifacts/019-phase2-interactive-smoke-v4-plan.md`
- [ ] First Dev pass creates marker with exact line `smoke-v4-state: first-pass`
- [ ] First Review pass creates review artifact and returns `State = needs-dev-fix` to Dev
- [ ] Second Dev pass updates marker to `smoke-v4-state: second-pass` and creates complete artifact
- [ ] Second Review pass returns `State = review-pass` to Main
- [ ] Channel audit trail follows `Main → Plan → Dev → Review → Dev → Review → Main`
- [ ] No app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, or external script changes are made by workers

## Estimated Complexity
- Small
- 3–4 disposable artifact files created/modified
- No source code, tests, or configuration changes
