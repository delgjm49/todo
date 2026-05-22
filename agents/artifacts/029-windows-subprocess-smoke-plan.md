# Plan: Windows Subprocess Smoke

## Overview
This dispatch is a tiny artifact-only smoke to verify the dispatch-auto subprocess path on Windows. Dev should create the minimal completion artifact, append the session log, and route the channel to Review without touching product code or orchestration files.

## Prerequisites
- The latest channel message must remain Plan → Dev for this dispatch.
- Keep the scope limited to artifacts, channel messages, and `docs/SESSIONS.md`.

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Create | agents/artifacts/029-windows-subprocess-smoke-complete.md | Minimal completion note from Dev confirming the smoke ran through the worker handoff path. |
| Create | agents/channels/029-windows-subprocess-smoke/messages/003-dev-to-review.md | Route the dispatch to Review with `State = ready-for-review`. |
| Modify | docs/SESSIONS.md | Append a Dev session entry documenting the smoke completion and next handoff. |

## Implementation Steps
### Step 1: Create the completion artifact
- Write a short `Complete` artifact noting that this dispatch is artifact-only and no product files were changed.
- File: `agents/artifacts/029-windows-subprocess-smoke-complete.md`
- **Verify**: File exists and mentions the dispatch stayed docs/artifacts/channel-only.

### Step 2: Append the Dev session entry
- Add a new append-only session entry to `docs/SESSIONS.md` for the Dev pass.
- Mention the channel, dispatch, completion artifact, and that the next hop is Review.
- **Verify**: The new entry appears at the end of the log.

### Step 3: Route to Review
- Create `agents/channels/029-windows-subprocess-smoke/messages/003-dev-to-review.md`.
- Set `To = Review` and `State = ready-for-review`.
- In `Read`, reference the dispatch artifact and the completion artifact.
- In `Task`, tell Review to validate the artifact-only subprocess smoke and route back to Main with a pass verdict if everything is clean.
- **Verify**: Exactly one new channel message exists and the sequence advances to 003.

## Data / Storage Changes
None.

## UI Specifications
None.

## Acceptance Criteria
- [ ] Dev creates only the minimal completion artifact requested.
- [ ] `docs/SESSIONS.md` gets a Dev session entry.
- [ ] The channel advances to `003-dev-to-review.md` with `State = ready-for-review`.
- [ ] No product code, tests, package files, Tauri config, UI, storage, or orchestration files are modified.

## Dependencies or Prerequisites
- `agents/artifacts/029-windows-subprocess-smoke-dispatch.md`
- `agents/channels/029-windows-subprocess-smoke/messages/001-main-to-plan.md`
- `agents/artifacts/029-windows-subprocess-smoke-plan.md`

## Estimated Complexity
- Small
- Estimated file count: 3