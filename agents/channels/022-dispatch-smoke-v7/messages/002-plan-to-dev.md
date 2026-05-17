# Message 002 — Plan → Dev — 2026-05-16

## From
Plan

## To
Dev

## State
ready-for-dev

## Read
- agents/artifacts/022-dispatch-smoke-v7-dispatch.md
- agents/artifacts/022-dispatch-smoke-v7-plan.md
- agents/workflows/dispatch-channel-protocol.md

## Task
Implement Smoke v7 — Phase 3 Spool-Format Dispatch Test. This is an artifact-only smoke test with a forced route: `Main → Plan → Dev → Review → Dev → Review → Main`.

### ⚠️ Spool-Format Differences vs Legacy Channels
This is the **first spool-format dispatch**. Key differences:
- Messages are **individual files** in `agents/channels/022-dispatch-smoke-v7/messages/`, not sections in a single `.md` file.
- Pickup uses **directory path**: `pickup agents/channels/022-dispatch-smoke-v7/` (trailing slash, no `.md`).
- Each agent creates **exactly one new numbered message file**. Never modify existing files.
- Filename pattern: `NNN-from-to.md` (e.g., `003-dev-to-review.md`).
- Active role is determined from the `## To` field of the latest message file.

### First Dev Pass
1. Create `agents/artifacts/022-dispatch-smoke-v7-marker.md` with the exact line:
   ```
   smoke-v7-state: first-pass
   ```
2. Append `agents/channels/022-dispatch-smoke-v7/messages/003-dev-to-review.md` with:
   - `## From = Dev`
   - `## To = Review`
   - `State = ready-for-review`
   - `## Read` includes the plan artifact and marker.
   - `## Task` instructs Review to intentionally return to Dev.
3. Update `docs/SESSIONS.md` with a Dev session entry.
4. Do not commit; Main handles git.

### Second Dev Pass (after intentional Review → Dev return)
1. **Re-read the channel from disk** (`agents/channels/022-dispatch-smoke-v7/messages/`) — ignore any cached state.
2. Parse the latest message file (should be `004-review-to-dev.md` with `## To = Dev` and `State = needs-dev-fix`).
3. Recompute active role from the `## To` field.
4. Update `agents/artifacts/022-dispatch-smoke-v7-marker.md` to contain exactly:
   ```
   smoke-v7-state: second-pass
   ```
5. Create `agents/artifacts/022-dispatch-smoke-v7-complete.md` with lightweight verification results documenting both Dev passes.
6. Append `agents/channels/022-dispatch-smoke-v7/messages/005-dev-to-review.md` with:
   - `## From = Dev`
   - `## To = Review`
   - `State = ready-for-review`
   - `## Read` includes the updated marker and complete artifact.
   - `## Task` instructs Review to verify both passes.
7. Update `docs/SESSIONS.md` with a Dev session entry.
8. Do not commit; Main handles git.

### Constraints
- Do not modify app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, or external scripts.
- Only create/update files under `agents/artifacts/` and `agents/channels/022-dispatch-smoke-v7/messages/`.
- `docs/SESSIONS.md` updates are allowed.

## Close Requirements
- Create exactly one next message file in this channel's messages directory (`003-dev-to-review.md` for first pass, `005-dev-to-review.md` for second pass).
- Update `docs/SESSIONS.md`.
- Do not commit; Main handles git.
