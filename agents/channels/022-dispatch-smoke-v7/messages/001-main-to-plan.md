# Message 001 — Main → Plan — 2026-05-16

## From
Main

## To
Plan

## State
ready-for-plan

## Read
- agents/artifacts/022-dispatch-smoke-v7-dispatch.md
- agents/workflows/dispatch-channel-protocol.md
- agents/ARTIFACTS.md
- agents/CLOSING.md
- agents/orchestration.json

## Task
Create the implementation plan for `Smoke v7 — Phase 3 Spool-Format Dispatch Test`. Keep the plan tiny and artifact-only, but explicitly require the forced route `Main → Plan → Dev → Review → Dev → Review → Main`.

**Primary test objective**: validate Phase 3 spool-format channel workflow end-to-end. This is the first dispatch to use the directory-based channel format (`agents/channels/NNN-feature/messages/NNN-from-to.md`) instead of the legacy single-file channel format. Every agent must create exactly one new numbered message file; no agent may modify an existing file.

The plan must:

1. Explicitly warn Dev about spool-format differences vs legacy channels:
   - Messages are individual files in `messages/`, not sections in a single `.md` file.
   - Pickup instructions use `agents/channels/022-dispatch-smoke-v7/` (directory, trailing slash).
   - Each agent creates exactly one new file with the next sequential number.
   - The channel directory is `agents/channels/022-dispatch-smoke-v7/` (not a single `.md` file).

2. Instruct **first-pass Plan** to create `agents/artifacts/022-dispatch-smoke-v7-plan.md` and append `002-plan-to-dev.md`.

3. Instruct **first-pass Dev** to create `agents/artifacts/022-dispatch-smoke-v7-marker.md` with exact line `smoke-v7-state: first-pass`, then append `003-dev-to-review.md`.

4. Instruct **first-pass Review** to intentionally return to Dev with `State = needs-dev-fix`, even if the first pass is otherwise correct. Append `004-review-to-dev.md`.

5. Instruct **second-pass Dev** to:
   - Re-read the channel from disk (`agents/channels/022-dispatch-smoke-v7/messages/`) — explicitly ignore any cached/remembered state from the first turn.
   - Parse the latest message file (should be `004-review-to-dev.md` with `## To = Dev` and `State = needs-dev-fix`).
   - Recompute active role from the `## To` field of that message.
   - Update the marker to `smoke-v7-state: second-pass`.
   - Create `agents/artifacts/022-dispatch-smoke-v7-complete.md` with lightweight verification results.
   - Append `005-dev-to-review.md`.

6. Instruct **second-pass Review** to verify the second-pass marker, confirm the complete artifact documents both passes, confirm the `messages/` directory has exactly 6 files with correct routing, and return `State = review-pass` to Main by appending `006-review-to-main.md`.

**Important framing**: This smoke's primary test objective is the spool format itself — directory creation, message file naming, sequencing, and worker role resolution from individual files. The re-review loop (Dev → Review → Dev → Review) validates that the second Dev pass correctly re-reads the channel from disk and resolves its role from the latest message file, not from cached state.

Do not modify app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, or external scripts.

Write the plan to `agents/artifacts/022-dispatch-smoke-v7-plan.md`.

### Close Requirements
- Append the next message file (`002-plan-to-dev.md`) to this channel's `messages/` directory.
- Update `docs/SESSIONS.md` with a Plan session entry.
- Do not commit; Main handles git.
