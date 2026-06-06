<!-- DISPATCH-SHARED:closing-pre — synced from meta-workflow/agents/templates/dispatch. Edit the canonical file and run tools/sync_repo_agents.py --apply; do not hand-edit here. Repo-specific text belongs in DISPATCH-LOCAL blocks. -->
# Session Closing Protocol

Every agent session ends with a structured close. This ensures documentation is current, work is not lost, and the next agent can continue through the dispatch channel without a long chat prompt.

---

## Agent Close Responsibilities

Every agent has a **BEFORE YOU END** checklist in its prompt template. The most critical output for Plan, Dev, and Review is creating the next numbered message file in the active dispatch channel spool.

| Agent | Writes Artifact | Session Log | Creates Next Channel Message | Chat Output | Update Other Docs | Commit & Push |
|-------|----------------|---------------------|--------------------------|-------------|-------------------|---------------|
| **Main** | Dispatch (if dispatching) | ✅ Consolidates per session-model below | ✅ Required | Short pickup instruction | Phase status | ✅ **Only Main** |
| **Plan** | Plan artifact | ✅ Required | ✅ Required (`Plan → Dev` file) | Short pickup instruction | Spec doc if needed | ❌ |
| **Dev** | Complete artifact | ✅ Required | ✅ Required (`Dev → Review` file) | Short pickup instruction | Flag spec changes | ❌ |
| **Review** | Review artifact | ✅ Required | ✅ Required (`Review → Main/Dev` file) | Short pickup instruction | — | ❌ |

## Why Dispatch Channels Replace Long Chat Prompts

- **Less copying**: The user starts the next session with `pickup agents/channels/###-feature-slug/`.
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

- `npm run test` failed in PowerShell with these specific assertions: `<suite> > <case>` — checkpoint-scoped.
- `npm run build` hit a known sandbox `spawn EPERM`; rerun with escalation is required.
- `npm run lint` failed in an unrelated untracked file; not introduced by this dispatch.

Unacceptable reports:

- "bash unavailable; commands not run" (translate to the actual shell available — PowerShell or zsh — and run them)
- "tests passed" (no command name, no shell, no scope statement)
<!-- /DISPATCH-SHARED:closing-pre -->
<!-- DISPATCH-LOCAL:session-model — repo-owned: this repo's session-log files and how Main consolidates them. Sync preserves this block; edit it here. -->

## Session Log Model

Plan, Dev, and Review append to this repo's session append buffer at close; Main consolidates at full close. This repo's model:

- Worker append buffer: `docs/SESSIONS_PENDING.md`
- Main consolidates pending entries into: `docs/SESSIONS_ARCHIVE.md`
- Living summary updated by Main: `docs/SESSIONS.md`

Session entry format:

```markdown
## Session N — YYYY-MM-DD

### Agent Type
[main / plan / dev / review]

### Artifacts
- Channel: agents/channels/###-feature-slug/
- Dispatch / Plan / Complete / Review: agents/artifacts/###-feature-*.md

### Summary
[2-3 sentences about what happened this session]

### Outcome
[For Main: what was dispatched or closed]
[For Plan: plan ready for dev; next channel message created]
[For Dev: implementation complete, ready for review; next channel message created]
[For Review: PASS / FAIL; next channel message created to Main/Dev]
```
<!-- /DISPATCH-LOCAL:session-model -->
<!-- DISPATCH-SHARED:closing-post — synced from meta-workflow/agents/templates/dispatch. Edit the canonical file and run tools/sync_repo_agents.py --apply; do not hand-edit here. Repo-specific text belongs in DISPATCH-LOCAL blocks. -->

## Main Close (Full Close)

Main is the only agent that does a **full close**:

1. **Verify the review** (if returning from a review cycle):
   - Read the dispatch channel
   - Read the review artifact and its `## Final Verdict` section
   - Confirm the latest Review message has `State = review-pass`
   - Confirm the Final Verdict is PASS or narrowly justified PASS WITH NOTES with no required fixes
   - Confirm any PASS WITH NOTES items have explicit deferral reasons and are not clear/trivial/helpful in-scope fixes that should have been required
   - Confirm every PASS WITH NOTES deferred item was actually recorded as an `[open]` entry in `agents/DEFERRED.md` (per agents/workflows/deferred-protocol.md). Do NOT close a PASS-WITH-NOTES dispatch whose deferrals were never written to the ledger — they would be lost. If the ledger entry is missing, route back to Review to record it.
   - If source, test, artifact, or user-facing documentation files changed after Review returned `State = review-pass`, do NOT close — create the next `Main → Review` message file with `State = ready-for-review` so Review can inspect the post-review changes
   - If the latest Review message is `needs-dev-fix` or `needs-main-fix`, do NOT close — route the work to the required fixer (Main re-engages Plan if the plan itself needs revision) and ensure it returns to Review afterward

2. **Run the dirty-file close gate:**
   - Inspect `git status`. Confirm every dirty file is reviewed in-scope for this dispatch, or explicitly accepted, reverted, or split out. Do not sweep unexplained working-tree changes into the close commit.

3. **Process the session log:** consolidate per the Session Log Model above (archive worker entries, update the living summary, and add your own Main entry to the append buffer for the next cycle).

4. **Commit**:
   ```bash
   git add -A
   git commit -m "feat: [feature name] — [brief description]"
   ```
   Commit message format: `feat:` for new features, `fix:` for fixes, `docs:` for doc-only changes.

5. **Push**:
   ```bash
   git push
   ```

6. **Provide next pickup instruction**:
   - If dispatching more work, create/update the channel and tell the user `pickup agents/channels/###-feature-slug/`.
   - If no next work is queued, tell the user to start with `main`.

## Partial Close (Plan, Dev, Review)

These agents do a **partial close**:

1. Write their artifact
2. Append to the repo's configured session append buffer
3. Create the next numbered message file in the active dispatch channel spool
4. Output only a short pickup instruction in chat:
   ```text
   Next message is ready in agents/channels/###-feature-slug/.
   Start the next session with:

   pickup agents/channels/###-feature-slug/

   Do not commit — Main handles git operations.
   ```

## What Happens If a Session Ends Abruptly

If a session ends without proper close (error, timeout, user abort):

- The agent's partial work is on disk (files, artifacts in progress)
- The user starts Main and references the channel
- Main checks the living summary, the session append buffer, the active dispatch channel, artifacts, and git status
- If the channel is missing a message, Main reconstructs it and notes the repair in the session append buffer

## Returning to Main After Review

When Review returns PASS or narrowly justified PASS WITH NOTES with no required fixes, it creates the next `Review → Main` message file with `State = review-pass` in the dispatch channel. The user starts Main with `pickup agents/channels/###-feature-slug/`.

Main then:
1. Reads the channel to confirm the latest message is addressed to Main with `State = review-pass`
2. Reads the review `## Final Verdict` to confirm PASS or narrowly justified PASS WITH NOTES with no required fixes
3. Reads the complete artifact to understand what was built, if applicable
4. Runs the dirty-file close gate and processes the session log per the model above
5. Commits and pushes
6. Provides the next `main` or `pickup` instruction

If Review returns `needs-main-fix`, Main applies the fix (re-engaging Plan if the plan itself needs revision) and creates the next `Main → Review` message file with `State = ready-for-review` instead of closing. The work is not finalized until Review returns `State = review-pass`.

## Commit Message Convention

| Prefix | When |
|--------|------|
| `feat:` | New feature completed through full cycle |
| `fix:` | Bug fix or review-driven correction |
| `docs:` | Documentation-only changes |
| `wip:` | Mid-cycle save point |
| `chore:` | Project setup, config, dependencies |
<!-- /DISPATCH-SHARED:closing-post -->
