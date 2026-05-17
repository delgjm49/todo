# Dispatch: Dispatch Smoke v6

## What
Run a tiny artifact-only dispatch that intentionally forces one `Review → Dev` loop to validate **dispatch-auto pickup hardening for reused interactive worker sessions**. The second Dev pass must re-read the channel from disk, ignore stale remembered channel state from its first turn, recompute its active role from the latest channel message addressed to Dev, perform the second-pass task, and append a fresh `Dev → Review` message.

## Why
Dispatch Smoke v5 (020) exercised the forced `Review → Dev` loop successfully, but the second Dev pass stalled — Dev ran but did not append a new channel message. The root cause is suspected to be **stale channel context**: a reused Dev worker remembered its first-turn state and failed to detect that the channel had moved on. This test is designed to explicitly validate the fix: the second Dev pass must ignore any cached/remembered state, re-read the channel file from disk, parse the latest message addressed to Dev, and act on it fresh.

## Scope
- In scope: create a minimal plan artifact under `agents/artifacts/`.
- In scope: create and update a disposable Dev marker artifact under `agents/artifacts/`.
- In scope: create complete and review artifacts under `agents/artifacts/`.
- In scope: intentionally force exactly one Review → Dev loop.
- In scope: update this dispatch channel and `docs/SESSIONS.md` per workflow rules.
- **In scope (explicit test objective)**: validate that the second Dev pass re-reads the channel from disk, ignores stale remembered channel state, recomputes its active role from the latest message addressed to Dev, and appends a fresh `Dev → Review` message.
- Out of scope: app source, app tests, package/Tauri config, product docs, storage/schema changes, dispatch-auto code, cmux/Pi extension changes, and commits by workers.

## Required Route

```text
Main → Plan → Dev → Review → Dev → Review → Main
```

## Required Loop Semantics

1. **First Dev pass** writes `agents/artifacts/021-dispatch-smoke-v6-marker.md` with exact line:

   ```text
   smoke-v6-state: first-pass
   ```

   After writing the marker, append a `Dev → Review` message to the dispatch channel with `State = ready-for-review`.

2. **First Review pass** must intentionally return to Dev with `State = needs-dev-fix`, even if everything else is correct. It should instruct Dev to update the marker to:

   ```text
   smoke-v6-state: second-pass
   ```

3. **Second Dev pass** must:
   - **Re-read the channel from disk** (`agents/channels/021-dispatch-smoke-v6-channel.md`). Do NOT rely on remembered state from the first pass.
   - **Parse the latest message** — identify that the most recent message is `Review → Dev` with `State = needs-dev-fix`.
   - **Recompute active role** from that latest message's `### To` field (`Dev`) to determine what task to perform.
   - Update the marker to `smoke-v6-state: second-pass`.
   - Create `agents/artifacts/021-dispatch-smoke-v6-complete.md` with lightweight verification results documenting both Dev passes.
   - **Append a fresh `Dev → Review` message** to the dispatch channel with `State = ready-for-review`.

4. **Second Review pass** verifies the marker now contains the second-pass line, confirms the complete artifact documents both passes, and returns `State = review-pass` to Main.

## Test Objective (explicit)

Validate dispatch-auto pickup hardening for reused interactive worker sessions by answering:

- Did the second Dev pass re-read the channel from disk (and not rely on cached/stale context from its first turn)?
- Did it correctly parse the latest channel message (`Review → Dev`, `State = needs-dev-fix`)?
- Did it recompute its active role and task from that message?
- Did it append a fresh `Dev → Review` message to the channel?

Pass condition: the channel audit trail contains exactly 6 messages (`Main → Plan`, `Plan → Dev`, `Dev → Review`, `Review → Dev`, `Dev → Review`, `Review → Main`) with no gaps or missing messages. The second `Dev → Review` message must be a separate, correctly formatted message appended after the `Review → Dev` message — not a re‑use or modification of the first `Dev → Review` message.

## Related Spec Sections
- agents/workflows/dispatch-channel-protocol.md
- agents/ARTIFACTS.md
- agents/CLOSING.md
- agents/orchestration.json

## Constraints
- Keep all created worker artifacts disposable and located under `agents/artifacts/`.
- Do not modify app/source/product documentation files. `docs/SESSIONS.md` updates are allowed because the workflow requires them.
- Use only lightweight artifact verification such as checking expected files/content and `git diff --check`.
- Preserve the required route exactly.
- Workers must not edit dispatch-auto code, orchestration config, external scripts, app code, app tests, package/Tauri config, or product docs as part of this smoke test.

## Acceptance Criteria
- [ ] Plan writes `agents/artifacts/021-dispatch-smoke-v6-plan.md` with a tiny artifact-only implementation plan that explicitly requires the forced Review → Dev loop and includes explicit instructions about stale-context hardening.
- [ ] First Dev writes marker with exact line `smoke-v6-state: first-pass` and appends `Dev → Review` message.
- [ ] First Review writes/updates `agents/artifacts/021-dispatch-smoke-v6-review.md` and returns `State = needs-dev-fix` to Dev.
- [ ] Second Dev re-reads channel from disk, parses latest `Review → Dev` message, recomputes role, updates marker to `smoke-v6-state: second-pass`, creates `agents/artifacts/021-dispatch-smoke-v6-complete.md`, and appends a **fresh** `Dev → Review` message.
- [ ] Second Review returns `State = review-pass` to Main.
- [ ] The channel audit trail follows `Main → Plan → Dev → Review → Dev → Review → Main` with 6 distinct messages and no gaps.
- [ ] No app source, app tests, package/Tauri config, product docs, orchestration config, dispatch-auto code, or external script changes are made by workers.
