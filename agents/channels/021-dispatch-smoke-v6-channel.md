# Dispatch Channel: Dispatch Smoke v6

## Summary
- Dispatch: agents/artifacts/021-dispatch-smoke-v6-dispatch.md
- Current status: ready-for-review
- Created by: Main
- Created: 2026-05-16

## Message 1 — Main → Plan — 2026-05-16

### To
Plan

### State
ready-for-plan

### Read
- agents/artifacts/021-dispatch-smoke-v6-dispatch.md
- agents/workflows/dispatch-channel-protocol.md
- agents/ARTIFACTS.md
- agents/CLOSING.md
- agents/orchestration.json

### Task
Create the implementation plan for `Dispatch Smoke v6`. Keep the plan tiny and artifact-only, but explicitly require the forced route `Main → Plan → Dev → Review → Dev → Review → Main`.

**Primary test objective**: validate dispatch-auto pickup hardening for reused interactive worker sessions. The second Dev pass must re-read the channel from disk, ignore stale remembered channel state from its first turn, recompute its active role from the latest channel message addressed to Dev, perform the second-pass task, and append a fresh `Dev → Review` message.

The plan must:

1. Instruct **first-pass Dev** to create `agents/artifacts/021-dispatch-smoke-v6-marker.md` with the exact line `smoke-v6-state: first-pass`, then **append a `Dev → Review` message** to the channel.
2. Instruct **first-pass Review** to intentionally return to Dev with `State = needs-dev-fix`, even if the first pass is otherwise correct.
3. Instruct **second-pass Dev** to:
   - **Re-read the channel from disk** (`agents/channels/021-dispatch-smoke-v6-channel.md`) — explicitly ignore any cached/remembered state from the first turn.
   - **Parse the latest message** addressed to Dev (the `Review → Dev` message with `State = needs-dev-fix`).
   - **Recompute active role** from the `### To` field of that message.
   - Update the marker to `smoke-v6-state: second-pass`.
   - Create `agents/artifacts/021-dispatch-smoke-v6-complete.md` with lightweight verification results.
   - **Append a fresh `Dev → Review` message** to the dispatch channel.
4. Instruct **second-pass Review** to verify the second-pass marker, confirm the complete artifact documents both passes, confirm the channel has exactly 6 distinct messages (nothing pre-populated), and return `State = review-pass` to Main.

**Important framing**: The prior v5 stall is not characterized only as "bookkeeping." The root cause under test is stale channel context on reused Dev pickup. The plan should explicitly warn Dev about this and include concrete steps to avoid it (re-read channel file from disk, parse latest message, recompute role).

Do not modify app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, or external scripts.

Write the plan to `agents/artifacts/021-dispatch-smoke-v6-plan.md`.

### Close Requirements
- Append the next message (Plan → Dev) to this channel.
- Update `docs/SESSIONS.md` with a Plan session entry.
- Do not commit; Main handles git.

## Message 2 — Plan → Dev — 2026-05-16

### To
Dev

### State
ready-for-dev

### Read
- agents/artifacts/021-dispatch-smoke-v6-dispatch.md
- agents/artifacts/021-dispatch-smoke-v6-plan.md
- agents/ARTIFACTS.md
- agents/CLOSING.md

### Task
Implement the first Dev pass as specified in the plan at `agents/artifacts/021-dispatch-smoke-v6-plan.md`.

**Step 1: First Dev pass**
1. Create `agents/artifacts/021-dispatch-smoke-v6-marker.md` with the exact line `smoke-v6-state: first-pass`.
2. Verify the marker content with `grep -F 'smoke-v6-state: first-pass' agents/artifacts/021-dispatch-smoke-v6-marker.md`.
3. Run lightweight artifact verification (marker grep, `git diff --check`, `git diff --name-only`). Do NOT modify app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, or external scripts.
4. Append a `Dev → Review` message to this dispatch channel with `State = ready-for-review`.
5. Update `docs/SESSIONS.md` with a Dev session entry.
6. Do not commit.

**Important**: This is the first of two Dev passes. After you append your `Dev → Review` message, Review will intentionally return to Dev with `State = needs-dev-fix`. The second Dev pass will test stale-context hardening separately.

### Close Requirements
- Append the next message (Dev → Review) to this channel.
- Update `docs/SESSIONS.md`.
- Do not commit; Main handles git.

---
## Message 3 — Dev → Review — 2026-05-16

### To
Review

### State
ready-for-review

### Read
- agents/artifacts/021-dispatch-smoke-v6-dispatch.md
- agents/artifacts/021-dispatch-smoke-v6-plan.md
- agents/artifacts/021-dispatch-smoke-v6-marker.md
- agents/CLOSING.md

### Task
Review the first Dev pass artifacts.

**Steps:**
1. Read the channel from disk. Parse the latest message (should be `Dev → Review` with `State = ready-for-review`).
2. Verify the marker at `agents/artifacts/021-dispatch-smoke-v6-marker.md` contains `smoke-v6-state: first-pass`.
3. Create/review `agents/artifacts/021-dispatch-smoke-v6-review.md` with findings.
4. **Intentionally return `FAIL — Return to Dev`** with `State = needs-dev-fix`, even though everything is correct. This forces the required Review → Dev loop for the stale-context test.
5. Append a `Review → Dev` message to this dispatch channel with the required FAIL → Dev close block.
6. Update `docs/SESSIONS.md` with a Review session entry.
7. Do not commit.

### Close Requirements
- Append the next message (Review → Dev) to this channel with FAIL close block.
- Update `docs/SESSIONS.md`.
- Do not commit; Main handles git.
