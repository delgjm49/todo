# Session Closing Protocol

Every agent session ends with a structured close. This ensures documentation is current, work is not lost, and the next agent can continue through the dispatch channel without a long chat prompt.

---

## Agent Close Responsibilities

Every agent has a **BEFORE YOU END** checklist in its prompt template. The most critical output for Plan, Dev, and Review is appending the next message to the active dispatch channel.

| Agent | Writes Artifact | Updates SESSIONS.md | Appends Dispatch Channel | Chat Output | Update Other Docs | Commit & Push |
|-------|----------------|---------------------|--------------------------|-------------|-------------------|---------------|
| **Main** | Dispatch (if dispatching) | ✅ Required | ✅ Required | Short pickup instruction | Phase status | ✅ **Only Main** |
| **Plan** | Plan artifact | ✅ Required | ✅ Required (`Plan → Dev`) | Short pickup instruction | TECH_SPEC if needed | ❌ |
| **Dev** | Complete artifact | ✅ Required | ✅ Required (`Dev → Review`) | Short pickup instruction | Flag TECH_SPEC changes | ❌ |
| **Review** | Review artifact | ✅ Required | ✅ Required (`Review → Main/Dev/Plan`) | Short pickup instruction | — | ❌ |

## Why Dispatch Channels Replace Long Chat Prompts

- **Less copying**: The user starts the next session with `pickup agents/channels/###-feature-channel.md`.
- **No buried prompts**: The next-agent message is in a known file, not hidden in an artifact or prose summary.
- **Audit trail**: Main can inspect one channel to see the full chain: Main → Plan → Dev → Review → ...
- **Lower token waste**: Full next-agent instructions live on disk, not in chat.

## Why Main Owns Git

- **Atomic commits per feature**: When Main commits, it bundles all artifacts, channel messages, and code from the cycle into one clean commit.
- **No merge conflicts**: Since sessions are sequential, only Main writes to git.
- **Clean history**: Each commit maps to a completed feature or decision point.

## Verification Reporting Rule

Both Dev and Review must report each required command outcome in this form. This is the canonical format used in Complete and Review artifacts.

- command:
- shell used:
- result:
- if failed, exact failure surface:
- checkpoint-scoped or unrelated repo-state:
- was this the actual shell provided by the environment:

Examples of acceptable reports:

- `npm run test` failed in PowerShell with these specific assertions: `BlockEditor > should commit row on Enter` — checkpoint-scoped.
- `npm run build` hit known sandbox `spawn EPERM`; rerun with escalation is required.
- `npm run lint` failed in unrelated untracked file `.pi/...`; not introduced by this dispatch.

Unacceptable reports:

- "bash unavailable; commands not run" (translate to the actual shell available — PowerShell or zsh — and run them)
- "tests passed" (no command name, no shell, no scope statement)

## SESSIONS.md Format

Every agent appends to `docs/SESSIONS.md` at close. The format:

```markdown
## Session N — YYYY-MM-DD

### Agent Type
[main / plan / dev / review]

### Artifacts
- Channel: agents/channels/###-feature-channel.md
- Dispatch: agents/artifacts/###-feature-dispatch.md
- (or) Plan: agents/artifacts/###-feature-plan.md
- (or) Complete: agents/artifacts/###-feature-complete.md
- (or) Review: agents/artifacts/###-feature-review.md

### Summary
[2-3 sentences about what happened this session]

### Outcome
[For Main: what was dispatched or closed]
[For Plan: plan ready for dev; channel appended]
[For Dev: implementation complete, ready for review; channel appended]
[For Review: PASS / FAIL; channel appended to Main/Dev/Plan]
```

## Main Close (Full Close)

Main is the only agent that does a **full close**:

1. **Verify the review** (if returning from a review cycle):
   - Read the dispatch channel
   - Read the review artifact
   - Confirm the latest Review message has `State = review-pass`
   - Confirm the review verdict is PASS or narrowly justified PASS WITH NOTES with no required fixes
   - Confirm any PASS WITH NOTES items have explicit deferral reasons and are not clear/trivial/helpful in-scope fixes that should have been required
   - If source, test, artifact, or user-facing documentation files changed after Review returned `State = review-pass`, do NOT close — append `Main → Review` with `State = ready-for-re-review` so Review can inspect the post-review changes
   - If the latest Review message is `needs-dev-fix`, `needs-plan-revision`, or `needs-main-fix`, do NOT close — route the work to the required fixer and ensure it returns to Review afterward

2. **Update SESSIONS.md**:
   - Add Main session entry summarizing the cycle
   - Update phase status table (mark features complete, if applicable)

3. **Commit**:
   ```bash
   git add -A
   git commit -m "feat: [feature name] — [brief description]"
   ```
   Commit message format: `feat:` for new features, `fix:` for fixes, `docs:` for doc-only changes.

4. **Push**:
   ```bash
   git push
   ```

5. **Provide next pickup instruction**:
   - If dispatching more work, create/update the channel and tell the user:
     ```text
     pickup agents/channels/###-feature-channel.md
     ```
   - If no next work is queued, tell the user to start with `main`.

## Partial Close (Plan, Dev, Review)

These agents do a **partial close**:

1. Write their artifact
2. Update `docs/SESSIONS.md`
3. Append the next message to the active dispatch channel
4. Output only a short pickup instruction in chat:
   ```text
   Next message is ready in agents/channels/###-feature-channel.md.
   Start the next session with:

   pickup agents/channels/###-feature-channel.md

   Do not commit — Main handles git operations.
   ```

## What Happens If a Session Ends Abruptly

If a session ends without proper close (error, timeout, user abort):

- The agent's partial work is on disk (files, artifacts in progress)
- The user starts Main and references the channel
- Main checks `docs/SESSIONS.md`, the active dispatch channel, artifacts, and git status
- If the channel is missing a message, Main reconstructs it and notes the repair in `docs/SESSIONS.md`

## Returning to Main After Review

When Review returns PASS or narrowly justified PASS WITH NOTES with no required fixes, it appends `Review → Main` with `State = review-pass` to the dispatch channel. The user starts Main with:

```text
pickup agents/channels/###-feature-channel.md
```

Main then:
1. Reads the channel to confirm the latest message is addressed to Main with `State = review-pass`
2. Reads the review to confirm PASS or narrowly justified PASS WITH NOTES with no required fixes
3. Reads the complete artifact to understand what was built, if applicable
4. Updates `docs/SESSIONS.md`
5. Commits and pushes
6. Provides the next `main` or `pickup` instruction

If Review returns `needs-main-fix`, Main applies the fix and appends `Main → Review` with `State = ready-for-re-review` instead of closing. The work is not finalized until Review returns `State = review-pass`.

## Returning to Main Mid-Cycle

If the user needs to stop mid-cycle:

```text
main

I'm mid-cycle on [feature]. Channel: agents/channels/###-feature-channel.md.
Please commit the current state as WIP and help me resume later.
```

Main commits with a `wip:` prefix and pushes. The user can resume later with the channel's pickup command.

## Commit Message Convention

| Prefix | When |
|--------|------|
| `feat:` | New feature completed through full cycle |
| `fix:` | Bug fix or review-driven correction |
| `docs:` | Documentation-only changes |
| `wip:` | Mid-cycle save point |
| `chore:` | Project setup, config, dependencies |
