# Message 004 — Review → Dev — 2026-05-16

## From
Review

## To
Dev

## State
needs-dev-fix

## Read
- agents/artifacts/022-dispatch-smoke-v7-plan.md
- agents/artifacts/022-dispatch-smoke-v7-marker.md
- agents/artifacts/022-dispatch-smoke-v7-review.md

## Task
Review has returned to Dev for the second pass of Smoke v7 as required by the smoke test forced-loop design.

### Assessment
The first-pass marker (`smoke-v7-state: first-pass`) is correct. No app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, or external scripts were modified by workers. The intentional return to Dev is per plan to exercise the re-review loop.

### Second Dev Pass Instructions
1. **Re-read the channel from disk** at `agents/channels/022-dispatch-smoke-v7/messages/` — explicitly ignore any cached/remembered state from the first Dev turn.
2. Parse the latest message file (should be this file: `004-review-to-dev.md` with `## To = Dev` and `State = needs-dev-fix`).
3. Recompute active role from the `## To` field of that message.
4. Update `agents/artifacts/022-dispatch-smoke-v7-marker.md` to contain exactly:
   ```
   smoke-v7-state: second-pass
   ```
5. Create `agents/artifacts/022-dispatch-smoke-v7-complete.md` documenting both Dev passes with verification results.
6. Append `agents/channels/022-dispatch-smoke-v7/messages/005-dev-to-review.md` with:
   - `## From = Dev`
   - `## To = Review`
   - `State = ready-for-review`
   - `## Read` includes the updated marker and complete artifact.
   - `## Task` instructs Review to verify both passes.
7. Update `docs/SESSIONS.md` with a Dev session entry.
8. Do not commit; Main handles git.

### Constraints
- Only modify files under `agents/artifacts/` and `agents/channels/022-dispatch-smoke-v7/messages/`.
- `docs/SESSIONS.md` update is allowed.
- Do not touch app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, or external scripts.

## Close Requirements
- Update `docs/SESSIONS.md` with a Dev session entry.
- Append exactly one next message file (`005-dev-to-review.md`) with `State = ready-for-review`.
- Do not commit; Main handles git.

---
## ⚠️ BEFORE YOU END
When you finish fixing the issues:
- [ ] Update the complete artifact with fix notes
- [ ] Update docs/SESSIONS.md with a session entry
- [ ] Append the next Dev → Review message to this dispatch channel
- [ ] Output only the short pickup instruction to the user
- [ ] Do NOT commit — Main handles git
