# Plan: Fresh Retry Smoke

## Overview
This artifact-only dispatch validates that a fresh Plan retry can continue after the first Plan attempt intentionally stopped without writing a next spool message. Dev will complete only durable workflow artifacts for Dispatch 024, avoid all product implementation changes, and route the channel to Review for read-only validation.

## Prerequisites
- The retry marker must already exist at `agents/artifacts/024-fresh-retry-smoke-first-attempt-marker.md`.
- The channel must contain only the existing `001-main-to-plan.md` message before Plan appends `002-plan-to-dev.md`.
- No product code, Tauri config, tests, or app documentation should be changed for this smoke beyond the required workflow/session artifacts.

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Create | `agents/artifacts/024-fresh-retry-smoke-complete.md` | Dev completion artifact proving the retry path progressed from durable repo state. |
| Modify | `docs/SESSIONS.md` | Dev session entry noting artifact-only completion and channel handoff. |
| Create | `agents/channels/024-fresh-retry-smoke/messages/003-dev-to-review.md` | Next immutable spool message routing Review to validate the smoke. |
| Create | `agents/artifacts/024-fresh-retry-smoke-review.md` | Review artifact for the subsequent Review role, if the work passes to Review. |

## Implementation Steps
### Step 1: Re-orient from durable dispatch state
- Read `AGENTS.md`, `agents/workflows/dispatch-channel-protocol.md`, `agents/prompts/dev.md`, the active `002-plan-to-dev.md` message, and this plan artifact.
- Confirm the retry marker exists at `agents/artifacts/024-fresh-retry-smoke-first-attempt-marker.md`.
- Confirm `agents/channels/024-fresh-retry-smoke/messages/001-main-to-plan.md` and `002-plan-to-dev.md` exist, and do not edit either file.
- **Verify**: Dev can state that the marker exists and the latest message routes To = Dev with `State = ready-for-dev`.

### Step 2: Create the completion artifact
- Create `agents/artifacts/024-fresh-retry-smoke-complete.md` using the Complete artifact structure from `agents/ARTIFACTS.md`.
- Include a short summary that this was artifact-only smoke completion after a fresh Plan retry.
- In Files Changed, list only workflow artifacts/session documentation Dev actually creates or modifies.
- In Deviations, Open Questions, and Known Issues, use `(None)` unless Dev finds a real workflow problem.
- In Verification, report lightweight artifact checks rather than running product test/build commands; this dispatch intentionally avoids product implementation work.
- **Verify**: The complete artifact exists and does not claim any product code changes.

### Step 3: Update the session log
- Append a new `dev` entry to `docs/SESSIONS.md`.
- Reference the channel, dispatch, plan, and complete artifacts.
- Summarize that Dev completed the artifact-only smoke and prepared Review handoff.
- **Verify**: The session entry is appended; do not rewrite prior session entries.

### Step 4: Append the Dev → Review message
- Create exactly one new channel message: `agents/channels/024-fresh-retry-smoke/messages/003-dev-to-review.md`.
- Use `From = Dev`, `To = Review`, and `State = ready-for-review`.
- The Read list should include the dispatch, plan, complete artifact, and protocol.
- Ask Review to validate that no product implementation files changed, the expected artifact-only work is complete, and the spool sequence is intact.
- **Verify**: No other new files are created under `agents/channels/024-fresh-retry-smoke/messages/`.

## Data / Storage Changes
None. This smoke must not change local JSON storage shapes, migrations, fixtures, or app data behavior.

## UI Specifications
Not applicable. This dispatch is workflow/artifact-only and must not change UI components, styles, routes, or screenshots.

## Acceptance Criteria
- [ ] Dev creates `agents/artifacts/024-fresh-retry-smoke-complete.md` with the Complete artifact sections.
- [ ] Dev changes no product source, Tauri, test, storage, or UI files.
- [ ] Dev appends one `dev` session entry to `docs/SESSIONS.md`.
- [ ] Dev creates exactly one next message file, `agents/channels/024-fresh-retry-smoke/messages/003-dev-to-review.md`.
- [ ] The Dev → Review message routes to Review with `State = ready-for-review`.
- [ ] Existing channel message files remain unedited.

## Estimated Complexity
- Small
- Estimated file count for Dev: 3 files (`complete` artifact, `docs/SESSIONS.md`, and `003-dev-to-review.md`)
